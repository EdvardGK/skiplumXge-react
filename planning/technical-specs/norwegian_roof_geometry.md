# Norwegian Roof Geometry Specification

**Date**: January 25, 2025
**Purpose**: Accurate algorithmic generation of Norwegian building roof shapes for 3D visualization

## 🏔️ Core Principle: Realism Over Simplification

The difference between a professional tool and a "gimmicky toy" lies in architectural accuracy. Norwegian buildings follow predictable patterns that must be respected for users to recognize their own buildings.

## 📐 Fundamental Rules

### The Møne (Ridge) Principle
**The ridge line (møne) ALWAYS runs parallel to and centered over the longest dimension of the building footprint.**

```typescript
interface RidgeLine {
  direction: 'east-west' | 'north-south';
  center: { x: number; z: number };
  length: number;
  height: number;  // Above base building height
}

const calculateMøneOrientation = (footprint: Point2D[]): RidgeLine => {
  const bbox = getBoundingBox(footprint);
  const width = bbox.maxX - bbox.minX;
  const depth = bbox.maxZ - bbox.minZ;

  // Critical: Ridge follows longest axis
  const ridgeDirection = width > depth ? 'east-west' : 'north-south';

  return {
    direction: ridgeDirection,
    center: {
      x: (bbox.minX + bbox.maxX) / 2,
      z: (bbox.minZ + bbox.maxZ) / 2
    },
    length: Math.max(width, depth),
    height: 2.5  // Standard Norwegian saddle roof height
  };
};
```

## 🏠 Norwegian Building Typology

### Standard Footprint Patterns

#### 1. Rectangular (Rektangulær)
- **Most common**: 60-70% of Norwegian residential
- **Simple saddle roof**: Ridge along longest dimension
- **Typical dimensions**: 8-12m × 6-10m

#### 2. L-Shaped (L-formet)
- **Common**: 20-25% of buildings
- **Continuous roof**: 90° direction change at corner
- **Hip connection**: Where two roof planes meet

#### 3. T-Shaped (T-formet)
- **Less common**: 5-10% of buildings
- **Main body + Ark**: Perpendicular roof section
- **Valley formation**: Where ark meets main roof

#### 4. U-Shaped (U-formet)
- **Rare**: 2-3% of buildings
- **Complex valleys**: Multiple intersection points
- **Often simplified**: To connected L-shapes

#### 5. Complex/Irregular
- **Modern/historic**: Variable percentage
- **Decomposition required**: Break into simple shapes

## 🔨 L-Shaped Buildings: Continuous Roof with Direction Change

### Architectural Reality
L-shaped buildings in Norway typically have a **continuous roof that changes direction at the corner**, not two separate roofs. This creates a hip line where the two roof sections meet.

### Implementation Algorithm
```typescript
class LShapeRoofGenerator {
  generate(footprint: Point2D[]): RoofGeometry {
    // Step 1: Decompose L into two rectangles
    const { main, wing } = this.decomposeLShape(footprint);

    // Step 2: Calculate ridge for each segment
    const mainRidge = this.calculateRidge(main);
    const wingRidge = this.calculateRidge(wing);

    // Step 3: Find intersection point (the corner)
    const corner = this.findIntersectionPoint(main, wing);

    // Step 4: Create hip line connecting ridges
    const hipLine = this.createHipLine(
      mainRidge.endpoint,
      wingRidge.startpoint,
      corner
    );

    // Step 5: Generate roof planes
    return this.buildConnectedRoof(mainRidge, wingRidge, hipLine);
  }

  private createHipLine(
    mainEnd: Point3D,
    wingStart: Point3D,
    corner: Point2D
  ): HipLine {
    // Hip runs from corner ground level to ridge intersection
    return {
      start: { x: corner.x, y: 0, z: corner.z },
      end: {
        x: (mainEnd.x + wingStart.x) / 2,
        y: Math.min(mainEnd.y, wingStart.y),  // Lower of two ridges
        z: (mainEnd.z + wingStart.z) / 2
      },
      angle: 45  // Typical Norwegian hip angle
    };
  }

  private buildConnectedRoof(
    mainRidge: Ridge,
    wingRidge: Ridge,
    hipLine: HipLine
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];

    // Main roof planes (2 slopes)
    this.addRoofPlane(vertices, indices, mainRidge, 'north');
    this.addRoofPlane(vertices, indices, mainRidge, 'south');

    // Wing roof planes (2 slopes)
    this.addRoofPlane(vertices, indices, wingRidge, 'east');
    this.addRoofPlane(vertices, indices, wingRidge, 'west');

    // Hip plane connecting the two
    this.addHipPlane(vertices, indices, hipLine);

    // Gable ends
    this.addGableEnd(vertices, indices, mainRidge.start);
    this.addGableEnd(vertices, indices, wingRidge.end);

    return this.createGeometry(vertices, indices);
  }
}
```

