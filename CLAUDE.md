# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skiplum Energianalyse React Version is a professional Next.js application that replaces the Streamlit version to provide true dashboard capabilities for Norwegian energy analysis and TEK17 compliance checking.

**Key Characteristics:**
- **Type**: Modern React/Next.js web application
- **Domain**: Norwegian building energy compliance (TEK17 § 14-2)
- **Target Users**: Property owners and energy professionals
- **Status**: Foundation built - ready for API integration
- **Language**: Norwegian (Bokmål) for UI, English for development
- **Framework**: Next.js 15+ with TypeScript

## Current Development Commands

### Environment Setup
```bash
# Navigate to project
cd landingsside-energi-react

# Install dependencies
npm install

# Start development server (with Turbopack)
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server
npm start
```

### Development Workflow
```bash
# Development server (hot reload with Turbopack)
npm run dev                 # http://localhost:3000

# Code quality
npm run lint               # ESLint checking (using ESLint v9)
npm run build              # Production build test

# Component development
npx shadcn@latest add [component]  # Add new UI components
```

## Technical Architecture

### Modern React Stack
```
├── Next.js 15 (App Router)      # React framework with Turbopack
├── TypeScript                   # Type safety
├── shadcn/ui                   # Component library (@radix-ui based)
├── Tailwind CSS v4             # Utility-first styling
├── Lucide React                # Professional icons
├── Framer Motion               # Animations
├── Recharts                    # Charts
├── React Query (@tanstack)     # Data fetching
├── Zustand                     # State management
├── React Hook Form + Zod       # Form handling and validation
└── Class Variance Authority    # Component variants
```

### Project Structure
```
src/
├── app/
│   ├── page.tsx              # Landing page (Norwegian interface)
│   ├── dashboard/
│   │   └── page.tsx          # Professional dashboard with mock data
│   ├── layout.tsx            # Root layout with Geist fonts
│   ├── globals.css           # Global styles
│   └── favicon.ico           # App icon
├── components/
│   └── ui/                   # shadcn/ui components
│       ├── button.tsx        # Button component
│       ├── card.tsx          # Card component
│       ├── input.tsx         # Input component
│       ├── select.tsx        # Select component
│       ├── label.tsx         # Label component
│       └── form.tsx          # Form components
└── lib/
    └── utils.ts              # Tailwind utilities
```

## Key Features Implemented

### 1. Professional Landing Page (`/`)
- **Modern Design**: Dark gradient (slate-900 via blue-900) with glass-morphism cards
- **Norwegian Branding**: SkiplumXGE identity with cyan accent colors
- **Feature Grid**: 4 key capabilities (Adressesøk, Eiendomsanalyse, Investeringsguide, Eiendomskart)
- **Search Interface**: Card-based design ready for Kartverket API integration
- **Responsive**: Mobile-first design with hover transitions
- **Norwegian Language**: Complete Norwegian text throughout interface

### 2. Dashboard Demo (`/dashboard`)
- **Two-Row Layout**: Exactly as specified in PRD
  - **Row 1**: Bygningstype (Kontor), Total BRA (1200 m²), Energy Grade (C), TEK17 Krav (115 kWh/m²), Eiendomskart
  - **Row 2**: Enova Status (Ikke registrert), Annual Waste (92,400 kr), Investment Room (646,800 kr), Actions, Report
- **Interactive Cards**: Hover scale effects (hover:scale-105) with backdrop-blur
- **Investment Breakdown**: SINTEF-based recommendations (heating 70%, lighting 15%, other 15%)
- **Professional CTAs**: Norwegian conversion buttons with gradient styling
- **Mock Data**: Complete Norwegian energy data structure (Oslo example)

## Norwegian Energy Data Integration (Planned)

### Data Sources to Preserve
All validated Norwegian data sources from Streamlit version:

