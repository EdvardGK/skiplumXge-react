# 3D Neighborhood Architecture Specification

**Date**: January 25, 2025
**Purpose**: Technical architecture for Three.js/React Three Fiber neighborhood visualization

## 📦 Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    "three": "^0.159.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/postprocessing": "^2.15.0",
    "@react-three/rapier": "^1.2.0"
  },
  "devDependencies": {
    "leva": "^0.9.35",
    "@types/three": "^0.159.0"
  }
}
```

### Optional Enhancements
```json
{
  "three-stdlib": "^2.28.0",
  "maath": "^0.10.0",
  "tunnel-rat": "^0.1.2",
  "@react-spring/three": "^9.7.0"
}
```

## 🏗️ System Architecture

### Data Flow Pipeline
```
OSM API → Data Processor → 3D Generator → Scene Renderer → User Interaction
    ↓           ↓              ↓              ↓                ↓
  Cache    Validation    Optimization    Performance    Analytics
```

### Component Hierarchy
```tsx
<NeighborhoodProvider>
  <Canvas>
    <Scene>
      <Environment />
      <Lighting />
      <CameraController />
      <Buildings>
        <UserBuilding />
        <NeighborBuildings />
      </Buildings>
      <Effects />
      <UI />
    </Scene>
  </Canvas>
</NeighborhoodProvider>
```

## 🗺️ OSM Data Integration

### Data Fetching Service
```typescript
interface OSMService {
  // Fetch buildings within radius
  async fetchBuildings(
    center: Coordinates,
    radius: number
  ): Promise<OSMBuilding[]>;

  // Get detailed building data
  async getBuildingDetails(
    osmId: string
  ): Promise<BuildingDetails>;

  // Fetch terrain/elevation data
  async getElevation(
    bounds: BoundingBox
  ): Promise<ElevationGrid>;
}

interface OSMBuilding {
  id: string;
  type: 'way' | 'relation';
  tags: {
    building?: string;
    'building:levels'?: string;
    'building:height'?: string;
    'roof:shape'?: string;
    'roof:height'?: string;
    'roof:direction'?: string;
    'addr:housenumber'?: string;
    'addr:street'?: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][];
  };
  centroid: [number, number];
}
```

### Data Processing Pipeline
```typescript
class BuildingProcessor {
  // Convert OSM to 3D-ready format
  process(osmBuilding: OSMBuilding): Building3D {
    return {
      id: osmBuilding.id,
      footprint: this.projectFootprint(osmBuilding.geometry),
      height: this.calculateHeight(osmBuilding),
      levels: this.extractLevels(osmBuilding),
      roofType: this.detectRoofType(osmBuilding),
      position: this.calculatePosition(osmBuilding.centroid),
      rotation: this.calculateRotation(osmBuilding.geometry),
      metadata: this.extractMetadata(osmBuilding.tags)
    };
  }

  // Project lat/lon to local coordinates
  private projectFootprint(geometry: Geometry): Vector2[] {
    return geometry.coordinates.map(coord =>
      this.latLonToLocal(coord[1], coord[0])
    );
  }

  // Height calculation with Norwegian standards
  private calculateHeight(building: OSMBuilding): number {
    if (building.tags['building:height']) {
      return parseFloat(building.tags['building:height']);
    }

    const levels = parseInt(building.tags['building:levels'] || '2');
    const buildingType = building.tags.building;

    // Norwegian standard heights
    const floorHeight = this.getFloorHeight(buildingType);
    return levels * floorHeight;
  }