### Visual Characteristics
- **Continuous ridge**: No break between sections
- **Hip valley**: 45° angle where sections meet
- **Consistent height**: Both sections typically same ridge height
- **Drainage**: Water flows away from hip into gutters

## 🏗️ T-Shaped Buildings: Main Body with Ark

### Architectural Reality
T-shaped buildings have a **main body with a perpendicular "ark" (Norwegian term)** - an independent roof section that creates a valley where it meets the main roof.

### Key Distinction from L-Shape
- **L-Shape**: Continuous roof changing direction
- **T-Shape**: Two independent roof structures meeting

### Implementation Algorithm
```typescript
class TShapeWithArkGenerator {
  generate(footprint: Point2D[]): RoofGeometry {
    // Step 1: Identify main body and ark
    const { mainBody, ark } = this.decomposeTShape(footprint);

    // Step 2: Main body gets standard saddle
    const mainRoof = this.generateSaddleRoof(mainBody);

    // Step 3: Ark is perpendicular to main
    const arkRoof = this.generateArkRoof(ark, mainRoof.ridgeDirection);

    // Step 4: Create valley where they meet
    const valley = this.createValley(mainRoof, arkRoof);

    // Step 5: Merge geometries
    return this.mergeWithValley(mainRoof, arkRoof, valley);
  }

  private generateArkRoof(
    arkFootprint: Rectangle,
    mainDirection: 'east-west' | 'north-south'
  ): ArkRoof {
    // Ark ridge MUST be perpendicular to main ridge
    const arkDirection = mainDirection === 'east-west'
      ? 'north-south'
      : 'east-west';

    return {
      ridge: {
        direction: arkDirection,
        height: 2.2,  // Slightly lower than main (2.5m)
        center: this.getCenter(arkFootprint)
      },
      footprint: arkFootprint,
      connectionSide: this.determineConnectionSide(arkFootprint)
    };
  }

  private createValley(
    mainRoof: RoofStructure,
    arkRoof: ArkRoof
  ): Valley {
    // Valley forms where ark meets main roof slope
    const intersectionLine = this.findIntersection(
      mainRoof.slopePlane,
      arkRoof.ridgeLine
    );

    return {
      line: intersectionLine,
      angle: this.calculateValleyAngle(mainRoof.pitch, arkRoof.pitch),
      drainageDirection: this.calculateDrainage(intersectionLine),
      depth: 0.1  // 10cm valley depth for water flow
    };
  }
}
```

### Visual Characteristics
- **Two distinct ridges**: Perpendicular to each other
- **Valley formation**: V-shaped where roofs meet
- **Height difference**: Ark often slightly lower
- **Water concentration**: Valley creates drainage point

## 📊 Roof Type Detection Algorithm

