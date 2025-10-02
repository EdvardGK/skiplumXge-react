'use client';

import { ThreeEvent } from '@react-three/fiber';
import { Plane } from 'three';

interface InsulationData {
  walls?: { thickness: number; uValue: number };
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface OpeningsData {
  windows?: { count: number; uValue: number };
  doors?: { count: number; uValue: number };
}

interface WindowDoorComponentsProps {
  footprint: [number, number][];
  numberOfFloors: number;
  height: number;
  visibleFloors: Set<number>;
  insulation?: InsulationData;
  openings?: OpeningsData;
  selectedComponent: string | null;
  hoveredComponent: string | null;
  clippingPlanes: Plane[];
  handleClick: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  handlePointerOver: (event: ThreeEvent<PointerEvent>, componentId: string) => void;
  handlePointerOut: () => void;
}

export default function WindowDoorComponents({
  footprint,
  numberOfFloors,
  height,
  visibleFloors,
  insulation,
  openings,
  selectedComponent,
  hoveredComponent,
  clippingPlanes,
  handleClick,
  handlePointerOver,
  handlePointerOut
}: WindowDoorComponentsProps) {
  const doorCount = openings?.doors?.count || 2;
  const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

  // Calculate perimeter segments with indices
  const segments: { start: [number, number], end: [number, number], length: number, index: number }[] = [];

  for (let i = 0; i < footprint.length; i++) {
    const start = footprint[i];
    const end = footprint[(i + 1) % footprint.length];
    const length = Math.sqrt(
      Math.pow(end[0] - start[0], 2) +
      Math.pow(end[1] - start[1], 2)
    );
    segments.push({ start, end, length, index: i });
  }

  // Sort segments by length to find longest walls
  const sortedSegments = [...segments].sort((a, b) => b.length - a.length);

  // Get the two longest walls for doors
  const doorWalls = sortedSegments.slice(0, Math.min(2, sortedSegments.length));
  const doorWallIndices = new Set(doorWalls.map(w => w.index));

  const openingComponents: React.ReactElement[] = [];
  let windowIndex = 0;

  // Place openings on each wall for all floors
  segments.forEach((segment, segmentIndex) => {
    const hasDoor = doorWallIndices.has(segmentIndex) && doorWalls.length > 0;
    const wallDoorIndex = doorWalls.findIndex(w => w.index === segmentIndex);

    // Calculate windows for this wall (1 per 3 meters)
    const windowCount = Math.floor(segment.length / 3);

    // Calculate wall rotation once for all openings
    const dx = segment.end[0] - segment.start[0];
    const dz = segment.end[1] - segment.start[1];
    const rotation = Math.atan2(dz, dx);

    // Loop through each floor
    for (let floor = 0; floor < numberOfFloors; floor++) {
      if (!visibleFloors.has(floor)) continue;

      const isGroundFloor = floor === 0;
      const floorHeight = height / numberOfFloors;
      const slabY = floorHeight * floor;
      const floorY = slabY + floorHeight / 2;

      // Calculate total openings for this floor
      const totalOpenings = windowCount + (hasDoor && isGroundFloor ? 1 : 0);
      if (totalOpenings === 0) continue;

      // Calculate even spacing across the wall
      const spacing = segment.length / (totalOpenings + 1);

      // Place door first if this is ground floor and wall has a door
      if (hasDoor && isGroundFloor) {
        const doorDistance = spacing;
        const doorT = doorDistance / segment.length;
        const doorX = segment.start[0] + doorT * (segment.end[0] - segment.start[0]);
        const doorZ = -(segment.start[1] + doorT * (segment.end[1] - segment.start[1]));

        const doorId = `door-${wallDoorIndex}`;
        const isSelected = selectedComponent === doorId;
        const isHovered = hoveredComponent === doorId;

        openingComponents.push(
          <mesh
            key={doorId}
            position={[doorX, slabY + 1.1, doorZ]}
            rotation={[0, rotation, 0]}
            onClick={(e) => handleClick(e, doorId)}
            onPointerOver={(e) => handlePointerOver(e, doorId)}
            onPointerOut={handlePointerOut}
          >
            <boxGeometry args={[1.0, 2.2, wallThickness + 0.1]} />
            <meshPhysicalMaterial
              color={isSelected ? '#f87171' : isHovered ? '#f97316' : '#8b5cf6'}
              transparent
              opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.4}
              metalness={0.2}
              roughness={0.8}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        );
      }

      // Place windows for this floor
      for (let i = 0; i < windowCount; i++) {
        const positionIndex = (hasDoor && isGroundFloor) ? i + 2 : i + 1;
        const distanceAlongWall = spacing * positionIndex;

        const t = distanceAlongWall / segment.length;
        const x = segment.start[0] + t * (segment.end[0] - segment.start[0]);
        const z = -(segment.start[1] + t * (segment.end[1] - segment.start[1]));

        const windowId = `window-floor${floor}-${windowIndex++}`;
        const isSelected = selectedComponent === windowId;
        const isHovered = hoveredComponent === windowId;

        openingComponents.push(
          <mesh
            key={windowId}
            position={[x, floorY, z]}
            rotation={[0, rotation, 0]}
            onClick={(e) => handleClick(e, windowId)}
            onPointerOver={(e) => handlePointerOver(e, windowId)}
            onPointerOut={handlePointerOut}
          >
            <boxGeometry args={[1.2, 1.5, wallThickness + 0.1]} />
            <meshPhysicalMaterial
              color={isSelected ? '#fbbf24' : isHovered ? '#60a5fa' : '#06b6d4'}
              transparent
              opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
              metalness={0.8}
              roughness={0.1}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        );
      }
    }
  });

  return <group>{openingComponents}</group>;
}
