'use client';

import { ThreeEvent } from '@react-three/fiber';
import { Plane, Shape, ExtrudeGeometry, BufferGeometry, Vector3, Float32BufferAttribute } from 'three';
import { useMemo } from 'react';
import {
  analyzeFootprintComplexity,
  decomposeRectilinearPolygon,
  generateMultiSectionRoof,
} from '@/lib/roofGeometry';

interface RoofComponentProps {
  footprint: [number, number][];
  height: number;
  numberOfFloors: number;
  roofPlacementFloor: number | null;
  selectedComponent: string | null;
  hoveredComponent: string | null;
  clippingPlanes: Plane[];
  handleClick: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  handleRightClick: (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => void;
  handlePointerOver: (event: ThreeEvent<PointerEvent>, componentId: string) => void;
  handlePointerOut: () => void;
}

export default function RoofComponent({
  footprint,
  height,
  numberOfFloors,
  roofPlacementFloor,
  selectedComponent,
  hoveredComponent,
  clippingPlanes,
  handleClick,
  handleRightClick,
  handlePointerOver,
  handlePointerOut
}: RoofComponentProps) {
  const roofHeight = useMemo(() => {
    if (roofPlacementFloor !== null && roofPlacementFloor < numberOfFloors) {
      return (height / numberOfFloors) * (roofPlacementFloor + 1);
    }
    return height;
  }, [roofPlacementFloor, numberOfFloors, height]);

  // Calculate polygon area
  const polygonArea = useMemo(() => {
    let area = 0;
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      area += footprint[i][0] * footprint[j][1];
      area -= footprint[j][0] * footprint[i][1];
    }
    return Math.abs(area / 2);
  }, [footprint]);

  // Analyze footprint complexity
  const complexity = useMemo(() => {
    return analyzeFootprintComplexity(footprint);
  }, [footprint]);

  // Determine roof type: flat if 4+ floors OR area > 500m²
  const useFlatRoof = numberOfFloors >= 4 || polygonArea > 500;

  // Flat roof geometry
  const flatRoofGeometry = useMemo(() => {
    if (!useFlatRoof) return null;

    const shape = new Shape();
    footprint.forEach((point, index) => {
      if (index === 0) {
        shape.moveTo(point[0], point[1]);
      } else {
        shape.lineTo(point[0], point[1]);
      }
    });
    shape.closePath();

    return new ExtrudeGeometry(shape, {
      depth: 0.3, // 30cm thick roof slab
      bevelEnabled: false
    });
  }, [footprint, useFlatRoof]);

