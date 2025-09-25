# Waterfall 3D Dashboard Implementation Plan

**Date**: January 25, 2025
**Vision**: Transform energy analysis into immersive visual storytelling with 3D neighborhood visualization

## 🌊 Executive Summary

This document outlines the implementation of a revolutionary "waterfall" dashboard that combines:
- **Visual Storytelling**: Energy data flows like a Norwegian waterfall through 6 narrative acts
- **3D Neighborhood**: Real buildings from OSM data with accurate Norwegian roof geometry
- **Aurora Effects**: Northern lights themed animations connecting data to emotion
- **Information Journalism**: Progressive disclosure following best practices from data visualization

## 🎭 The Waterfall Concept

### Core Metaphor
Energy efficiency is like a Norwegian waterfall in winter - powerful, beautiful, but sometimes frozen and inefficient. The user's building energy story flows from top to bottom, with each "pool" of understanding cascading into the next insight.

### User Psychology
- **Curiosity-Driven**: Each section ends with a question the next answers
- **Progressive Disclosure**: Complex data revealed gradually
- **Emotional Journey**: From confusion → clarity → confidence → action
- **Dopamine Rewards**: Scrolling reveals new insights and visualizations

## 📖 Six-Act Story Structure

### Act 1: The Cold Open - "Your Building's Energy Portrait"
```
Visual: 3D building silhouette against aurora sky
Data: Address, size, current performance, TEK17 compliance
Emotion: Recognition → Curiosity
Transition: Heat particles escaping from 3D building model
```

**Implementation**:
- 3D building rendered from OSM footprint
- Glowing compliance badge with aurora effect
- Heat leak particle system
- Scroll trigger: Building becomes transparent revealing internal flows

### Act 2: The Heat Map - "Where Your Energy Escapes"
```
Visual: Cross-section with thermal imaging effect
Data: Heat loss breakdown by component
Emotion: Discovery → Understanding
Transition: Heat streams converging into cost counter
```

**Implementation**:
- Interactive thermal vision on 3D model
- Color intensity mapping (red = high loss)
- Morphing pie → bar chart animation
- Particle systems for walls/windows/roof

### Act 3: The Seasons Cycle - "Energy Through Norwegian Seasons"
```
Visual: Circular calendar morphing to wave chart
Data: Monthly consumption with weather overlay
Emotion: Pattern recognition → Concern
Transition: Cost accumulation waterfall
```

**Implementation**:
- Radial calendar unrolling to timeline
- Weather particles (snow/sun)
- Temperature ribbon behind consumption
- Background seasons transition

### Act 4: The Money Waterfall - "From Waste to Wealth"
```
Visual: Literal waterfall chart with cascading NOK
Data: Current waste → Investment potential → ROI
Emotion: Shock → Opportunity
Transition: Coins transforming into upgrade icons
```

**Implementation**:
- Animated waterfall with falling currency
- Investment simulator with real-time updates
- Compound interest visualization
- Success story overlays

### Act 5: The Comparison - "You're Not Alone"
```
Visual: 3D neighborhood constellation
Data: Peer performance, best-in-class examples
Emotion: Social proof → Motivation
Transition: Light flowing to action items
```

**Implementation**:
- 3D buildings as glowing columns (height = consumption)
- Aurora connections between similar buildings
- Your building pulsing/highlighted
- Hover for renovation stories

### Act 6: The Action Plan - "Path to Excellence"
```
Visual: Roadmap with aurora milestones
Data: Prioritized improvements, contractors
Emotion: Empowerment → Action
Transition: CTA with aurora burst
```

**Implementation**:
- Interactive timeline
- Cost-benefit flowers
- Contractor cards
- Aurora explosion on CTA click

## 🏗️ 3D Neighborhood Implementation

### Technology Stack
```json
{
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.88.0",
  "@react-three/postprocessing": "^2.15.0",
  "three": "^0.159.0",
  "leva": "^0.9.35"
}
```

