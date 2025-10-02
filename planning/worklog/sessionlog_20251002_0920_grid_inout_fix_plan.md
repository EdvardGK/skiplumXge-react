# Grid In/Out Check Fix Plan
**Date**: 2025-10-02 09:20
**Issue**: Low green tile coverage (0.53x ratio) - tiles are correctly filtered (no overlaps) but point-in-polygon test appears inaccurate

## Problem Summary

**Current Status**:
- Building footprint area: 149.40 m²
- Total tile area: 242.96 m² → 163 m² after `coverage > 0` filter
- Green tile area (99%+ coverage): 79.05 m²
- Ratio green/polygon: **0.53x (only 53% of building covered by green tiles)**

**Expected**: Green tile ratio should be 0.8-0.9x (accounting for edge tiles with partial coverage)

## Root Cause Hypotheses

### Hypothesis 1: Coordinate System Mismatch ⚠️ MOST LIKELY
**Theory**: Sample points might be tested in wrong coordinate space vs polygon
- Grid algorithm generates tiles in GIS (x, y) coordinate space
- Footprint polygon is in transformed coordinate space
- Sample points might not align with actual polygon

**Evidence**:
- Transformed footprint shows coordinates like `[-7.69, -5.47]` to `[7.86, 10]`
- Raw OSM footprint is in lat/lon `[61.596, 9.765]`
- Grid lines are generated from transformed footprint edges

**Test Plan**:
1. Log first footprint vertex coordinate
2. Test that exact coordinate with `isPointInsideFootprint()`
3. Should return `true` - if `false`, coordinate spaces are misaligned

### Hypothesis 2: Polygon Orientation (CW vs CCW)
**Theory**: Ray casting algorithm might be sensitive to polygon winding order
- Some ray casting implementations only work with counter-clockwise polygons
- OSM data might provide clockwise polygons

**Test Plan**:
1. Check if reversing polygon vertices fixes the issue
2. Calculate signed area (positive = CCW, negative = CW)

### Hypothesis 3: Sampling Resolution Too Coarse
**Theory**: 2×2 sampling (4 points) misses actual building coverage
- Edge tiles might have 1 point inside, 3 outside → 25% coverage (not green)
- Center tiles might all be inside → 100% coverage (green)
- This creates "donut" effect: green center, gray edges

**Test Plan**:
1. Temporarily increase to 4×4 sampling (16 points) for accuracy test
2. If green ratio improves significantly, sampling was the issue
3. If not, coordinate system is the issue

### Hypothesis 4: Grid Lines Not Aligned with Building
**Theory**: Grid extends beyond building, creating many edge tiles
- Grid bounding box much larger than building
- Most tiles are partial coverage (gray)
- Only small center area is full coverage (green)

**Evidence**:
- Already implemented `coverage > 0` filter
- Total/polygon ratio went from 1.63x to expected ~1.0x
- But green ratio stayed low (0.53x)

## Fix Plan (Priority Order)

### Step 1: Test Coordinate System Alignment (CRITICAL)
```typescript
// Add one-time test in grid generation
const testPoint = [footprint[0][0], footprint[0][1]]; // First vertex
const isInside = isPointInsideFootprint(testPoint[0], testPoint[1]);
console.log(`🧪 Coordinate test: First vertex ${testPoint} isInside=${isInside} (should be TRUE)`);

// Test center of polygon
const centerX = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
const centerY = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;
const centerInside = isPointInsideFootprint(centerX, centerY);
console.log(`🧪 Center test: [${centerX}, ${centerY}] isInside=${centerInside} (should be TRUE)`);
```

**Expected Result**: Both tests return `true`
**If False**: Coordinate system mismatch confirmed - need to fix transformation

### Step 2: Verify Polygon Winding Order
```typescript
// Calculate signed area
function getSignedArea(polygon: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return area / 2; // Positive = CCW, Negative = CW
}

const signedArea = getSignedArea(footprint);
console.log(`🧪 Polygon winding: ${signedArea > 0 ? 'CCW' : 'CW'} (signed area: ${signedArea})`);
```

**Expected Result**: Should be CCW (positive)
**If CW**: Try reversing polygon with `footprint.reverse()`

### Step 3: Test with Higher Sampling Resolution
```typescript
// Temporarily change samples from 2 to 4
const samples = 4; // 4×4 = 16 sample points
```

**Expected Result**: Green ratio improves to 0.7-0.8x
**If No Change**: Confirms coordinate system issue, not sampling issue

### Step 4: Visual Debug Overlay (If needed)
Create Three.js visualization showing:
- Red dots: Sample points that tested FALSE (outside)
- Green dots: Sample points that tested TRUE (inside)
- Blue outline: Actual footprint polygon
- White wireframe: Grid tiles

This will visually show if sample points are in wrong location vs polygon.

## Implementation Strategy

1. **Add diagnostic tests** (Step 1 & 2) - just logging, no changes
2. **Run dev mode** and check console output
3. **Based on test results**, implement appropriate fix:
   - If coordinate mismatch → Fix transformation
   - If winding order → Reverse polygon
   - If sampling → Increase resolution
4. **Remove diagnostic logs** once fixed
5. **Verify** green ratio is 0.8-0.9x

## Success Criteria

- ✅ Total tile area / polygon area ≈ 1.0x (no overlaps)
- ✅ Green tile area / polygon area ≈ 0.8-0.9x (80-90% coverage)
- ✅ Edge tiles show partial coverage (25%, 50%, 75%)
- ✅ Center tiles show full coverage (100%)
- ✅ No infinite loops or performance issues

## Next Steps

1. Implement Step 1 (coordinate test)
2. Check console output
3. Continue based on findings