### From OSM Data
```typescript
class RoofTypeDetector {
  detect(building: OSMBuilding): NorwegianRoofType {
    // Priority 1: Explicit OSM tags
    if (building.tags['roof:shape']) {
      return this.mapOSMRoofType(building.tags['roof:shape']);
    }

    // Priority 2: Footprint analysis
    const shape = this.analyzeFootprint(building.geometry);

    // Priority 3: Building type inference
    return this.inferFromBuildingType(
      building.tags.building,
      shape,
      building.tags['building:levels']
    );
  }

  private analyzeFootprint(geometry: Polygon): FootprintShape {
    const vertices = geometry.coordinates;
    const angles = this.calculateInteriorAngles(vertices);

    // Check for L-shape (one ~270° angle)
    if (angles.some(a => Math.abs(a - 270) < 10)) {
      return 'L-SHAPE';
    }

    // Check for T-shape (characteristic pattern)
    if (this.detectTPattern(vertices)) {
      return 'T-SHAPE';
    }

    // Check for rectangle (all ~90° angles)
    if (angles.every(a => Math.abs(a - 90) < 10)) {
      return 'RECTANGLE';
    }

    return 'COMPLEX';
  }

  private inferFromBuildingType(
    type: string,
    shape: FootprintShape,
    levels?: string
  ): NorwegianRoofType {
    const levelCount = parseInt(levels || '2');

    // Norwegian building conventions
    const rules: RoofRule[] = [
      { type: 'house', shape: 'RECTANGLE', levels: [1, 2], roof: 'saddle' },
      { type: 'house', shape: 'L-SHAPE', levels: [1, 2], roof: 'hip-saddle' },
      { type: 'house', shape: 'T-SHAPE', levels: [1, 2], roof: 'saddle-ark' },
      { type: 'apartments', shape: 'ANY', levels: [3, 4], roof: 'saddle' },
      { type: 'apartments', shape: 'ANY', levels: [5, 99], roof: 'flat' },
      { type: 'commercial', shape: 'ANY', levels: [1, 99], roof: 'flat' },
      { type: 'industrial', shape: 'ANY', levels: [1, 99], roof: 'shed' }
    ];

    return this.matchRule(rules, type, shape, levelCount);
  }
}
```

## 🔧 Complex Footprint Decomposition

### Strategy: Straight Skeleton Algorithm
For complex footprints, use the straight skeleton algorithm to find natural ridge lines:

```typescript
class ComplexRoofGenerator {
  generate(footprint: Point2D[]): RoofGeometry {
    // Step 1: Compute straight skeleton
    const skeleton = this.computeStraightSkeleton(footprint);

    // Step 2: Extract ridge lines
    const ridges = this.extractRidges(skeleton);

    // Step 3: Classify ridges
    const classified = this.classifyRidges(ridges);

    // Step 4: Generate roof faces
    return this.generateFromClassifiedRidges(classified);
  }

  private computeStraightSkeleton(footprint: Point2D[]): Skeleton {
    // Implementation of straight skeleton algorithm
    // Creates natural roof ridges for arbitrary polygons
    const edges = this.createEdges(footprint);
    const bisectors = this.computeBisectors(edges);

    return this.propagateWavefront(bisectors);
  }

  private classifyRidges(ridges: Ridge[]): ClassifiedRidges {
    return {
      main: ridges.filter(r => r.length > 10),      // Main ridges
      secondary: ridges.filter(r => r.length > 5 && r.length <= 10),
      valleys: ridges.filter(r => r.type === 'valley'),
      hips: ridges.filter(r => r.type === 'hip')
    };
  }
}
```

## 🌧️ Water Drainage Realism

### Critical for Believability
Accurate water drainage is essential - users know where water flows on their real buildings.

```typescript
class DrainageCalculator {
  calculate(roof: RoofGeometry): DrainageSystem {
    const drainagePoints: DrainagePoint[] = [];

    // Valleys are primary drainage
    roof.valleys.forEach(valley => {
      drainagePoints.push({
        position: valley.lowestPoint,
        flowRate: 'high',
        type: 'valley',
        gutterRequired: true
      });
    });

    // Eaves are secondary drainage
    roof.eaves.forEach(eave => {
      drainagePoints.push({
        position: eave.midpoint,
        flowRate: 'normal',
        type: 'eave',
        gutterRequired: true
      });
    });

    // Hips shed water to sides
    roof.hips.forEach(hip => {
      // Water flows to both sides of hip
      drainagePoints.push({
        position: hip.leftDrainage,
        flowRate: 'medium',
        type: 'hip-side'
      });
      drainagePoints.push({
        position: hip.rightDrainage,
        flowRate: 'medium',
        type: 'hip-side'
      });
    });

    return {
      points: drainagePoints,
      gutters: this.planGutters(drainagePoints),
      downspouts: this.placeDownspouts(drainagePoints)
    };
  }
}
```