### Building Generation Pipeline

#### 1. OSM Data Fetching
```typescript
interface OSMBuilding {
  id: string;
  footprint: [lat: number, lon: number][];
  height?: number;
  levels?: number;
  buildingType?: string;
  roofShape?: string;
}

// Fetch buildings within radius
const fetchNeighborhoodBuildings = async (
  center: [lat, lon],
  radius: number
): Promise<OSMBuilding[]>
```

#### 2. Height Calculation
```typescript
const calculateHeight = (building: OSMBuilding): number => {
  if (building.height) return building.height;
  if (building.levels) {
    const floorHeight = building.buildingType === 'residential' ? 2.7 : 3.0;
    return building.levels * floorHeight;
  }
  return building.buildingType === 'house' ? 6 : 12; // Defaults
}
```

#### 3. Norwegian Roof Generation
See detailed algorithm in [Norwegian Roof Geometry Documentation](../technical-specs/norwegian_roof_geometry.md)

Key principles:
- Møne (ridge) always parallel to longest building dimension
- L-shapes: Continuous roof with 90° direction change
- T-shapes: Main roof + perpendicular "ark" section
- Proper valleys and drainage lines

### 3D Scene Architecture

```tsx
<Canvas camera={{ position: [50, 50, 50], fov: 45 }}>
  {/* Environment */}
  <AuroraSky intensity={energyWaste} />
  <fog attach="fog" args={['#0a0f1c', 50, 200]} />

  {/* Lighting */}
  <ambientLight intensity={0.2} color="#4a5f7a" />
  <directionalLight position={[10, 20, 10]} />

  {/* Buildings */}
  <CenterBuilding building={userBuilding} showHeatParticles />
  <InstancedNeighborhood buildings={neighbors} />

  {/* Effects */}
  <EffectComposer>
    <Bloom intensity={0.5} />
    <ChromaticAberration offset={[0.001, 0.001]} />
  </EffectComposer>
</Canvas>
```

### Performance Optimization

#### LOD System
- **Near (< 30m)**: Full detail + particles + windows
- **Medium (30-60m)**: Simplified geometry
- **Far (> 60m)**: Box only

#### Instanced Rendering
```tsx
<instancedMesh args={[null, null, buildingCount]}>
  <boxGeometry args={[10, 10, 10]} />
  <meshPhysicalMaterial color="#2a3f5f" />
</instancedMesh>
```

## 🌌 Visual Design System

### Aurora Color Palette
```css
--aurora-green: linear-gradient(180deg, #10b981 0%, #059669 100%);
--aurora-blue: linear-gradient(180deg, #0ea5e9 0%, #0369a1 100%);
--aurora-purple: linear-gradient(180deg, #a855f7 0%, #7c3aed 100%);
--aurora-pink: linear-gradient(180deg, #ec4899 0%, #db2777 100%);

--cold-inefficient: #1e3a5f → #0f172a;
--warming-up: #0369a1 → #0891b2;
--optimal-flow: #10b981 → #059669;
--hot-waste: #f59e0b → #dc2626;
```

### Visual Elements
- **Particle Systems**: Heat escaping, money falling, aurora ribbons
- **Glassmorphism**: Cards at different z-indexes
- **Liquid Transitions**: Numbers morphing like water
- **Depth Layers**: Parallax scrolling effects

### Animation Principles
- **Scroll-triggered**: Elements reveal on scroll progress
- **Momentum scrolling**: Slight pause at section midpoints
- **Data morphing**: Smooth transitions between visualizations
- **Color bleeding**: Aurora colors blend between sections

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
1. Create `/dashboard-waterfall` route
2. Implement basic 6-section structure
3. Add scroll-triggered animations with Framer Motion
4. Create `DashboardToggle` component for dev switching

### Phase 2: 3D Integration (Week 2)
1. Install Three.js dependencies
2. Create 3D building component
3. Implement OSM data fetching
4. Add basic roof geometry

