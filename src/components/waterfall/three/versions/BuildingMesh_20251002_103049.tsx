'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Mesh, Shape, ExtrudeGeometry, Vector2, Plane, Vector3 } from 'three';
import { generateRoofSections, generateRoof3DGeometry, Roof3DPart, RoofSection, RoofIntersection } from '@/lib/roof-algorithm';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

interface InsulationData {
  walls?: { thickness: number; uValue: number };  // thickness in mm
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface OpeningsData {
  windows?: { count: number; uValue: number };
  doors?: { count: number; uValue: number };
}

interface GridDebugInfo {
  polygonArea: number;
  totalTileArea: number;
  greenTileArea: number;
  tileCount: number;
  duplicateCount: number;
}

interface BuildingMeshProps {
  footprint: [number, number][];
  height?: number;  // Optional - will be calculated if not provided
  numberOfFloors?: number;
  buildingType: string;
  insulation?: InsulationData;
  openings?: OpeningsData;
  onComponentSelect?: (componentId: string | null, componentType?: string, additionalInfo?: any) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  sectionPlane?: { active: boolean; axis: 'x' | 'y' | 'z'; position: number; normal?: [number, number, number] } | null;
  visibleFloors?: Set<number>;  // Which floors are visible (includes roof as last floor)
  showFootprint?: boolean;  // Show building footprint on ground
  showGrid?: boolean;  // Show grid decomposition visualization
  showGridLines?: boolean;  // Show cyan wall extension lines
  showGridSquares?: boolean;  // Show colored grid squares
  gridColorScheme?: 'coverage' | 'roof';  // Color scheme for grid squares
  showAxes?: boolean;  // Show coordinate axes (X=red, Y=green, Z=blue)
  roofPlacementFloor?: number | null;  // Which floor the roof sits on (null = top of building)
  onGridDebugInfo?: (info: GridDebugInfo | null) => void;  // Callback for grid debug information
}

export default function BuildingMesh({
  footprint,
  height: providedHeight,
  numberOfFloors = 2,  // Default 2 floors
  buildingType,
  insulation = {
    walls: { thickness: 200, uValue: 0.18 },  // Default 200mm wall insulation
    roof: { thickness: 300, uValue: 0.13 },   // Default 300mm roof insulation
    floor: { thickness: 250, uValue: 0.15 }   // Default 250mm floor insulation
  },
  openings = {
    windows: { count: 8, uValue: 1.2 },
    doors: { count: 1, uValue: 1.5 }
  },
  onComponentSelect,
  onContextMenu,
  sectionPlane,
  visibleFloors = new Set(Array.from({ length: (numberOfFloors || 2) + 1 }, (_, i) => i)), // Default all visible
  showFootprint = true,
  showGrid = false,
  showGridLines = true,
  showGridSquares = true,
  gridColorScheme = 'coverage',
  showAxes = false,
  roofPlacementFloor = null,
  onGridDebugInfo
}: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);

  // Selection state for different components
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Create clipping planes for sectioning
  const clippingPlanes = useMemo(() => {
    if (!sectionPlane?.active) return [];

    const plane = new Plane();
    const normal = new Vector3();

    // If we have a surface normal, use it directly (not inverted)
    if (sectionPlane.normal) {
      // Use the normal as-is so the plane cuts from the clicked surface inward
      // This hides what's in front of the surface (positive side) and shows what's behind (negative side)
      normal.set(sectionPlane.normal[0], sectionPlane.normal[1], sectionPlane.normal[2]);
    } else {
      // Fallback to axis-based normal
      if (sectionPlane.axis === 'x') {
        normal.set(1, 0, 0);  // Hide positive X
      } else if (sectionPlane.axis === 'y') {
        normal.set(0, 1, 0);  // Hide positive Y
      } else if (sectionPlane.axis === 'z') {
        normal.set(0, 0, 1);  // Hide positive Z
      }
    }

    // Set plane from normal and position
    plane.setFromNormalAndCoplanarPoint(normal, new Vector3(
      sectionPlane.axis === 'x' ? sectionPlane.position : 0,
      sectionPlane.axis === 'y' ? sectionPlane.position : 0,
      sectionPlane.axis === 'z' ? sectionPlane.position : 0
    ));

    return [plane];
  }, [sectionPlane]);

  // Calculate building height based on type and floors if not provided
  const height = useMemo(() => {
    if (providedHeight) return providedHeight;

    // Floor heights based on building type
    let floorHeight: number;
    switch (buildingType.toLowerCase()) {
      case 'bolig':
      case 'enebolig':
      case 'småhus':
      case 'rekkehus':
        floorHeight = 2.7; // Residential: 2.7m per floor
        break;
      case 'kontor':
      case 'butikk':
      case 'skole':
        floorHeight = 3.0; // Commercial/Office: 3.0m per floor
        break;
      case 'industri':
      case 'lager':
      case 'sykehus':
        floorHeight = 4.5; // Industrial/Special: 4.5m per floor
        break;
      default:
        floorHeight = 3.0; // Default 3.0m
    }

    return numberOfFloors * floorHeight;
  }, [providedHeight, buildingType, numberOfFloors]);

  // Use intelligent roof algorithm to analyze building and generate roof sections
  const roofData = useMemo<{
    sections: RoofSection[];
    intersections: RoofIntersection[];
    geometry3D: Roof3DPart[];
    bounds: { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number; width: number; depth: number };
  }>(() => {
    if (!footprint || footprint.length === 0) {
      // Default fallback for empty footprint
      return {
        sections: [],
        intersections: [],
        geometry3D: [],
        bounds: { minX: -10, maxX: 10, minY: -8, maxY: 8, centerX: 0, centerY: 0, width: 20, depth: 16 }
      };
    }

    // PERFORMANCE FIX: Temporarily disable complex roof algorithm
    // The grid decomposition is too expensive for real-time rendering
    console.log('Roof algorithm temporarily disabled for performance');

    // Just calculate bounds for now
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    footprint.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const bounds = {
      minX, maxX, minY, maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      depth: maxY - minY
    };

    return {
      sections: [],
      intersections: [],
      geometry3D: [],
      bounds
    };

    /* DISABLED FOR PERFORMANCE - The algorithm below causes severe lag
    try {
      // Generate roof sections using the intelligent algorithm
      const { sections, intersections } = generateRoofSections(footprint);

      // Generate 3D geometry for rendering
      const geometry3D = generateRoof3DGeometry(sections, intersections);

      // Calculate overall bounds for fallback
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      footprint.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });

      const bounds = {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        depth: maxY - minY
      };

      return {
        sections,
        intersections,
        geometry3D,
        bounds
      };
    } catch (error) {
      console.warn('Roof generation failed, using simple fallback:', error);

      // Fallback to simple single-section roof
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      footprint.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });

      const bounds = {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        depth: maxY - minY
      };

      return {
        sections: [],
        intersections: [],
        geometry3D: [],
        bounds
      };
    }
    */
  }, [footprint]);


  // Building color based on type - Northern lights palette
  const buildingColor = useMemo(() => {
    switch (buildingType.toLowerCase()) {
      case 'kontor':
        return '#0891b2'; // Cyan for office
      case 'bolig':
        return '#10b981'; // Emerald for residential
      case 'barnehage':
        return '#06b6d4'; // Cyan variant
      case 'sykehus':
        return '#8b5cf6'; // Purple for hospital
      default:
        return '#0ea5e9'; // Sky blue for other
    }
  }, [buildingType]);


  // Handle component clicks
  const handleClick = (event: ThreeEvent<MouseEvent>, componentId: string) => {
    event.stopPropagation();
    setSelectedComponent(componentId);

    // Notify parent component
    if (onComponentSelect) {
      let componentType = '';
      let additionalInfo = {};

      // Check if it's a grid tile
      if (componentId.startsWith('grid-')) {
        // Find the tile info from gridVisualization
        if (gridVisualization && gridVisualization.tileInfoMap) {
          const tileInfo = gridVisualization.tileInfoMap.get(componentId);
          if (tileInfo) {
            componentType = 'Rutenett-tile';
            additionalInfo = tileInfo;
          } else {
            componentType = 'Rutenett-tile';
          }
        } else {
          componentType = 'Rutenett-tile';
        }
      } else {
        componentType = componentId.includes('roof') ? 'Tak' :
                       componentId.includes('window') ? 'Vindu' :
                       componentId.includes('door') ? 'Dør' :
                       componentId.includes('wall') ? `Vegg ${componentId.split('-')[1]}` :
                       componentId.includes('floor-divider') ? `Etasje ${parseInt(componentId.split('-')[2]) + 1}` :
                       componentId.includes('floor') ? 'Gulv' : 'Komponent';
      }

      onComponentSelect(componentId, componentType, additionalInfo);
    }
    console.log(`Selected: ${componentId}`);
  };