```typescript
interface NorwegianDataSources {
  kartverket: {
    endpoint: "https://ws.geonorge.no/adresser/v1/sok";
    purpose: "Address search and validation";
  };
  ssb: {
    electricityPrice: 2.80; // kr/kWh 2024
    purpose: "Official electricity pricing";
  };
  tek17: {
    standards: "§ 14-2 building requirements";
    buildingTypes: 13; // regulated categories
  };
  sintef: {
    heatingPercentage: 70;
    lightingPercentage: 15;
    purpose: "Energy system breakdowns";
  };
  enova: {
    database: "Energy certificates";
    status: "Grade or 'Ikke registrert'";
  };
}
```

### Investment Calculations
```typescript
interface InvestmentCalculation {
  formula: "Annual waste × 7 = Conservative investment room";
  multiplier: 7; // NPV at 6% discount with buffers
  breakdown: {
    heating: "70% of investment room";
    lighting: "15% of investment room";
    other: "15% of investment room";
  };
}
```

## Component Development Guidelines

### React Best Practices
- **Functional Components**: Use hooks, avoid class components
- **TypeScript**: All components must be typed
- **Composition**: Prefer composition over inheritance
- **Props Interface**: Define clear prop types

```typescript
// Example component structure
interface EnergyCardProps {
  title: string;
  value: string | number;
  delta?: string;
  color?: 'success' | 'warning' | 'error';
  icon: React.ComponentType;
  onClick?: () => void;
}

export function EnergyCard({ title, value, delta, color, icon: Icon, onClick }: EnergyCardProps) {
  return (
    <Card className="hover:scale-105 transition-all duration-300" onClick={onClick}>
      <CardContent className="p-6 text-center">
        <Icon className="w-8 h-8 mx-auto mb-3" />
        <div className="text-slate-300 text-sm font-medium mb-1">{title}</div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {delta && <div className="text-xs">{delta}</div>}
      </CardContent>
    </Card>
  );
}
```

### Styling Guidelines
- **Tailwind v4**: Use Tailwind classes for all styling (v4 with PostCSS)
- **Dark Theme**: Maintain dark gradient background theme
- **Glass Morphism**: `backdrop-blur-lg bg-white/10 border-white/20`
- **Color Palette**:
  - Primary: `cyan-400` to `emerald-400` gradients
  - Background: `bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900`
  - Cards: `bg-white/10` backgrounds with `border-white/20` borders
  - Text: `text-white` for values, `text-slate-300` for labels
  - Accents: `text-cyan-400`, `text-emerald-400`, `text-purple-400`, etc.

### Animation Guidelines
- **Hover Effects**: `hover:scale-105 transition-all duration-300`
- **Color Transitions**: `hover:text-cyan-400 transition-colors`
- **Micro-interactions**: Subtle scale and color changes
- **Performance**: Use `transform` and `opacity` for smooth animations

## API Integration Strategy

### Backend Connection (Next Steps)
```typescript
// API structure for Norwegian data
interface ApiEndpoints {
  addresses: '/api/addresses/search?q={query}';
  buildings: '/api/buildings/{addressId}';
  analysis: '/api/analysis/calculate';
  reports: '/api/reports/generate';
}

// State management structure
interface AppState {
  address: Address | null;
  buildingData: BuildingData | null;
  energyAnalysis: EnergyAnalysis | null;
  uiState: {
    loading: boolean;
    errors: string[];
  };
}
```

### Data Flow
```
1. User searches address → Kartverket API
2. User selects property → Building data form
3. User submits data → Energy analysis calculation
4. Display results → Professional dashboard
5. Generate report → PDF download
6. Conversion action → Contact form/booking
```

## Performance Requirements

### Target Metrics
- **Initial Load**: < 2 seconds
- **Page Transitions**: < 300ms
- **API Responses**: < 500ms
- **Mobile Performance**: 90+ Lighthouse score
- **Core Web Vitals**: All green