  private getFloorHeight(type?: string): number {
    const heights: Record<string, number> = {
      'house': 2.7,
      'apartments': 2.8,
      'residential': 2.7,
      'office': 3.0,
      'commercial': 3.5,
      'industrial': 4.0
    };
    return heights[type || 'residential'] || 2.7;
  }
}
```

## 🏠 3D Building Generation

### Building Factory
```typescript
class BuildingFactory {
  // Main generation method
  createBuilding(data: Building3D): THREE.Group {
    const group = new THREE.Group();

    // Base structure
    const base = this.createBase(data.footprint, data.height);
    group.add(base);

    // Roof based on type
    const roof = this.createRoof(data);
    group.add(roof);

    // Windows and details
    if (data.renderDetail === 'high') {
      const windows = this.createWindows(data);
      group.add(windows);
    }

    // Position and rotation
    group.position.set(data.position.x, 0, data.position.z);
    group.rotation.y = data.rotation;

    return group;
  }

  // Create building base
  private createBase(
    footprint: Vector2[],
    height: number
  ): THREE.Mesh {
    const shape = new THREE.Shape(footprint);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false
    });

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x2a3f5f,
      roughness: 0.8,
      metalness: 0.2
    });

    return new THREE.Mesh(geometry, material);
  }

  // Roof generation (delegates to roof system)
  private createRoof(data: Building3D): THREE.Mesh {
    const roofGenerator = new RoofGenerator();
    return roofGenerator.generate(
      data.footprint,
      data.roofType,
      data.height
    );
  }
}
```

### Roof Generation System
```typescript
class RoofGenerator {
  generate(
    footprint: Vector2[],
    type: RoofType,
    baseHeight: number
  ): THREE.Mesh {
    switch (type) {
      case 'saddle':
        return this.generateSaddleRoof(footprint, baseHeight);
      case 'hip':
        return this.generateHipRoof(footprint, baseHeight);
      case 'flat':
        return this.generateFlatRoof(footprint, baseHeight);
      case 'complex':
        return this.generateComplexRoof(footprint, baseHeight);
      default:
        return this.generateSaddleRoof(footprint, baseHeight);
    }
  }

  private generateSaddleRoof(
    footprint: Vector2[],
    baseHeight: number
  ): THREE.Mesh {
    // Find longest dimension for ridge
    const bbox = this.getBoundingBox(footprint);
    const isEastWest = bbox.width > bbox.depth;

    // Create roof geometry
    const roofShape = new THREE.Shape();
    const ridgeHeight = 2.5; // Standard Norwegian saddle height

    // Build triangular cross-section
    if (isEastWest) {
      // Ridge runs east-west
      roofShape.moveTo(bbox.min.x, baseHeight);
      roofShape.lineTo(bbox.center.x, baseHeight + ridgeHeight);
      roofShape.lineTo(bbox.max.x, baseHeight);
    } else {
      // Ridge runs north-south
      roofShape.moveTo(bbox.min.z, baseHeight);
      roofShape.lineTo(bbox.center.z, baseHeight + ridgeHeight);
      roofShape.lineTo(bbox.max.z, baseHeight);
    }

    // Extrude along ridge
    const extrudeSettings = {
      steps: 2,
      depth: isEastWest ? bbox.depth : bbox.width,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    });

    return new THREE.Mesh(geometry, material);
  }
}
```

## 🎭 Scene Management

### Scene Configuration
```typescript
interface SceneConfig {
  camera: {
    position: [number, number, number];
    fov: number;
    near: number;
    far: number;
  };
  lighting: {
    ambient: {
      intensity: number;
      color: string;
    };
    directional: {
      position: [number, number, number];
      intensity: number;
      castShadow: boolean;
    };
  };
  environment: {
    fog: {
      color: string;
      near: number;
      far: number;
    };
    background: string;
  };
  performance: {
    shadows: boolean;
    antialias: boolean;
    pixelRatio: number;
  };
}

