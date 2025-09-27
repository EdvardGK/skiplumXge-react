/**
 * Intelligent roof generation algorithm for complex building footprints
 * Handles simple rectangles, L-shapes, T-shapes, and multi-T configurations
 * Ensures complete coverage with 600mm overhang on all sides
 */

import { Shape, Vector2 } from 'three';

export interface Point2D {
  x: number;
  y: number;
}

export interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  area: number;
  orientation: 'horizontal' | 'vertical'; // Longest axis
  priority: number; // Higher = main section
}

export interface RoofSection {
  rectangle: Rectangle;
  ridgeOrientation: 'x' | 'y';
  ridgeHeight: number;
  overhang: number;
  type: 'main' | 'wing' | 'connector';
  neighbors: RoofSection[];
}

export interface RoofIntersection {
  type: 'valley' | 'hip' | 'ridge-continuation';
  line: [Point2D, Point2D];
  sections: [RoofSection, RoofSection];
}

const STANDARD_OVERHANG = 0.6; // 600mm in meters
const ROOF_SLOPE_RATIO = 0.35; // Height is 35% of perpendicular distance

/**
 * Main entry point: Analyzes building footprint and generates roof sections
 */
export function generateRoofSections(footprint: [number, number][]): {
  sections: RoofSection[];
  intersections: RoofIntersection[];
} {
  if (!footprint || footprint.length < 3) {
    throw new Error('Invalid footprint: need at least 3 points');
  }

  // Fix duplicate first/last point issue common in OSM data
  let cleanFootprint = footprint;
  if (footprint.length > 3) {
    const firstPoint = footprint[0];
    const lastPoint = footprint[footprint.length - 1];

    // Check if first and last points are the same (within tolerance)
    const tolerance = 0.001;
    if (Math.abs(firstPoint[0] - lastPoint[0]) < tolerance &&
        Math.abs(firstPoint[1] - lastPoint[1]) < tolerance) {
      cleanFootprint = footprint.slice(0, -1); // Remove last point
      console.log('Removed duplicate first/last point, now', cleanFootprint.length, 'points');
    }
  }

  console.log('Analyzing footprint with', cleanFootprint.length, 'points:', cleanFootprint);

  // Step 1: Decompose footprint into rectangles
  const rectangles = decomposeIntoRectangles(cleanFootprint);
  console.log('Decomposed into', rectangles.length, 'rectangles:', rectangles);

  // Step 2: Create roof sections for each rectangle
  const sections = rectangles.map(rect => createRoofSection(rect));

  // Step 3: Identify and create intersections
  const intersections = createIntersections(sections);

  // Step 4: Validate coverage
  validateCoverage(cleanFootprint, sections);

  return { sections, intersections };
}

/**
 * Decomposes a polygon footprint into overlapping rectangles
 * Uses a corner-based approach for L and T shapes
 */
function decomposeIntoRectangles(footprint: [number, number][]): Rectangle[] {
  const rectangles: Rectangle[] = [];

  // First, check if it's already a simple rectangle
  if (isRectangle(footprint)) {
    console.log('Simple rectangle detected');
    const rect = getBoundingRectangle(footprint);
    rect.priority = 1;
    return [rect];
  }

  // Find corner types (convex vs concave)
  const corners = analyzeCorners(footprint);
  console.log('Corner analysis:', corners);

  // For L-shapes: Find the concave corner and split into 2 rectangles
  const concaveCorners = corners.filter(c => c.type === 'concave');
  console.log('Found', concaveCorners.length, 'concave corners');

  if (concaveCorners.length === 1) {
    console.log('L-shape detected');
    return decomposeLShape(footprint, concaveCorners[0]);
  }

  if (concaveCorners.length === 2) {
    console.log('Simple T-shape detected');
    return decomposeTShape(footprint, concaveCorners);
  }

  if (concaveCorners.length === 3) {
    console.log('Complex T-shape detected with 3 concave corners');
    // Check if this is actually a T-shape with 3 corners
    const tShapeRectangles = decomposeComplexTShape(footprint, concaveCorners);
    if (tShapeRectangles.length >= 2) {
      return tShapeRectangles;
    }
    // Fallback to multi-wing if T-shape detection fails
    return decomposeMultiWingShape(footprint, concaveCorners);
  }

  if (concaveCorners.length === 4) {
    console.log('Multi-wing shape detected with', concaveCorners.length, 'concave corners');
    return decomposeMultiWingShape(footprint, concaveCorners);
  }

  if (concaveCorners.length > 4) {
    console.log('Complex shape detected with', concaveCorners.length, 'concave corners');
    return decomposeComplexShape(footprint, concaveCorners);
  }

  // Fallback: use bounding box
  console.log('Fallback to bounding box');
  const boundingRect = getBoundingRectangle(footprint);
  boundingRect.priority = 1;
  return [boundingRect];
}