### Phase 3: Visual Polish (Week 3)
1. Add particle systems
2. Implement aurora effects
3. Create data flow connectors
4. Add morphing visualizations

### Phase 4: Neighborhood (Week 4)
1. Render neighboring buildings
2. Implement LOD system
3. Add interactive hover states
4. Create comparison visualizations

## 📱 Responsive Strategy

### Desktop (1200px+)
- Full 3D experience with all effects
- Side-by-side layouts where appropriate
- Parallax scrolling
- Complex particle systems

### Tablet (768px - 1199px)
- Simplified 3D (fewer polygons)
- Reduced particle count
- Touch-optimized interactions
- Maintained story flow

### Mobile (< 768px)
- 2.5D visualization (isometric)
- Minimal particles
- Swipe gestures
- Card-based sections

## 🎯 Success Metrics

### Engagement
- **Scroll Depth**: Target 80%+ reaching investment section
- **Time on Page**: Target 3+ minutes (vs current 1.5)
- **Interaction Rate**: 50%+ users clicking interactive elements

### Conversion
- **Form Opens**: Target 25%+ improvement
- **Report Downloads**: Target 40%+ improvement
- **Contact Submissions**: Target 35%+ improvement

### Performance
- **FPS**: Maintain 30+ fps on mobile
- **Load Time**: < 3 seconds initial load
- **TTI**: < 5 seconds time to interactive

## 🔧 Technical Requirements

### Browser Support
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

### Hardware Requirements
- **Minimum**: 4GB RAM, integrated graphics
- **Recommended**: 8GB RAM, dedicated GPU
- **Mobile**: iPhone 8+ / equivalent Android

### Fallbacks
- **No WebGL**: Static images with CSS animations
- **Low Performance**: Reduced quality mode auto-detection
- **No JavaScript**: Server-rendered static version

## 📋 File Structure

```
src/
├── app/
│   └── dashboard-waterfall/
│       └── page.tsx
├── components/
│   ├── DashboardToggle.tsx
│   └── waterfall/
│       ├── WaterfallSection.tsx
│       ├── sections/
│       │   ├── PropertyHeroSection.tsx
│       │   ├── HeatLossSection.tsx
│       │   ├── SeasonalSection.tsx
│       │   ├── InvestmentSection.tsx
│       │   ├── ComparisonSection.tsx
│       │   └── ActionSection.tsx
│       ├── three/
│       │   ├── BuildingMesh.tsx
│       │   ├── NeighborhoodScene.tsx
│       │   ├── AuroraSky.tsx
│       │   ├── HeatParticles.tsx
│       │   └── roofs/
│       │       ├── SaddleRoof.tsx
│       │       ├── LShapeRoof.tsx
│       │       └── TShapeArk.tsx
│       └── effects/
│           ├── DataFlowConnector.tsx
│           ├── ScrollProgress.tsx
│           └── AuroraTransition.tsx
```

## 🎨 Unique Innovations

### The Energy Signature
Visual fingerprint combining:
- Heat loss pattern (shape)
- Efficiency level (color intensity)
- Improvement potential (aurora activity)

### The Savings Aurora
Aurora grows stronger as users explore improvements, visualizing potential as northern lights intensity.

### The Efficiency Constellation
Buildings form constellations based on efficiency patterns - users see their place in the "energy sky".

### The Investment River
Money flows through investment options like a river, with ROI determining flow speed.

## ✅ Next Steps

1. **Immediate**: Set up dual dashboard structure with toggle
2. **Week 1**: Implement basic waterfall sections
3. **Week 2**: Add Three.js and 3D building
4. **Week 3**: Polish animations and effects
5. **Week 4**: Complete neighborhood visualization

This implementation will create the most visually compelling and informative energy analysis tool in the Norwegian market, combining accurate building representation with beautiful data storytelling.