  // Handle right-click for context menu with surface normal
  const handleRightClick = (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => {
    event.stopPropagation();
    if (onContextMenu) {
      // Get the intersection point where the user clicked
      const intersectionPoint = event.point;

      // Add normal and position to event data
      const eventWithData = {
        ...event,
        normal: normal || [0, 1, 0], // Default to up if no normal provided
        intersectionPoint: [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z] // 3D position of click
      };
      onContextMenu(eventWithData as any, componentId);
    }
  };

  // Handle hover
  const handlePointerOver = (event: ThreeEvent<PointerEvent>, componentId: string) => {
    event.stopPropagation();
    setHoveredComponent(componentId);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHoveredComponent(null);
    document.body.style.cursor = 'auto';
  };

  // Calculate offset corners by moving each edge perpendicular to itself
  const offsetCorners = useMemo(() => {
    if (footprint.length < 3) return footprint;

    const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

    // First, calculate the signed area to determine winding order
    let signedArea = 0;
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      signedArea += (footprint[j][0] - footprint[i][0]) * (footprint[j][1] + footprint[i][1]);
    }

    // Positive area = clockwise, negative = counter-clockwise
    // For area reduction, we need to offset inward
    const offsetDirection = signedArea > 0 ? 1 : -1;

    // Create offset edges by moving each edge perpendicular to itself
    const offsetEdges = [];
    for (let i = 0; i < footprint.length; i++) {
      const p1 = footprint[i];
      const p2 = footprint[(i + 1) % footprint.length];

      // Edge vector
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const edgeLen = Math.sqrt(dx * dx + dy * dy);

      if (edgeLen === 0) continue;

      // Perpendicular (rotated 90 degrees)
      // For reducing area: CW polygon needs right perpendicular, CCW needs left
      const perpX = (dy / edgeLen) * offsetDirection;
      const perpY = (-dx / edgeLen) * offsetDirection;

      // Offset edge endpoints
      offsetEdges.push({
        start: [p1[0] + perpX * wallThickness, p1[1] + perpY * wallThickness],
        end: [p2[0] + perpX * wallThickness, p2[1] + perpY * wallThickness],
        perpX,
        perpY
      });
    }

    // Find intersection points of consecutive offset edges to get new corners
    const corners = [];
    for (let i = 0; i < footprint.length; i++) {
      const edgeIndex1 = i;
      const edgeIndex2 = (i + 1) % footprint.length;

      const edge1 = offsetEdges[edgeIndex1];
      const edge2 = offsetEdges[edgeIndex2];

      if (!edge1 || !edge2 || offsetEdges.length !== footprint.length) {
        // If we don't have proper offset edges, fall back to simple offset
        const curr = footprint[i];
        const prev = footprint[(i - 1 + footprint.length) % footprint.length];
        const next = footprint[(i + 1) % footprint.length];

        // Simple offset toward center
        const centerX = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
        const centerY = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;
        const dirX = centerX - curr[0];
        const dirY = centerY - curr[1];
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

        if (dirLen > 0) {
          corners.push([
            curr[0] + (dirX / dirLen) * wallThickness,
            curr[1] + (dirY / dirLen) * wallThickness
          ]);
        } else {
          corners.push(curr);
        }
        continue;
      }

      // Line intersection of two edges
      const x1 = edge1.start[0], y1 = edge1.start[1];
      const x2 = edge1.end[0], y2 = edge1.end[1];
      const x3 = edge2.start[0], y3 = edge2.start[1];
      const x4 = edge2.end[0], y4 = edge2.end[1];

      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

      if (Math.abs(denom) < 0.001) {
        // Parallel lines, use the shared point
        corners.push(edge1.end);
      } else {
        // Find intersection
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        corners.push([
          x1 + t * (x2 - x1),
          y1 + t * (y2 - y1)
        ]);
      }
    }

    console.log('Footprint length:', footprint.length, 'Offset corners length:', corners.length);

    // Ensure we always return the same number of corners as footprint points
    while (corners.length < footprint.length) {
      corners.push(footprint[corners.length]);
    }

    return corners;
  }, [footprint, insulation?.walls?.thickness]);

  // Helper function to lighten a hex color
  // Stable lightenColor function outside useMemo to prevent dependency issues
  const lightenColor = useCallback((hex: string, percent: number = 30): string => {
    // Remove # if present
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }, []);