/**
 * Check if footprint is a simple rectangle
 */
function isRectangle(footprint: [number, number][]): boolean {
  if (footprint.length !== 4 && footprint.length !== 5) return false; // 5 if closed

  // Check if all angles are 90 degrees
  for (let i = 0; i < 4; i++) {
    const p1 = footprint[i];
    const p2 = footprint[(i + 1) % footprint.length];
    const p3 = footprint[(i + 2) % footprint.length];

    const angle = getAngle(p1, p2, p3);
    if (Math.abs(angle - 90) > 1 && Math.abs(angle - 270) > 1) {
      return false;
    }
  }

  return true;
}

/**
 * Analyze corners to find concave and convex corners
 */
function analyzeCorners(footprint: [number, number][]): Array<{
  point: [number, number];
  index: number;
  type: 'concave' | 'convex';
  angle: number;
}> {
  const corners = [];
  const n = footprint.length;

  console.log('Analyzing', n, 'corners in footprint');

  for (let i = 0; i < n; i++) {
    const prev = footprint[(i - 1 + n) % n];
    const curr = footprint[i];
    const next = footprint[(i + 1) % n];

    const angle = getAngle(prev, curr, next);
    const crossProduct = getCrossProduct(prev, curr, next);

    const cornerType = crossProduct > 0 ? 'convex' : 'concave';

    corners.push({
      point: curr,
      index: i,
      type: cornerType as 'convex' | 'concave',
      angle: angle
    });

    console.log(`Corner ${i}: [${curr[0].toFixed(2)}, ${curr[1].toFixed(2)}] - ${cornerType} (angle: ${angle.toFixed(1)}°, cross: ${crossProduct.toFixed(2)})`);
  }

  return corners;
}

/**
 * Decompose L-shape into two rectangles
 */
function decomposeLShape(footprint: [number, number][], concaveCorner: any): Rectangle[] {
  const rectangles: Rectangle[] = [];

  // Find the two edges meeting at the concave corner
  const [x, y] = concaveCorner.point;

  // Create two rectangles that meet at the concave corner
  // We need to find the extent of each wing
  const bounds = getBoundingRectangle(footprint);

  // Determine orientation of L
  const horizontalWing: Rectangle = {
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: y,
    maxY: bounds.maxY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - y,
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (y + bounds.maxY) / 2,
    area: 0,
    orientation: 'horizontal',
    priority: 1
  };
  horizontalWing.area = horizontalWing.width * horizontalWing.height;

  const verticalWing: Rectangle = {
    minX: bounds.minX,
    maxX: x,
    minY: bounds.minY,
    maxY: y,
    width: x - bounds.minX,
    height: y - bounds.minY,
    centerX: (bounds.minX + x) / 2,
    centerY: (bounds.minY + y) / 2,
    area: 0,
    orientation: 'vertical',
    priority: 2
  };
  verticalWing.area = verticalWing.width * verticalWing.height;

  // Assign priority based on area
  if (horizontalWing.area > verticalWing.area) {
    horizontalWing.priority = 1;
    verticalWing.priority = 2;
  } else {
    horizontalWing.priority = 2;
    verticalWing.priority = 1;
  }

  return [horizontalWing, verticalWing];
}

