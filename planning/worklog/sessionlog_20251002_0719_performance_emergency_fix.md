# Session Log: Performance Emergency Fix
**Date:** 2025-10-02 07:19
**Focus:** Critical performance fixes - page unresponsive, 96% RAM usage (32GB system)

## Crisis Report

User reported catastrophic performance issues after yesterday's coordinate system fixes:
- **Page unresponsive after 7-8 minutes**
- **Three.js consuming 96% of 32GB RAM**
- **Waterfall dashboard unable to scroll**
- **Three.js showing blank white background in bright mode**

## Root Cause Analysis

### Issue 1: Grid Algorithm Complexity Explosion
The grid generation algorithm has **O(n⁴) nested loop complexity**:

1. **Line Generation**: For each edge direction × every corner = n² lines
2. **Intersection Finding**: Compare all line pairs = O(n²) additional
3. **Tile Formation**: For each parallel set pair × adjacent line pairs = O(n²) again
4. **Coverage Sampling**: Each tile samples 5×5 = 25 points with polygon containment tests

**Result**: Buildings with > 10 corners could generate thousands of mesh objects

### Issue 2: useMemo Dependencies Causing Regeneration
The `gridVisualization` useMemo had **12 dependencies** including:
- `selectedComponent` - changes on every selection
- `hoveredComponent` - **changes on every mouse move!**
- `lightenColor` - function reference (unstable)

**Result**: Entire grid regenerated on every hover, creating new mesh objects and never releasing old ones

### Issue 3: Each Grid Tile = Separate Mesh Object
Every grid tile creates:
- One `<mesh>` component
- One geometry (ShapeGeometry or PlaneGeometry)
- One material (MeshBasicMaterial)
- Event handlers for hover/click

**Result**: 500 tiles = 500 mesh objects = massive GPU memory consumption

## Fixes Applied

### Fix 1: Aggressive Performance Limits
```typescript
// BEFORE
const MAX_GRID_LINES = 100;
const MAX_GRID_TILES = 500;

// AFTER
const MAX_GRID_LINES = 40;   // 60% reduction
const MAX_GRID_TILES = 100;  // 80% reduction
const MAX_CORNERS_FOR_GRID = 12; // NEW: Skip grid entirely for complex buildings
```

**File**: `src/components/waterfall/three/BuildingMesh.tsx` lines 531-534

### Fix 2: Early Exit for Complex Buildings
```typescript
// Skip grid generation for buildings with > 12 corners
if (footprint.length > MAX_CORNERS_FOR_GRID) {
  console.warn(`Building has ${footprint.length} corners (> ${MAX_CORNERS_FOR_GRID}). Skipping grid generation to prevent performance issues.`);
  return {
    walls: wallMeshes,
    roof: null,
    grid: [],
    rafters: [],
    metadata: {
      wallCount: wallMeshes.length,
      roofArea: 0,
      gridTileCount: 0,
      skippedDueToComplexity: true
    }
  };
}
```

**File**: `src/components/waterfall/three/BuildingMesh.tsx` lines 537-551

### Fix 3: Early Loop Termination
```typescript
// Added `tileGenerationComplete` flag to break out of nested loops
let tileGenerationComplete = false;
for (let setA = 0; setA < parallelSets.length && !tileGenerationComplete; setA++) {
  for (let setB = setA + 1; setB < parallelSets.length && !tileGenerationComplete; setB++) {
    for (let i = 0; i < linesA.length - 1 && !tileGenerationComplete; i++) {
      for (let j = 0; j < linesB.length - 1 && !tileGenerationComplete; j++) {
        if (gridSquares.length >= MAX_GRID_TILES) {
          tileGenerationComplete = true;
          break;
        }
```

**File**: `src/components/waterfall/three/BuildingMesh.tsx` lines 678-722

### Fix 4: Reduced Coverage Sampling
```typescript
// BEFORE
const samples = 5; // 5x5 = 25 samples per tile

// AFTER
const samples = 3; // 3x3 = 9 samples per tile (64% reduction)
```

**File**: `src/components/waterfall/three/BuildingMesh.tsx` line 758

### Fix 5: Removed Hover/Select from useMemo Dependencies
```typescript
// BEFORE
}, [footprint, showGrid, showGridLines, showGridSquares, gridColorScheme,
    selectedComponent, hoveredComponent, lightenColor, height, roofPlacementFloor, numberOfFloors]);

// AFTER
}, [footprint, showGrid, showGridLines, showGridSquares, gridColorScheme,
    height, roofPlacementFloor, numberOfFloors]);
// REMOVED: selectedComponent, hoveredComponent, lightenColor
```

