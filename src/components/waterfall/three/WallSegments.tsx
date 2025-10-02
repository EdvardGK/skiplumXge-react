'use client';

import { ThreeEvent } from '@react-three/fiber';
import { Plane } from 'three';

interface InsulationData {
  walls?: { thickness: number; uValue: number };
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface WallSegmentsProps {
  footprint: [number, number][];
  numberOfFloors: number;
  height: number;
  visibleFloors: Set<number>;
  insulation?: InsulationData;
  buildingColor: string;
  selectedComponent: string | null;
  hoveredComponent: string | null;
  clippingPlanes: Plane[];
  handleClick: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  handleRightClick: (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => void;
  handlePointerOver: (event: ThreeEvent<PointerEvent>, componentId: string) => void;
  handlePointerOut: () => void;
}

export default function WallSegments({
  footprint,
  numberOfFloors,
  height,
  visibleFloors,
  insulation,
  buildingColor,
  selectedComponent,
  hoveredComponent,
  clippingPlanes,
  handleClick,
  handleRightClick,
  handlePointerOver,
  handlePointerOut
}: WallSegmentsProps) {
  const wallThickness = (insulation?.walls?.thickness || 200) / 1000;
  const floorHeight = height / numberOfFloors;

  return (
    <group>
      {Array.from({ length: numberOfFloors }, (_, floor) => {
        if (!visibleFloors.has(floor)) return null;

        const yPos = (floor * floorHeight) + (floorHeight / 2);

        return (
          <group key={`floor-walls-${floor}`}>
            {footprint.map((point, index) => {
              const nextPoint = footprint[(index + 1) % footprint.length];

              const wallId = `wall-floor${floor}-${index}`;
              const isSelected = selectedComponent === wallId;
              const isHovered = hoveredComponent === wallId;

              // Calculate wall center (midpoint between two footprint corners)
              const centerX = (point[0] + nextPoint[0]) / 2;
              const centerZ = -(point[1] + nextPoint[1]) / 2;

              // Calculate wall length
              const dx = nextPoint[0] - point[0];
              const dy = nextPoint[1] - point[1];
              const wallLength = Math.sqrt(dx * dx + dy * dy);

              // Calculate rotation to align wall with footprint edge
              const wallAngle = Math.atan2(dy, dx);

              // Calculate outward normal for context menu
              const normalX = -dy / wallLength;
              const normalZ = dx / wallLength;

              return (
                <mesh
                  key={wallId}
                  position={[centerX, yPos, centerZ]}
                  rotation={[0, wallAngle, 0]}
                  castShadow
                  receiveShadow
                  onClick={(e) => handleClick(e, wallId)}
                  onContextMenu={(e) => handleRightClick(e, wallId, [normalX, 0, normalZ])}
                  onPointerOver={(e) => handlePointerOver(e, wallId)}
                  onPointerOut={handlePointerOut}
                >
                  <boxGeometry args={[wallLength, floorHeight, wallThickness]} />
                  <meshPhysicalMaterial
                    color={isSelected ? '#10b981' : isHovered ? '#0ea5e9' : buildingColor}
                    metalness={0.1}
                    roughness={0.7}
                    envMapIntensity={0.5}
                    emissive={isSelected ? '#10b981' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : 0}
                    clippingPlanes={clippingPlanes}
                    side={2}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
