import * as turf from '@turf/turf';

/**
 * Roof geometry utilities for complex building footprints
 */

export interface RoofSection {
  type: 'main' | 'wing' | 'extension';
  footprint: [number, number][];
  ridgeLine: {
    start: [number, number];
    end: [number, number];
    height: number;
  };
  eaves: {
    left: { start: [number, number]; end: [number, number] };
    right: { start: [number, number]; end: [number, number] };
  };
  area: number;
}

export interface FootprintComplexity {
  isSimple: boolean;
  isConvex: boolean;
  isRectilinear: boolean;
  interiorAngles: number[];
  recommendedApproach: 'single-ridge' | 'multi-section' | 'complex';
}

/**
 * Analyze footprint complexity to determine roof approach
 */
export function analyzeFootprintComplexity(
  footprint: [number, number][]
): FootprintComplexity {
  if (footprint.length < 3) {
    throw new Error('Footprint must have at least 3 points');
  }

  // Convert to GeoJSON polygon
  const polygon = turf.polygon([[...footprint, footprint[0]]]);

  // Check if convex
  const convexHull = turf.convex(turf.featureCollection([polygon]));
  const isConvex = convexHull ?
    Math.abs(turf.area(polygon) - turf.area(convexHull)) < 0.01 : false;

  // Calculate interior angles
  const interiorAngles = calculateInteriorAngles(footprint);

  // Check if rectilinear (all angles are ~90° or ~270°)
  const tolerance = 5; // degrees
  const isRectilinear = interiorAngles.every(angle => {
    const deg = (angle * 180) / Math.PI;
    return (
      Math.abs(deg - 90) < tolerance ||
      Math.abs(deg - 270) < tolerance ||
      Math.abs(deg - 180) < tolerance // Allow straight angles
    );
  });

  // Determine if simple enough for single ridge
  const isSimple = isConvex && footprint.length <= 6;

  // Recommend approach
  let recommendedApproach: 'single-ridge' | 'multi-section' | 'complex';
  if (isSimple) {
    recommendedApproach = 'single-ridge';
  } else if (isRectilinear && !isConvex) {
    recommendedApproach = 'multi-section';
  } else {
    recommendedApproach = 'complex';
  }

  return {
    isSimple,
    isConvex,
    isRectilinear,
    interiorAngles,
    recommendedApproach,
  };
}

/**
 * Calculate interior angles of polygon
 */
function calculateInteriorAngles(footprint: [number, number][]): number[] {
  const angles: number[] = [];

  for (let i = 0; i < footprint.length; i++) {
    const prev = footprint[(i - 1 + footprint.length) % footprint.length];
    const curr = footprint[i];
    const next = footprint[(i + 1) % footprint.length];

    // Vectors
    const v1x = prev[0] - curr[0];
    const v1y = prev[1] - curr[1];
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];

    // Calculate angle using atan2
    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);

    let angle = angle2 - angle1;
    if (angle < 0) angle += 2 * Math.PI;

    angles.push(angle);
  }

  return angles;
}

/**
 * Decompose rectilinear concave polygon into rectangular sections
 * Uses a dominant rectangle approach: find main building body, then identify wings
 */
export function decomposeRectilinearPolygon(
  footprint: [number, number][]
): RoofSection[] {
  // Convert to GeoJSON
  const polygon = turf.polygon([[...footprint, footprint[0]]]);

  // Find minimum rotated rectangle (main building orientation)
  const bbox = turf.bbox(polygon);
  const envelopePolygon = turf.bboxPolygon(bbox);

  // Calculate polygon area
  const totalArea = turf.area(polygon);

  // Try different approaches based on footprint shape
  const sections: RoofSection[] = [];

  // For now, use a simple approach: try to find largest rectangle
  // that fits inside the polygon, then handle remainder

  // This is a placeholder - would need more sophisticated algorithm
  // For MVP, we can use the single-ridge approach on the whole footprint
  // and mark it as 'main' type

  const mainSection: RoofSection = {
    type: 'main',
    footprint: footprint,
    ridgeLine: calculateRidgeForSection(footprint),
    eaves: calculateEavesForSection(footprint),
    area: totalArea,
  };

  sections.push(mainSection);

  return sections;
}