## 📏 Norwegian Building Standards

### Typical Dimensions
```typescript
const NorwegianBuildingStandards = {
  roofPitch: {
    saddle: 27,      // degrees (most common)
    steep: 35,       // Northern Norway (snow shedding)
    shallow: 22,     // Southern Norway
    flat: 3          // Minimum for drainage
  },

  roofOverhang: {
    standard: 0.5,   // meters
    minimal: 0.3,    // Modern design
    traditional: 0.7 // Older buildings
  },

  ridgeHeight: {
    house: 2.5,      // Single family home
    apartment: 2.0,  // Multi-family
    commercial: 1.5  // Commercial buildings
  },

  floorHeights: {
    residential: 2.7,
    office: 3.0,
    commercial: 3.5,
    industrial: 4.0
  }
};
```

## 🎯 Implementation Priorities

### Accuracy Hierarchy
1. **Møne orientation**: Must be correct (parallel to longest dimension)
2. **Basic shape**: Rectangle/L/T recognition
3. **Ridge height**: Proportional to building size
4. **Valleys/Hips**: Geometrically correct intersections
5. **Details**: Dormers, chimneys (future enhancement)

### Common Mistakes to Avoid
❌ Random roof orientation
❌ Ridge perpendicular to wrong axis
❌ L-shapes with disconnected roofs
❌ T-shapes without valleys
❌ Incorrect drainage patterns
❌ Uniform height regardless of building type

### Correct Implementation
✅ Ridge follows longest dimension
✅ L-shapes have continuous roofs with hips
✅ T-shapes have perpendicular arks with valleys
✅ Water flows to logical drainage points
✅ Height varies by building type and age
✅ Overhangs appropriate to style

## 🏗️ Three.js Implementation

### Geometry Generation
```typescript
class NorwegianRoofMesh extends THREE.Group {
  constructor(
    footprint: Point2D[],
    baseHeight: number,
    buildingType: string
  ) {
    super();

    // Detect roof type
    const roofType = new RoofTypeDetector().detect({
      footprint,
      buildingType
    });

    // Generate appropriate geometry
    const geometry = this.generateRoofGeometry(
      footprint,
      baseHeight,
      roofType
    );

    // Apply materials
    const material = this.getRoofMaterial(roofType);

    // Create mesh
    const roofMesh = new THREE.Mesh(geometry, material);
    roofMesh.position.y = baseHeight;

    this.add(roofMesh);

    // Add details if close enough
    if (this.shouldAddDetails()) {
      this.addRoofDetails(roofType);
    }
  }

  private getRoofMaterial(type: RoofType): THREE.Material {
    // Norwegian roof materials
    const materials = {
      tile: new THREE.MeshPhysicalMaterial({
        color: 0x8b4513,
        roughness: 0.9,
        normalMap: this.loadTileNormal()
      }),
      metal: new THREE.MeshPhysicalMaterial({
        color: 0x2a2a2a,
        metalness: 0.8,
        roughness: 0.3
      }),
      slate: new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,
        roughness: 0.7
      })
    };

    return materials.slate; // Most common in Norway
  }
}
```

## ✅ Validation Checklist

When implementing, verify:
- [ ] Ridge orientation matches longest building dimension
- [ ] L-shapes have continuous roof with proper hip
- [ ] T-shapes have perpendicular ark with valley
- [ ] Water drainage follows logical paths
- [ ] Roof height proportional to building size
- [ ] Materials appropriate for Norwegian climate
- [ ] Visual matches user expectations for their building

This specification ensures the 3D visualization produces architecturally accurate Norwegian roofs that users will immediately recognize as realistic representations of their actual buildings.