const defaultSceneConfig: SceneConfig = {
  camera: {
    position: [50, 50, 50],
    fov: 45,
    near: 0.1,
    far: 1000
  },
  lighting: {
    ambient: {
      intensity: 0.2,
      color: '#4a5f7a'
    },
    directional: {
      position: [10, 20, 10],
      intensity: 0.5,
      castShadow: true
    }
  },
  environment: {
    fog: {
      color: '#0a0f1c',
      near: 50,
      far: 200
    },
    background: '#0a0f1c'
  },
  performance: {
    shadows: true,
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
  }
};
```

### React Three Fiber Scene
```tsx
const NeighborhoodScene: React.FC<SceneProps> = ({
  buildings,
  centerBuilding,
  energyData
}) => {
  return (
    <Canvas
      camera={defaultSceneConfig.camera}
      shadows={defaultSceneConfig.performance.shadows}
      dpr={defaultSceneConfig.performance.pixelRatio}
    >
      {/* Environment Setup */}
      <color
        attach="background"
        args={[defaultSceneConfig.environment.background]}
      />
      <fog
        attach="fog"
        args={[
          defaultSceneConfig.environment.fog.color,
          defaultSceneConfig.environment.fog.near,
          defaultSceneConfig.environment.fog.far
        ]}
      />

      {/* Lighting */}
      <ambientLight
        intensity={defaultSceneConfig.lighting.ambient.intensity}
        color={defaultSceneConfig.lighting.ambient.color}
      />
      <directionalLight
        position={defaultSceneConfig.lighting.directional.position}
        intensity={defaultSceneConfig.lighting.directional.intensity}
        castShadow
      />

      {/* Sky and Effects */}
      <AuroraSky intensity={energyData.wasteLevel} />

      {/* Ground */}
      <Ground />

      {/* Buildings */}
      <BuildingSystem
        buildings={buildings}
        centerBuilding={centerBuilding}
        energyData={energyData}
      />

      {/* Particle Systems */}
      <HeatParticles buildings={buildings} />

      {/* Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={20}
        maxDistance={150}
      />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
        />
        <ChromaticAberration offset={[0.001, 0.001]} />
        <Vignette offset={0.3} darkness={0.4} />
      </EffectComposer>

      {/* Performance Monitor (dev only) */}
      {process.env.NODE_ENV === 'development' && <Stats />}
    </Canvas>
  );
};
```

## ⚡ Performance Optimization

### Level of Detail (LOD) System
```typescript
class LODManager {
  private camera: THREE.Camera;
  private buildings: Map<string, LODBuilding>;

  updateLODs(cameraPosition: THREE.Vector3) {
    this.buildings.forEach(building => {
      const distance = building.position.distanceTo(cameraPosition);
      building.setLOD(this.getLODLevel(distance));
    });
  }

  private getLODLevel(distance: number): LODLevel {
    if (distance < 30) return 'high';
    if (distance < 60) return 'medium';
    if (distance < 100) return 'low';
    return 'minimal';
  }
}

interface LODLevel {
  high: {
    geometry: 'detailed';
    windows: true;
    roof: 'complex';
    particles: true;
  };
  medium: {
    geometry: 'simplified';
    windows: false;
    roof: 'simple';
    particles: false;
  };
  low: {
    geometry: 'box';
    windows: false;
    roof: 'flat';
    particles: false;
  };
  minimal: {
    geometry: 'billboard';
    windows: false;
    roof: 'none';
    particles: false;
  };
}
```

### Instanced Rendering
```tsx
const InstancedBuildings: React.FC<{
  buildings: BuildingData[]
}> = ({ buildings }) => {
  const meshRef = useRef<THREE.InstancedMesh>();

  useLayoutEffect(() => {
    const temp = new THREE.Object3D();

    buildings.forEach((building, i) => {
      temp.position.set(building.x, 0, building.z);
      temp.scale.set(1, building.height / 10, 1);
      temp.updateMatrix();
      meshRef.current?.setMatrixAt(i, temp.matrix);
    });

    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [buildings]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[10, 10, 10]} />
      <meshPhysicalMaterial color="#2a3f5f" />
    </instancedMesh>
  );
};
```

### Occlusion Culling
```typescript
class OcclusionCuller {
  private frustum: THREE.Frustum;
  private camera: THREE.Camera;

