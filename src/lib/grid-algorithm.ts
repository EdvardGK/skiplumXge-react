/**
 * Grid-based building analysis algorithm
 * Uses grid squares to identify building sections for roof generation
 * Replaces the failing corner-counting approach
 */

export interface GridSquare {
  id: string;
  i: number; // Grid index i
  j: number; // Grid index j
  centerX: number;
  centerY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  coverage: number; // 0-1 percentage inside building
  isInside: boolean;
  groupId?: number; // Which connected group this belongs to
}

export interface GridGroup {
  id: number;
  squares: GridSquare[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  area: number;
  centerX: number;
  centerY: number;
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
  orientation: 'horizontal' | 'vertical';
  priority: number;
}

/**
 * Generate grid from wall extensions
 */
export function generateGridFromWalls(
  footprint: [number, number][],
  gridExtension: number = 3
): { horizontalLines: number[], verticalLines: number[] } {
  const horizontalLines: Set<number> = new Set();
  const verticalLines: Set<number> = new Set();

  // Process each wall segment to create extension lines
  footprint.forEach((corner, index) => {
    const nextCorner = footprint[(index + 1) % footprint.length];

    // Calculate wall vector
    const wallDx = nextCorner[0] - corner[0];
    const wallDy = nextCorner[1] - corner[1];
    const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);

    if (wallLength === 0) return;

    // Normalized wall direction
    const wallDirX = wallDx / wallLength;
    const wallDirY = wallDy / wallLength;

    // Check if wall is mostly horizontal or vertical
    const angleThreshold = Math.PI / 8; // 22.5 degrees
    const wallAngle = Math.atan2(wallDy, wallDx);

    if (Math.abs(wallAngle) < angleThreshold ||
        Math.abs(wallAngle - Math.PI) < angleThreshold ||
        Math.abs(wallAngle + Math.PI) < angleThreshold) {
      // Mostly horizontal wall
      horizontalLines.add(corner[1]);
      horizontalLines.add(nextCorner[1]);
    } else if (Math.abs(wallAngle - Math.PI/2) < angleThreshold ||
               Math.abs(wallAngle + Math.PI/2) < angleThreshold) {
      // Mostly vertical wall
      verticalLines.add(corner[0]);
      verticalLines.add(nextCorner[0]);
    }
  });

  // Extend grid beyond building bounds
  const bounds = getBuildingBounds(footprint);

  // Add extended boundary lines
  horizontalLines.add(bounds.minY - gridExtension);
  horizontalLines.add(bounds.maxY + gridExtension);
  verticalLines.add(bounds.minX - gridExtension);
  verticalLines.add(bounds.maxX + gridExtension);

  return {
    horizontalLines: Array.from(horizontalLines).sort((a, b) => a - b),
    verticalLines: Array.from(verticalLines).sort((a, b) => a - b)
  };
}

/**
 * Test if a point is inside the building footprint using ray casting
 */
export function isPointInsideFootprint(
  point: [number, number],
  footprint: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
    const xi = footprint[i][0];
    const yi = footprint[i][1];
    const xj = footprint[j][0];
    const yj = footprint[j][1];

    if ((yi > y) !== (yj > y) &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate what percentage of a grid square is inside the footprint
 */
export function calculateSquareCoverage(
  minX: number, maxX: number, minY: number, maxY: number,
  footprint: [number, number][]
): number {
  // Sample multiple points within the square to estimate coverage
  const samples = 5; // 5x5 grid of sample points
  let insideCount = 0;
  const totalSamples = samples * samples;

  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const x = minX + (maxX - minX) * (i + 0.5) / samples;
      const y = minY + (maxY - minY) * (j + 0.5) / samples;

      if (isPointInsideFootprint([x, y], footprint)) {
        insideCount++;
      }
    }
  }

  return insideCount / totalSamples;
}

/**
 * Analyze grid squares to determine which are inside the building
 */
export function analyzeGridSquares(
  footprint: [number, number][],
  gridExtension: number = 3
): GridSquare[] {
  const { horizontalLines, verticalLines } = generateGridFromWalls(footprint, gridExtension);
  const gridSquares: GridSquare[] = [];

  // Create grid squares from line intersections
  for (let i = 0; i < verticalLines.length - 1; i++) {
    for (let j = 0; j < horizontalLines.length - 1; j++) {
      const minX = verticalLines[i];
      const maxX = verticalLines[i + 1];
      const minY = horizontalLines[j];
      const maxY = horizontalLines[j + 1];

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const coverage = calculateSquareCoverage(minX, maxX, minY, maxY, footprint);
      const isInside = coverage >= 0.99; // Consider inside only if fully covered (green squares)

      gridSquares.push({
        id: `grid-${i}-${j}`,
        i, j,
        centerX, centerY,
        minX, maxX, minY, maxY,
        coverage,
        isInside
      });
    }
  }

  return gridSquares;
}

/**
 * Group connected grid squares using flood fill algorithm
 */