  // Memoize grid visualization to prevent recalculation
  const gridVisualization = useMemo(() => {
    console.log(`Grid visualization: showGrid=${showGrid}, showGridLines=${showGridLines}, showGridSquares=${showGridSquares}, footprint.length=${footprint.length}`);
    // Allow rendering if either grid lines OR grid squares are enabled
    if ((!showGrid && !showGridSquares) || footprint.length === 0) return null;

    const gridLines: React.ReactElement[] = [];
    const gridExtension = 3; // 3 meter extension beyond wall ends
    const gridSquares: {
      id: string;
      bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
      center: [number, number, number];
      coverage: number; // 0-1 percentage inside building
      isInside: boolean;
      corners?: [number, number][]; // Actual corner points in GIS coordinates
    }[] = [];

    // Helper function to test if a point is inside the building footprint
    // Using Turf.js for robust, industry-standard point-in-polygon testing
    const isPointInsideFootprint = (gisX: number, gisY: number): boolean => {
      // Create Turf.js point from GIS coordinates
      const testPoint = point([gisX, gisY]);

      // Create Turf.js polygon from footprint
      // Turf requires closed polygon (first point === last point)
      const isClosedPolygon =
        footprint[0][0] === footprint[footprint.length - 1][0] &&
        footprint[0][1] === footprint[footprint.length - 1][1];

      const polygonCoords = isClosedPolygon
        ? [footprint]
        : [[...footprint, footprint[0]]];

      const poly = polygon(polygonCoords);

      // Use Turf's robust point-in-polygon test
      return booleanPointInPolygon(testPoint, poly);
    };

    // Get building bounds for workspace
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    footprint.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // Define workspace bounds
    const workspaceMinX = minX - gridExtension * 2;
    const workspaceMaxX = maxX + gridExtension * 2;
    const workspaceMinY = minY - gridExtension * 2;
    const workspaceMaxY = maxY + gridExtension * 2;

    // Create bounding box
    const boundingBox = {
      minX: minX - gridExtension,
      maxX: maxX + gridExtension,
      minY: minY - gridExtension,
      maxY: maxY + gridExtension
    };

    // PERFORMANCE SAFETY: Reasonable limits for grid generation
    // The real performance issue was useMemo dependencies causing regeneration on hover
    const MAX_GRID_LINES = 200;  // Enough for complex buildings (20-30 corners × ~8 lines)
    const MAX_GRID_TILES = 1000; // Safety limit to prevent infinite loops

    // Collect grid lines - for each edge direction, create lines through ALL corners
    const gridLineSegments: {
      start: [number, number];
      end: [number, number];
      angle: number;
      edgeIndex: number;
    }[] = [];

    // Calculate extension to reach bounding box edges
    // Use diagonal of bounding box to ensure lines reach all corners
    const boundingBoxDiagonal = Math.sqrt(
      Math.pow(boundingBox.maxX - boundingBox.minX, 2) +
      Math.pow(boundingBox.maxY - boundingBox.minY, 2)
    );
    // Extend by diagonal length to guarantee coverage to all bounding box corners
    const extension = boundingBoxDiagonal;

    // PERFORMANCE FIX: Group edges by angle and create lines only at edge endpoints
    // Instead of creating lines through ALL corners for ALL edges (N × N = 144 for 12 corners),
    // create lines only at unique positions along each edge direction
    const angleGroups = new Map<number, Set<number>>();
    const angleThreshold = 0.1; // ~5.7 degrees tolerance for grouping parallel edges

    let lineCount = 0;
    footprint.forEach((corner, edgeIndex) => {
      if (gridLineSegments.length >= MAX_GRID_LINES) {
        console.warn(`Grid line limit reached (${MAX_GRID_LINES}). Skipping remaining lines.`);
        return;
      }
      const nextCorner = footprint[(edgeIndex + 1) % footprint.length];

      // Calculate wall direction
      const wallDx = nextCorner[0] - corner[0];
      const wallDy = nextCorner[1] - corner[1];
      const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

      if (wallLength === 0) return;

      // Normalize direction
      const dirX = wallDx / wallLength;
      const dirY = wallDy / wallLength;
      const wallAngle = Math.atan2(wallDy, wallDx);

      // Find or create angle group for this edge direction
      let angleKey = wallAngle;
      let foundGroup = false;
      for (const [existingAngle, positions] of angleGroups.entries()) {
        if (Math.abs(existingAngle - wallAngle) < angleThreshold) {
          angleKey = existingAngle;
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        angleGroups.set(wallAngle, new Set());
      }

      // Create lines at both edge endpoints (not through all corners)
      [corner, nextCorner].forEach((throughPoint, pointIndex) => {
        if (gridLineSegments.length >= MAX_GRID_LINES) return;

        // Calculate perpendicular distance from origin to avoid duplicate lines
        const perpDist = Math.abs(-dirY * throughPoint[0] + dirX * throughPoint[1]);
        const positionKey = Math.round(perpDist * 100) / 100; // Round to cm precision

        // Only add if we haven't seen this position for this angle
        const positions = angleGroups.get(angleKey)!;
        if (positions.has(positionKey)) return; // Skip duplicate
        positions.add(positionKey);

        // Extend line through this point in the edge direction
        const start: [number, number] = [
          throughPoint[0] - dirX * extension,
          throughPoint[1] - dirY * extension
        ];
        const end: [number, number] = [
          throughPoint[0] + dirX * extension,
          throughPoint[1] + dirY * extension
        ];

        gridLineSegments.push({
          start,
          end,
          angle: wallAngle,
          edgeIndex: edgeIndex * 100 + pointIndex
        });
        lineCount++;

        // Draw the extended line
        if (showGridLines) {
          const centerX = (start[0] + end[0]) / 2;
          const centerZ = -(start[1] + end[1]) / 2;
          const lineLength = extension * 2;

          gridLines.push(
            <mesh
              key={`grid-line-${edgeIndex}-${pointIndex}-${positionKey}`}
              position={[centerX, 0.01, centerZ]}
              rotation={[0, wallAngle, 0]}
            >
              <boxGeometry args={[lineLength, 0.03, 0.03]} />
              <meshBasicMaterial color="#00ffff" opacity={0.6} transparent />
            </mesh>
          );
        }
      });
    });

    console.log(`Grid creation: ${gridLineSegments.length} wall-parallel lines (created ${lineCount} total, footprint has ${footprint.length} edges)`);

    // Find all intersection points between pairs of non-parallel lines
    const intersectionPoints: { x: number; y: number; lines: [number, number] }[] = [];

    for (let i = 0; i < gridLineSegments.length; i++) {
      for (let j = i + 1; j < gridLineSegments.length; j++) {
        const line1 = gridLineSegments[i];
        const line2 = gridLineSegments[j];

        // Skip parallel lines (no intersection)
        const angleDiff = Math.abs(line1.angle - line2.angle);
        if (angleDiff < 0.01 || Math.abs(angleDiff - Math.PI) < 0.01) {
          continue;
        }

        // Find intersection point using line equation
        const x1 = line1.start[0], y1 = line1.start[1];
        const x2 = line1.end[0], y2 = line1.end[1];
        const x3 = line2.start[0], y3 = line2.start[1];
        const x4 = line2.end[0], y4 = line2.end[1];

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) continue; // Parallel or coincident

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

        const intersectX = x1 + t * (x2 - x1);
        const intersectY = y1 + t * (y2 - y1);

        intersectionPoints.push({
          x: intersectX,
          y: intersectY,
          lines: [i, j]
        });
      }
    }

    console.log(`Found ${intersectionPoints.length} intersection points`);

    // Group lines by similar angle to find parallel sets
    const parallelSets: number[][] = [];
    // Use same angleThreshold as defined above for grouping

    gridLineSegments.forEach((line, index) => {
      let foundSet = false;
      for (const set of parallelSets) {
        const setAngle = gridLineSegments[set[0]].angle;
        const angleDiff = Math.abs(line.angle - setAngle);
        if (angleDiff < angleThreshold || Math.abs(angleDiff - Math.PI) < angleThreshold) {
          set.push(index);
          foundSet = true;
          break;
        }
      }
      if (!foundSet) {
        parallelSets.push([index]);
      }
    });

    console.log(`Found ${parallelSets.length} sets of parallel lines`);

    // CRITICAL FIX: Only use the TWO LARGEST sets to prevent overlapping grids
    // Sort sets by number of lines (largest first)
    const sortedSets = parallelSets
      .map((set, index) => ({ set, index, count: set.length }))
      .sort((a, b) => b.count - a.count);

    // Use only the top 2 sets for grid generation
    const primarySets = sortedSets.slice(0, 2);
    console.log(`Using top 2 sets for grid: Set ${primarySets[0]?.index} (${primarySets[0]?.count} lines), Set ${primarySets[1]?.index} (${primarySets[1]?.count} lines)`);

    // Create grid tiles from intersections between the two largest parallel sets
    let tileGenerationComplete = false;
    if (primarySets.length >= 2) {
      const setA = 0; // Always use first pair
      const setB = 1;
      const linesA = primarySets[setA].set;
      const linesB = primarySets[setB].set;

        // Find all intersections between these two sets
        const setIntersections: { x: number; y: number; lineA: number; lineB: number }[] = [];

        linesA.forEach(aIndex => {
          linesB.forEach(bIndex => {
            const intersection = intersectionPoints.find(
              p => (p.lines[0] === aIndex && p.lines[1] === bIndex) ||
                   (p.lines[0] === bIndex && p.lines[1] === aIndex)
            );
            if (intersection) {
              setIntersections.push({
                x: intersection.x,
                y: intersection.y,
                lineA: aIndex,
                lineB: bIndex
              });
            }
          });
        });

        // Create tiles from adjacent pairs of lines in each set
        for (let i = 0; i < linesA.length - 1 && !tileGenerationComplete; i++) {
          for (let j = 0; j < linesB.length - 1 && !tileGenerationComplete; j++) {
            const a1 = linesA[i];
            const a2 = linesA[i + 1];
            const b1 = linesB[j];
            const b2 = linesB[j + 1];

            // Find the 4 corners of this quadrilateral
            const corner1 = setIntersections.find(p => p.lineA === a1 && p.lineB === b1);
            const corner2 = setIntersections.find(p => p.lineA === a2 && p.lineB === b1);
            const corner3 = setIntersections.find(p => p.lineA === a2 && p.lineB === b2);
            const corner4 = setIntersections.find(p => p.lineA === a1 && p.lineB === b2);

            if (corner1 && corner2 && corner3 && corner4) {
              // PERFORMANCE SAFETY: Stop if we've hit the tile limit
              if (gridSquares.length >= MAX_GRID_TILES) {
                console.warn(`Grid tile limit reached (${MAX_GRID_TILES}). Stopping grid generation.`);
                tileGenerationComplete = true;
                break;
              }

              // Calculate center and bounds
              const centerX = (corner1.x + corner2.x + corner3.x + corner4.x) / 4;
              const centerY = (corner1.y + corner2.y + corner3.y + corner4.y) / 4;

              const allX = [corner1.x, corner2.x, corner3.x, corner4.x];
              const allY = [corner1.y, corner2.y, corner3.y, corner4.y];
              const tileMinX = Math.min(...allX);
              const tileMaxX = Math.max(...allX);
              const tileMinY = Math.min(...allY);
              const tileMaxY = Math.max(...allY);

              // Use 10x10 sampling for accurate coverage calculation
              const samples = 10; // 10x10 grid = 100 sample points per tile
              let insideCount = 0;
              const totalSamples = samples * samples;

              // Sample points in GIS coordinate space (tile bounds are in GIS x,y)
              for (let si = 0; si < samples; si++) {
                for (let sj = 0; sj < samples; sj++) {
                  const gisX = tileMinX + (tileMaxX - tileMinX) * (si + 0.5) / samples;
                  const gisY = tileMinY + (tileMaxY - tileMinY) * (sj + 0.5) / samples;

                  // Test point against footprint - both in GIS (x,y) space
                  if (isPointInsideFootprint(gisX, gisY)) {
                    insideCount++;
                  }
                }
              }

              const coverage = insideCount / totalSamples;

              // CRITICAL FIX: Only add tiles that have ANY coverage (ignore completely outside tiles)
              // This prevents the grid from being 2x the building size
              if (coverage > 0) {
                gridSquares.push({
                  id: `grid-${setA}-${setB}-${i}-${j}`,
                  bounds: { minX: tileMinX, maxX: tileMaxX, minZ: -tileMaxY, maxZ: -tileMinY },
                  center: [centerX, 0.1, -centerY],
                  coverage,
                  isInside: coverage > 0.5,
                  // Store actual corner points for rendering
                  corners: [
                    [corner1.x, corner1.y],
                    [corner2.x, corner2.y],
                    [corner3.x, corner3.y],
                    [corner4.x, corner4.y]
                  ]
                });
              }
            }
          }
        }
    }

    console.log(`Created ${gridSquares.length} grid squares`);

    // DEBUG: Check for duplicate positions
    const positionMap = new Map<string, number>();
    gridSquares.forEach(sq => {
      const posKey = `${sq.center[0].toFixed(2)},${sq.center[2].toFixed(2)}`;
      positionMap.set(posKey, (positionMap.get(posKey) || 0) + 1);
    });
    const duplicates = Array.from(positionMap.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn(`⚠️ Found ${duplicates.length} positions with multiple tiles:`, duplicates);
    }

    // DEBUG: Calculate polygon area vs total tile area
    const calculatePolygonArea = (coords: [number, number][]) => {
      let area = 0;
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        area += coords[i][0] * coords[j][1];
        area -= coords[j][0] * coords[i][1];
      }
      return Math.abs(area / 2);
    };

    const calculateTileArea = (corners: [number, number][]) => {
      // Use shoelace formula for quadrilateral
      let area = 0;
      for (let i = 0; i < corners.length; i++) {
        const j = (i + 1) % corners.length;
        area += corners[i][0] * corners[j][1];
        area -= corners[j][0] * corners[i][1];
      }
      return Math.abs(area / 2);
    };

    const polygonArea = calculatePolygonArea(footprint);
    const totalTileArea = gridSquares.reduce((sum, sq) => {
      if (sq.corners && sq.corners.length === 4) {
        return sum + calculateTileArea(sq.corners);
      }
      // Fallback: use bounding box area
      const width = sq.bounds.maxX - sq.bounds.minX;
      const height = Math.abs(sq.bounds.maxZ - sq.bounds.minZ);
      return sum + (width * height);
    }, 0);

    const greenTileArea = gridSquares
      .filter(sq => sq.coverage >= 0.99)
      .reduce((sum, sq) => {
        if (sq.corners && sq.corners.length === 4) {
          return sum + calculateTileArea(sq.corners);
        }
        const width = sq.bounds.maxX - sq.bounds.minX;
        const height = Math.abs(sq.bounds.maxZ - sq.bounds.minZ);
        return sum + (width * height);
      }, 0);

    console.log(`📊 Area Analysis:
  Building footprint area: ${polygonArea.toFixed(2)} m²
  Total tile area: ${totalTileArea.toFixed(2)} m²
  Green tile area (coverage >= 99%): ${greenTileArea.toFixed(2)} m²
  Ratio (total/polygon): ${(totalTileArea / polygonArea).toFixed(2)}x
  Ratio (green/polygon): ${(greenTileArea / polygonArea).toFixed(2)}x
  ${totalTileArea > polygonArea * 1.5 ? '⚠️ WARNING: Total tile area is >150% of polygon area - likely overlaps!' : '✅ Tile area reasonable'}
`);

    // Initialize tileConnectionInfo at the top level so it's always available
    const tileConnectionInfo = new Map<string, { greenSides: number; isEdgeTile: boolean }>();

    // Always analyze green tiles for connection info (useful for both color schemes)
    // Lower threshold to 70% to handle tiles that extend slightly beyond footprint
    const greenSquares = gridSquares.filter(s => s.coverage >= 0.99);

    // Calculate the overall grid bounds to detect edge tiles
    let gridMinX = Infinity, gridMaxX = -Infinity;
    let gridMinZ = Infinity, gridMaxZ = -Infinity;
    gridSquares.forEach(square => {
      gridMinX = Math.min(gridMinX, square.bounds.minX);
      gridMaxX = Math.max(gridMaxX, square.bounds.maxX);
      gridMinZ = Math.min(gridMinZ, square.bounds.minZ);
      gridMaxZ = Math.max(gridMaxZ, square.bounds.maxZ);
    });

    // Populate tile connection info for all green squares
    greenSquares.forEach((square, idx) => {
      const s1 = square.bounds;
      const tolerance = 0.1;

      // Check if this tile is at the edge of the grid
      const atLeftEdge = Math.abs(s1.minX - gridMinX) < tolerance;
      const atRightEdge = Math.abs(s1.maxX - gridMaxX) < tolerance;
      const atTopEdge = Math.abs(s1.minZ - gridMinZ) < tolerance;
      const atBottomEdge = Math.abs(s1.maxZ - gridMaxZ) < tolerance;

      let redSides = 0;
      if (atLeftEdge) redSides++;
      if (atRightEdge) redSides++;
      if (atTopEdge) redSides++;
      if (atBottomEdge) redSides++;

      // Check each of the 4 sides for green neighbors
      let greenNeighbors = {
        left: false,
        right: false,
        top: false,
        bottom: false
      };

      greenSquares.forEach(other => {
        if (square.id === other.id) return;

        const s2 = other.bounds;

        if (!atLeftEdge && Math.abs(s1.minX - s2.maxX) < tolerance) {
          const zOverlap = Math.min(s1.maxZ, s2.maxZ) - Math.max(s1.minZ, s2.minZ);
          if (zOverlap > tolerance) {
            greenNeighbors.left = true;
          }
        }

        if (!atRightEdge && Math.abs(s1.maxX - s2.minX) < tolerance) {
          const zOverlap = Math.min(s1.maxZ, s2.maxZ) - Math.max(s1.minZ, s2.minZ);
          if (zOverlap > tolerance) {
            greenNeighbors.right = true;
          }
        }

        if (!atTopEdge && Math.abs(s1.minZ - s2.maxZ) < tolerance) {
          const xOverlap = Math.min(s1.maxX, s2.maxX) - Math.max(s1.minX, s2.minX);
          if (xOverlap > tolerance) {
            greenNeighbors.top = true;
          }
        }

        if (!atBottomEdge && Math.abs(s1.maxZ - s2.minZ) < tolerance) {
          const xOverlap = Math.min(s1.maxX, s2.maxX) - Math.max(s1.minX, s2.minX);
          if (xOverlap > tolerance) {
            greenNeighbors.bottom = true;
          }
        }
      });

      let greenSides = 0;
      if (greenNeighbors.left) greenSides++;
      if (greenNeighbors.right) greenSides++;
      if (greenNeighbors.top) greenSides++;
      if (greenNeighbors.bottom) greenSides++;

      tileConnectionInfo.set(square.id, {
        greenSides,
        isEdgeTile: redSides > 0
      });
    });

    // Analyze roof segmentation - ALWAYS run this for roof generation
    let roofSegments: {
      isMain: boolean;
      squareId: string;
      isNoise: boolean;
    }[] & {
      rafterLine?: any;
      roofGeometry?: any;
      mainSegmentBounds?: any;
    } = [];

    console.log(`Roof segmentation: Found ${greenSquares.length} green tiles (≥99% coverage) out of ${gridSquares.length} total tiles`);

      // Create adjacency map - ONLY for green squares
      const adjacencyMap = new Map<string, Set<string>>();

      // Reuse grid bounds already calculated above (no need to recalculate)

      // Now build adjacency map - only connect tiles with 2+ green sides
      greenSquares.forEach(square => {
        const neighbors = new Set<string>();
        const info = tileConnectionInfo.get(square.id);

        // Only tiles with 2+ green sides can be part of the main segment
        if (info && info.greenSides >= 2) {
          // Connect to adjacent green tiles that also have 2+ green sides
          greenSquares.forEach(other => {
            if (square.id === other.id) return;

            const otherInfo = tileConnectionInfo.get(other.id);
            if (!otherInfo || otherInfo.greenSides < 2) return;

            const s1 = square.bounds;
            const s2 = other.bounds;
            const tolerance = 0.1;

            // Check if they're adjacent
            const touchingLeft = Math.abs(s1.minX - s2.maxX) < tolerance;
            const touchingRight = Math.abs(s1.maxX - s2.minX) < tolerance;
            const touchingTop = Math.abs(s1.minZ - s2.maxZ) < tolerance;
            const touchingBottom = Math.abs(s1.maxZ - s2.minZ) < tolerance;

            if (touchingLeft || touchingRight) {
              const zOverlap = Math.min(s1.maxZ, s2.maxZ) - Math.max(s1.minZ, s2.minZ);
              if (zOverlap > tolerance) {
                neighbors.add(other.id);
              }
            }

            if (touchingTop || touchingBottom) {
              const xOverlap = Math.min(s1.maxX, s2.maxX) - Math.max(s1.minX, s2.minX);
              if (xOverlap > tolerance) {
                neighbors.add(other.id);
              }
            }
          });
        }

        adjacencyMap.set(square.id, neighbors);
      });

      // Debug: Log neighbor counts
      let isolatedCount = 0;
      let connectedCount = 0;
      adjacencyMap.forEach((neighbors, squareId) => {
        if (neighbors.size === 0) {
          isolatedCount++;
        } else {
          connectedCount++;
        }
      });
      console.log(`Adjacency: ${connectedCount} connected tiles, ${isolatedCount} isolated tiles`);

      // Find connected components (main roof vs secondary segments)
      const visited = new Set<string>();
      const components: string[][] = [];

      greenSquares.forEach(square => {
        if (visited.has(square.id)) return;

        const component: string[] = [];
        const queue = [square.id];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;

          visited.add(current);
          component.push(current);

          const neighbors = adjacencyMap.get(current) || new Set();
          neighbors.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          });
        }