/**
 * Calculate optimal ridge line for a section
 */
function calculateRidgeForSection(footprint: [number, number][]): {
  start: [number, number];
  end: [number, number];
  height: number;
} {
  // Find longest edge
  let longestEdgeIndex = 0;
  let longestEdgeLength = 0;

  for (let i = 0; i < footprint.length; i++) {
    const p1 = footprint[i];
    const p2 = footprint[(i + 1) % footprint.length];
    const length = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)
    );

    if (length > longestEdgeLength) {
      longestEdgeLength = length;
      longestEdgeIndex = i;
    }
  }

  const longestEdgeStart = footprint[longestEdgeIndex];
  const longestEdgeEnd = footprint[(longestEdgeIndex + 1) % footprint.length];

  // Ridge direction (parallel to longest edge)
  const ridgeDX = longestEdgeEnd[0] - longestEdgeStart[0];
  const ridgeDY = longestEdgeEnd[1] - longestEdgeStart[1];
  const ridgeLength = Math.sqrt(ridgeDX * ridgeDX + ridgeDY * ridgeDY);

  const ridgeUnitX = ridgeDX / ridgeLength;
  const ridgeUnitY = ridgeDY / ridgeLength;

  // Perpendicular direction
  const perpX = -ridgeUnitY;
  const perpY = ridgeUnitX;

  // Find furthest points in perpendicular direction
  let minProj = Infinity;
  let maxProj = -Infinity;

  footprint.forEach(point => {
    const projection = point[0] * perpX + point[1] * perpY;
    minProj = Math.min(minProj, projection);
    maxProj = Math.max(maxProj, projection);
  });

  // Building width (perpendicular to ridge)
  const buildingWidth = maxProj - minProj;

  // Ridge height (35% of building width)
  const ridgeHeight = buildingWidth * 0.35;

  // Find extent along ridge direction
  let minRidgeProj = Infinity;
  let maxRidgeProj = -Infinity;

  footprint.forEach(point => {
    const projection = point[0] * ridgeUnitX + point[1] * ridgeUnitY;
    minRidgeProj = Math.min(minRidgeProj, projection);
    maxRidgeProj = Math.max(maxRidgeProj, projection);
  });

  // Ridge endpoints
  const ridgeStart: [number, number] = [
    minRidgeProj * ridgeUnitX + ((minProj + maxProj) / 2) * perpX,
    minRidgeProj * ridgeUnitY + ((minProj + maxProj) / 2) * perpY,
  ];
  const ridgeEnd: [number, number] = [
    maxRidgeProj * ridgeUnitX + ((minProj + maxProj) / 2) * perpX,
    maxRidgeProj * ridgeUnitY + ((minProj + maxProj) / 2) * perpY,
  ];

  return {
    start: ridgeStart,
    end: ridgeEnd,
    height: ridgeHeight,
  };
}

/**
 * Calculate eave lines for a section
 */