export function groupConnectedSquares(gridSquares: GridSquare[]): GridGroup[] {
  const groups: GridGroup[] = [];
  let nextGroupId = 0;

  // Create a 2D array for easier neighbor lookup
  const maxI = Math.max(...gridSquares.map(s => s.i)) + 1;
  const maxJ = Math.max(...gridSquares.map(s => s.j)) + 1;
  const grid: (GridSquare | null)[][] = Array(maxI).fill(null).map(() => Array(maxJ).fill(null));

  // Fill the grid
  gridSquares.forEach(square => {
    grid[square.i][square.j] = square;
  });

  // Flood fill to find connected components
  const visited = new Set<string>();

  function floodFill(i: number, j: number, groupId: number, group: GridSquare[]): void {
    if (i < 0 || i >= maxI || j < 0 || j >= maxJ) return;

    const square = grid[i][j];
    if (!square || !square.isInside || visited.has(square.id)) return;

    visited.add(square.id);
    square.groupId = groupId;
    group.push(square);

    // Check 4 neighbors (not diagonal)
    floodFill(i + 1, j, groupId, group);
    floodFill(i - 1, j, groupId, group);
    floodFill(i, j + 1, groupId, group);
    floodFill(i, j - 1, groupId, group);
  }

  // Find all connected groups
  gridSquares.forEach(square => {
    if (square.isInside && !visited.has(square.id)) {
      const group: GridSquare[] = [];
      floodFill(square.i, square.j, nextGroupId, group);

      if (group.length > 0) {
        // Calculate group bounds
        const minX = Math.min(...group.map(s => s.minX));
        const maxX = Math.max(...group.map(s => s.maxX));
        const minY = Math.min(...group.map(s => s.minY));
        const maxY = Math.max(...group.map(s => s.maxY));

        groups.push({
          id: nextGroupId,
          squares: group,
          minX, maxX, minY, maxY,
          area: group.length, // Number of squares as proxy for area
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2
        });

        nextGroupId++;
      }
    }
  });

  return groups;
}

/**
 * Convert grid groups to rectangles for roof generation
 */
export function groupsToRectangles(groups: GridGroup[]): Rectangle[] {
  const rectangles: Rectangle[] = [];

  // Sort groups by area (largest first)
  const sortedGroups = [...groups].sort((a, b) => b.area - a.area);

  sortedGroups.forEach((group, index) => {
    const width = group.maxX - group.minX;
    const height = group.maxY - group.minY;

    rectangles.push({
      minX: group.minX,
      maxX: group.maxX,
      minY: group.minY,
      maxY: group.maxY,
      width,
      height,
      centerX: group.centerX,
      centerY: group.centerY,
      area: width * height,
      orientation: width > height ? 'horizontal' : 'vertical',
      priority: index + 1 // Largest group gets priority 1
    });
  });

  return rectangles;
}

/**
 * Main entry point: Decompose footprint into rectangles using grid analysis
 */
export function decomposeUsingGrid(footprint: [number, number][]): Rectangle[] {
  console.log('=== Grid-based decomposition ===');
  console.log('Footprint points:', footprint.length);

  // Step 1: Analyze grid squares
  const gridSquares = analyzeGridSquares(footprint);
  const insideSquares = gridSquares.filter(s => s.isInside);
  const partialSquares = gridSquares.filter(s => s.coverage > 0.01 && s.coverage < 0.99);

  console.log('Grid analysis:');
  console.log(`  Total squares: ${gridSquares.length}`);
  console.log(`  Green (≥99% inside): ${insideSquares.length}`);
  console.log(`  Yellow (partial): ${partialSquares.length}`);
  console.log(`  Red (outside): ${gridSquares.filter(s => s.coverage <= 0.01).length}`);

  // Step 2: Group connected squares
  let groups = groupConnectedSquares(gridSquares);

  // If no fully-inside squares, try with partial coverage threshold
  if (groups.length === 0 && partialSquares.length > 0) {
    console.log('\nNo fully-inside squares found. Using partial squares (>50% coverage)...');

    // Temporarily adjust the isInside flag for partial squares
    const adjustedSquares = gridSquares.map(s => ({
      ...s,
      isInside: s.coverage > 0.5  // Lower threshold for fallback
    }));

    groups = groupConnectedSquares(adjustedSquares);
  }

  console.log(`\nFound ${groups.length} connected group(s):`);
  groups.forEach(g => {
    console.log(`  Group ${g.id}: ${g.squares.length} squares`);
    console.log(`    Bounds: [${g.minX.toFixed(1)}, ${g.minY.toFixed(1)}] to [${g.maxX.toFixed(1)}, ${g.maxY.toFixed(1)}]`);
    console.log(`    Size: ${(g.maxX - g.minX).toFixed(1)} x ${(g.maxY - g.minY).toFixed(1)}`);
  });

  // Step 3: Convert groups to rectangles
  const rectangles = groupsToRectangles(groups);
  console.log('\nCreated', rectangles.length, 'rectangle(s) for roof sections');

  // Fallback if no rectangles found
  if (rectangles.length === 0) {
    console.warn('No rectangles found, using bounding box as fallback');
    const bounds = getBuildingBounds(footprint);
    return [{
      ...bounds,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
      area: (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY),
      orientation: (bounds.maxX - bounds.minX) > (bounds.maxY - bounds.minY) ? 'horizontal' : 'vertical',
      priority: 1
    }];
  }

  return rectangles;
}

/**
 * Get bounding box of footprint
 */
function getBuildingBounds(footprint: [number, number][]): {
  minX: number; maxX: number; minY: number; maxY: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  footprint.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  return { minX, maxX, minY, maxY };
}