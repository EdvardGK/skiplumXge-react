/**
 * Standalone test script for polygon main body detection
 * Run with: node test-polygon-main-body.js
 */

// Test implementation without TypeScript
function isPointInPolygon(point, polygon) {
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

function calculateRectangleCoverage(rect, polygon, samplePoints = 10) {
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

function findLargestInternalRectangle(polygon) {
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const gridSize = 15; // Reduced for faster execution
  let bestRect = null;
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

function determineMainBody(polygonArray) {
  const points = polygonArray.map(([x, y]) => ({ x, y }));

  console.log('\n=== Determining Main Body of Polygon ===');
  console.log(`Analyzing polygon with ${points.length} vertices`);

  // For this test, we'll just use the internal rectangle method
  const mainBody = findLargestInternalRectangle(points);

  if (!mainBody) {
    // Fallback to bounding box
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      mainBody: {
        minX, maxX, minY, maxY,
        width: maxX - minX,
        height: maxY - minY,
        area: (maxX - minX) * (maxY - minY),
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        coverage: 0.5
      },
      confidence: 0.3,
      method: 'bounding-box'
    };
  }

  console.log('\nMain body found:');
  console.log(`  Position: [${mainBody.minX.toFixed(1)}, ${mainBody.minY.toFixed(1)}] to [${mainBody.maxX.toFixed(1)}, ${mainBody.maxY.toFixed(1)}]`);
  console.log(`  Size: ${mainBody.width.toFixed(1)} x ${mainBody.height.toFixed(1)}`);
  console.log(`  Area: ${mainBody.area.toFixed(1)}`);
  console.log(`  Coverage: ${(mainBody.coverage * 100).toFixed(1)}%`);

  return {
    mainBody,
    confidence: mainBody.coverage,
    method: 'internal-rectangle'
  };
}

function visualizeMainBody(polygon, result) {
  const points = polygon.map(([x, y]) => ({ x, y }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = 30 / Math.max(width, height);

  const canvasWidth = Math.ceil(width * scale);
  const canvasHeight = Math.ceil(height * scale);
  const canvas = Array(canvasHeight).fill(null).map(() => Array(canvasWidth).fill(' '));

  // Draw polygon outline
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const worldX = minX + x / scale;
      const worldY = minY + y / scale;
      if (isPointInPolygon({ x: worldX, y: worldY }, points)) {
        canvas[y][x] = '·';
      }
    }
  }

  // Draw polygon edges
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    const x1 = Math.floor((p1.x - minX) * scale);
    const y1 = Math.floor((p1.y - minY) * scale);
    const x2 = Math.floor((p2.x - minX) * scale);
    const y2 = Math.floor((p2.y - minY) * scale);

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

  // Draw rectangle corners and edges
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

  // Mark corners with special characters
  if (mx1 >= 0 && mx1 < canvasWidth && my1 >= 0 && my1 < canvasHeight) canvas[my1][mx1] = '┌';
  if (mx2 >= 0 && mx2 < canvasWidth && my1 >= 0 && my1 < canvasHeight) canvas[my1][mx2] = '┐';
  if (mx1 >= 0 && mx1 < canvasWidth && my2 >= 0 && my2 < canvasHeight) canvas[my2][mx1] = '└';
  if (mx2 >= 0 && mx2 < canvasWidth && my2 >= 0 && my2 < canvasHeight) canvas[my2][mx2] = '┘';

  return canvas.map(row => row.join('')).join('\n');
}

// Test cases
const testCases = {
  'L-Shape': [
    [0, 0],
    [10, 0],
    [10, 5],
    [5, 5],
    [5, 10],
    [0, 10]
  ],
  'T-Shape': [
    [3, 0],
    [7, 0],
    [7, 6],
    [10, 6],
    [10, 8],
    [0, 8],
    [0, 6],
    [3, 6]
  ],
  'Rectangle with Extension': [
    [0, 0],
    [12, 0],
    [12, 8],
    [14, 8],
    [14, 10],
    [12, 10],
    [12, 8],
    [0, 8]
  ],
  'Complex House': [
    [2, 0],
    [8, 0],
    [8, 2],
    [10, 2],
    [10, 6],
    [8, 6],
    [8, 8],
    [6, 8],
    [6, 10],
    [4, 10],
    [4, 8],
    [2, 8],
    [2, 6],
    [0, 6],
    [0, 2],
    [2, 2]
  ],
  'Simple Rectangle': [
    [0, 0],
    [10, 0],
    [10, 6],
    [0, 6]
  ]
};

// Run tests
console.log('POLYGON MAIN BODY DETECTION TEST');
console.log('='.repeat(60));

Object.entries(testCases).forEach(([name, polygon]) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));

  const result = determineMainBody(polygon);

  console.log('\nVisualization:');
  console.log('Legend: * = Polygon edge, · = Inside polygon, # = Main body rectangle');
  console.log('');
  const visualization = visualizeMainBody(polygon, result);
  console.log(visualization);

  console.log(`\nConfidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Method: ${result.method}`);
});

console.log(`\n${'='.repeat(60)}`);
console.log('TEST COMPLETE');
console.log('='.repeat(60));