**File**: `src/components/waterfall/three/BuildingMesh.tsx` lines 1490-1491

**Trade-off**: Grid tiles no longer highlight on hover/select, but prevents memory leak

## Performance Impact

### Before
- Complex buildings: 500+ tiles
- Grid regenerates on every mouse move
- RAM usage: 30GB+ (96% of 32GB)
- Page: Unresponsive after 7-8 minutes

### After (Estimated)
- Simple buildings (≤12 corners): Max 100 tiles
- Complex buildings (>12 corners): 0 tiles (grid skipped)
- Grid regenerates only when footprint/visibility changes
- RAM usage: Should stabilize
- Page: Should remain responsive

## Known Limitations After Fix

1. **No hover highlighting** on grid tiles (removed to prevent regeneration)
2. **No select highlighting** on grid tiles
3. **Grid disabled** for buildings with >12 corners
4. **Lower coverage accuracy** (3x3 vs 5x5 sampling)
5. **Fewer tiles** for analysis (max 100 vs 500)

## Next Steps (Future Work)

### Immediate Testing Required
- [ ] Verify RAM usage stays under 10GB
- [ ] Test with simple rectangle building (4 corners)
- [ ] Test with L-shape building (8 corners)
- [ ] Test with complex building (15+ corners - should skip grid)
- [ ] Confirm page remains responsive during navigation

### Future Architectural Improvements
1. **Separate grid data from visualization**:
   - Generate grid data once (in useMemo)
   - Apply hover/select styling in render pass only

2. **Use instanced mesh for tiles**:
   - Instead of 100 separate meshes
   - Single instanced mesh with 100 instances
   - 99% memory reduction for grid rendering

3. **Implement LOD (Level of Detail)**:
   - Coarse grid when zoomed out
   - Fine grid only for selected areas
   - Progressive loading

4. **Consider Web Workers**:
   - Move grid calculation to background thread
   - Stream results progressively
   - Don't block main thread

5. **Add performance monitoring**:
   - Track mesh count
   - Track memory usage
   - Warn when limits approached

## Files Modified

1. `src/components/waterfall/three/BuildingMesh.tsx`
   - Lines 531-534: Performance limits
   - Lines 537-551: Early exit for complex buildings
   - Lines 574: Safety check in forEach
   - Lines 678-722: Early loop termination
   - Lines 758: Reduced sampling
   - Lines 1490-1491: Fixed useMemo dependencies

## Key Insights

### Performance Antipatterns Identified
1. **Never put hover state in useMemo dependencies** - causes regeneration every frame
2. **Mesh object count matters more than polygon count** - 100 meshes >> 1 mesh with 100 polygons
3. **O(n⁴) algorithms are never acceptable** in real-time rendering
4. **Function references in dependencies** break memoization (lightenColor)

### React Three Fiber Lessons
- Each `<mesh>` creates GPU buffers and memory allocation
- Prefer InstancedMesh for repeated geometry
- Keep useMemo dependencies minimal and stable
- Separate data computation from presentation

### Grid Algorithm Reality
The current grid decomposition algorithm is **fundamentally unsuitable** for real-time use:
- Only works reliably for simple orthogonal buildings
- Complexity explodes for non-rectangular shapes
- Memory footprint too large for many tiles

**Recommendation**: For production, replace with:
- Simpler regular grid (not following building edges)
- Or quad-tree spatial decomposition
- Or don't visualize grid at all - just calculate roof segments

## Emergency vs Permanent Fix

This is an **emergency fix** to restore usability. The performance characteristics are:

✅ **Good enough for**:
- Simple rectangular buildings
- L-shapes, T-shapes (≤12 corners)
- Demo/prototype purposes

❌ **Not suitable for**:
- Complex buildings (>12 corners)
- Production deployment
- Buildings requiring fine-grained roof analysis

**Permanent solution requires**: Complete grid algorithm redesign (estimated 1-2 days work)

---

## Notes for Next Session

- Grid tiles won't show hover effects - this is intentional to prevent memory leak
- Buildings with >12 corners will show walls only (no grid/roof visualization)
- If user needs complex building support, must refactor to instanced meshes
- Consider adding UI warning when grid is skipped due to complexity
