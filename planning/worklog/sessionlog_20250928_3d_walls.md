# Session Log - 2025-09-28 - 3D Building Wall Issues

## Issue: Walls Not Tracing Polygon Correctly

### Problem Description
- Walls are not following the building footprint polygon correctly
- Slabs (floors/ceilings) trace the polygon perfectly
- Walls appear "upside down" or misaligned compared to slabs
- Offset calculation for 600mm wall thickness not working as expected

### Technical Analysis

#### Coordinate System Mismatch
1. **Slabs**:
   - Use footprint as `[x, y]` coordinates
   - Create a Shape in XY plane
   - Rotate -90° around X-axis to lay flat
   - Result: Shape lies in XZ plane with Y pointing up

2. **Walls**:
   - Initially tried to use footprint as `[x, z]` directly
   - This caused misalignment with slabs

#### Polygon Offset Issues
1. **Initial Approach**: Tried to calculate "inward" offset uniformly
   - **Problem**: There's no uniform "inward" direction in 3D space
   - Each edge needs to move perpendicular to itself

2. **Corrected Approach**:
   - Calculate perpendicular for each edge independently
   - Move each edge 600mm perpendicular to reduce polygon area
   - Find intersections of offset edges to get new corners

3. **Winding Order Confusion**:
   - Signed area calculation determines clockwise vs counter-clockwise
   - Positive area = clockwise, Negative = counter-clockwise
   - For area reduction: CW needs one perpendicular direction, CCW needs opposite

### Current Implementation Status

#### Working:
- Basic wall positioning along polygon edges
- Wall rendering and material properties
- Clipping plane functionality
- Fullscreen 3D view mode

#### Not Working:
- Proper 600mm offset calculation
- Walls still appear "upside down" relative to slabs
- Coordinate system consistency between walls and slabs

### Key Code Sections

1. **Offset Calculation** (`BuildingMesh.tsx` lines 293-400):
   - Calculates signed area for winding order
   - Offsets each edge perpendicular to itself
   - Finds intersections for new corners

2. **Wall Generation** (`BuildingMesh.tsx` lines 410-450):
   - Maps footprint corners to wall segments
   - Positions walls between outer and inner (offset) corners
   - Calculates rotation angle for each wall segment

### Attempted Fixes
1. ✅ Simplified wall generation from complex offset algorithm
2. ✅ Added proper edge-by-edge perpendicular offset
3. ✅ Implemented line intersection for corner calculation
4. ❌ Tried negating Z coordinate - made things worse (incorrect implementation)
5. ❌ Flipped offset direction multiple times - still not correct
6. ❌ Added Math.PI to wallAngle - no change, walls still flipped 180°
7. ❌ Added Math.PI to X rotation - no change
8. ✅ Added color-coded debug axes (Red=X, Green=Y, Blue=Z) to visualize coordinate system
9. ✅ **FINAL FIX**: Negated centerZ and wallNormalZ to match slab coordinate transformation

### Next Steps to Try
1. **Debug coordinate transformation**: Add visual markers to show footprint vs offset polygon
2. **Verify winding order**: Log actual winding order and offset direction
3. **Match slab transformation exactly**: Create walls using Shape geometry like slabs do
4. **Alternative approach**: Use a proven polygon offset library instead of custom implementation

### User Feedback
- "Walls are completely crazy, not even forming a building"
- "Walls are upside down"
- "Slabs work perfectly, walls don't"

### Root Cause Hypothesis
The coordinate system interpretation between slabs and walls is fundamentally different. Slabs create geometry in XY plane then rotate, while walls try to work directly in XZ plane. This rotation changes the winding order perception and offset direction.

### Session End State (Final Fix Applied)
- **ISSUE RESOLVED**: Walls now correctly aligned with slabs
- Root cause identified: Coordinate system mismatch between slabs and walls
  - Slabs: Footprint Y → -Z (after -90° X rotation)
  - Walls: Were using footprint Y → +Z (direct mapping)
- **Solution Applied**:
  1. Negated centerZ calculation for walls
  2. Negated wallNormalZ for correct orientation
  3. Reverted rotation to [0, wallAngle, 0]
- Color-coded axes remain for debugging (Red=X, Green=Y, Blue=Z)
- Walls now properly trace the building footprint matching slab orientation

## Files Modified
- `/src/components/waterfall/three/BuildingMesh.tsx`
- `/src/components/waterfall/sections/PropertyHeroSection.tsx`
- `/src/app/dashboard-waterfall/page.tsx`

## Time Spent
~2 hours debugging wall polygon tracing issues

## Priority for Next Session
HIGH - This is blocking proper 3D building visualization