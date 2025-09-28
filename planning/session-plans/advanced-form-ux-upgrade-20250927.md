# Advanced Form UX Upgrade Plan
**Date:** September 27, 2025
**Time:** 11:24 AM
**Component:** DataEditingOverlay.tsx

## Objective
Upgrade the DataEditingOverlay (advanced technical assessment form) to match the modern UX functionality of BuildingDataForm, ensuring consistent user experience across all forms in the application.

## Current State Analysis

### DataEditingOverlay Limitations
- Uses simple Select dropdowns for single energy system selection
- No support for mixed energy systems with percentage distribution
- Fixed grid layouts without dynamic height matching between columns
- Energy systems scattered across different tabs (Mechanical, Electrical)
- No visual indication of primary/secondary/tertiary systems

### BuildingDataForm Advantages (Target State)
- RankedMultiSelect with percentage distribution
- Dynamic height matching between grid columns
- Responsive layout that adapts to screen size
- All energy systems in one coherent section
- Visual ranking badges (hidden on mobile for space)

## Implementation Plan

### Phase 1: Data Structure Update
**Goal:** Support multi-select energy systems with percentage distribution

#### Current Structure
```typescript
oppvarmingsType: string;
ventilasjonsType: string;
varmtvannsType: string;
belysningType: string;
```

#### New Structure
```typescript
heatingSystems: RankedSelection[];
ventilationSystem: string; // Keep single but use multi-select UI for consistency
hotWaterSystems: RankedSelection[];
lightingSystems: RankedSelection[];
```

### Phase 2: Component Updates

#### 2.1 Import RankedMultiSelect
```typescript
import { RankedMultiSelect, RankedSelection } from '@/components/ui/ranked-multi-select';
```

#### 2.2 Add State Management
- Initialize arrays for multi-select systems
- Add handlers for selection changes
- Implement percentage validation

#### 2.3 Replace Select Components
Location: Lines 936-983 (Mechanical tab) and 1003-1014 (Electrical tab)
- Replace Select with RankedMultiSelect
- Configure max selections (3 for most, 1 for ventilation)
- Add proper Norwegian labels and tooltips

### Phase 3: Dynamic Layout Implementation

#### 3.1 Add Height Matching Logic
```typescript
const [topRowHeight, setTopRowHeight] = useState<number | undefined>();
const [bottomRowHeight, setBottomRowHeight] = useState<number | undefined>();

const heatingRef = useRef<HTMLDivElement>(null);
const ventilationRef = useRef<HTMLDivElement>(null);
const lightingRef = useRef<HTMLDivElement>(null);
const hotWaterRef = useRef<HTMLDivElement>(null);
```

#### 3.2 Implement Height Calculation
- Use requestAnimationFrame for proper DOM measurement
- Clear heights first, then measure natural heights
- Apply only on screens ≥1024px (lg breakpoint)
- React to selection array length changes

### Phase 4: Responsive Grid Updates

#### Current Grids
- `grid-cols-1 md:grid-cols-3` for technical systems
- `grid-cols-1 md:grid-cols-2` for lighting

#### New Grid Structure
```html
<!-- Energy Systems Container -->
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <!-- Left Column: Heating & Ventilation -->
  <div className="space-y-4">
    <div ref={heatingRef} style={{ minHeight: topRowHeight }}>
      <!-- Heating Systems -->
    </div>
    <div ref={ventilationRef} style={{ minHeight: bottomRowHeight }}>
      <!-- Ventilation System -->
    </div>
  </div>

  <!-- Right Column: Lighting & Hot Water -->
  <div className="space-y-4">
    <div ref={lightingRef} style={{ minHeight: topRowHeight }}>
      <!-- Lighting Systems -->
    </div>
    <div ref={hotWaterRef} style={{ minHeight: bottomRowHeight }}>
      <!-- Hot Water Systems -->
    </div>
  </div>
</div>
```

### Phase 5: UI Enhancements

#### 5.1 Mobile Optimizations
- Hide ranking badges on narrow screens: `hidden sm:inline-flex`
- Stack columns on mobile: `grid-cols-1 lg:grid-cols-2`
- Responsive button sizing

#### 5.2 Z-index Fixes
- Ensure all SelectContent and PopoverContent have `style={{ zIndex: 9999 }}`
- Already implemented: `z-[10000]` on existing selects

#### 5.3 Modal Updates
- Change max-width from `max-w-4xl` to `max-w-6xl`
- Ensure proper padding and overflow handling

### Phase 6: Energy Systems Consolidation
**Move all energy systems to single tab for better UX**

#### Current Distribution
- Mechanical Tab: Heating, Ventilation, Hot Water
- Electrical Tab: Lighting

#### New Organization
- Create dedicated "Energisystemer" section in General tab
- Or create new "Energi" tab combining all systems
- Maintain 2x2 grid layout for consistency

## Migration Considerations

### Data Compatibility
- Support reading old format (strings) for backward compatibility
- Convert to new format (arrays) on save
- Primary system = 100% in simple cases

### Validation Rules
- Percentages must sum to 100% for each system type
- Maximum 3 selections per system (except ventilation: 1)
- Minimum 1 selection required

## Testing Checklist
- [ ] All dropdowns appear above modal (z-index)
- [ ] Dynamic heights adjust when adding/removing selections
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Percentage validation works correctly
- [ ] Data saves and loads properly
- [ ] Backward compatibility maintained

## Success Metrics
- Consistent UX between BuildingDataForm and DataEditingOverlay
- Improved data entry for mixed energy systems
- Better mobile experience
- Reduced user confusion from scattered energy fields

## Next Steps
1. Implement Phase 1-2 (Data structure and basic multi-select)
2. Test functionality
3. Implement Phase 3-4 (Dynamic layout)
4. Implement Phase 5-6 (UI polish and reorganization)
5. Final testing and validation