  cullBuildings(buildings: THREE.Object3D[]): THREE.Object3D[] {
    this.frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      )
    );

    return buildings.filter(building => {
      const sphere = new THREE.Sphere();
      building.geometry.computeBoundingSphere();
      sphere.copy(building.geometry.boundingSphere);
      sphere.applyMatrix4(building.matrixWorld);
      return this.frustum.intersectsSphere(sphere);
    });
  }
}
```

## 🎮 Interaction System

### Building Selection
```tsx
const InteractiveBuilding: React.FC<BuildingProps> = ({
  building,
  onSelect,
  onHover
}) => {
  const meshRef = useRef<THREE.Mesh>();
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);

  const { scale, emissiveIntensity } = useSpring({
    scale: selected ? 1.2 : hovered ? 1.1 : 1,
    emissiveIntensity: selected ? 0.8 : hovered ? 0.4 : 0
  });

  return (
    <animated.mesh
      ref={meshRef}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(building);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(!selected);
        onSelect?.(building);
      }}
    >
      <BuildingGeometry building={building} />
      <animated.meshPhysicalMaterial
        color={building.color}
        emissive="#00ff88"
        emissiveIntensity={emissiveIntensity}
      />
    </animated.mesh>
  );
};
```

### Information Overlays
```tsx
const BuildingTooltip: React.FC<TooltipProps> = ({
  building,
  visible
}) => {
  return (
    <Html
      position={[0, building.height + 5, 0]}
      center
      style={{
        transition: 'opacity 0.3s',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none'
      }}
    >
      <div className="bg-slate-900/90 p-3 rounded-lg text-white">
        <div className="font-bold">{building.address}</div>
        <div className="text-sm text-slate-300">
          {building.levels} etasjer • {building.area} m²
        </div>
        <div className="text-sm mt-1">
          <span className="text-emerald-400">
            Energikarakter: {building.energyGrade || 'Ukjent'}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          {building.energyUse} kWh/m²/år
        </div>
      </div>
    </Html>
  );
};
```

## 🌐 Data Management

### State Management
```typescript
interface NeighborhoodState {
  buildings: Map<string, Building3D>;
  centerBuilding: string;
  loadingState: 'idle' | 'loading' | 'loaded' | 'error';
  visibleRadius: number;
  selectedBuilding: string | null;
  energyData: Map<string, EnergyData>;
  filters: {
    minEnergyGrade: string;
    maxEnergyGrade: string;
    buildingTypes: string[];
  };
}

const useNeighborhoodStore = create<NeighborhoodState>((set) => ({
  buildings: new Map(),
  centerBuilding: '',
  loadingState: 'idle',
  visibleRadius: 200,
  selectedBuilding: null,
  energyData: new Map(),
  filters: {
    minEnergyGrade: 'A',
    maxEnergyGrade: 'G',
    buildingTypes: []
  },

  // Actions
  loadBuildings: async (center: Coordinates, radius: number) => {
    set({ loadingState: 'loading' });
    try {
      const buildings = await fetchOSMBuildings(center, radius);
      set({
        buildings: new Map(buildings.map(b => [b.id, b])),
        loadingState: 'loaded'
      });
    } catch (error) {
      set({ loadingState: 'error' });
    }
  },

  selectBuilding: (id: string | null) => {
    set({ selectedBuilding: id });
  }
}));
```

## 📊 Metrics & Analytics

### Performance Monitoring
```typescript
class PerformanceMonitor {
  private stats: {
    fps: number;
    drawCalls: number;
    triangles: number;
    memory: number;
  };

  monitor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.stats = {
      fps: this.calculateFPS(),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      memory: (performance as any).memory?.usedJSHeapSize || 0
    };

    this.checkPerformance();
  }

  private checkPerformance() {
    if (this.stats.fps < 30) {
      this.optimizeScene();
    }
  }

  private optimizeScene() {
    // Reduce quality settings
    // Disable effects
    // Reduce LOD distances
  }
}
```

This architecture provides a robust, scalable foundation for the 3D neighborhood visualization with proper data management, performance optimization, and interaction capabilities.