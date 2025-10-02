/**
 * Test script for polygon main body detection
 */

import { determineMainBody, visualizeMainBody } from './polygon-main-body';

// Test case 1: Simple L-shape
const lShape: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 5],
  [5, 5],
  [5, 10],
  [0, 10],
  [0, 0]
];

// Test case 2: T-shape
const tShape: [number, number][] = [
  [3, 0],
  [7, 0],
  [7, 6],
  [10, 6],
  [10, 8],
  [0, 8],
  [0, 6],
  [3, 6],
  [3, 0]
];

// Test case 3: Rectangle with small extension
const rectWithExtension: [number, number][] = [
  [0, 0],
  [12, 0],
  [12, 8],
  [14, 8],
  [14, 10],
  [12, 10],
  [12, 8],
  [0, 8],
  [0, 0]
];

// Test case 4: Complex shape (house-like)
const complexShape: [number, number][] = [
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
  [2, 2],
  [2, 0]
];

function runTest(name: string, polygon: [number, number][]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));

  const result = determineMainBody(polygon);

  console.log('\nVisualization:');
  console.log('* = Polygon outline');
  console.log('# = Main body rectangle');
  console.log('');
  const visualization = visualizeMainBody(polygon, result);
  console.log(visualization);

  if (result.alternativeBodies && result.alternativeBodies.length > 0) {
    console.log(`\nAlternative bodies found: ${result.alternativeBodies.length}`);
    result.alternativeBodies.forEach((alt, i) => {
      console.log(`  Alternative ${i + 1}: Area=${alt.area.toFixed(1)}, Coverage=${(alt.coverage * 100).toFixed(1)}%`);
    });
  }
}

// Run all tests
export function runAllTests() {
  console.log('POLYGON MAIN BODY DETECTION TESTS');
  console.log('=' .repeat(60));

  runTest('L-Shape', lShape);
  runTest('T-Shape', tShape);
  runTest('Rectangle with Extension', rectWithExtension);
  runTest('Complex House Shape', complexShape);

  console.log(`\n${'='.repeat(60)}`);
  console.log('TESTS COMPLETE');
  console.log('='.repeat(60));
}

// Export for use in other scripts
export { lShape, tShape, rectWithExtension, complexShape };