  // Multi-section roof geometry (for complex footprints)
  const multiSectionRoofGeometry = useMemo(() => {
    if (useFlatRoof) return null;
    if (complexity.recommendedApproach !== 'multi-section') return null;

    // Decompose into sections
    const sections = decomposeRectilinearPolygon(footprint);

    // Generate combined geometry
    const { vertices } = generateMultiSectionRoof(sections);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, [footprint, useFlatRoof, complexity]);

  // Pitched roof geometry (for simple footprints)
  const pitchedRoofData = useMemo(() => {
    if (useFlatRoof) return null;
    if (complexity.recommendedApproach === 'multi-section') return null;

    // 1. Find longest edge of polygon
    let longestEdgeIndex = 0;
    let longestEdgeLength = 0;

    for (let i = 0; i < footprint.length; i++) {
      const p1 = footprint[i];
      const p2 = footprint[(i + 1) % footprint.length];
      const length = Math.sqrt(
        Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2)
      );

      if (length > longestEdgeLength) {
        longestEdgeLength = length;
        longestEdgeIndex = i;
      }
    }

    const longestEdgeStart = footprint[longestEdgeIndex];
    const longestEdgeEnd = footprint[(longestEdgeIndex + 1) % footprint.length];

    // 2. Calculate ridge direction (parallel to longest edge)
    const ridgeDX = longestEdgeEnd[0] - longestEdgeStart[0];
    const ridgeDY = longestEdgeEnd[1] - longestEdgeStart[1];
    const ridgeLength = Math.sqrt(ridgeDX * ridgeDX + ridgeDY * ridgeDY);

    // Normalized ridge direction
    const ridgeUnitX = ridgeDX / ridgeLength;
    const ridgeUnitY = ridgeDY / ridgeLength;

    // Perpendicular direction (for measuring width)
    const perpX = -ridgeUnitY;
    const perpY = ridgeUnitX;

    // 3. Find furthest points in perpendicular direction
    let minProj = Infinity;
    let maxProj = -Infinity;
    let minPoint: [number, number] = [0, 0];
    let maxPoint: [number, number] = [0, 0];

    footprint.forEach(point => {
      // Project point onto perpendicular axis
      const projection = point[0] * perpX + point[1] * perpY;

      if (projection < minProj) {
        minProj = projection;
        minPoint = point;
      }
      if (projection > maxProj) {
        maxProj = projection;
        maxPoint = point;
      }
    });

    // 4. Calculate ridge position (midpoint between furthest points)
    const ridgeCenterX = (minPoint[0] + maxPoint[0]) / 2;
    const ridgeCenterY = (minPoint[1] + maxPoint[1]) / 2;

    // 5. Calculate building width (perpendicular to ridge)
    const buildingWidth = maxProj - minProj;

    // 6. Ridge height (35% of building width for reasonable pitch)
    const ridgeHeightAboveBase = buildingWidth * 0.35;

    // 7. Find extent of building along ridge direction (parallel to longest edge)
    let minRidgeProj = Infinity;
    let maxRidgeProj = -Infinity;

    footprint.forEach(point => {
      // Project point onto ridge direction
      const projection = point[0] * ridgeUnitX + point[1] * ridgeUnitY;
      minRidgeProj = Math.min(minRidgeProj, projection);
      maxRidgeProj = Math.max(maxRidgeProj, projection);
    });

    // Calculate ridge endpoints along the ridge direction
    const ridgeStart: [number, number] = [
      minRidgeProj * ridgeUnitX,
      minRidgeProj * ridgeUnitY
    ];
    const ridgeEnd: [number, number] = [
      maxRidgeProj * ridgeUnitX,
      maxRidgeProj * ridgeUnitY
    ];

    // 8. Calculate eave positions using the perpendicular projections (minProj, maxProj)
    // Eave 1 at maxProj (furthest in perpendicular direction)
    const eave1Start: [number, number] = [
      minRidgeProj * ridgeUnitX + maxProj * perpX,
      minRidgeProj * ridgeUnitY + maxProj * perpY
    ];
    const eave1End: [number, number] = [
      maxRidgeProj * ridgeUnitX + maxProj * perpX,
      maxRidgeProj * ridgeUnitY + maxProj * perpY
    ];

    // Eave 2 at minProj (nearest in perpendicular direction)
    const eave2Start: [number, number] = [
      minRidgeProj * ridgeUnitX + minProj * perpX,
      minRidgeProj * ridgeUnitY + minProj * perpY
    ];
    const eave2End: [number, number] = [
      maxRidgeProj * ridgeUnitX + minProj * perpX,
      maxRidgeProj * ridgeUnitY + minProj * perpY
    ];

    return {
      ridgeStart,
      ridgeEnd,
      ridgeHeight: ridgeHeightAboveBase,
      eave1Start,
      eave1End,
      eave2Start,
      eave2End,
    };
  }, [footprint, useFlatRoof]);

