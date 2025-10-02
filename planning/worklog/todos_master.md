# Master TODO List - Landingsside Energi React
**Last Updated:** 2025-09-28 08:40:00
**Current Focus:** Grid-based roof algorithm development

## 🔴 High Priority - Grid & Roof Algorithm

### 1. Grid Square Analysis System
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (after line 600)
- [ ] Add function to test if grid square center is inside building polygon
- [ ] Color-code grid squares: green (fully inside), yellow (partial), red (outside)
- [ ] Calculate percentage of square area within building footprint
- [ ] Store analysis results in gridSquares array

### 2. Main Body Detection Algorithm
**Location:** Create new function in `src/lib/roof-algorithm.ts` (replace lines 94-149)
- [ ] Replace `decomposeIntoRectangles()` with `analyzeGridSquares()`
- [ ] Group adjacent "inside" squares into rectangular sections
- [ ] Identify largest connected rectangle as main body
- [ ] Flag smaller sections as wings/extensions

### 3. Roof Section Generation from Grid
**Location:** `src/lib/roof-algorithm.ts` (modify `generateRoofSections` at line 49)
- [ ] Use grid analysis instead of concave corner counting
- [ ] Create roof sections based on grouped grid rectangles
- [ ] Set ridge orientation based on rectangle proportions
- [ ] Handle overlapping sections at intersections

### 4. Grid Square Text Labels
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (line 571-575)
- [ ] Replace black plane with Text component from @react-three/drei
- [ ] Display grid coordinates (i,j) on each square
- [ ] Add area calculation in m²
- [ ] Make text face camera (billboard behavior)

## 🟡 Medium Priority - Visualization

### 5. Grid Filtering Controls
**Location:** `src/components/waterfall/sections/PropertyHeroSection.tsx` (after line 644)
- [ ] Add slider for grid extension distance (currently fixed at 3m)
- [ ] Add toggle for showing only inside squares
- [ ] Add opacity control for grid lines

### 6. Roof Section Highlighting
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (lines 786-941)
- [ ] Re-enable roof rendering (currently disabled)
- [ ] Add selection/hover states for roof sections
- [ ] Show roof section data in component info panel
- [ ] Color-code by priority (main/wing/connector)

## 🟢 Low Priority - Testing & Polish

### 7. Test with Various Building Footprints
**Location:** Test data in `src/components/waterfall/sections/PropertyHeroSection.tsx` (line 134)
- [ ] Create test footprints: L-shape, T-shape, H-shape, complex
- [ ] Add building selector dropdown
- [ ] Document which shapes work/fail
- [ ] Screenshot results for documentation

### 8. Performance Optimization
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (lines 457-525)
- [ ] Memoize grid calculation with useMemo
- [ ] Add level-of-detail (LOD) for grid display
- [ ] Limit grid squares to reasonable maximum (e.g., 100)
- [ ] Cache grid analysis results

## 📝 Documentation

### 9. Grid Algorithm Documentation
**Location:** Create `src/lib/grid-algorithm.ts`
- [ ] Extract grid generation logic to separate file
- [ ] Add JSDoc comments explaining the algorithm
- [ ] Create visual diagram of grid extension logic
- [ ] Document coordinate transformations

### 10. Roof Algorithm Rewrite Documentation
**Location:** `src/lib/roof-algorithm.ts` (top of file)
- [ ] Document why corner counting failed
- [ ] Explain grid-based approach advantages
- [ ] Add examples of handled edge cases
- [ ] Include Norwegian building standards references

## 🐛 Known Issues to Fix

### 11. Non-Axis-Aligned Buildings
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (lines 518-524)
- [ ] Current grid only handles nearly axis-aligned walls
- [ ] Need arbitrary angle grid generation
- [ ] Consider rotated bounding box approach

### 12. Grid Square Intersection Calculation
**Location:** `src/components/waterfall/three/BuildingMesh.tsx` (lines 513-529)
- [ ] Some grid squares missing at building corners
- [ ] Duplicate lines when walls are colinear
- [ ] Need to merge overlapping grid extensions

## 🚀 Next Session Starting Points

**Quick Start Commands:**
```bash
cd /mnt/host/c/Users/edkjo/theSpruceForgeDevelopment/projects/active/landingsside-energi-react
npm run dev
# Open http://localhost:3000/dashboard-waterfall
# Enable grid visualization in sidebar
```

**Key Files to Open:**
1. `src/components/waterfall/three/BuildingMesh.tsx` - Grid visualization
2. `src/lib/roof-algorithm.ts` - Roof generation logic
3. `src/components/waterfall/sections/PropertyHeroSection.tsx` - UI controls

**Test Coordinates:**
- Current test building: Hesthagen 16 (from PropertyHeroSection line 134)
- Grid squares visible at ground level (Y=0.05)
- Axes toggle in Visualisering panel

## Session History
- 2025-09-28 08:21: Fixed UI overlaps, added initial grid from roof sections
- 2025-09-28 08:38: Redesigned grid based on wall extensions, added axes toggle
- **Next:** Implement grid square analysis for roof generation

---

**Note:** Line numbers accurate as of 2025-09-28 08:40. Use file search if code has moved.