        components.push(component);
      });

      // Filter out noise - components that are too small or narrow
      const validComponents = components.filter(component => {
        // Ignore single tiles or very small clusters (less than 3 tiles)
        if (component.length < 3) {
          console.log(`Filtering out small component with ${component.length} tiles`);
          return false;
        }

        // Calculate the bounding box of this component
        const componentSquares = component.map(id => gridSquares.find(s => s.id === id)!);
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        componentSquares.forEach(square => {
          minX = Math.min(minX, square.bounds.minX);
          maxX = Math.max(maxX, square.bounds.maxX);
          minZ = Math.min(minZ, square.bounds.minZ);
          maxZ = Math.max(maxZ, square.bounds.maxZ);
        });

        const width = maxX - minX;
        const depth = maxZ - minZ;
        const aspectRatio = Math.max(width, depth) / Math.min(width, depth);

        // Filter out extremely narrow strips (aspect ratio > 5:1)
        if (aspectRatio > 5 && component.length < 6) {
          console.log(`Filtering out narrow strip: ${width.toFixed(1)}x${depth.toFixed(1)}, aspect ratio ${aspectRatio.toFixed(1)}`);
          return false;
        }

        // Calculate area and density
        const boundingArea = width * depth;
        const tileSize = componentSquares[0] ?
          (componentSquares[0].bounds.maxX - componentSquares[0].bounds.minX) *
          (componentSquares[0].bounds.maxZ - componentSquares[0].bounds.minZ) : 1;
        const actualArea = component.length * tileSize;
        const density = actualArea / boundingArea;

        // Filter out very sparse components (less than 30% density)
        if (density < 0.3 && component.length < 8) {
          console.log(`Filtering out sparse component: density ${(density * 100).toFixed(1)}%`);
          return false;
        }

        return true;
      });

      // Log component information
      console.log(`Found ${components.length} initial components, ${validComponents.length} after filtering`);
      validComponents.forEach((component, idx) => {
        console.log(`  Component ${idx + 1}: ${component.length} tiles`);
      });

      // Find the largest valid component (main roof)
      let mainComponent: string[] = [];
      validComponents.forEach(component => {
        if (component.length > mainComponent.length) {
          mainComponent = component;
        }
      });

      // Only consider other components as secondary if they're substantial enough
      const minSecondarySize = Math.max(3, Math.floor(mainComponent.length * 0.15)); // At least 15% of main or 3 tiles
      const secondaryComponents = validComponents.filter(component =>
        component !== mainComponent && component.length >= minSecondarySize
      );

      // Calculate bounding box and rafter for main segment
      let rafterLine = null;
      let roofGeometry = null;

      if (mainComponent.length > 0) {
        // Get all squares in the main component
        const mainSquares = mainComponent.map(id => gridSquares.find(s => s.id === id)!);

        // Calculate bounding box of main segment
        let mainMinX = Infinity, mainMaxX = -Infinity;
        let mainMinZ = Infinity, mainMaxZ = -Infinity;

        mainSquares.forEach(square => {
          mainMinX = Math.min(mainMinX, square.bounds.minX);
          mainMaxX = Math.max(mainMaxX, square.bounds.maxX);
          mainMinZ = Math.min(mainMinZ, square.bounds.minZ);
          mainMaxZ = Math.max(mainMaxZ, square.bounds.maxZ);
        });

        const width = mainMaxX - mainMinX;
        const depth = Math.abs(mainMaxZ - mainMinZ);

        // Calculate roof base height based on placement floor
        let roofBaseHeight = height; // Default to top of building
        if (roofPlacementFloor !== null && roofPlacementFloor < numberOfFloors) {
          // Place roof at top of specified floor
          const floorHeight = height / numberOfFloors;
          roofBaseHeight = floorHeight * (roofPlacementFloor + 1);
        }
        const roofRidgeHeight = roofBaseHeight + 2; // Ridge is 2m above eaves

        // Determine which axis is longer
        const isWidthLonger = width > depth;

        if (isWidthLonger) {
          // Rafter runs along X axis
          const centerZ = (mainMinZ + mainMaxZ) / 2;
          rafterLine = {
            start: [mainMinX, 0, centerZ],
            end: [mainMaxX, 0, centerZ],
            direction: 'x'
          };

          // Create saddle roof geometry (two planes meeting at ridge)
          roofGeometry = {
            ridge: { start: [mainMinX, roofRidgeHeight, centerZ], end: [mainMaxX, roofRidgeHeight, centerZ] },
            eaveNorth: { start: [mainMinX, roofBaseHeight, mainMinZ], end: [mainMaxX, roofBaseHeight, mainMinZ] },
            eaveSouth: { start: [mainMinX, roofBaseHeight, mainMaxZ], end: [mainMaxX, roofBaseHeight, mainMaxZ] }
          };
        } else {
          // Rafter runs along Z axis
          const centerX = (mainMinX + mainMaxX) / 2;
          rafterLine = {
            start: [centerX, 0, mainMinZ],
            end: [centerX, 0, mainMaxZ],
            direction: 'z'
          };

          // Create saddle roof geometry (two planes meeting at ridge)
          roofGeometry = {
            ridge: { start: [centerX, roofRidgeHeight, mainMinZ], end: [centerX, roofRidgeHeight, mainMaxZ] },
            eaveEast: { start: [mainMinX, roofBaseHeight, mainMinZ], end: [mainMinX, roofBaseHeight, mainMaxZ] },
            eaveWest: { start: [mainMaxX, roofBaseHeight, mainMinZ], end: [mainMaxX, roofBaseHeight, mainMaxZ] }
          };
        }

        console.log(`Main segment: ${width.toFixed(1)}m x ${depth.toFixed(1)}m, rafter runs ${rafterLine.direction === 'x' ? 'East-West' : 'North-South'}`);

        // Store main segment bounds for roof rendering
        roofSegments.mainSegmentBounds = {
          minX: mainMinX,
          maxX: mainMaxX,
          minZ: mainMinZ,
          maxZ: mainMaxZ,
          width,
          depth,
          ridgeDirection: rafterLine ? rafterLine.direction : (width > depth ? 'x' : 'z')
        };
      }

      // Mark squares as main, secondary, or noise
      const mainSet = new Set(mainComponent);
      const secondarySet = new Set(secondaryComponents.flat());

      roofSegments = greenSquares.map(square => {
        if (mainSet.has(square.id)) {
          return { squareId: square.id, isMain: true, isNoise: false };
        } else {
          // All other green tiles are secondary segments (including isolated tiles)
          // They're all part of the roof, just not the main continuous section
          return { squareId: square.id, isMain: false, isNoise: false };
        }
      });

      // Store roof geometry for rendering
      if (rafterLine && roofGeometry) {
        roofSegments.rafterLine = rafterLine;
        roofSegments.roofGeometry = roofGeometry;
      }

    // Create a map for quick roof segment lookup
    const roofSegmentMap = new Map<string, { isMain: boolean; isNoise: boolean }>();
    roofSegments.forEach(segment => {
      roofSegmentMap.set(segment.squareId, { isMain: segment.isMain, isNoise: segment.isNoise });
    });

    // Store tile information for selection
    const tileInfoMap = new Map<string, any>();

    // Now render grid squares with appropriate colors
    console.log(`Rendering grid squares: showGridSquares=${showGridSquares}, gridSquares.length=${gridSquares.length}`);
    if (showGridSquares) {
      console.log(`Processing ${gridSquares.length} grid squares for rendering`);
      let quadCount = 0;
      let fallbackCount = 0;
      gridSquares.forEach(square => {
        let squareColor: string;
        let opacity: number;
        let tileType: string = '';
        let segmentType: string = '';

        if (gridColorScheme === 'coverage') {
          // Traffic light scheme based on coverage
          if (square.coverage >= 0.99) {
            squareColor = '#00ff00'; // Green - fully inside
            opacity = 0.9;  // High opacity for visibility
            tileType = 'Fullt innenfor';
            segmentType = 'Dekning';  // Set segment type for coverage mode
          } else if (square.coverage > 0.01) {
            squareColor = '#ffff00'; // Yellow - partially inside
            opacity = 0.9;
            tileType = 'Delvis innenfor';
            segmentType = 'Dekning';  // Set segment type for coverage mode
          } else {
            squareColor = '#ff0000'; // Red - outside
            opacity = 0.8;
            tileType = 'Utenfor';
            segmentType = 'Dekning';  // Set segment type for coverage mode
          }
        } else {
          // Roof segmentation scheme
          if (square.coverage >= 0.99) {
            // Check if it's main or secondary segment
            const segmentInfo = roofSegmentMap.get(square.id);
            if (segmentInfo) {
              if (segmentInfo.isMain) {
                squareColor = '#00ff00'; // Green - main roof segment
                opacity = 0.95;  // Very high opacity for main segment
                segmentType = 'Hovedtak';
              } else {
                squareColor = '#ff00ff'; // Magenta - secondary roof segment
                opacity = 0.95;  // Very high opacity for secondary segment
                segmentType = 'Sekundært tak';
              }
            } else {
              // Shouldn't happen but fallback
              squareColor = '#808080'; // Gray
              opacity = 0.3;
              segmentType = 'Ukjent';
            }
            tileType = 'Fullt innenfor';
          } else {
            squareColor = '#333333'; // Dark gray - not part of roof
            opacity = 0.2;
            tileType = square.coverage > 0.01 ? 'Delvis innenfor' : 'Utenfor';
            segmentType = 'Ikke tak';
          }
        }

        // Get connection info for this tile
        const connectionInfo = tileConnectionInfo.get(square.id);
        const greenSides = connectionInfo?.greenSides || 0;

        // Check if this tile is selected or hovered
        const isSelected = selectedComponent === square.id;
        const isHovered = hoveredComponent === square.id;

        // Adjust appearance for selected/hovered state
        if (isSelected) {
          opacity = Math.min(opacity + 0.2, 1);
        }
        if (isHovered) {
          opacity = Math.min(opacity + 0.1, 1);
        }

        // Render tile as actual quadrilateral if corners available, otherwise use bounding box
        if (square.corners && square.corners.length === 4) {
          // Calculate center of quad in GIS coordinates
          const quadCenterX = (square.corners[0][0] + square.corners[1][0] + square.corners[2][0] + square.corners[3][0]) / 4;
          const quadCenterY = (square.corners[0][1] + square.corners[1][1] + square.corners[2][1] + square.corners[3][1]) / 4;

          gridLines.push(
            <mesh
              key={square.id}
              position={[quadCenterX, 0.2, -quadCenterY]}  // Position at quad center (GIS Y becomes -Z in Three.js)
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={10}  // Higher render order to draw on top
              onClick={(e) => handleClick(e, square.id)}
              onContextMenu={(e) => handleRightClick(e, square.id, [0, 1, 0])}
              onPointerOver={(e) => handlePointerOver(e, square.id)}
              onPointerOut={handlePointerOut}
            >
              <shapeGeometry args={[(() => {
                const shape = new Shape();
                // Create quadrilateral from corner points RELATIVE TO CENTER
                shape.moveTo(square.corners[0][0] - quadCenterX, square.corners[0][1] - quadCenterY);
                shape.lineTo(square.corners[1][0] - quadCenterX, square.corners[1][1] - quadCenterY);
                shape.lineTo(square.corners[2][0] - quadCenterX, square.corners[2][1] - quadCenterY);
                shape.lineTo(square.corners[3][0] - quadCenterX, square.corners[3][1] - quadCenterY);
                shape.closePath();
                return shape;
              })()]} />
              <meshBasicMaterial
                color={isSelected ? lightenColor(squareColor, 40) : (isHovered ? lightenColor(squareColor, 20) : squareColor)}
                opacity={isSelected ? 1 : (isHovered ? Math.min(opacity + 0.1, 1) : opacity)}
                transparent
                side={0}  // FrontSide only - prevents double-layer rendering
                depthWrite={false}  // Prevent z-fighting
              />
            </mesh>
          );
          quadCount++;
        } else {
          // Fallback to bounding box rectangle
          gridLines.push(
            <mesh
              key={square.id}
              position={[square.center[0], 0.2, square.center[2]]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={10}
              onClick={(e) => handleClick(e, square.id)}
              onContextMenu={(e) => handleRightClick(e, square.id, [0, 1, 0])}
              onPointerOver={(e) => handlePointerOver(e, square.id)}
              onPointerOut={handlePointerOut}
            >
              <planeGeometry args={[
                square.bounds.maxX - square.bounds.minX,
                Math.abs(square.bounds.maxZ - square.bounds.minZ)
              ]} />
              <meshBasicMaterial
                color={isSelected ? lightenColor(squareColor, 40) : (isHovered ? lightenColor(squareColor, 20) : squareColor)}
                opacity={isSelected ? 1 : (isHovered ? Math.min(opacity + 0.1, 1) : opacity)}
                transparent
                side={0}  // FrontSide only - prevents double-layer rendering
                depthWrite={false}
              />
            </mesh>
          );
          fallbackCount++;
        }

        // Store tile info for selection display
        const tileInfo = {
          id: square.id,
          coverage: (square.coverage * 100).toFixed(1),
          type: tileType,
          segment: segmentType,
          greenSides: greenSides,
          color: squareColor,
          position: `X: ${square.center[0].toFixed(1)}, Z: ${square.center[2].toFixed(1)}`,
          size: `${(square.bounds.maxX - square.bounds.minX).toFixed(1)} × ${Math.abs(square.bounds.maxZ - square.bounds.minZ).toFixed(1)} m`
        };
        tileInfoMap.set(square.id, tileInfo);
      });
      console.log(`Added ${gridSquares.length} colored tiles to gridLines (${quadCount} quads, ${fallbackCount} fallbacks)`);

      /* COMMENTED OUT - New roof geometry - keeping legacy roof instead
      // Add rafter line and roof geometry if in roof segmentation mode
      if (gridColorScheme === 'roof' && roofSegments.rafterLine && roofSegments.roofGeometry) {
        const rafter = roofSegments.rafterLine;
        const roof = roofSegments.roofGeometry;

        // Draw the rafter centerline
        gridLines.push(
          <mesh
            key="rafter-line"
            position={[
              (rafter.start[0] + rafter.end[0]) / 2,
              height / 2,
              (rafter.start[2] + rafter.end[2]) / 2
            ]}
            rotation={rafter.direction === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.1, 0.1, Math.sqrt(
              Math.pow(rafter.end[0] - rafter.start[0], 2) +
              Math.pow(rafter.end[2] - rafter.start[2], 2)
            ), 8]} />
            <meshBasicMaterial color="#ff6600" opacity={0.8} transparent />
          </mesh>
        );

        // Draw the saddle roof
        if (roof.ridge) {
          // Ridge line
          gridLines.push(
            <mesh
              key="roof-ridge"
              position={[
                (roof.ridge.start[0] + roof.ridge.end[0]) / 2,
                roof.ridge.start[1],
                (roof.ridge.start[2] + roof.ridge.end[2]) / 2
              ]}
              rotation={rafter.direction === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.05, 0.05, Math.sqrt(
                Math.pow(roof.ridge.end[0] - roof.ridge.start[0], 2) +
                Math.pow(roof.ridge.end[2] - roof.ridge.start[2], 2)
              ), 8]} />
              <meshBasicMaterial color="#ffffff" opacity={0.9} transparent />
            </mesh>
          );

          // Create roof planes as simple triangulated quads
          if (rafter.direction === 'x') {
            // Roof runs East-West, slopes North-South
            // North slope
            gridLines.push(
              <mesh key="roof-north">
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={6}
                    array={new Float32Array([
                      // Triangle 1
                      roof.ridge.start[0], roof.ridge.start[1], roof.ridge.start[2],
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveNorth.start[0], roof.eaveNorth.start[1], roof.eaveNorth.start[2],
                      // Triangle 2
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveNorth.end[0], roof.eaveNorth.end[1], roof.eaveNorth.end[2],
                      roof.eaveNorth.start[0], roof.eaveNorth.start[1], roof.eaveNorth.start[2],
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <meshBasicMaterial
                  color="#000000"
                  side={2}
                  opacity={0.8}
                  transparent
                />
              </mesh>
            );

            // South slope
            gridLines.push(
              <mesh key="roof-south">
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={6}
                    array={new Float32Array([
                      // Triangle 1
                      roof.ridge.start[0], roof.ridge.start[1], roof.ridge.start[2],
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveSouth.start[0], roof.eaveSouth.start[1], roof.eaveSouth.start[2],
                      // Triangle 2
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveSouth.end[0], roof.eaveSouth.end[1], roof.eaveSouth.end[2],
                      roof.eaveSouth.start[0], roof.eaveSouth.start[1], roof.eaveSouth.start[2],
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <meshBasicMaterial
                  color="#1a1a1a"
                  side={2}
                  opacity={0.8}
                  transparent
                />
              </mesh>
            );
          } else {
            // Roof runs North-South, slopes East-West
            // East slope
            gridLines.push(
              <mesh key="roof-east">
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={6}
                    array={new Float32Array([
                      // Triangle 1
                      roof.ridge.start[0], roof.ridge.start[1], roof.ridge.start[2],
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveEast.start[0], roof.eaveEast.start[1], roof.eaveEast.start[2],
                      // Triangle 2
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveEast.end[0], roof.eaveEast.end[1], roof.eaveEast.end[2],
                      roof.eaveEast.start[0], roof.eaveEast.start[1], roof.eaveEast.start[2],
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <meshBasicMaterial
                  color="#000000"
                  side={2}
                  opacity={0.8}
                  transparent
                />
              </mesh>
            );

            // West slope
            gridLines.push(
              <mesh key="roof-west">
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={6}
                    array={new Float32Array([
                      // Triangle 1
                      roof.ridge.start[0], roof.ridge.start[1], roof.ridge.start[2],
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveWest.start[0], roof.eaveWest.start[1], roof.eaveWest.start[2],
                      // Triangle 2
                      roof.ridge.end[0], roof.ridge.end[1], roof.ridge.end[2],
                      roof.eaveWest.end[0], roof.eaveWest.end[1], roof.eaveWest.end[2],
                      roof.eaveWest.start[0], roof.eaveWest.start[1], roof.eaveWest.start[2],
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <meshBasicMaterial
                  color="#1a1a1a"
                  side={2}
                  opacity={0.8}
                  transparent
                />
              </mesh>
            );
          }
        }
      }
      */
    }

    console.log(`Returning ${gridLines.length} total grid elements`);
    return {
      gridLines,
      tileConnectionInfo,
      tileInfoMap,
      roofSegments,
      debugInfo: {
        polygonArea,
        totalTileArea,
        greenTileArea,
        tileCount: gridSquares.length,
        duplicateCount: duplicates.length
      }
    };
  }, [footprint, showGrid, showGridLines, showGridSquares, gridColorScheme, height, roofPlacementFloor, numberOfFloors, selectedComponent, lightenColor]);
  // PERFORMANCE FIX: Removed hoveredComponent from dependencies - hover state changes should NOT trigger full grid recalculation
  // Grid only recalculates when actual geometry or selection changes

  // Send debug info to parent component
  useEffect(() => {
    if (onGridDebugInfo) {
      onGridDebugInfo(showGrid && gridVisualization?.debugInfo ? gridVisualization.debugInfo : null);
    }
  }, [gridVisualization?.debugInfo, showGrid, onGridDebugInfo]);

  return (
    <group>
      {/* Debug Axes - X (red), Y (green), Z (blue) */}
      {showAxes && (
        <group>
          {/* X axis - Red (pointing right) */}
          <mesh position={[5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh position={[10, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>

          {/* Y axis - Green (pointing up) */}
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>
          <mesh position={[0, 10, 0]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>

          {/* Z axis - Blue (pointing forward) */}
          <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="blue" />
          </mesh>
          <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="blue" />
          </mesh>

          {/* Origin sphere - White */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      )}

      {/* Building Footprint Polygon (Fotavtrykk tak) - clickable to deselect */}
      {/* HIDDEN when grid squares are shown to prevent z-fighting transparency issues */}
      {showFootprint && footprint.length > 0 && !showGridSquares && (
        <mesh
          position={[0, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedComponent(null);
            if (onComponentSelect) {
              onComponentSelect(null, undefined);
            }
          }}>
          <shapeGeometry args={[(() => {
            const shape = new Shape();
            footprint.forEach((point, index) => {
              if (index === 0) {
                shape.moveTo(point[0], point[1]);
              } else {
                shape.lineTo(point[0], point[1]);
              }
            });
            shape.closePath();
            return shape;
          })()]} />
          <meshBasicMaterial
            color="#4a5568"
            opacity={showGrid ? 0.2 : 0.5}  // Dimmer when grid is shown
            transparent
            side={2}
          />
        </mesh>
      )}

      {/* Grid Visualization based on Wall Extensions - elevated above footprint */}
      {gridVisualization && gridVisualization.gridLines && (
        <group position={[0, 0.3, 0]}>
          {gridVisualization.gridLines}
        </group>
      )}

      {/* Wall Segments by Floor */}
      {footprint.length > 0 && (
        <group>
          {/* Generate walls for each floor */}
          {Array.from({ length: numberOfFloors }, (_, floor) => {
            // Skip if floor is hidden
            if (!visibleFloors.has(floor)) return null;

            const floorHeight = height / numberOfFloors;
            // Position walls to sit on the slab (bottom of wall at slab level)
            const slabY = floorHeight * floor;
            const floorY = slabY + floorHeight / 2;

            return (
              <group key={`floor-walls-${floor}`}>
                {footprint.map((outerCorner, index) => {
                  const nextOuterCorner = footprint[(index + 1) % footprint.length];
                  const innerCorner = offsetCorners[index] || outerCorner;  // Fallback if undefined
                  const nextInnerCorner = offsetCorners[(index + 1) % offsetCorners.length] || nextOuterCorner;  // Fallback

                  const wallId = `wall-floor${floor}-${index}`;
                  const isSelected = selectedComponent === wallId;
                  const isHovered = hoveredComponent === wallId;

                  // Wall connects between outer and inner edges
                  // Position is center of all 4 corners
                  const centerX = (outerCorner[0] + nextOuterCorner[0] + innerCorner[0] + nextInnerCorner[0]) / 4;
                  // Negate Z to match slab orientation (slabs rotate Y to -Z)
                  const centerZ = -(outerCorner[1] + nextOuterCorner[1] + innerCorner[1] + nextInnerCorner[1]) / 4;

                  // Calculate wall dimensions
                  const wallLength = Math.sqrt(
                    Math.pow(nextOuterCorner[0] - outerCorner[0], 2) +
                    Math.pow(nextOuterCorner[1] - outerCorner[1], 2)
                  );

                  // Calculate angle for rotation
                  const wallAngle = Math.atan2(
                    nextOuterCorner[1] - outerCorner[1],
                    nextOuterCorner[0] - outerCorner[0]
                  );

                  const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

                  // Calculate wall normal (perpendicular to wall, pointing outward)
                  const wallDX = nextOuterCorner[0] - outerCorner[0];
                  const wallDZ = nextOuterCorner[1] - outerCorner[1];
                  const wallNormalX = -wallDZ / wallLength;
                  // Negate to match coordinate system flip
                  const wallNormalZ = -wallDX / wallLength;

                  return (
                    <mesh
                      key={wallId}
                      position={[centerX, floorY, centerZ]}
                      rotation={[0, wallAngle, 0]}
                      castShadow
                      receiveShadow
                      onClick={(e) => handleClick(e, wallId)}
                      onContextMenu={(e) => handleRightClick(e, wallId, [wallNormalX, 0, wallNormalZ])}
                      onPointerOver={(e) => handlePointerOver(e, wallId)}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[wallLength, floorHeight, wallThickness]} />
                      <meshPhysicalMaterial
                        color={isSelected ? '#10b981' :
                               isHovered ? '#0ea5e9' : buildingColor}
                        metalness={0.1}
                        roughness={0.7}
                        envMapIntensity={0.5}
                        emissive={isSelected ? '#10b981' : '#000000'}
                        emissiveIntensity={isSelected ? 0.2 : 0}
                        clippingPlanes={clippingPlanes}
                        side={2} // DoubleSide for proper clipping
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

      {/* Windows and Doors distributed evenly */}
      {footprint.length > 0 && (
        <group>
          {/* Calculate window and door positions with fixed 3m spacing */}
          {(() => {
            const doorCount = openings?.doors?.count || 2; // Default 2 doors
            const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

            // Calculate perimeter segments with indices
            const segments: { start: [number, number], end: [number, number], length: number, index: number }[] = [];
            let totalPerimeter = 0;

            for (let i = 0; i < footprint.length; i++) {
              const start = footprint[i];
              const end = footprint[(i + 1) % footprint.length];
              const length = Math.sqrt(
                Math.pow(end[0] - start[0], 2) +
                Math.pow(end[1] - start[1], 2)
              );
              segments.push({ start, end, length, index: i });
              totalPerimeter += length;
            }

            // Sort segments by length to find longest walls
            const sortedSegments = [...segments].sort((a, b) => b.length - a.length);

            // Get the two longest walls for doors
            const doorWalls = sortedSegments.slice(0, Math.min(2, sortedSegments.length));
            const doorWallIndices = new Set(doorWalls.map(w => w.index));

            const openingComponents: React.ReactElement[] = [];
            let windowIndex = 0;

            // Place openings on each wall for all floors
            segments.forEach((segment, segmentIndex) => {
              // Check if this wall gets a door (ground floor only)
              const hasDoor = doorWallIndices.has(segmentIndex) && doorWalls.length > 0;
              const wallDoorIndex = doorWalls.findIndex(w => w.index === segmentIndex);

              // Calculate windows for this wall (1 per 3 meters)
              const windowCount = Math.floor(segment.length / 3);

              // Calculate wall rotation once for all openings
              const dx = segment.end[0] - segment.start[0];
              const dz = segment.end[1] - segment.start[1];
              const rotation = Math.atan2(dz, dx);

              // Loop through each floor
              for (let floor = 0; floor < numberOfFloors; floor++) {
                // Skip if floor is hidden
                if (!visibleFloors.has(floor)) continue;

                const isGroundFloor = floor === 0;
                const floorHeight = height / numberOfFloors;
                // Match wall positioning
                const slabY = floorHeight * floor;
                const floorY = slabY + floorHeight / 2;

                // Calculate total openings for this floor (windows + door if ground floor)
                const totalOpenings = windowCount + (hasDoor && isGroundFloor ? 1 : 0);
                if (totalOpenings === 0) continue;

                // Calculate even spacing across the wall
                const spacing = segment.length / (totalOpenings + 1);

                // Place door first if this is ground floor and wall has a door
                if (hasDoor && isGroundFloor) {
                  // Door at first position
                  const doorDistance = spacing;
                  const doorT = doorDistance / segment.length;
                  const doorX = segment.start[0] + doorT * (segment.end[0] - segment.start[0]);
                  // Negate Z to match wall coordinate system
                  const doorZ = -(segment.start[1] + doorT * (segment.end[1] - segment.start[1]));

                  const doorId = `door-${wallDoorIndex}`;
                  const isSelected = selectedComponent === doorId;
                  const isHovered = hoveredComponent === doorId;

                  openingComponents.push(
                    <mesh
                      key={doorId}
                      position={[doorX, slabY + 1.1, doorZ]}  // Position door from floor level
                      rotation={[0, rotation, 0]}
                      onClick={(e) => handleClick(e, doorId)}
                      onPointerOver={(e) => handlePointerOver(e, doorId)}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[1.0, 2.2, wallThickness + 0.1]} />
                      <meshPhysicalMaterial
                        color={isSelected ? '#f87171' : isHovered ? '#f97316' : '#8b5cf6'}
                        transparent
                        opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.4}
                        metalness={0.2}
                        roughness={0.8}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                  );
                }

                // Place windows for this floor
                for (let i = 0; i < windowCount; i++) {
                  // Calculate position (skip first spot if door is present on ground floor)
                  const positionIndex = (hasDoor && isGroundFloor) ? i + 2 : i + 1;
                  const distanceAlongWall = spacing * positionIndex;

                  const t = distanceAlongWall / segment.length;
                  const x = segment.start[0] + t * (segment.end[0] - segment.start[0]);
                  // Negate Z to match wall coordinate system
                  const z = -(segment.start[1] + t * (segment.end[1] - segment.start[1]));

                  const windowId = `window-floor${floor}-${windowIndex++}`;
                  const isSelected = selectedComponent === windowId;
                  const isHovered = hoveredComponent === windowId;

                  openingComponents.push(
                    <mesh
                      key={windowId}
                      position={[x, floorY, z]}
                      rotation={[0, rotation, 0]}
                      onClick={(e) => handleClick(e, windowId)}
                      onPointerOver={(e) => handlePointerOver(e, windowId)}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[1.2, 1.5, wallThickness + 0.1]} />
                      <meshPhysicalMaterial
                        color={isSelected ? '#fbbf24' : isHovered ? '#60a5fa' : '#06b6d4'}
                        transparent
                        opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
                        metalness={0.8}
                        roughness={0.1}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                  );
                }
              }
            });

            return openingComponents;
          })()}
        </group>
      )}

      {/* Floor with insulation thickness - only show when ground floor is visible */}
      {footprint.length > 0 && visibleFloors.has(0) && (
        <mesh
          position={[0, -(insulation?.floor?.thickness || 250) / 1000, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => handleClick(e, 'floor-ground')}
          onContextMenu={(e) => handleRightClick(e, 'floor-ground', [0, 1, 0])} // Floor normal points up
          onPointerOver={(e) => handlePointerOver(e, 'floor-ground')}
          onPointerOut={handlePointerOut}
        >
          <shapeGeometry args={[(() => {
            const shape = new Shape();
            if (footprint.length > 0) {
              const [firstX, firstY] = footprint[0];
              shape.moveTo(firstX, firstY);
              for (let i = 1; i < footprint.length; i++) {
                const [x, y] = footprint[i];
                shape.lineTo(x, y);
              }
              shape.closePath();
            }
            return shape;
          })()]} />
          <meshPhysicalMaterial
            color={selectedComponent === 'floor-ground' ? '#f59e0b' :
                   hoveredComponent === 'floor-ground' ? '#f97316' : '#374151'}
            roughness={0.9}
            metalness={0.1}
            side={2} // DoubleSide
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      )}

      {/* Floor dividers between floors */}
      {footprint.length > 0 && numberOfFloors > 1 && (
        <group>
          {[...Array(numberOfFloors - 1)].map((_, floorIndex) => {
            // Floor divider belongs to the floor above it (it's the floor of that story)
            const floorAbove = floorIndex + 1;
            if (!visibleFloors.has(floorAbove)) return null;

            const floorHeight = (height / numberOfFloors) * (floorIndex + 1);
            const floorId = `floor-divider-${floorIndex + 1}`;
            const isSelected = selectedComponent === floorId;
            const isHovered = hoveredComponent === floorId;

            return (
              <mesh
                key={floorId}
                position={[0, floorHeight, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => handleClick(e, floorId)}
                onPointerOver={(e) => handlePointerOver(e, floorId)}
                onPointerOut={handlePointerOut}
              >
                <shapeGeometry args={[(() => {
                  const shape = new Shape();

                  // Create solid floor slab (no hole)
                  if (footprint.length > 0) {
                    const [firstX, firstY] = footprint[0];
                    shape.moveTo(firstX, firstY);
                    for (let i = 1; i < footprint.length; i++) {
                      const [x, y] = footprint[i];
                      shape.lineTo(x, y);
                    }
                    shape.closePath();
                  }
                  return shape;
                })()]} />
                <meshPhysicalMaterial
                  color={isSelected ? '#10b981' : isHovered ? '#06b6d4' : '#4b5563'}
                  roughness={0.8}
                  metalness={0.1}
                  side={2} // DoubleSide
                  transparent
                  opacity={0.9}
                  emissive={isSelected ? '#10b981' : '#000000'}
                  emissiveIntensity={isSelected ? 0.1 : 0}
                  clippingPlanes={clippingPlanes}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Intelligent roof system based on building shape */}
      {visibleFloors.has(numberOfFloors) && (
        <group position={[0,
          roofPlacementFloor !== null && roofPlacementFloor < numberOfFloors
            ? (height / numberOfFloors) * (roofPlacementFloor + 1)  // Place at top of specified floor
            : height,  // Default to top of building
          0]}>
        {/* Norwegian standard: 600mm (0.6m) overhang, 200mm (0.2m) below wall top */}
        {(() => {
          const { geometry3D, bounds } = roofData;

          // If intelligent algorithm generated roof sections, render them
          if (geometry3D && geometry3D.length > 0) {
            return (
              <>
                {geometry3D.map((roofPart, index) => {
                  if (roofPart.type === 'gable') {
                    const { ridgeLength, roofWidth, ridgeHeight, orientation, position } = roofPart;
                    if (!roofWidth || !ridgeLength || !ridgeHeight) return null;
                    const slopeDepth = roofWidth / 2;
                    const [posX, , posZ] = position;

                    return (
                      <group key={index} position={[posX, 0, posZ]}>
                        {orientation === 'x' ? (
                          <>
                            {/* Ridge runs east-west - North slope */}
                            <mesh
                              position={[0, ridgeHeight / 2, -slopeDepth / 2]}
                              rotation={[-Math.PI / 5, 0, 0]}
                              onClick={(e) => handleClick(e, `roof-north-${index}`)}
                              onContextMenu={(e) => {
                                // Calculate roof slope normal (tilted upward)
                                const angle = Math.PI / 5;
                                handleRightClick(e, `roof-north-${index}`, [0, Math.cos(angle), -Math.sin(angle)]);
                              }}
                              onPointerOver={(e) => handlePointerOver(e, `roof-north-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-north-${index}` ? '#ef4444' :
                                       hoveredComponent === `roof-north-${index}` ? '#f97316' : '#1f2937'}
                                roughness={0.9}
                                metalness={0.1}
                                emissive={selectedComponent === `roof-north-${index}` ? '#ef4444' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-north-${index}` ? 0.1 : 0}
                                clippingPlanes={clippingPlanes}
                              />
                            </mesh>
                            {/* South slope */}
                            <mesh
                              position={[0, ridgeHeight / 2, slopeDepth / 2]}
                              rotation={[Math.PI / 5, 0, 0]}
                              onClick={(e) => handleClick(e, `roof-south-${index}`)}
                              onPointerOver={(e) => handlePointerOver(e, `roof-south-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-south-${index}` ? '#ef4444' :
                                       hoveredComponent === `roof-south-${index}` ? '#f97316' : '#1f2937'}
                                roughness={0.9}
                                metalness={0.1}
                                emissive={selectedComponent === `roof-south-${index}` ? '#ef4444' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-south-${index}` ? 0.1 : 0}
                                clippingPlanes={clippingPlanes}
                              />
                            </mesh>
                            {/* Ridge beam */}
                            <mesh
                              position={[0, ridgeHeight, 0]}
                              onClick={(e) => handleClick(e, `roof-ridge-${index}`)}
                              onPointerOver={(e) => handlePointerOver(e, `roof-ridge-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.4, 0.4]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-ridge-${index}` ? '#a855f7' :
                                       hoveredComponent === `roof-ridge-${index}` ? '#8b5cf6' : '#111827'}
                                roughness={0.8}
                                emissive={selectedComponent === `roof-ridge-${index}` ? '#a855f7' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-ridge-${index}` ? 0.1 : 0}
                              />
                            </mesh>
                          </>
                        ) : (
                          <>
                            {/* Ridge runs north-south */}
                            <mesh position={[-slopeDepth / 2, ridgeHeight / 2, 0]} rotation={[0, 0, Math.PI / 5]}>
                              <boxGeometry args={[slopeDepth * 1.1, 0.3, ridgeLength]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[slopeDepth / 2, ridgeHeight / 2, 0]} rotation={[0, 0, -Math.PI / 5]}>
                              <boxGeometry args={[slopeDepth * 1.1, 0.3, ridgeLength]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[0, ridgeHeight, 0]}>
                              <boxGeometry args={[0.4, 0.4, ridgeLength]} />
                              <meshPhysicalMaterial color="#111827" roughness={0.8} />
                            </mesh>
                          </>
                        )}
                      </group>
                    );
                  } else if (roofPart.type === 'valley') {
                    // Render valley geometry
                    return null; // TODO: Implement valley rendering
                  }
                  return null;
                })}
              </>
            );
          } else {
            // Use roofSegments analysis from grid decomposition
            if (gridVisualization?.roofSegments?.mainSegmentBounds) {
              // Build saddle roof from actual main segment (not bounding box!)
              const { minX, maxX, minZ, maxZ, width, depth, ridgeDirection } = gridVisualization.roofSegments.mainSegmentBounds;
              const overhang = 0.3;
              const roofWidth = width + overhang * 2;
              const roofDepth = depth + overhang * 2;
              const roofHeight = Math.min(roofWidth, roofDepth) * 0.35;

              // Use ridge direction from grid analysis
              const ridgeAlongX = ridgeDirection === 'x';

              if (ridgeAlongX) {
                // Ridge runs along X (local Y), slopes along Z (local X)
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;
                return (
                  <>
                    <mesh
                      position={[centerX, roofHeight / 2, centerZ - roofDepth / 4]}
                      rotation={[-Math.PI / 5, 0, 0]}
                      onClick={(e) => handleClick(e, 'roof-north')}
                      onPointerOver={(e) => handlePointerOver(e, 'roof-north')}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[roofWidth, 0.3, roofDepth * 0.55]} />
                      <meshPhysicalMaterial
                        color={selectedComponent === 'roof-north' ? '#ef4444' :
                               hoveredComponent === 'roof-north' ? '#f97316' : '#1f2937'}
                        roughness={0.9}
                        metalness={0.1}
                        emissive={selectedComponent === 'roof-north' ? '#ef4444' : '#000000'}
                        emissiveIntensity={selectedComponent === 'roof-north' ? 0.1 : 0}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                    <mesh
                      position={[centerX, roofHeight / 2, centerZ + roofDepth / 4]}
                      rotation={[Math.PI / 5, 0, 0]}
                      onClick={(e) => handleClick(e, 'roof-south')}
                      onPointerOver={(e) => handlePointerOver(e, 'roof-south')}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[roofWidth, 0.3, roofDepth * 0.55]} />
                      <meshPhysicalMaterial
                        color={selectedComponent === 'roof-south' ? '#ef4444' :
                               hoveredComponent === 'roof-south' ? '#f97316' : '#1f2937'}
                        roughness={0.9}
                        metalness={0.1}
                        emissive={selectedComponent === 'roof-south' ? '#ef4444' : '#000000'}
                        emissiveIntensity={selectedComponent === 'roof-south' ? 0.1 : 0}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                    <mesh position={[centerX, roofHeight, centerZ]}>
                      <boxGeometry args={[roofWidth, 0.4, 0.4]} />
                      <meshPhysicalMaterial color="#111827" roughness={0.8} />
                    </mesh>
                  </>
                );
              } else {
                // Ridge runs along Z (local Y), slopes along X (local X)
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;
                return (
                  <>
                    <mesh
                      position={[centerX - roofWidth / 4, roofHeight / 2, centerZ]}
                      rotation={[0, 0, Math.PI / 5]}
                      onClick={(e) => handleClick(e, 'roof-west')}
                      onPointerOver={(e) => handlePointerOver(e, 'roof-west')}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[roofWidth * 0.55, 0.3, roofDepth]} />
                      <meshPhysicalMaterial
                        color={selectedComponent === 'roof-west' ? '#ef4444' :
                               hoveredComponent === 'roof-west' ? '#f97316' : '#1f2937'}
                        roughness={0.9}
                        metalness={0.1}
                        emissive={selectedComponent === 'roof-west' ? '#ef4444' : '#000000'}
                        emissiveIntensity={selectedComponent === 'roof-west' ? 0.1 : 0}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                    <mesh
                      position={[centerX + roofWidth / 4, roofHeight / 2, centerZ]}
                      rotation={[0, 0, -Math.PI / 5]}
                      onClick={(e) => handleClick(e, 'roof-east')}
                      onPointerOver={(e) => handlePointerOver(e, 'roof-east')}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[roofWidth * 0.55, 0.3, roofDepth]} />
                      <meshPhysicalMaterial
                        color={selectedComponent === 'roof-east' ? '#ef4444' :
                               hoveredComponent === 'roof-east' ? '#f97316' : '#1f2937'}
                        roughness={0.9}
                        metalness={0.1}
                        emissive={selectedComponent === 'roof-east' ? '#ef4444' : '#000000'}
                        emissiveIntensity={selectedComponent === 'roof-east' ? 0.1 : 0}
                        clippingPlanes={clippingPlanes}
                      />
                    </mesh>
                    <mesh position={[centerX, roofHeight, centerZ]}>
                      <boxGeometry args={[0.4, 0.4, roofDepth]} />
                      <meshPhysicalMaterial color="#111827" roughness={0.8} />
                    </mesh>
                  </>
                );
              }
            } else if (roofData.bounds) {
              // Fallback to bounding box if grid analysis failed
              const { bounds } = roofData;
              const overhang = 0.3;
              const width = bounds.width + overhang * 2;
              const depth = bounds.depth + overhang * 2;
              const roofHeight = Math.min(width, depth) * 0.35;
              const ridgeAlongX = width > depth;

              // Same simplified roof logic as before (bounding box fallback)
              // ... keeping existing fallback code
            }

            // Ultimate fallback: flat roof following polygon
            return (
              <mesh
                position={[0, 0.2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => handleClick(e, 'roof-flat')}
                onPointerOver={(e) => handlePointerOver(e, 'roof-flat')}
                onPointerOut={handlePointerOut}
              >
                <shapeGeometry args={[(() => {
                  const shape = new Shape();
                  if (footprint.length > 0) {
                    const [firstX, firstY] = footprint[0];
                    shape.moveTo(firstX, firstY);
                    for (let i = 1; i < footprint.length; i++) {
                      const [x, y] = footprint[i];
                      shape.lineTo(x, y);
                    }
                    shape.closePath();
                  }
                  return shape;
                })()]} />
                <meshPhysicalMaterial
                  color={selectedComponent === 'roof-flat' ? '#ef4444' :
                         hoveredComponent === 'roof-flat' ? '#f97316' : '#1f2937'}
                  roughness={0.9}
                  metalness={0.1}
                  emissive={selectedComponent === 'roof-flat' ? '#ef4444' : '#000000'}
                  emissiveIntensity={selectedComponent === 'roof-flat' ? 0.1 : 0}
                  clippingPlanes={clippingPlanes}
                />
              </mesh>
            );
          }
        })()}
        </group>
      )}
    </group>
  );
}