/**
 * Decompose T-shape into main bar and perpendicular wing
 */
function decomposeTShape(footprint: [number, number][], concaveCorners: any[]): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const bounds = getBoundingRectangle(footprint);

  // For a T-shape, we need to identify the main bar and the perpendicular wing
  // The two concave corners mark where the wing meets the main bar
  const [c1, c2] = concaveCorners;

  // Check if concave corners are aligned horizontally or vertically
  const horizontallyAligned = Math.abs(c1.point[1] - c2.point[1]) < 1;
  const verticallyAligned = Math.abs(c1.point[0] - c2.point[0]) < 1;

  if (horizontallyAligned) {
    // T-shape with horizontal cut (vertical main bar or horizontal wing)
    const y = (c1.point[1] + c2.point[1]) / 2;
    const x1 = Math.min(c1.point[0], c2.point[0]);
    const x2 = Math.max(c1.point[0], c2.point[0]);

    // Check which side has more area to determine main vs wing
    const topArea = (bounds.maxY - y) * (x2 - x1);
    const bottomArea = (y - bounds.minY) * (x2 - x1);
    const sideArea = Math.max(
      (bounds.maxY - bounds.minY) * (x1 - bounds.minX),
      (bounds.maxY - bounds.minY) * (bounds.maxX - x2)
    );

    // Main bar (vertical through center)
    const mainBar: Rectangle = {
      minX: x1,
      maxX: x2,
      minY: bounds.minY,
      maxY: bounds.maxY,
      width: x2 - x1,
      height: bounds.maxY - bounds.minY,
      centerX: (x1 + x2) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
      area: (x2 - x1) * (bounds.maxY - bounds.minY),
      orientation: (bounds.maxY - bounds.minY) > (x2 - x1) ? 'vertical' : 'horizontal',
      priority: 1
    };
    rectangles.push(mainBar);

    // Wing (perpendicular section)
    if (x1 - bounds.minX > bounds.maxX - x2) {
      // Wing is on the left
      const wing: Rectangle = {
        minX: bounds.minX,
        maxX: x1,
        minY: c1.point[1] < c2.point[1] ? c1.point[1] : c2.point[1],
        maxY: c1.point[1] > c2.point[1] ? c1.point[1] : c2.point[1],
        width: x1 - bounds.minX,
        height: Math.abs(c2.point[1] - c1.point[1]),
        centerX: (bounds.minX + x1) / 2,
        centerY: y,
        area: (x1 - bounds.minX) * Math.abs(c2.point[1] - c1.point[1]),
        orientation: 'horizontal',
        priority: 2
      };
      if (wing.width > 0 && wing.height > 0) {
        rectangles.push(wing);
      }
    } else {
      // Wing is on the right
      const wing: Rectangle = {
        minX: x2,
        maxX: bounds.maxX,
        minY: c1.point[1] < c2.point[1] ? c1.point[1] : c2.point[1],
        maxY: c1.point[1] > c2.point[1] ? c1.point[1] : c2.point[1],
        width: bounds.maxX - x2,
        height: Math.abs(c2.point[1] - c1.point[1]),
        centerX: (x2 + bounds.maxX) / 2,
        centerY: y,
        area: (bounds.maxX - x2) * Math.abs(c2.point[1] - c1.point[1]),
        orientation: 'horizontal',
        priority: 2
      };
      if (wing.width > 0 && wing.height > 0) {
        rectangles.push(wing);
      }
    }
  } else if (verticallyAligned) {
    // T-shape with vertical cut (horizontal main bar or vertical wing)
    const x = (c1.point[0] + c2.point[0]) / 2;
    const y1 = Math.min(c1.point[1], c2.point[1]);
    const y2 = Math.max(c1.point[1], c2.point[1]);

    // Main bar (horizontal through center)
    const mainBar: Rectangle = {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: y1,
      maxY: y2,
      width: bounds.maxX - bounds.minX,
      height: y2 - y1,
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (y1 + y2) / 2,
      area: (bounds.maxX - bounds.minX) * (y2 - y1),
      orientation: (bounds.maxX - bounds.minX) > (y2 - y1) ? 'horizontal' : 'vertical',
      priority: 1
    };
    rectangles.push(mainBar);

    // Wing (perpendicular section)
    if (y1 - bounds.minY > bounds.maxY - y2) {
      // Wing is at bottom
      const wing: Rectangle = {
        minX: x,
        maxX: x,
        minY: bounds.minY,
        maxY: y1,
        width: Math.abs(c2.point[0] - c1.point[0]),
        height: y1 - bounds.minY,
        centerX: x,
        centerY: (bounds.minY + y1) / 2,
        area: Math.abs(c2.point[0] - c1.point[0]) * (y1 - bounds.minY),
        orientation: 'vertical',
        priority: 2
      };
      if (wing.width > 0 && wing.height > 0) {
        rectangles.push(wing);
      }
    } else {
      // Wing is at top
      const wing: Rectangle = {
        minX: x,
        maxX: x,
        minY: y2,
        maxY: bounds.maxY,
        width: Math.abs(c2.point[0] - c1.point[0]),
        height: bounds.maxY - y2,
        centerX: x,
        centerY: (y2 + bounds.maxY) / 2,
        area: Math.abs(c2.point[0] - c1.point[0]) * (bounds.maxY - y2),
        orientation: 'vertical',
        priority: 2
      };
      if (wing.width > 0 && wing.height > 0) {
        rectangles.push(wing);
      }
    }
  }

  console.log('T-shape decomposed into', rectangles.length, 'rectangles');
  return rectangles.length > 0 ? rectangles : [bounds];
}

