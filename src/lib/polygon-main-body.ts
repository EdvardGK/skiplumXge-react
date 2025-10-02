/**
 * Algorithm to determine the main body of a polygon
 * The main body is typically the largest rectangular section that forms the core of the shape
 */

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  area: number;
  centerX: number;
  centerY: number;
  coverage: number; // Percentage of rectangle that's inside the polygon
}

interface MainBodyResult {
  mainBody: Rectangle;
  confidence: number; // 0-1, how confident we are this is the main body
  method: string; // Which method was used to find it
  alternativeBodies?: Rectangle[]; // Other potential main bodies
}

/**
 * Check if a point is inside a polygon using ray casting
 */
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate what percentage of a rectangle is inside the polygon
 */
function calculateRectangleCoverage(rect: Omit<Rectangle, 'coverage'>, polygon: Point[], samplePoints: number = 10): number {
  let insideCount = 0;
  const totalSamples = samplePoints * samplePoints;

  for (let i = 0; i < samplePoints; i++) {
    for (let j = 0; j < samplePoints; j++) {
      const x = rect.minX + (rect.width * (i + 0.5) / samplePoints);
      const y = rect.minY + (rect.height * (j + 0.5) / samplePoints);

      if (isPointInPolygon({ x, y }, polygon)) {
        insideCount++;
      }
    }
  }

  return insideCount / totalSamples;
}

/**
 * Method 1: Find the largest axis-aligned bounding box that fits inside the polygon
 */
function findLargestInternalRectangle(polygon: Point[]): Rectangle | null {
  // Get overall bounding box
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Use a grid search to find the largest rectangle
  const gridSize = 20; // Resolution of search
  let bestRect: Rectangle | null = null;
  let maxArea = 0;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let w = 1; w <= gridSize - i; w++) {
        for (let h = 1; h <= gridSize - j; h++) {
          const x1 = minX + (maxX - minX) * i / gridSize;
          const y1 = minY + (maxY - minY) * j / gridSize;
          const x2 = minX + (maxX - minX) * (i + w) / gridSize;
          const y2 = minY + (maxY - minY) * (j + h) / gridSize;

          const rect = {
            minX: x1,
            maxX: x2,
            minY: y1,
            maxY: y2,
            width: x2 - x1,
            height: y2 - y1,
            area: (x2 - x1) * (y2 - y1),
            centerX: (x1 + x2) / 2,
            centerY: (y1 + y2) / 2,
            coverage: 0
          };

          const coverage = calculateRectangleCoverage(rect, polygon);
          rect.coverage = coverage;

          // Only consider rectangles that are mostly inside (>95% coverage)
          if (coverage > 0.95 && rect.area > maxArea) {
            maxArea = rect.area;
            bestRect = rect;
          }
        }
      }
    }
  }

  return bestRect;
}

/**
 * Method 2: Analyze edges to find the main rectangular structure
 */
function findMainBodyByEdges(polygon: Point[]): Rectangle | null {
  // Find horizontal and vertical edges
  const horizontalEdges: { y: number; x1: number; x2: number; length: number }[] = [];
  const verticalEdges: { x: number; y1: number; y2: number; length: number }[] = [];

  const angleThreshold = 15; // degrees

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Check if edge is horizontal
    if (Math.abs(angle) < angleThreshold || Math.abs(angle - 180) < angleThreshold || Math.abs(angle + 180) < angleThreshold) {
      horizontalEdges.push({
        y: (p1.y + p2.y) / 2,
        x1: Math.min(p1.x, p2.x),
        x2: Math.max(p1.x, p2.x),
        length
      });
    }
    // Check if edge is vertical
    else if (Math.abs(angle - 90) < angleThreshold || Math.abs(angle + 90) < angleThreshold) {
      verticalEdges.push({
        x: (p1.x + p2.x) / 2,
        y1: Math.min(p1.y, p2.y),
        y2: Math.max(p1.y, p2.y),
        length
      });
    }
  }

  // Sort edges by length to find the main ones
  horizontalEdges.sort((a, b) => b.length - a.length);
  verticalEdges.sort((a, b) => b.length - a.length);

  // Try to form rectangles from the longest edges
  if (horizontalEdges.length >= 2 && verticalEdges.length >= 2) {
    // Use the two longest horizontal and vertical edges
    const h1 = horizontalEdges[0];
    const h2 = horizontalEdges[1];
    const v1 = verticalEdges[0];
    const v2 = verticalEdges[1];

    const minX = Math.min(v1.x, v2.x);
    const maxX = Math.max(v1.x, v2.x);
    const minY = Math.min(h1.y, h2.y);
    const maxY = Math.max(h1.y, h2.y);

    const rect = {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      area: (maxX - minX) * (maxY - minY),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      coverage: 0
    };

    rect.coverage = calculateRectangleCoverage(rect, polygon);
    return rect;
  }

  return null;
}

