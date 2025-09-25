'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Shape, ExtrudeGeometry, Vector2 } from 'three';

interface BuildingMeshProps {
  footprint: [number, number][];
  height: number;
  buildingType: string;
  showHeatParticles?: boolean;
}

export default function BuildingMesh({
  footprint,
  height,
  buildingType,
  showHeatParticles = false
}: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const particlesRef = useRef<Mesh[]>([]);

  // Create building geometry from footprint
  const geometry = useMemo(() => {
    const shape = new Shape();

    // Convert footprint to shape
    if (footprint.length > 0) {
      const [firstX, firstY] = footprint[0];
      shape.moveTo(firstX, firstY);

      for (let i = 1; i < footprint.length; i++) {
        const [x, y] = footprint[i];
        shape.lineTo(x, y);
      }
      shape.closePath();
    }

    // Extrude settings
    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 0.2,
      bevelThickness: 0.1,
    };

    return new ExtrudeGeometry(shape, extrudeSettings);
  }, [footprint, height]);

  // Building color based on type and efficiency
  const buildingColor = useMemo(() => {
    if (showHeatParticles) {
      return '#dc2626'; // Red for inefficient buildings
    }

    switch (buildingType.toLowerCase()) {
      case 'kontor':
        return '#1e40af'; // Blue for office
      case 'bolig':
        return '#059669'; // Green for residential
      default:
        return '#6366f1'; // Purple for other
    }
  }, [buildingType, showHeatParticles]);

  // Animation loop
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Subtle building pulse for inefficient buildings
      if (showHeatParticles) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
      }
    }

    // Animate heat particles
    if (showHeatParticles) {
      particlesRef.current.forEach((particle, i) => {
        if (particle) {
          particle.position.y += delta * 2;
          particle.position.x += Math.sin(state.clock.elapsedTime + i) * delta * 0.5;
          particle.position.z += Math.cos(state.clock.elapsedTime + i * 0.5) * delta * 0.5;

          if (particle.position.y > height + 5) {
            particle.position.y = 0;
            particle.position.x = (Math.random() - 0.5) * 10;
            particle.position.z = (Math.random() - 0.5) * 10;
          }
        }
      });
    }
  });

  return (
    <group>
      {/* Main Building */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={buildingColor}
          metalness={0.1}
          roughness={0.7}
          envMapIntensity={0.5}
          transparent={showHeatParticles}
          opacity={showHeatParticles ? 0.8 : 1}
        />
      </mesh>

      {/* Heat Particles */}
      {showHeatParticles && (
        <group>
          {[...Array(12)].map((_, i) => (
            <mesh
              key={i}
              ref={(el) => {
                if (el) particlesRef.current[i] = el;
              }}
              position={[
                (Math.random() - 0.5) * 10,
                Math.random() * height,
                (Math.random() - 0.5) * 10
              ]}
            >
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshBasicMaterial
                color="#f59e0b"
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Windows (simplified) */}
      {!showHeatParticles && (
        <group>
          {[...Array(Math.floor(height / 3))].map((_, floor) => (
            <group key={floor}>
              {[...Array(3)].map((_, window) => (
                <mesh
                  key={window}
                  position={[
                    -5 + window * 5,
                    floor * 3 + 1.5,
                    5.1
                  ]}
                >
                  <boxGeometry args={[1, 1.5, 0.1]} />
                  <meshBasicMaterial
                    color="#60a5fa"
                    transparent
                    opacity={0.3}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* Roof (simplified saddle roof) */}
      <group position={[0, height, 0]}>
        <mesh position={[0, 1, 2.5]} rotation={[Math.PI / 6, 0, 0]}>
          <boxGeometry args={[10, 4, 0.2]} />
          <meshPhysicalMaterial color="#374151" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1, -2.5]} rotation={[-Math.PI / 6, 0, 0]}>
          <boxGeometry args={[10, 4, 0.2]} />
          <meshPhysicalMaterial color="#374151" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}