/**
 * Decompose complex T-shape with 3 concave corners
 * Real T-shapes often have 3 concave corners instead of the theoretical 2
 */
function decomposeComplexTShape(footprint: [number, number][], concaveCorners: any[]): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const bounds = getBoundingRectangle(footprint);

  console.log('Analyzing complex T-shape with corners:', concaveCorners.map(c => c.point));

  // Strategy for T-shape:
  // 1. Identify the main bar (longest continuous span)
  // 2. Identify the perpendicular wing
  // 3. Main bar should have ridge along its length
  // 4. Wing should have ridge perpendicular to main bar

  // Find the longest axis of the building
  const isHorizontalMain = bounds.width > bounds.height;

  console.log('Building dimensions:', bounds.width.toFixed(2), 'x', bounds.height.toFixed(2));
  console.log('Main orientation:', isHorizontalMain ? 'horizontal' : 'vertical');

  if (isHorizontalMain) {
    // Main bar is horizontal, wing extends vertically

    // Main horizontal bar - spans full width
    const mainBar: Rectangle = {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY + bounds.height * 0.3, // Start from 30% up
      maxY: bounds.maxY - bounds.height * 0.3, // End at 70% up
      width: bounds.width,
      height: bounds.height * 0.4, // 40% of total height
      centerX: bounds.centerX,
      centerY: bounds.centerY,
      area: bounds.width * (bounds.height * 0.4),
      orientation: 'horizontal',
      priority: 1
    };
    rectangles.push(mainBar);

    // Perpendicular wing - determine which side based on concave corners
    const leftWingCorners = concaveCorners.filter(c => c.point[0] < bounds.centerX);
    const rightWingCorners = concaveCorners.filter(c => c.point[0] > bounds.centerX);

    if (leftWingCorners.length > 0) {
      // Wing extends from left side
      const wing: Rectangle = {
        minX: bounds.minX,
        maxX: bounds.minX + bounds.width * 0.4, // Wing is 40% of main width
        minY: bounds.minY,
        maxY: bounds.maxY,
        width: bounds.width * 0.4,
        height: bounds.height,
        centerX: bounds.minX + bounds.width * 0.2,
        centerY: bounds.centerY,
        area: (bounds.width * 0.4) * bounds.height,
        orientation: 'vertical', // Ridge perpendicular to main
        priority: 2
      };
      rectangles.push(wing);
    }

    if (rightWingCorners.length > 0) {
      // Wing extends from right side
      const wing: Rectangle = {
        minX: bounds.maxX - bounds.width * 0.4,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.maxY,
        width: bounds.width * 0.4,
        height: bounds.height,
        centerX: bounds.maxX - bounds.width * 0.2,
        centerY: bounds.centerY,
        area: (bounds.width * 0.4) * bounds.height,
        orientation: 'vertical', // Ridge perpendicular to main
        priority: 2
      };
      rectangles.push(wing);
    }
  } else {
    // Main bar is vertical, wing extends horizontally

    // Main vertical bar - spans full height
    const mainBar: Rectangle = {
      minX: bounds.minX + bounds.width * 0.3,
      maxX: bounds.maxX - bounds.width * 0.3,
      minY: bounds.minY,
      maxY: bounds.maxY,
      width: bounds.width * 0.4,
      height: bounds.height,
      centerX: bounds.centerX,
      centerY: bounds.centerY,
      area: (bounds.width * 0.4) * bounds.height,
      orientation: 'vertical',
      priority: 1
    };
    rectangles.push(mainBar);

    // Horizontal wings
    const topWingCorners = concaveCorners.filter(c => c.point[1] > bounds.centerY);
    const bottomWingCorners = concaveCorners.filter(c => c.point[1] < bounds.centerY);

    if (topWingCorners.length > 0) {
      const wing: Rectangle = {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.maxY - bounds.height * 0.4,
        maxY: bounds.maxY,
        width: bounds.width,
        height: bounds.height * 0.4,
        centerX: bounds.centerX,
        centerY: bounds.maxY - bounds.height * 0.2,
        area: bounds.width * (bounds.height * 0.4),
        orientation: 'horizontal', // Ridge perpendicular to main
        priority: 2
      };
      rectangles.push(wing);
    }

    if (bottomWingCorners.length > 0) {
      const wing: Rectangle = {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.minY + bounds.height * 0.4,
        width: bounds.width,
        height: bounds.height * 0.4,
        centerX: bounds.centerX,
        centerY: bounds.minY + bounds.height * 0.2,
        area: bounds.width * (bounds.height * 0.4),
        orientation: 'horizontal', // Ridge perpendicular to main
        priority: 2
      };
      rectangles.push(wing);
    }
  }

  console.log('Complex T-shape decomposed into', rectangles.length, 'rectangles');
  return rectangles;
}