  // Create pitched roof geometry
  const pitchedRoofGeometry = useMemo(() => {
    if (!pitchedRoofData) return null;

    const { ridgeStart, ridgeEnd, ridgeHeight, eave1Start, eave1End, eave2Start, eave2End } = pitchedRoofData;

    // Create BufferGeometry for both roof planes
    const geometry = new BufferGeometry();

    // CRITICAL: Transform coordinates for Three.js coordinate system
    // GIS: X=East, Y=North, Z=Height
    // Three.js: X=Right, Y=Up, Z=Forward (negative Z = into screen = North)
    // Transform: three_x = gis_x, three_y = height, three_z = -gis_y

    // Vertices for two triangulated quads (2 planes × 2 triangles × 3 vertices = 12 vertices)
    const vertices = new Float32Array([
      // Plane 1 (ridge to eave1)
      // Triangle 1
      ridgeStart[0], ridgeHeight, -ridgeStart[1],
      eave1Start[0], 0, -eave1Start[1],
      ridgeEnd[0], ridgeHeight, -ridgeEnd[1],
      // Triangle 2
      ridgeEnd[0], ridgeHeight, -ridgeEnd[1],
      eave1Start[0], 0, -eave1Start[1],
      eave1End[0], 0, -eave1End[1],

      // Plane 2 (ridge to eave2)
      // Triangle 1
      ridgeStart[0], ridgeHeight, -ridgeStart[1],
      ridgeEnd[0], ridgeHeight, -ridgeEnd[1],
      eave2Start[0], 0, -eave2Start[1],
      // Triangle 2
      ridgeEnd[0], ridgeHeight, -ridgeEnd[1],
      eave2End[0], 0, -eave2End[1],
      eave2Start[0], 0, -eave2Start[1],
    ]);

    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, [pitchedRoofData]);

  if (useFlatRoof && flatRoofGeometry) {
    return (
      <mesh
        geometry={flatRoofGeometry}
        position={[0, roofHeight, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => handleClick(e, 'roof-flat')}
        onContextMenu={(e) => handleRightClick(e, 'roof-flat', [0, 1, 0])}
        onPointerOver={(e) => handlePointerOver(e, 'roof-flat')}
        onPointerOut={handlePointerOut}
      >
        <meshPhysicalMaterial
          color={selectedComponent === 'roof-flat' ? '#ef4444' :
                 hoveredComponent === 'roof-flat' ? '#f97316' : '#1f2937'}
          roughness={0.9}
          metalness={0.1}
          emissive={selectedComponent === 'roof-flat' ? '#ef4444' : '#000000'}
          emissiveIntensity={selectedComponent === 'roof-flat' ? 0.1 : 0}
          clippingPlanes={clippingPlanes}
        />
      </mesh>
    );
  }

  // Multi-section roof (complex footprints)
  if (multiSectionRoofGeometry) {
    return (
      <mesh
        geometry={multiSectionRoofGeometry}
        position={[0, roofHeight, 0]}
        onClick={(e) => handleClick(e, 'roof-multi-section')}
        onContextMenu={(e) => handleRightClick(e, 'roof-multi-section', [0, 1, 0])}
        onPointerOver={(e) => handlePointerOver(e, 'roof-multi-section')}
        onPointerOut={handlePointerOut}
      >
        <meshPhysicalMaterial
          color={selectedComponent === 'roof-multi-section' ? '#ef4444' :
                 hoveredComponent === 'roof-multi-section' ? '#f97316' : '#8b4513'}
          roughness={0.9}
          metalness={0.1}
          emissive={selectedComponent === 'roof-multi-section' ? '#ef4444' : '#000000'}
          emissiveIntensity={selectedComponent === 'roof-multi-section' ? 0.1 : 0}
          clippingPlanes={clippingPlanes}
          side={2} // Double-sided for pitched roof
        />
      </mesh>
    );
  }

  // Simple pitched roof
  if (pitchedRoofGeometry) {
    return (
      <mesh
        geometry={pitchedRoofGeometry}
        position={[0, roofHeight, 0]}
        onClick={(e) => handleClick(e, 'roof-pitched')}
        onContextMenu={(e) => handleRightClick(e, 'roof-pitched', [0, 1, 0])}
        onPointerOver={(e) => handlePointerOver(e, 'roof-pitched')}
        onPointerOut={handlePointerOut}
      >
        <meshPhysicalMaterial
          color={selectedComponent === 'roof-pitched' ? '#ef4444' :
                 hoveredComponent === 'roof-pitched' ? '#f97316' : '#8b4513'}
          roughness={0.9}
          metalness={0.1}
          emissive={selectedComponent === 'roof-pitched' ? '#ef4444' : '#000000'}
          emissiveIntensity={selectedComponent === 'roof-pitched' ? 0.1 : 0}
          clippingPlanes={clippingPlanes}
          side={2} // Double-sided for pitched roof
        />
      </mesh>
    );
  }

  return null;
}
