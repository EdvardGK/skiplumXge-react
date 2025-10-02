'use client';

import { ThreeEvent } from '@react-three/fiber';
import { Plane, Shape } from 'three';

interface InsulationData {
  walls?: { thickness: number; uValue: number };
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface FloorComponentsProps {
  footprint: [number, number][];
  numberOfFloors: number;
  height: number;
  visibleFloors: Set<number>;
  insulation?: InsulationData;
  selectedComponent: string | null;
  hoveredComponent: string | null;
  clippingPlanes: Plane[];
  handleClick: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  handleRightClick: (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => void;
  handlePointerOver: (event: ThreeEvent<PointerEvent>, componentId: string) => void;
  handlePointerOut: () => void;
}

export default function FloorComponents({
  footprint,
  numberOfFloors,
  height,
  visibleFloors,
  insulation,
  selectedComponent,
  hoveredComponent,
  clippingPlanes,
  handleClick,
  handleRightClick,
  handlePointerOver,
  handlePointerOut
}: FloorComponentsProps) {
  return (
    <group>
      {/* Ground floor with insulation thickness */}
      {visibleFloors.has(0) && (
        <mesh
          position={[0, -(insulation?.floor?.thickness || 250) / 1000, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => handleClick(e, 'floor-ground')}
          onContextMenu={(e) => handleRightClick(e, 'floor-ground', [0, 1, 0])}
          onPointerOver={(e) => handlePointerOver(e, 'floor-ground')}
          onPointerOut={handlePointerOut}
        >
          <shapeGeometry args={[(() => {
            const shape = new Shape();
            if (footprint.length > 0) {
              const [firstX, firstY] = footprint[0];
              shape.moveTo(firstX, firstY);
              for (let i = 1; i < footprint.length; i++) {
                const [x, y] = footprint[i];
                shape.lineTo(x, y);
              }
              shape.closePath();
            }
            return shape;
          })()]} />
          <meshPhysicalMaterial
            color={selectedComponent === 'floor-ground' ? '#f59e0b' :
                   hoveredComponent === 'floor-ground' ? '#f97316' : '#374151'}
            roughness={0.9}
            metalness={0.1}
            side={2}
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      )}

      {/* Floor dividers between floors */}
      {numberOfFloors > 1 && (
        <group>
          {[...Array(numberOfFloors - 1)].map((_, floorIndex) => {
            const floorAbove = floorIndex + 1;
            if (!visibleFloors.has(floorAbove)) return null;

            const floorHeight = (height / numberOfFloors) * (floorIndex + 1);
            const floorId = `floor-divider-${floorIndex + 1}`;
            const isSelected = selectedComponent === floorId;
            const isHovered = hoveredComponent === floorId;

            return (
              <mesh
                key={floorId}
                position={[0, floorHeight, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => handleClick(e, floorId)}
                onPointerOver={(e) => handlePointerOver(e, floorId)}
                onPointerOut={handlePointerOut}
              >
                <shapeGeometry args={[(() => {
                  const shape = new Shape();
                  if (footprint.length > 0) {
                    const [firstX, firstY] = footprint[0];
                    shape.moveTo(firstX, firstY);
                    for (let i = 1; i < footprint.length; i++) {
                      const [x, y] = footprint[i];
                      shape.lineTo(x, y);
                    }
                    shape.closePath();
                  }
                  return shape;
                })()]} />
                <meshPhysicalMaterial
                  color={isSelected ? '#10b981' : isHovered ? '#06b6d4' : '#4b5563'}
                  roughness={0.8}
                  metalness={0.1}
                  side={2}
                  transparent
                  opacity={0.9}
                  emissive={isSelected ? '#10b981' : '#000000'}
                  emissiveIntensity={isSelected ? 0.1 : 0}
                  clippingPlanes={clippingPlanes}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}