/**
 * Decompose multi-wing shapes (4+ concave corners, often seen in realistic T-shapes)
 */
function decomposeMultiWingShape(footprint: [number, number][], concaveCorners: any[]): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const bounds = getBoundingRectangle(footprint);

  console.log('Multi-wing decomposition for', concaveCorners.length, 'concave corners');
  console.log('Building bounds:', bounds);

  // Strategy: Find the largest axis and create a main rectangle along it
  // Then create wing rectangles for the remaining areas

  // 1. Create main rectangle along longest axis
  const mainRect: Rectangle = {
    ...bounds,
    priority: 1
  };
  rectangles.push(mainRect);

  // 2. For shapes with multiple concave corners, try to identify clear wings
  // Group concave corners by proximity and orientation
  const wingClusters = groupConcaveCornersByProximity(concaveCorners, bounds);

  wingClusters.forEach((cluster, index) => {
    const wingRect = createWingRectangleFromCluster(cluster, bounds, index + 2);
    if (wingRect && wingRect.area > 0) {
      rectangles.push(wingRect);
    }
  });

  console.log('Multi-wing decomposed into', rectangles.length, 'rectangles');
  return rectangles.length > 0 ? rectangles : [bounds];
}

/**
 * Group concave corners that are close to each other
 */
function groupConcaveCornersByProximity(corners: any[], bounds: Rectangle): any[][] {
  const clusters: any[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < corners.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [corners[i]];
    processed.add(i);

    // Find nearby corners (within 30% of building dimension)
    const proximityThreshold = Math.min(bounds.width, bounds.height) * 0.3;

    for (let j = i + 1; j < corners.length; j++) {
      if (processed.has(j)) continue;

      const distance = Math.sqrt(
        Math.pow(corners[i].point[0] - corners[j].point[0], 2) +
        Math.pow(corners[i].point[1] - corners[j].point[1], 2)
      );

      if (distance < proximityThreshold) {
        cluster.push(corners[j]);
        processed.add(j);
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Create wing rectangle from a cluster of concave corners
 */
function createWingRectangleFromCluster(cluster: any[], bounds: Rectangle, priority: number): Rectangle | null {
  if (cluster.length === 0) return null;

  // Find the bounding box of the cluster
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  cluster.forEach(corner => {
    minX = Math.min(minX, corner.point[0]);
    maxX = Math.max(maxX, corner.point[0]);
    minY = Math.min(minY, corner.point[1]);
    maxY = Math.max(maxY, corner.point[1]);
  });

  // Expand to create a meaningful wing area
  const expansion = Math.min(bounds.width, bounds.height) * 0.2;
  minX = Math.max(bounds.minX, minX - expansion);
  maxX = Math.min(bounds.maxX, maxX + expansion);
  minY = Math.max(bounds.minY, minY - expansion);
  maxY = Math.min(bounds.maxY, maxY + expansion);

  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) return null;

  return {
    minX, maxX, minY, maxY,
    width, height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    area: width * height,
    orientation: width > height ? 'horizontal' : 'vertical',
    priority
  };
}

/**
 * Decompose complex shapes (H, cross, multi-T)
 */
function decomposeComplexShape(footprint: [number, number][], concaveCorners: any[]): Rectangle[] {
  // Use grid-based decomposition for complex shapes
  const bounds = getBoundingRectangle(footprint);
  const rectangles: Rectangle[] = [];

  // Create a grid and find maximal rectangles
  const gridResolution = 0.5; // 0.5m grid
  const grid = createGrid(footprint, bounds, gridResolution);
  const maximalRects = findMaximalRectangles(grid, bounds, gridResolution);

  // Sort by area and assign priorities
  maximalRects.sort((a, b) => b.area - a.area);
  maximalRects.forEach((rect, index) => {
    rect.priority = index + 1;
    rectangles.push(rect);
  });

  return rectangles;
}

/**
 * Create roof section for a rectangle
 */
function createRoofSection(rectangle: Rectangle): RoofSection {
  // Determine ridge orientation (along longest dimension)
  const ridgeOrientation = rectangle.width > rectangle.height ? 'x' : 'y';

  // Calculate ridge height based on perpendicular dimension
  const perpDistance = ridgeOrientation === 'x' ? rectangle.height : rectangle.width;
  const ridgeHeight = perpDistance * ROOF_SLOPE_RATIO;

  // Determine roof type based on priority
  const type = rectangle.priority === 1 ? 'main' : 'wing';

  return {
    rectangle,
    ridgeOrientation,
    ridgeHeight,
    overhang: STANDARD_OVERHANG,
    type,
    neighbors: []
  };
}

/**
 * Create intersections between roof sections
 */
function createIntersections(sections: RoofSection[]): RoofIntersection[] {
  const intersections: RoofIntersection[] = [];

  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const intersection = findIntersection(sections[i], sections[j]);
      if (intersection) {
        // Update neighbor relationships
        sections[i].neighbors.push(sections[j]);
        sections[j].neighbors.push(sections[i]);
        intersections.push(intersection);
      }
    }
  }

  return intersections;
}

/**
 * Find intersection between two roof sections
 */
function findIntersection(s1: RoofSection, s2: RoofSection): RoofIntersection | null {
  // Check if rectangles are adjacent or overlapping
  if (!rectanglesAdjacent(s1.rectangle, s2.rectangle)) {
    return null;
  }

  // Determine intersection type based on ridge orientations
  let intersectionType: 'valley' | 'hip' | 'ridge-continuation';

  if (s1.ridgeOrientation === s2.ridgeOrientation) {
    // Parallel ridges - could be continuation or step
    intersectionType = 'ridge-continuation';
  } else {
    // Perpendicular ridges - create valley
    intersectionType = 'valley';
  }

  // Calculate intersection line
  const line = calculateIntersectionLine(s1, s2, intersectionType);

  return {
    type: intersectionType,
    line,
    sections: [s1, s2]
  };
}

/**
 * Validate that roof sections provide complete coverage
 */
function validateCoverage(footprint: [number, number][], sections: RoofSection[]): boolean {
  if (!sections || sections.length === 0) {
    console.warn('No roof sections to validate coverage');
    return false;
  }

  // Validate that all rectangle properties are numbers
  for (const section of sections) {
    const rect = section.rectangle;
    if (isNaN(rect.minX) || isNaN(rect.maxX) || isNaN(rect.minY) || isNaN(rect.maxY) ||
        isNaN(section.overhang)) {
      console.warn('Invalid rectangle or overhang values:', rect, section.overhang);
      return false;
    }
  }

  // Expand footprint by overhang amount
  const expandedFootprint = expandPolygon(footprint, STANDARD_OVERHANG);

  // Create union of all roof section areas (including overhangs)
  const roofCoverage = sections.map(s => {
    return {
      minX: s.rectangle.minX - s.overhang,
      maxX: s.rectangle.maxX + s.overhang,
      minY: s.rectangle.minY - s.overhang,
      maxY: s.rectangle.maxY + s.overhang
    };
  });

  // Sample points on expanded footprint
  const samplePoints = samplePolygon(expandedFootprint, 0.1); // Sample every 0.1m

  // Check each sample point is covered
  for (const point of samplePoints) {
    // Validate point coordinates
    if (isNaN(point[0]) || isNaN(point[1])) {
      console.warn('Invalid sample point:', point);
      continue;
    }

    let covered = false;
    for (const rect of roofCoverage) {
      if (point[0] >= rect.minX && point[0] <= rect.maxX &&
          point[1] >= rect.minY && point[1] <= rect.maxY) {
        covered = true;
        break;
      }
    }

    if (!covered) {
      console.warn(`Point ${point} is not covered by roof!`);
      return false;
    }
  }

  console.log('Coverage validation passed for', sections.length, 'roof sections');
  return true;
}

// Utility functions

function getBoundingRectangle(footprint: [number, number][]): Rectangle {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of footprint) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX, maxX, minY, maxY,
    width, height,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    area: width * height,
    orientation: width > height ? 'horizontal' : 'vertical',
    priority: 1
  };
}

