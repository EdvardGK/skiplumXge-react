# PRD: Skiplum Energianalyse - React Version

**Document Version**: 1.0
**Date**: 2025-01-17
**Status**: Draft

## Executive Summary

Transform the existing Streamlit-based Skiplum Energianalyse into a professional React application with modern dashboard capabilities, eliminating the current UI/UX limitations while preserving all validated business logic and data sources.

## Problem Statement

### Current Limitations (Streamlit)
- **Dashboard Styling**: Cannot create proper Plotly/Grafana-style dashboards
- **Component Control**: Limited control over UI components and interactions
- **Performance**: Page reloads on every interaction
- **Mobile Experience**: Poor responsive design capabilities
- **Professional UI**: Cannot achieve modern SaaS application look and feel
- **Interactivity**: Limited real-time updates and smooth user interactions

### Business Impact
- **User Experience**: Suboptimal professional appearance affects credibility
- **Conversion Rate**: Current interface doesn't support 30-40%+ conversion goals
- **Scalability**: Streamlit architecture limits future feature development
- **Integration**: Difficult to integrate with CRM, payment systems, and external tools

## Solution Overview

Build a modern React application with Next.js that maintains all current functionality while delivering a professional, dashboard-focused user experience.

## Technical Architecture

### Frontend Stack
```
├── Next.js 14+ (App Router)
├── TypeScript (Type safety)
├── shadcn/ui (Component library)
├── Tailwind CSS (Styling)
├── Framer Motion (Animations)
├── Recharts/Chart.js (Dashboard visualizations)
├── React Query (Data fetching)
├── Zustand (State management)
└── React Hook Form (Form handling)
```

### Backend Integration
```
├── FastAPI Backend (Python - existing logic)
├── RESTful API endpoints
├── Data validation with Pydantic
├── Norwegian data source integrations
└── Caching with Redis/PostgreSQL
```

## Core Features

### 1. Modern Landing Page
**Current State**: Basic Streamlit search interface
**Target State**: Professional SaaS landing page

**Features**:
- Hero section with value proposition
- Real-time address search with debouncing
- Auto-complete with Kartverket API integration
- Smooth animations and transitions
- Mobile-first responsive design
- Clear call-to-action flow

**Technical Requirements**:
```typescript
interface AddressSearchProps {
  onAddressSelect: (address: Address) -> void;
  debounceMs?: number;
  maxResults?: number;
}

interface Address {
  adressetekst: string;
  coordinates: { lat: number; lon: number };
  municipality: string;
  postalCode: string;
  matrikkel: MatrikkelData;
}
```

### 2. Professional Dashboard
**Current State**: HTML string in Streamlit
**Target State**: Interactive React dashboard components

**Dashboard Layout**:
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

**Component Architecture**:
```typescript
interface DashboardProps {
  propertyData: PropertyAnalysis;
  onDataChange: () => void;
}

interface MetricCard {
  title: string;
  value: string | number;
  delta?: string;
  color?: 'success' | 'warning' | 'error';
  icon: React.ComponentType;
  onClick?: () => void;
}

interface PropertyAnalysis {
  building: BuildingData;
  energy: EnergyAnalysis;
  tek17: TEK17Compliance;
  investment: InvestmentGuidance;
  enova: EnovaStatus;
}
```

**Visual Design**:
- Glass-morphism cards with backdrop blur
- Smooth hover animations and micro-interactions
- Color-coded metrics (energy grades, compliance status)
- Real-time data updates without page refreshes
- Interactive charts and visualizations

### 3. Advanced Property Visualization
**Current State**: Basic Folium map
**Target State**: Interactive 3D property visualization

**Features**:
- Interactive property map with building outlines
- 3D building visualization (optional)
- Solar potential overlay
- Energy efficiency heatmap
- Property boundary highlighting
- Street view integration

**Technical Implementation**:
```typescript
interface PropertyMapProps {
  address: Address;
  buildings: BuildingOutline[];
  showSolarPotential?: boolean;
  show3D?: boolean;
  height?: number;
}

interface BuildingOutline {
  geometry: GeoJSON.Polygon;
  properties: {
    buildingType: string;
    height?: number;
    energyClass?: string;
  };
}
```

### 4. Real-time Form Experience
**Current State**: Streamlit form with page reloads
**Target State**: Smooth, validated form experience

**Features**:
- Multi-step form with progress indication
- Real-time validation and feedback
- Auto-save functionality
- Smart defaults based on building type
- Conditional fields based on user selections

**Form Flow**:
```
Step 1: Building Basics → Step 2: Systems → Step 3: Energy Data → Dashboard
```

### 5. Investment Guidance System
**Current State**: Static calculations
**Target State**: Interactive investment planner

**Features**:
- Dynamic investment calculator
- System-specific recommendations
- ROI scenarios with different assumptions
- Integration with Norwegian energy incentives
- Professional PDF report generation

### 6. Professional Reporting
**Target**: PDF generation with charts and analysis
- Executive summary
- Detailed analysis
- Investment recommendations
- Energy improvement roadmap
- Compliance documentation

## Data Architecture