/**
 * Method 3: Use connected component analysis from grid
 */
function findMainBodyByGrid(polygon: Point[], gridResolution: number = 1): Rectangle | null {
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const gridCols = Math.ceil(width / gridResolution);
  const gridRows = Math.ceil(height / gridResolution);

  // Create a grid and mark cells inside the polygon
  const grid: boolean[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const x = minX + (col + 0.5) * gridResolution;
      const y = minY + (row + 0.5) * gridResolution;
      grid[row][col] = isPointInPolygon({ x, y }, polygon);
    }
  }

  // Find the largest rectangular region in the grid
  let maxRect: Rectangle | null = null;
  let maxArea = 0;

  // Dynamic programming approach to find largest rectangle
  const heights = Array(gridCols).fill(0);

  for (let row = 0; row < gridRows; row++) {
    // Update heights for this row
    for (let col = 0; col < gridCols; col++) {
      heights[col] = grid[row][col] ? heights[col] + 1 : 0;
    }

    // Find largest rectangle in histogram
    for (let col = 0; col < gridCols; col++) {
      if (heights[col] === 0) continue;

      let minHeight = heights[col];
      for (let endCol = col; endCol < gridCols; endCol++) {
        if (heights[endCol] === 0) break;
        minHeight = Math.min(minHeight, heights[endCol]);

        const rectWidth = (endCol - col + 1) * gridResolution;
        const rectHeight = minHeight * gridResolution;
        const area = rectWidth * rectHeight;

        if (area > maxArea) {
          maxArea = area;
          maxRect = {
            minX: minX + col * gridResolution,
            maxX: minX + (endCol + 1) * gridResolution,
            minY: minY + (row - minHeight + 1) * gridResolution,
            maxY: minY + (row + 1) * gridResolution,
            width: rectWidth,
            height: rectHeight,
            area,
            centerX: minX + (col + endCol + 1) * gridResolution / 2,
            centerY: minY + (row - minHeight / 2 + 0.5) * gridResolution,
            coverage: 1.0 // By construction, this is fully inside
          };
        }
      }
    }
  }

  return maxRect;
}

/**
 * Main function to determine the main body of a polygon
 */