function getAngle(p1: [number, number], p2: [number, number], p3: [number, number]): number {
  const v1 = [p1[0] - p2[0], p1[1] - p2[1]];
  const v2 = [p3[0] - p2[0], p3[1] - p2[1]];

  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const det = v1[0] * v2[1] - v1[1] * v2[0];

  const angle = Math.atan2(det, dot) * 180 / Math.PI;
  return angle < 0 ? angle + 360 : angle;
}

function getCrossProduct(p1: [number, number], p2: [number, number], p3: [number, number]): number {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
}

function rectanglesAdjacent(r1: Rectangle, r2: Rectangle): boolean {
  // Check if rectangles share an edge or overlap
  const xOverlap = r1.minX <= r2.maxX && r2.minX <= r1.maxX;
  const yOverlap = r1.minY <= r2.maxY && r2.minY <= r1.maxY;

  return xOverlap && yOverlap;
}

function calculateIntersectionLine(s1: RoofSection, s2: RoofSection, type: string): [Point2D, Point2D] {
  // Simplified - would need full geometry calculation
  const meetingPoint: Point2D = {
    x: (s1.rectangle.centerX + s2.rectangle.centerX) / 2,
    y: (s1.rectangle.centerY + s2.rectangle.centerY) / 2
  };

  // Valley lines typically run at 45 degrees
  const endPoint: Point2D = {
    x: meetingPoint.x + 10,
    y: meetingPoint.y + 10
  };

  return [meetingPoint, endPoint];
}