### Norwegian Data Sources (Preserved)
```typescript
interface DataSources {
  kartverket: KartverketAPI;      // Address lookup
  ssb: SSBEnergyPrices;          // Electricity prices
  tek17: TEK17Standards;         // Building requirements
  enova: EnovaDatabase;          // Energy certificates
  matrikkel: MatrikkelAPI;       // Building registry
  openstreetmap: OverpassAPI;    // Building outlines
}
```

### API Endpoints (FastAPI Backend)
```
GET /api/addresses/search?q=<query>
GET /api/addresses/{address_id}/buildings
GET /api/buildings/{building_id}/analysis
POST /api/buildings/{building_id}/calculate
GET /api/reports/{building_id}/pdf
GET /api/energy-prices/current
```

### State Management
```typescript
interface AppState {
  user: UserSession;
  property: PropertyState;
  analysis: AnalysisState;
  ui: UIState;
}

interface PropertyState {
  selectedAddress: Address | null;
  buildingData: BuildingData | null;
  analysisResults: EnergyAnalysis | null;
}
```

## User Experience Flow

### 1. Landing & Search (30 seconds)
```
User arrives → See value prop → Search address → Select property → Navigate to dashboard
```

### 2. Data Input (2-3 minutes)
```
Building type → Area details → Energy systems → Energy consumption → Calculate
```

### 3. Analysis & Results (5+ minutes)
```
View dashboard → Explore metrics → Investment guidance → Generate report → Take action
```

### 4. Conversion Actions
```
Contact form → Schedule consultation → Download report → Share results
```

## Performance Requirements

### Loading Performance
- **Initial Load**: < 2 seconds
- **Page Transitions**: < 300ms
- **API Responses**: < 500ms
- **Dashboard Updates**: Real-time (<100ms)

### Mobile Performance
- **Responsive Breakpoints**: 320px, 768px, 1024px, 1440px
- **Touch Interactions**: All buttons and cards optimized for touch
- **Offline Capability**: Basic functionality without internet

### SEO & Analytics
- **Core Web Vitals**: All green scores
- **SEO Optimization**: Meta tags, structured data
- **Analytics Integration**: Google Analytics, custom events
- **A/B Testing**: Built-in capability for conversion optimization

## Implementation Plan

### Phase 1: Core Migration (2-3 weeks)
- Set up Next.js project structure
- Create basic component library
- Implement address search functionality
- Build dashboard layout (no data yet)
- Set up FastAPI backend with existing logic

### Phase 2: Data Integration (2-3 weeks)
- Connect all Norwegian data sources
- Implement energy calculation logic
- Build property visualization
- Create form handling system
- Add state management

### Phase 3: Dashboard & Analytics (2-3 weeks)
- Complete dashboard implementation
- Add interactive charts and visualizations
- Implement investment guidance system
- Build PDF report generation
- Add analytics and conversion tracking

### Phase 4: Polish & Optimization (1-2 weeks)
- Mobile optimization
- Performance tuning
- SEO optimization
- User testing and refinements
- Deployment preparation

## Success Metrics

### Technical KPIs
- **Page Load Speed**: < 2s (target: < 1s)
- **Mobile Performance**: 95+ Lighthouse score
- **Uptime**: 99.9%
- **API Response Time**: < 500ms average

### Business KPIs
- **Conversion Rate**: 30-40%+ (from current unknown %)
- **User Engagement**: 5+ minutes average session
- **Report Downloads**: 60%+ of completed analyses
- **Return Users**: 25%+ return within 30 days

### User Experience KPIs
- **Task Completion**: 90%+ complete full analysis
- **User Satisfaction**: 4.5+ stars (when feedback implemented)
- **Mobile Usage**: 50%+ mobile traffic supported
- **Error Rate**: < 1% of user sessions

## Risk Assessment

### Technical Risks
- **Data Migration**: Ensure all Norwegian data sources work correctly
- **Performance**: Dashboard complexity might affect loading times
- **Mobile Compatibility**: Complex dashboard on small screens

**Mitigation**:
- Comprehensive testing with existing Streamlit calculations
- Progressive loading and lazy loading strategies
- Mobile-first design approach

### Business Risks
- **User Adoption**: Users might prefer simple Streamlit interface
- **Development Timeline**: React complexity might extend timeline

**Mitigation**:
- Phased rollout with A/B testing capability
- Keep existing Streamlit version as backup during transition

## Resource Requirements

### Development Team
- **1 Senior React Developer** (Dashboard, components, state management)
- **1 Backend Developer** (FastAPI integration, data sources)
- **1 UI/UX Designer** (Dashboard design, mobile optimization)
- **1 DevOps Engineer** (Deployment, performance optimization)

### Infrastructure
- **Frontend**: Vercel or Netlify deployment
- **Backend**: DigitalOcean or Railway (existing FastAPI)
- **Database**: PostgreSQL for caching, Redis for sessions
- **Monitoring**: Sentry for errors, Google Analytics for usage

## Conclusion

The React version will transform Skiplum Energianalyse from a functional but limited Streamlit app into a professional-grade SaaS application capable of achieving the target 30-40%+ conversion rates while maintaining all validated Norwegian energy analysis capabilities.

The investment in modern architecture will pay dividends in user experience, scalability, and business growth potential.

---

**Next Steps**:
1. Stakeholder approval of this PRD
2. Technical architecture review
3. UI/UX mockup creation
4. Development timeline finalization
5. Resource allocation and team assembly