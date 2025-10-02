# Next Steps - Roof System Integration
**Date**: 2025-09-28
**Purpose**: Define clear path forward for roof system improvements

## Critical Understanding Required

### 1. Current Roof System Dependencies
**Must Map**:
- [ ] How insulation thickness affects roof geometry
- [ ] Where roof height calculations originate
- [ ] How `roofData` is populated from `generateRoof`
- [ ] What triggers roof re-calculation
- [ ] How bounds relate to actual footprint

**Key Variables to Track**:
```typescript
- height (building height)
- numberOfFloors
- roofData.geometry3D
- roofData.bounds
- insulation.roof.thickness
- buildingType (affects roof style?)
```

### 2. Coordinate System Reconciliation
**Current Issues**:
- Grid system works in XZ plane with specific bounds
- Roof system has its own positioning logic
- Group position at `[0, height, 0]` affects all children

**Need to Understand**:
- Why roof uses `position={[0, height, 0]}` for group
- How overhang (0.6m) is calculated and applied
- Relationship between footprint coords and roof bounds
- Why simplified roof has different calculation than complex

### 3. Height Calculation Logic

**Current Misunderstanding**:
- We placed roof eaves at floor top
- Should be: Eaves at floor top, ridge calculated from span + pitch

**Correct Formula Needed**:
```
eaveHeight = floorHeight * (roofPlacementFloor + 1)
roofSpan = buildingWidth or buildingDepth (perpendicular to ridge)
roofPitch = 22-30° (Norwegian standard)
ridgeHeight = eaveHeight + (roofSpan/2 * tan(roofPitch))
```

## Integration Strategy

### Phase 1: Understand Legacy System
1. **Trace `roofData` Flow**:
   - Where is it created? (line ~147)
   - What populates geometry3D?
   - When does it fall back to simple roof?

2. **Document Current Behavior**:
   - What makes roof choose X vs Y orientation?
   - How does overhang affect visual appearance?
   - Why color #1f2937 (dark gray)?

3. **Map All Roof Interactions**:
   - Click handlers for roof sections
   - Hover effects
   - Context menu actions
   - Clipping plane support

### Phase 2: Merge Grid Intelligence

**Goal**: Use grid analysis to improve existing roof, not replace it

1. **Keep Legacy Structure**:
   - Maintain group positioning
   - Preserve material system
   - Keep interaction handlers

2. **Enhance with Grid Data**:
   ```typescript
   // Pseudocode for integration
   if (gridColorScheme === 'roof' && mainSegmentBounds) {
     // Override roofData.bounds with mainSegmentBounds
     // Adjust orientation based on actual main segment
     // Keep all other legacy behavior
   }
   ```

3. **Progressive Enhancement**:
   - Start with bounds override only
   - Add orientation detection
   - Finally add multi-segment support

### Phase 3: Fix Height Calculation

**Current Bug**:
- Roof doesn't move when `roofPlacementFloor` changes
- Group position updated but roof geometry unchanged

**Fix Required**:
1. Pass `roofPlacementFloor` to roof generation
2. Calculate ridge based on span + pitch
3. Ensure overhang scales appropriately

## Specific Code Locations to Examine

### Critical Functions:
1. **generateRoof** (lines 147-240)
   - Returns `{sections, intersections, geometry3D, bounds}`
   - Currently disabled for performance
   - Need to understand fallback logic

2. **Roof Rendering** (lines 1730-1880)
   - Complex multi-section rendering
   - Orientation detection logic
   - Material and interaction setup

3. **Grid Analysis** (lines 915-990)
   - Main segment detection working
   - Bounds calculation correct
   - Need to pipe this data to roof system

## Testing Checklist

Before implementing changes:
- [ ] Verify roof appears at correct floor
- [ ] Check overhang is consistent
- [ ] Ensure materials/colors correct
- [ ] Test all interaction handlers still work
- [ ] Confirm performance acceptable
- [ ] Validate with different building shapes

## Risk Mitigation

### Don't Break:
- Insulation integration
- Floor visibility system
- Section plane clipping
- Performance optimizations
- Existing interaction handlers

### Safe Approach:
1. Add feature flag: `useGridForRoof`
2. Implement alongside legacy
3. A/B test both approaches
4. Gradually migrate features
5. Remove legacy only when stable

## Key Questions to Answer

1. **Why is roof gray (#1f2937) not black?**
   - Is this intentional for Norwegian standards?
   - Does it respond to building type?

2. **What controls overhang?**
   - Fixed at 0.6m or calculated?
   - How does it affect energy calculations?

3. **Where are roof slopes defined?**
   - Currently uses `Math.PI / 5` (36°)
   - Should be 22-30° for Norway

4. **How to handle complex roofs?**
   - Current system supports multiple sections
   - Grid gives us main segment
   - How to generate dormers/extensions?

## Success Criteria

Roof system is "fixed" when:
1. ✅ Responds correctly to `roofPlacementFloor`
2. ✅ Uses grid-detected main segment for bounds
3. ✅ Maintains all existing integrations
4. ✅ Ridge height calculated from span + pitch
5. ✅ Visual appearance matches Norwegian standards
6. ✅ Performance remains acceptable
7. ✅ Can handle L-shapes and T-shapes

---

**Next Session Focus**: Map the legacy roof system completely before attempting integration