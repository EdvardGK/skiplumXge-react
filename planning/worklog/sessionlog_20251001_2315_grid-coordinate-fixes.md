# Session Log: Grid Coordinate System Fixes
**Date:** 2025-10-01 23:15
**Focus:** Investigating and fixing grid tile coverage calculation and boundary issues

## Issues Identified

### 1. Coverage Calculation Bug (FIXED ✓)
**Problem:** Grid tiles showing 76% coverage instead of 100% for tiles that appeared fully inside the building.

**Root Cause:** Coordinate system mismatch in `isPointInsideFootprint` function
- Function was called with GIS coordinates (x, y) from bilinear interpolation
- But function was negating the second parameter: `footprintY = -z`
- This assumed input was Three.js Z coordinate, but it was actually GIS Y
- Result: Y-axis flip caused sample points to test against wrong locations

**Fix Applied:**
```typescript
// BEFORE (incorrect)
const isPointInsideFootprint = (x: number, z: number): boolean => {
  const footprintX = x;
  const footprintY = -z;  // ❌ Wrong! z is already GIS Y
  ...
}

// AFTER (correct)
const isPointInsideFootprint = (gisX: number, gisY: number): boolean => {
  // Input is already in GIS coordinates - use directly
  // No transformation needed
  ...
}
```

**File:** `src/components/waterfall/three/BuildingMesh.tsx` lines 467-483

---

### 2. Grid Line Over-Extension (FIXED ✓)
**Problem:** Grid tiles appearing far outside the building bounding box

**Root Cause:** Excessive line extension calculation
- Extension was `buildingDiagonal × 10`
- For a 20m × 15m building (diagonal ~25m), lines extended ±250m!
- Bounding box was only polygon bounds ±3m
- Result: Intersections created far outside intended grid area

**Fix Applied:**
```typescript
// BEFORE (incorrect)
const extension = buildingDiagonal * 10;  // ❌ Way too large

// AFTER (correct)
const boundingBoxDiagonal = Math.sqrt(
  Math.pow(boundingBox.maxX - boundingBox.minX, 2) +
  Math.pow(boundingBox.maxY - boundingBox.minY, 2)
);
const extension = boundingBoxDiagonal;  // ✓ Just enough to reach bounding box corners
```

**Rationale:**
- Bounding box is polygon bounds + 3m gridExtension
- Diagonal of this box is exactly what's needed to reach all corners
- No more tiles extending hundreds of meters outside building

**File:** `src/components/waterfall/three/BuildingMesh.tsx` lines 537-544

---

### 3. Coverage Threshold Inconsistency (FIXED ✓)
**Problem:** Code comment said "≥99% coverage" but actual filter used `>= 0.70`

**Fix Applied:**
```typescript
// BEFORE
const greenSquares = gridSquares.filter(s => s.coverage >= 0.70);  // ❌ 70% threshold

// AFTER
const greenSquares = gridSquares.filter(s => s.coverage >= 0.99);  // ✓ 99% threshold
```

**File:** `src/components/waterfall/three/BuildingMesh.tsx` line 770

---

### 4. TypeScript Interface Update (FIXED ✓)
**Problem:** `corners` property missing from gridSquares type definition

**Fix Applied:**
```typescript
const gridSquares: {
  id: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: [number, number, number];
  coverage: number;
  isInside: boolean;
  corners?: [number, number][];  // ✓ Added
}[] = [];
```

**File:** `src/components/waterfall/three/BuildingMesh.tsx` lines 458-465

---

### 5. Heat Particle Removal (FIXED ✓)
**Problem:** `showHeatParticles` prop still being passed to BuildingMesh but prop doesn't exist

**Fix Applied:** Removed prop from PropertyHeroSection.tsx line 530

---

## Analysis: Why Walls Work But Grids Don't

### Wall Rendering (Always Works)
- **Direct polygon traversal:** Iterates over footprint edges directly
- **Simple positioning:** Each wall positioned between adjacent corners
- **No complex calculations:** Just basic geometry between two points
- **Coordinate handling:** Uses GIS X directly, negates Y to get Three.js Z

### Grid Rendering (Hit-or-Miss)
- **Complex algorithm:** Creates extended lines through all corners in each edge direction
- **Intersection-based:** Finds where non-parallel lines intersect
- **Quadrilateral formation:** Groups 4 intersections into tiles
- **Fragile:** Can fail if lines don't intersect cleanly or form invalid quads

**Why it fails for complex buildings:**
- Non-orthogonal angles create unexpected intersection patterns
- Many edge directions overwhelm the parallel-set grouping
- Extended lines may not form valid quadrilaterals
- Intersection-finding may miss corner cases

---

## Build Status

✅ **Production build successful** (Done in 27.81s)
- TypeScript compilation passed
- All routes compiled successfully
- No linting errors
- Bundle sizes reasonable (dashboard-waterfall: 516 kB)

---

## Next Steps

### Testing Required
- [ ] Verify grid tiles now stay within bounding box bounds
- [ ] Test coverage percentages show 100% for fully-inside tiles
- [ ] Test with various building shapes:
  - [ ] Simple rectangle
  - [ ] L-shape
  - [ ] U-shape
  - [ ] Complex polygon with many edges
  - [ ] Non-orthogonal angles
- [ ] Check roof segmentation (relies on green tile analysis)

### Potential Future Improvements
1. **Add quadrilateral validation:** Check that 4 corners form valid convex quad
2. **Add boundary filtering:** Additional safety check to remove stray tiles
3. **Improve intersection logic:** Better tolerance for near-miss intersections
4. **Debug visualization:** Add logging to identify which buildings cause issues

---

## Files Modified

1. `src/components/waterfall/three/BuildingMesh.tsx`
   - Line 467-483: Fixed `isPointInsideFootprint` coordinate system
   - Line 537-544: Reduced grid line extension from 10x to 1x diagonal
   - Line 770: Increased coverage threshold from 0.70 to 0.99
   - Line 458-465: Added `corners` property to gridSquares type

2. `src/components/waterfall/sections/PropertyHeroSection.tsx`
   - Line 530: Removed `showHeatParticles` prop

---

## Key Insights

### Coordinate System Rules (Three.js + GIS)
- **GIS Convention:** X = East, Y = North, Z = Elevation
- **Three.js Convention:** X = Right, Y = Up, Z = Forward (negative = into screen)
- **Transformation:** GIS (x,y) → Three.js (x, 0, -y) for ground plane
- **Critical:** Always be explicit about which coordinate system is in use

### Grid Algorithm Complexity
The grid decomposition algorithm is significantly more complex than direct polygon rendering:
- Walls: O(n) where n = number of edges
- Grids: O(n²) for line intersections, then O(m²) for tile formation where m = number of lines
- This complexity is necessary for roof segmentation analysis
- But makes it fragile for unusual building shapes

### Extension Calculation Philosophy
- Previous: "Make it big enough to definitely work" → 10x multiplier
- Current: "Make it exactly what's needed" → Bounding box diagonal
- Result: More predictable behavior, fewer edge cases

---

## Notes for Next Session

- **Grid fixes not yet tested visually** - need to check if tiles now respect bounding box
- Coverage calculation fix should eliminate 76% issue
- May still need additional validation for complex building shapes
- Consider adding debug mode to visualize bounding box and line extensions