function calculateEavesForSection(footprint: [number, number][]): {
  left: { start: [number, number]; end: [number, number] };
  right: { start: [number, number]; end: [number, number] };
} {
  // Find longest edge to determine ridge orientation
  let longestEdgeIndex = 0;
  let longestEdgeLength = 0;

  for (let i = 0; i < footprint.length; i++) {
    const p1 = footprint[i];
    const p2 = footprint[(i + 1) % footprint.length];
    const length = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)
    );

    if (length > longestEdgeLength) {
      longestEdgeLength = length;
      longestEdgeIndex = i;
    }
  }

  const longestEdgeStart = footprint[longestEdgeIndex];
  const longestEdgeEnd = footprint[(longestEdgeIndex + 1) % footprint.length];

  const ridgeDX = longestEdgeEnd[0] - longestEdgeStart[0];
  const ridgeDY = longestEdgeEnd[1] - longestEdgeStart[1];
  const ridgeLength = Math.sqrt(ridgeDX * ridgeDX + ridgeDY * ridgeDY);

  const ridgeUnitX = ridgeDX / ridgeLength;
  const ridgeUnitY = ridgeDY / ridgeLength;

  const perpX = -ridgeUnitY;
  const perpY = ridgeUnitX;

  // Find furthest points
  let minProj = Infinity;
  let maxProj = -Infinity;

  footprint.forEach(point => {
    const projection = point[0] * perpX + point[1] * perpY;
    minProj = Math.min(minProj, projection);
    maxProj = Math.max(maxProj, projection);
  });

  let minRidgeProj = Infinity;
  let maxRidgeProj = -Infinity;

  footprint.forEach(point => {
    const projection = point[0] * ridgeUnitX + point[1] * ridgeUnitY;
    minRidgeProj = Math.min(minRidgeProj, projection);
    maxRidgeProj = Math.max(maxRidgeProj, projection);
  });

  // Eave lines
  const leftEaveStart: [number, number] = [
    minRidgeProj * ridgeUnitX + maxProj * perpX,
    minRidgeProj * ridgeUnitY + maxProj * perpY,
  ];
  const leftEaveEnd: [number, number] = [
    maxRidgeProj * ridgeUnitX + maxProj * perpX,
    maxRidgeProj * ridgeUnitY + maxProj * perpY,
  ];

  const rightEaveStart: [number, number] = [
    minRidgeProj * ridgeUnitX + minProj * perpX,
    minRidgeProj * ridgeUnitY + minProj * perpY,
  ];
  const rightEaveEnd: [number, number] = [
    maxRidgeProj * ridgeUnitX + minProj * perpX,
    maxRidgeProj * ridgeUnitY + minProj * perpY,
  ];

  return {
    left: { start: leftEaveStart, end: leftEaveEnd },
    right: { start: rightEaveStart, end: rightEaveEnd },
  };
}

/**
 * Generate roof geometry for multiple sections with valleys
 */
export function generateMultiSectionRoof(
  sections: RoofSection[]
): {
  vertices: Float32Array;
  sectionTypes: string[];
} {
  const allVertices: number[] = [];
  const sectionTypes: string[] = [];

  sections.forEach((section, idx) => {
    const { ridgeLine, eaves } = section;

    // Create two roof planes per section
    // Plane 1: ridge to left eave
    allVertices.push(
      // Triangle 1
      ridgeLine.start[0], ridgeLine.height, -ridgeLine.start[1],
      eaves.left.start[0], 0, -eaves.left.start[1],
      ridgeLine.end[0], ridgeLine.height, -ridgeLine.end[1],
      // Triangle 2
      ridgeLine.end[0], ridgeLine.height, -ridgeLine.end[1],
      eaves.left.start[0], 0, -eaves.left.start[1],
      eaves.left.end[0], 0, -eaves.left.end[1]
    );
    sectionTypes.push(`${section.type}-left`, `${section.type}-left`);

    // Plane 2: ridge to right eave
    allVertices.push(
      // Triangle 1
      ridgeLine.start[0], ridgeLine.height, -ridgeLine.start[1],
      ridgeLine.end[0], ridgeLine.height, -ridgeLine.end[1],
      eaves.right.start[0], 0, -eaves.right.start[1],
      // Triangle 2
      ridgeLine.end[0], ridgeLine.height, -ridgeLine.end[1],
      eaves.right.end[0], 0, -eaves.right.end[1],
      eaves.right.start[0], 0, -eaves.right.start[1]
    );
    sectionTypes.push(`${section.type}-right`, `${section.type}-right`);
  });

  return {
    vertices: new Float32Array(allVertices),
    sectionTypes,
  };
}
