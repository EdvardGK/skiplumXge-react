# PRD Amendment: Dashboard Layout Update
## Revised Based on UX Research and User Preferences

**Amendment Date**: September 18, 2025
**Original PRD Section**: 2. Professional Dashboard (Lines 86-136)
**Reason**: UX research + user preference for no-scrolling, multi-page approach

## Original PRD Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: Property Name + Actions                      │
├─────────────────────────────────────────────────────┤
│ Row 1: Status & Facts (5 metric cards)             │
│ [Type] [BRA] [Grade] [TEK17] [Map]                 │
├─────────────────────────────────────────────────────┤
│ Row 2: Action & Results (5 action cards)           │
│ [Enova] [Waste] [Investment] [Actions] [Report]    │
├─────────────────────────────────────────────────────┤
│ Interactive Charts & Analysis (expandable)          │
└─────────────────────────────────────────────────────┘
```

## Problems with Original Layout
1. **Too Many Cards**: 10 cards create cognitive overload
2. **Expandable Content**: Violates no-scrolling preference
3. **Unclear Priority**: TEK17 compliance not emphasized as primary value
4. **Information Architecture**: Mixes facts with actions without clear hierarchy

## Revised Dashboard Layout

### Based on Modern BI Principles (Grafana, Plotly, Tableau, PowerBI)
```
┌─────────────────────────────────────────────────────┐
│ Header: [Address] + [TEK17 Status] (Primary Value)  │
├─────────────────────────────────────────────────────┤
│ Key Metrics Row (4 Cards - No Scrolling)           │
│ [Compliance] [Energy Use] [Waste Cost] [Investment] │
├─────────────────────────────────────────────────────┤
│ Action Row (3 Clear CTAs)                          │
│ [Download Report] [Book Consultation] [Share]      │
└─────────────────────────────────────────────────────┘
```

### Design Principles Applied
1. **Top-Left Priority**: TEK17 compliance status (most important info)
2. **Cognitive Load**: Maximum 4 metric cards, 3 action cards
3. **No Scrolling**: Everything fits single screen
4. **Story Flow**: Compliance → Usage → Cost → Investment → Action

## Updated Component Architecture

### Revised Interface Definitions
```typescript
interface DashboardProps {
  analysisData: EnergyAnalysisData; // Real data, no mock
  onActionClick: (action: ActionType) => void;
}

// Simplified metric cards (4 instead of 10)
interface MetricCard {
  type: 'compliance' | 'energy-use' | 'waste-cost' | 'investment';
  primaryValue: string | number;
  status: 'success' | 'warning' | 'danger';
  subtitle: string;
  icon: React.ComponentType;
}

// Clear action cards (3 focused CTAs)
interface ActionCard {
  type: 'report' | 'consultation' | 'share';
  title: string;
  description: string;
  ctaText: string;
  variant: 'primary' | 'secondary';
}
```

### Updated Visual Design Specifications
- **Color Strategy**: Complement GE.no (cyan-blue primary, not competing green)
- **Background**: Professional dark theme (#0a1525 gradient)
- **Cards**: Glass-morphism with backdrop blur
- **Semantic Colors**: Red (over TEK17), Green (compliant), Orange (warning)

## Updated User Experience Flow

### Multi-Page Architecture (Steve Jobs 3-Click Rule)
```
Page 1: Landing + Address Search (30 seconds)
User enters address → Selects from Kartverket results → Navigate to building data

Page 2: Building Data Input (2-3 minutes)
Building type → Area → Energy systems → Energy consumption → Submit for analysis

Page 3: Dashboard Results (5+ minutes)
View grid dashboard → Download report → Book consultation
```

### Key UX Changes
1. **No Expandable Content**: Everything visible without interaction
2. **Clear Navigation**: Breadcrumbs show user position in flow
3. **Focused Actions**: 3 clear next steps instead of scattered options
4. **Mobile-First**: Grid adapts to mobile without scrolling

## Service Definition Alignment

### Emphasize Correct Value Hierarchy
1. **Primary**: TEK17 § 14-2 compliance analysis
2. **Secondary**: Investment guidance based on energy waste
3. **Tertiary**: Enova certificate status (when available)

### Remove A-G Grading Confusion
- **What We Do**: Display existing Enova certificates if available
- **What We Don't Do**: Create custom A-G grades
- **Clear Messaging**: "TEK17 Compliance Check" not "Energy Grading"

## Technical Implementation Updates

### New Required Components
```typescript
// Core dashboard components
DashboardHeader.tsx     // Address + primary TEK17 status
MetricsGrid.tsx         // 4-card metrics layout
ActionGrid.tsx          // 3-card CTA layout
PropertyMap.tsx         // Interactive map (was missing)

// Supporting components
ComplianceStatusCard.tsx   // TEK17 compliance visualization
EnergyUsageCard.tsx       // kWh/m² vs requirement
WasteCostCard.tsx         // Annual waste in kr
InvestmentCard.tsx        // Investment room calculation
```

### CSS Grid System
```css
.dashboard-container {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh; /* No scrolling */
  gap: 1.5rem;
  padding: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
```

## Updated Success Metrics

### User Experience KPIs (Revised)
- **Task Completion**: 95%+ complete analysis without scrolling
- **Time to Understanding**: TEK17 compliance visible in <5 seconds
- **Action Conversion**: 40%+ click primary CTA (report/consultation)
- **Mobile Success**: 90%+ complete flow on mobile without scrolling

### Technical KPIs (Updated)
- **Dashboard Load**: <2 seconds to interactive state
- **No Mock Data**: 100% real Norwegian API integration
- **Responsive**: Works on 320px mobile to 1440px desktop
- **Accessibility**: WCAG 2.1 AA compliance for color contrast

## Migration Strategy

### Phase Implementation
1. **Phase 1**: Fix address data flow, create building input page
2. **Phase 2**: Implement new dashboard grid layout
3. **Phase 3**: Add interactive map, update color theme
4. **Phase 4**: Remove all mock data, integrate real APIs

### Backward Compatibility
- Keep existing API endpoints during transition
- Maintain mock data until real integration complete
- Test extensively on Norwegian addresses and building types

---

**Amendment Approval**: This revision better serves user needs based on:
- UX research from modern BI platforms
- User preference for no-scrolling, focused experiences
- Steve Jobs 3-click rule compliance
- Clear service definition (TEK17 compliance primary)
- Partnership considerations with GE.no color harmony**