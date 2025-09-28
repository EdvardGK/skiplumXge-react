# Master Todo List - Landingsside Energi React

## High Priority 🔴

### Production Bug
- [ ] **Fix "Rediger data" button** - Currently only logs to console in production
  - Implement proper editing overlay component
  - Add state management for overlay open/close
  - Connect to advanced form for data editing
  - Test in both development and production

### 3D Visualization
- [ ] **Invert section plane scroll direction** - Quick UX fix
  - Scroll UP → push section away (into building)
  - Scroll DOWN → pull section toward user
  - Note: Clipping planes working perfectly otherwise!
- [ ] **Fix roof algorithm** - Apply coordinate system transformation
  - Ensure roof uses same GIS Y → Three.js -Z transformation
  - Test with various building footprints

### UI/UX
- [ ] **Fix waterfall design**
  - Review and improve waterfall dashboard layout
  - Ensure responsive design works properly

## Medium Priority 🟡

### Features
- [ ] Complete integration with real Norwegian data sources
- [ ] Implement PDF report generation
- [ ] Add data export functionality

### Performance
- [ ] Optimize 3D rendering for mobile devices
- [ ] Reduce initial bundle size

## Low Priority 🟢

### Enhancements
- [ ] Remove debug axes from 3D view once stable
- [ ] Add more building types to 3D visualization
- [ ] Improve animation transitions

## Completed Today ✅
- [x] Fix 3D wall orientation (180° flip issue)
- [x] Fix walls not sitting on slabs
- [x] Fix floor divider visibility
- [x] Fix window/door placement
- [x] Fix TypeScript build errors
- [x] Document coordinate system transformation

## Notes
- Production deployment: Vercel
- Build must pass before deployment
- Always test in production after deployment