export function determineMainBody(polygon: [number, number][]): MainBodyResult {
  // Convert to Point format
  const points: Point[] = polygon.map(([x, y]) => ({ x, y }));

  console.log('=== Determining Main Body of Polygon ===');
  console.log(`Analyzing polygon with ${points.length} vertices`);

  const candidates: { rect: Rectangle; method: string }[] = [];

  // Try Method 1: Largest internal rectangle
  const internalRect = findLargestInternalRectangle(points);
  if (internalRect) {
    candidates.push({ rect: internalRect, method: 'internal-rectangle' });
    console.log(`Method 1 (Internal Rectangle): Area=${internalRect.area.toFixed(1)}, Coverage=${(internalRect.coverage * 100).toFixed(1)}%`);
  }

  // Try Method 2: Edge analysis
  const edgeRect = findMainBodyByEdges(points);
  if (edgeRect) {
    candidates.push({ rect: edgeRect, method: 'edge-analysis' });
    console.log(`Method 2 (Edge Analysis): Area=${edgeRect.area.toFixed(1)}, Coverage=${(edgeRect.coverage * 100).toFixed(1)}%`);
  }

  // Try Method 3: Grid-based analysis
  const gridRect = findMainBodyByGrid(points);
  if (gridRect) {
    candidates.push({ rect: gridRect, method: 'grid-analysis' });
    console.log(`Method 3 (Grid Analysis): Area=${gridRect.area.toFixed(1)}, Coverage=${(gridRect.coverage * 100).toFixed(1)}%`);
  }

  // Select the best candidate
  if (candidates.length === 0) {
    // Fallback: use bounding box
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boundingBox: Rectangle = {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY,
      area: (maxX - minX) * (maxY - minY),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      coverage: calculateRectangleCoverage({
        minX, maxX, minY, maxY,
        width: maxX - minX,
        height: maxY - minY,
        area: 0,
        centerX: 0,
        centerY: 0
      }, points)
    };

    console.log('No main body found, using bounding box as fallback');
    return {
      mainBody: boundingBox,
      confidence: 0.3,
      method: 'bounding-box-fallback'
    };
  }

  // Sort by a combination of area and coverage
  candidates.sort((a, b) => {
    const scoreA = a.rect.area * a.rect.coverage;
    const scoreB = b.rect.area * b.rect.coverage;
    return scoreB - scoreA;
  });

  const best = candidates[0];
  const alternatives = candidates.slice(1).map(c => c.rect);

  // Calculate confidence based on how much better the best is than alternatives
  let confidence = best.rect.coverage;
  if (candidates.length > 1) {
    const secondBest = candidates[1];
    const scoreDiff = (best.rect.area * best.rect.coverage) / (secondBest.rect.area * secondBest.rect.coverage);
    confidence *= Math.min(1, scoreDiff / 2); // Higher difference = higher confidence
  }

  console.log(`\nSelected main body using ${best.method}:`);
  console.log(`  Position: [${best.rect.minX.toFixed(1)}, ${best.rect.minY.toFixed(1)}] to [${best.rect.maxX.toFixed(1)}, ${best.rect.maxY.toFixed(1)}]`);
  console.log(`  Size: ${best.rect.width.toFixed(1)} x ${best.rect.height.toFixed(1)}`);
  console.log(`  Area: ${best.rect.area.toFixed(1)}`);
  console.log(`  Coverage: ${(best.rect.coverage * 100).toFixed(1)}%`);
  console.log(`  Confidence: ${(confidence * 100).toFixed(1)}%`);

  return {
    mainBody: best.rect,
    confidence,
    method: best.method,
    alternativeBodies: alternatives
  };
}

/**
 * Visualize the main body detection for debugging
 */
export function visualizeMainBody(polygon: [number, number][], result: MainBodyResult): string {
  const points: Point[] = polygon.map(([x, y]) => ({ x, y }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = 50 / Math.max(width, height);

  // Create ASCII visualization
  const canvasWidth = Math.ceil(width * scale);
  const canvasHeight = Math.ceil(height * scale);
  const canvas: string[][] = Array(canvasHeight).fill(null).map(() => Array(canvasWidth).fill(' '));

  // Draw polygon outline
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    const x1 = Math.floor((p1.x - minX) * scale);
    const y1 = Math.floor((p1.y - minY) * scale);
    const x2 = Math.floor((p2.x - minX) * scale);
    const y2 = Math.floor((p2.y - minY) * scale);

    // Simple line drawing
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let step = 0; step <= steps; step++) {
      const t = steps === 0 ? 0 : step / steps;
      const x = Math.round(x1 + t * (x2 - x1));
      const y = Math.round(y1 + t * (y2 - y1));
      if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
        canvas[y][x] = '*';
      }
    }
  }

  // Draw main body rectangle
  const main = result.mainBody;
  const mx1 = Math.floor((main.minX - minX) * scale);
  const my1 = Math.floor((main.minY - minY) * scale);
  const mx2 = Math.floor((main.maxX - minX) * scale);
  const my2 = Math.floor((main.maxY - minY) * scale);

  for (let x = mx1; x <= mx2; x++) {
    if (x >= 0 && x < canvasWidth) {
      if (my1 >= 0 && my1 < canvasHeight) canvas[my1][x] = '#';
      if (my2 >= 0 && my2 < canvasHeight) canvas[my2][x] = '#';
    }
  }
  for (let y = my1; y <= my2; y++) {
    if (y >= 0 && y < canvasHeight) {
      if (mx1 >= 0 && mx1 < canvasWidth) canvas[y][mx1] = '#';
      if (mx2 >= 0 && mx2 < canvasWidth) canvas[y][mx2] = '#';
    }
  }

  // Convert to string
  return canvas.map(row => row.join('')).join('\n');
}