### Optimization Strategies
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: `npm run build` shows bundle sizes
- **Lazy Loading**: Dynamic imports for heavy components

## Testing Strategy

### Component Testing
```bash
# Setup testing (when needed)
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

### Manual Testing Checklist
- [ ] Landing page loads and displays correctly
- [ ] All hover effects work smoothly
- [ ] Dashboard cards render with proper data
- [ ] Mobile responsive design functions
- [ ] Navigation between pages works
- [ ] Norwegian text displays correctly

## Deployment Preparation

### Production Build Considerations
**IMPORTANT**: Development mode is more permissive than production builds. Issues may only appear during deployment that don't show up locally.

### Deployment Platforms
- **Recommended**: Vercel (optimal for Next.js)
- **Alternatives**: Netlify, Railway, DigitalOcean Apps
- **Requirements**: Node.js 18+, automatic SSL, CDN

### Code Quality for Deployment
- ESLint rules configured as warnings (not errors) for successful builds
- TypeScript compilation must pass without errors
- Version files excluded from build (`**/versions/**`)
- No mock data references in compiled files
- Proper file exclusion patterns in tsconfig.json and eslint config

### Environment Variables (Future)
```bash
# .env.local (when backend is ready)
NEXT_PUBLIC_API_URL=https://api.skiplum.no
KARTVERKET_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_key_here
```

## Success Metrics

### Technical KPIs
- **Build Time**: < 30 seconds
- **Bundle Size**: < 500KB initial
- **Performance**: 90+ Lighthouse scores
- **Type Safety**: 0 TypeScript errors

### Business KPIs (When Live)
- **Conversion Rate**: Target 30-40%+
- **User Engagement**: 5+ minutes average
- **Mobile Usage**: 50%+ traffic
- **Return Users**: 25%+ within 30 days

## Development Rules

### Language Rules
- **User-Facing**: Norwegian (Bokmål) throughout (already implemented)
- **Development**: English for code, comments, docs
- **API**: Norwegian field names where appropriate
- **Error Messages**: Norwegian for users, English for developers

### Code Quality
- **TypeScript**: Strict mode enabled
- **ESLint v9**: Follow Next.js recommended rules (using new flat config)
- **React 19**: Latest stable React version with concurrent features
- **Commits**: Conventional commit messages

### Build System
- **Next.js 15**: App Router with Turbopack for development and production
- **TypeScript 5**: Latest stable version
- **PostCSS**: For Tailwind CSS v4 processing

### File Organization
- **Components**: One component per file
- **Imports**: Group by external, internal, relative
- **Naming**: PascalCase for components, camelCase for functions
- **Files**: kebab-case for file names

## Next Development Priorities

### Phase 1: Core Functionality (2-3 weeks)
1. **Address Search**: Kartverket API integration
2. **State Management**: Zustand setup for property data
3. **Form System**: Building data input with validation
4. **Navigation**: Proper routing between search and dashboard

### Phase 2: Dashboard Enhancement (2-3 weeks)
1. **Real Data**: Connect to Norwegian data sources
2. **Charts**: Recharts integration for energy visualization
3. **Map Component**: Interactive property map
4. **Investment Calculator**: Real-time calculations

### Phase 3: Conversion Optimization (1-2 weeks)
1. **PDF Generation**: Professional energy reports
2. **Contact Forms**: Lead capture system
3. **Analytics**: Conversion tracking
4. **A/B Testing**: Optimization framework

### Phase 4: Production Launch (1 week)
1. **Performance Optimization**: Bundle size, loading speed
2. **SEO**: Meta tags, structured data
3. **Deployment**: Production environment setup
4. **Monitoring**: Error tracking, performance monitoring

## Migration Strategy

### From Streamlit to React
1. **Preserve**: All Norwegian data sources and calculations
2. **Improve**: UI/UX with professional dashboard components
3. **Maintain**: Business logic and energy analysis algorithms
4. **Enhance**: Performance, mobile experience, conversions

### Data Migration
- **TEK17 Calculations**: Port exact formulas from Streamlit
- **Investment Logic**: Preserve 7x multiplier and system breakdowns
- **API Integrations**: Maintain Kartverket, SSB, SINTEF connections
- **Business Rules**: Keep all validated Norwegian energy standards

---

## Current Implementation Status

### ✅ Completed Features
- **Landing Page**: Complete Norwegian interface with SkiplumXGE branding
- **Dashboard Layout**: Two-row layout with all 10 required cards
- **UI Components**: Full shadcn/ui component library setup
- **Mock Data**: Complete Norwegian energy data structure
- **Styling System**: Dark theme with glass-morphism effects
- **Responsive Design**: Mobile-first approach implemented
- **Typography**: Geist fonts configured and working

### 🔄 Ready for Integration
- **Address Search**: UI ready for Kartverket API connection
- **Energy Calculations**: Dashboard ready for real data
- **Investment Logic**: Mock calculations using correct 70/15/15 breakdown
- **Form Handling**: React Hook Form + Zod validation setup
- **State Management**: Zustand and React Query configured

### 📋 Next Implementation Steps
1. **API Integration**: Connect to existing FastAPI backend
2. **Real Data**: Replace mock data with Norwegian sources
3. **Navigation**: Connect search to dashboard flow
4. **PDF Generation**: Implement report download functionality

**This React version provides the professional dashboard experience needed to achieve target 30-40%+ conversion rates while maintaining all validated Norwegian energy analysis logic from the Streamlit version.**

---

## Session Management Rules

### Version Control
- **Always maintain a version folder** and save the last version of files there with "_version" suffix
- **Create a folder for each main file** so that versions are contained
- **Main file never changes** unless you're completely forking or creating something different

### Session Documentation
- **Always track sessions** in `planning/worklog/` with md files named `sessionlog_timestamp`
- **Reference versions in the log** - we want to understand what changes were made and why at a later time
- **Always write plans from plan mode** into the session notes
- **Always maintain a to-do list** in the session notes, not only in context memory

## Information Architecture & I/O Strategy

### Planning Document Hierarchy
All planning and research should be organized in structured locations:

```
/planning/
├── ux-research/          # All UX findings and design principles
├── user-journey/         # Journey mapping and flow analysis
├── service-definition/   # Core service understanding and clarifications
├── prd-amendments/       # PRD updates and changes
└── session-plans/        # Forward-looking session plans
```

### Worklog Structure
Session tracking and todo management:

```
/planning/worklog/
├── sessionlog_YYYYMMDD_topic.md    # Individual session tracking
├── todos_master.md                 # Central todo management across sessions
└── decisions_log.md                # Key decision tracking and rationale
```

### Session Workflow
**Pre-session**:
- Check `planning/worklog/todos_master.md` for active tasks
- Review relevant planning documents for context

**During session**:
- Update relevant planning docs in real-time
- Track decisions and rationale as they occur
- Use TodoWrite tool for immediate task tracking

**Post-session**:
- Update session log with changes and outcomes
- Update `planning/worklog/todos_master.md` with session results
- Cross-reference session logs to planning doc changes

### Knowledge Organization Rules
- **UX Research**: Always save to `planning/ux-research/`
- **Service Clarifications**: Document in `planning/service-definition/`
- **User Journey Changes**: Track in `planning/user-journey/`
- **PRD Updates**: Document in `planning/prd-amendments/`
- **Cross-Reference**: Link related documents explicitly

### Code Quality Rules
- **Never let scripts grow longer than 300 lines** - refactor if necessary

### Data & Language Rules
- **Never use mockdata** without clearly labelling it, and only in development
- **User facing language is Norwegian** (Bokmål)
- **Dev language is English** (code, comments, documentation)
- **Never try to fill gaps** with false data or assumptions - no data is a real issue that needs to be solved with real solutions, not mock data or lies