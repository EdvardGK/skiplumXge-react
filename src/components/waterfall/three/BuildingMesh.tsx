'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Shape, ExtrudeGeometry, Vector2 } from 'three';
import { generateRoofSections, generateRoof3DGeometry } from '@/lib/roof-algorithm';

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

  // Use intelligent roof algorithm to analyze building and generate roof sections
  const roofData = useMemo(() => {
    if (!footprint || footprint.length === 0) {
      // Default fallback for empty footprint
      return {
        sections: [],
        intersections: [],
        geometry3D: [],
        bounds: { minX: -10, maxX: 10, minY: -8, maxY: 8, centerX: 0, centerY: 0, width: 20, depth: 16 }
      };
    }

    try {
      // Generate roof sections using the intelligent algorithm
      const { sections, intersections } = generateRoofSections(footprint);

      // Generate 3D geometry for rendering
      const geometry3D = generateRoof3DGeometry(sections, intersections);

      // Calculate overall bounds for fallback
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      footprint.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });

      const bounds = {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        depth: maxY - minY
      };

      return {
        sections,
        intersections,
        geometry3D,
        bounds
      };
    } catch (error) {
      console.warn('Roof generation failed, using simple fallback:', error);

      // Fallback to simple single-section roof
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      footprint.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });

      const bounds = {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX,
        depth: maxY - minY
      };

      return {
        sections: [],
        intersections: [],
        geometry3D: [],
        bounds
      };
    }
  }, [footprint]);

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

  // Building color based on type - Northern lights palette
  const buildingColor = useMemo(() => {
    if (showHeatParticles) {
      return '#a855f7'; // Purple for inefficient (northern lights)
    }

    switch (buildingType.toLowerCase()) {
      case 'kontor':
        return '#0891b2'; // Cyan for office
      case 'bolig':
        return '#10b981'; // Emerald for residential
      case 'barnehage':
        return '#06b6d4'; // Cyan variant
      case 'sykehus':
        return '#8b5cf6'; // Purple for hospital
      default:
        return '#0ea5e9'; // Sky blue for other
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
                color="#a855f7"
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
                    color="#06b6d4"
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* Intelligent roof system based on building shape */}
      <group position={[0, height, 0]}>
        {/* Norwegian standard: 600mm (0.6m) overhang, 200mm (0.2m) below wall top */}
        {(() => {
          const { geometry3D, bounds } = roofData;

          // If intelligent algorithm generated roof sections, render them
          if (geometry3D && geometry3D.length > 0) {
            return (
              <>
                {geometry3D.map((roofPart, index) => {
                  if (roofPart.type === 'gable') {
                    const { ridgeLength, roofWidth, ridgeHeight, orientation, position } = roofPart;
                    if (!roofWidth || !ridgeLength || !ridgeHeight) return null;
                    const slopeDepth = roofWidth / 2;
                    const [posX, , posZ] = position;

                    return (
                      <group key={index} position={[posX, 0, posZ]}>
                        {orientation === 'x' ? (
                          <>
                            {/* Ridge runs east-west */}
                            <mesh position={[0, ridgeHeight / 2, -slopeDepth / 2]} rotation={[-Math.PI / 5, 0, 0]}>
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[0, ridgeHeight / 2, slopeDepth / 2]} rotation={[Math.PI / 5, 0, 0]}>
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[0, ridgeHeight, 0]}>
                              <boxGeometry args={[ridgeLength, 0.4, 0.4]} />
                              <meshPhysicalMaterial color="#111827" roughness={0.8} />
                            </mesh>
                          </>
                        ) : (
                          <>
                            {/* Ridge runs north-south */}
                            <mesh position={[-slopeDepth / 2, ridgeHeight / 2, 0]} rotation={[0, 0, Math.PI / 5]}>
                              <boxGeometry args={[slopeDepth * 1.1, 0.3, ridgeLength]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[slopeDepth / 2, ridgeHeight / 2, 0]} rotation={[0, 0, -Math.PI / 5]}>
                              <boxGeometry args={[slopeDepth * 1.1, 0.3, ridgeLength]} />
                              <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                            </mesh>
                            <mesh position={[0, ridgeHeight, 0]}>
                              <boxGeometry args={[0.4, 0.4, ridgeLength]} />
                              <meshPhysicalMaterial color="#111827" roughness={0.8} />
                            </mesh>
                          </>
                        )}
                      </group>
                    );
                  } else if (roofPart.type === 'valley') {
                    // Render valley geometry
                    return null; // TODO: Implement valley rendering
                  }
                  return null;
                })}
              </>
            );
          } else {
            // Fallback to simple single roof if algorithm fails
            const overhang = 0.6;
            const width = bounds.width + overhang * 2;
            const depth = bounds.depth + overhang * 2;
            const roofHeight = Math.min(width, depth) * 0.35;
            const orientation = width > depth ? 'x' : 'y';

            if (orientation === 'x') {
              return (
                <>
                  <mesh position={[0, roofHeight / 2, -depth / 4]} rotation={[-Math.PI / 5, 0, 0]}>
                    <boxGeometry args={[width, 0.3, depth * 0.55]} />
                    <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                  </mesh>
                  <mesh position={[0, roofHeight / 2, depth / 4]} rotation={[Math.PI / 5, 0, 0]}>
                    <boxGeometry args={[width, 0.3, depth * 0.55]} />
                    <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                  </mesh>
                  <mesh position={[0, roofHeight, 0]}>
                    <boxGeometry args={[width, 0.4, 0.4]} />
                    <meshPhysicalMaterial color="#111827" roughness={0.8} />
                  </mesh>
                </>
              );
            } else {
              return (
                <>
                  <mesh position={[-width / 4, roofHeight / 2, 0]} rotation={[0, 0, Math.PI / 5]}>
                    <boxGeometry args={[width * 0.55, 0.3, depth]} />
                    <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                  </mesh>
                  <mesh position={[width / 4, roofHeight / 2, 0]} rotation={[0, 0, -Math.PI / 5]}>
                    <boxGeometry args={[width * 0.55, 0.3, depth]} />
                    <meshPhysicalMaterial color="#1f2937" roughness={0.9} metalness={0.1} />
                  </mesh>
                  <mesh position={[0, roofHeight, 0]}>
                    <boxGeometry args={[0.4, 0.4, depth]} />
                    <meshPhysicalMaterial color="#111827" roughness={0.8} />
                  </mesh>
                </>
              );
            }
          }
        })()}
      </group>
    </group>
  );
}