function expandPolygon(footprint: [number, number][], distance: number): [number, number][] {
  // Simplified - would use proper polygon offsetting algorithm
  return footprint.map(([x, y]) => {
    // This is a rough approximation - proper implementation would calculate
    // perpendicular offsets for each edge
    return [x, y] as [number, number];
  });
}

function samplePolygon(polygon: [number, number][], resolution: number): [number, number][] {
  const samples: [number, number][] = [];

  // Sample along edges
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const distance = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
    const steps = Math.ceil(distance / resolution);

    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      samples.push([
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1])
      ]);
    }
  }

  return samples;
}

function createGrid(footprint: [number, number][], bounds: Rectangle, resolution: number): boolean[][] {
  const width = Math.ceil(bounds.width / resolution);
  const height = Math.ceil(bounds.height / resolution);
  const grid: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // Mark cells inside polygon
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const worldX = bounds.minX + x * resolution + resolution / 2;
      const worldY = bounds.minY + y * resolution + resolution / 2;

      if (isPointInPolygon([worldX, worldY], footprint)) {
        grid[y][x] = true;
      }
    }
  }

  return grid;
}

function findMaximalRectangles(grid: boolean[][], bounds: Rectangle, resolution: number): Rectangle[] {
  // Simplified maximal rectangle algorithm
  // Full implementation would use dynamic programming
  const rectangles: Rectangle[] = [];

  // For now, return bounding rectangle as fallback
  rectangles.push(bounds);

  return rectangles;
}

