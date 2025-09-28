# Session Log - 2025-09-28 01:12:14 - Coordinate System Fix Success

## Major Breakthrough: Three.js vs GIS Coordinate Systems

### The Problem
Walls were appearing flipped 180 degrees relative to floor/ceiling slabs in the 3D building visualization. Multiple rotation attempts (Math.PI additions, axis rotations) had no effect, suggesting a deeper coordinate system issue.

### Root Cause Discovery
The issue stemmed from a fundamental mismatch in how Three.js and GIS systems interpret coordinates:

#### GIS/Footprint Convention:
- Uses X (East), Y (North) as the primary horizontal plane
- Building footprints are naturally expressed as [x, y] coordinates
- Z represents elevation/height

#### Three.js Convention:
- Uses X (Right), Z (Forward) as the ground plane
- Y represents vertical (up)
- This is standard in 3D graphics (OpenGL/WebGL)

### The Transformation Challenge

#### Slabs (Working Correctly):
1. Created Shape in XY plane using footprint [x, y]
2. Rotated -90° around X-axis (`rotation={[-Math.PI / 2, 0, 0]}`)
3. This rotation transforms:
   - X stays X
   - Y → -Z (footprint north becomes 3D forward)
   - Shape's normal (was +Z) → +Y (becomes up)

#### Walls (Were Broken):
1. Directly mapped footprint to 3D: [x, y] → [x, 0, z]
2. Used footprint Y as positive Z
3. This created a 180° flip because slabs use Y as negative Z

### The Solution
```javascript
// Before (incorrect):
const centerZ = (outerCorner[1] + nextOuterCorner[1] + innerCorner[1] + nextInnerCorner[1]) / 4;

// After (correct):
const centerZ = -(outerCorner[1] + nextOuterCorner[1] + innerCorner[1] + nextInnerCorner[1]) / 4;
```

Also fixed wall normals:
```javascript
// Before:
const wallNormalZ = wallDX / wallLength;

// After:
const wallNormalZ = -wallDX / wallLength;
```

### Key Insights

1. **Coordinate System Translation is Critical**: When working with GIS data in Three.js, you must consistently transform from GIS conventions (XY horizontal) to Three.js conventions (XZ horizontal).

2. **Rotation Order Matters**: The slab's -90° X-axis rotation specifically maps Y to -Z, not +Z. This negative is crucial.

3. **Debug Visualization Helps**: Adding color-coded axes (Red=X, Green=Y/Up, Blue=Z/Forward) made the issue visible.

4. **Consistency is Key**: All geometry must use the same transformation. Mixing conventions creates orientation mismatches.

### Technical Details

#### Coordinate Mapping Rules:
- **GIS → Three.js Ground Plane**: [x, y] → [x, 0, -y]
- **GIS North**: +Y in footprint → -Z in Three.js
- **GIS East**: +X in footprint → +X in Three.js
- **Elevation**: Becomes +Y in Three.js

#### Why Negative Z?
In Three.js default camera setup:
- Camera looks down -Z axis (into the screen)
- Positive Z comes toward viewer
- Negative Z goes away from viewer
- GIS "North" (top of map) should go "into" the scene, hence -Z

### Files Modified
- `/src/components/waterfall/three/BuildingMesh.tsx` - Fixed wall positioning and normals
- `/planning/worklog/sessionlog_20250928_3d_walls.md` - Updated with solution

### Testing Confirmation
- Walls now properly trace building footprint
- Wall orientation matches slab orientation
- Building appears correctly from all angles
- Debug axes confirm coordinate system alignment

### Lessons Learned
1. Always check coordinate system conventions when mixing GIS and 3D graphics
2. Visual debug tools (axes) are invaluable for spatial problems
3. When rotations don't work, the issue is likely in the base coordinates
4. Document coordinate transformations clearly in code

### Time Invested
~3 hours debugging, multiple failed attempts before identifying root cause

### Next Steps
- Consider removing debug axes once confirmed stable
- Document this coordinate convention in component comments
- Apply same transformation consistency to roof geometry
- Ensure windows/doors also follow correct transformation

## Success Criteria Met
✅ Walls align with slabs
✅ Building footprint correctly traced
✅ Consistent coordinate system throughout
✅ Solution documented for future reference