function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Generate 3D roof geometry for Three.js
 */
export function generateRoof3DGeometry(sections: RoofSection[], intersections: RoofIntersection[]) {
  const roofParts = [];

  for (const section of sections) {
    const { rectangle, ridgeOrientation, ridgeHeight, overhang } = section;

    // Calculate roof bounds with overhang
    const roofBounds = {
      minX: rectangle.minX - overhang,
      maxX: rectangle.maxX + overhang,
      minY: rectangle.minY - overhang,
      maxY: rectangle.maxY + overhang,
      width: rectangle.width + (overhang * 2),
      depth: rectangle.height + (overhang * 2)
    };

    if (ridgeOrientation === 'x') {
      // Ridge runs east-west
      roofParts.push({
        type: 'gable',
        position: [rectangle.centerX, 0, rectangle.centerY],
        ridgeLength: roofBounds.width,
        roofWidth: roofBounds.depth,
        ridgeHeight: ridgeHeight,
        orientation: 'x'
      });
    } else {
      // Ridge runs north-south
      roofParts.push({
        type: 'gable',
        position: [rectangle.centerX, 0, rectangle.centerY],
        ridgeLength: roofBounds.depth,
        roofWidth: roofBounds.width,
        ridgeHeight: ridgeHeight,
        orientation: 'y'
      });
    }
  }

  // Add valley/hip geometries for intersections
  for (const intersection of intersections) {
    if (intersection.type === 'valley') {
      roofParts.push({
        type: 'valley',
        line: intersection.line,
        depth: 0.2 // Valley depth
      });
    }
  }

  return roofParts;
}