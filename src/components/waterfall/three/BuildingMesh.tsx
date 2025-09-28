'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Mesh, Shape, ExtrudeGeometry, Vector2, Plane, Vector3 } from 'three';
import { generateRoofSections, generateRoof3DGeometry } from '@/lib/roof-algorithm';

interface InsulationData {
  walls?: { thickness: number; uValue: number };  // thickness in mm
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface OpeningsData {
  windows?: { count: number; uValue: number };
  doors?: { count: number; uValue: number };
}

interface BuildingMeshProps {
  footprint: [number, number][];
  height?: number;  // Optional - will be calculated if not provided
  numberOfFloors?: number;
  buildingType: string;
  showHeatParticles?: boolean;
  insulation?: InsulationData;
  openings?: OpeningsData;
  onComponentSelect?: (componentId: string | null, componentType?: string) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  sectionPlane?: { active: boolean; axis: 'x' | 'y' | 'z'; position: number; normal?: [number, number, number] } | null;
  visibleFloors?: Set<number>;  // Which floors are visible (includes roof as last floor)
}

export default function BuildingMesh({
  footprint,
  height: providedHeight,
  numberOfFloors = 2,  // Default 2 floors
  buildingType,
  showHeatParticles = false,
  insulation = {
    walls: { thickness: 200, uValue: 0.18 },  // Default 200mm wall insulation
    roof: { thickness: 300, uValue: 0.13 },   // Default 300mm roof insulation
    floor: { thickness: 250, uValue: 0.15 }   // Default 250mm floor insulation
  },
  openings = {
    windows: { count: 8, uValue: 1.2 },
    doors: { count: 1, uValue: 1.5 }
  },
  onComponentSelect,
  onContextMenu,
  sectionPlane,
  visibleFloors = new Set(Array.from({ length: (numberOfFloors || 2) + 1 }, (_, i) => i)) // Default all visible
}: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const particlesRef = useRef<Mesh[]>([]);

  // Selection state for different components
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Create clipping planes for sectioning
  const clippingPlanes = useMemo(() => {
    if (!sectionPlane?.active) return [];

    const plane = new Plane();
    const normal = new Vector3();

    // If we have a surface normal, use it directly (not inverted)
    if (sectionPlane.normal) {
      // Use the normal as-is so the plane cuts from the clicked surface inward
      // This hides what's in front of the surface (positive side) and shows what's behind (negative side)
      normal.set(sectionPlane.normal[0], sectionPlane.normal[1], sectionPlane.normal[2]);
    } else {
      // Fallback to axis-based normal
      if (sectionPlane.axis === 'x') {
        normal.set(1, 0, 0);  // Hide positive X
      } else if (sectionPlane.axis === 'y') {
        normal.set(0, 1, 0);  // Hide positive Y
      } else if (sectionPlane.axis === 'z') {
        normal.set(0, 0, 1);  // Hide positive Z
      }
    }

    // Set plane from normal and position
    plane.setFromNormalAndCoplanarPoint(normal, new Vector3(
      sectionPlane.axis === 'x' ? sectionPlane.position : 0,
      sectionPlane.axis === 'y' ? sectionPlane.position : 0,
      sectionPlane.axis === 'z' ? sectionPlane.position : 0
    ));

    return [plane];
  }, [sectionPlane]);

  // Calculate building height based on type and floors if not provided
  const height = useMemo(() => {
    if (providedHeight) return providedHeight;

    // Floor heights based on building type
    let floorHeight: number;
    switch (buildingType.toLowerCase()) {
      case 'bolig':
      case 'enebolig':
      case 'småhus':
      case 'rekkehus':
        floorHeight = 2.7; // Residential: 2.7m per floor
        break;
      case 'kontor':
      case 'butikk':
      case 'skole':
        floorHeight = 3.0; // Commercial/Office: 3.0m per floor
        break;
      case 'industri':
      case 'lager':
      case 'sykehus':
        floorHeight = 4.5; // Industrial/Special: 4.5m per floor
        break;
      default:
        floorHeight = 3.0; // Default 3.0m
    }

    return numberOfFloors * floorHeight;
  }, [providedHeight, buildingType, numberOfFloors]);

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

  // Handle component clicks
  const handleClick = (event: ThreeEvent<MouseEvent>, componentId: string) => {
    event.stopPropagation();
    setSelectedComponent(componentId);

    // Notify parent component
    if (onComponentSelect) {
      const componentType = componentId.includes('roof') ? 'Tak' :
                           componentId.includes('window') ? 'Vindu' :
                           componentId.includes('door') ? 'Dør' :
                           componentId.includes('wall') ? `Vegg ${componentId.split('-')[1]}` :
                           componentId.includes('floor-divider') ? `Etasje ${parseInt(componentId.split('-')[2]) + 1}` :
                           componentId.includes('floor') ? 'Gulv' : 'Komponent';
      onComponentSelect(componentId, componentType);
    }
    console.log(`Selected: ${componentId}`);
  };

  // Handle right-click for context menu with surface normal
  const handleRightClick = (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => {
    event.stopPropagation();
    if (onContextMenu) {
      // Get the intersection point where the user clicked
      const intersectionPoint = event.point;

      // Add normal and position to event data
      const eventWithData = {
        ...event,
        normal: normal || [0, 1, 0], // Default to up if no normal provided
        intersectionPoint: [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z] // 3D position of click
      };
      onContextMenu(eventWithData as any, componentId);
    }
  };

  // Handle hover
  const handlePointerOver = (event: ThreeEvent<PointerEvent>, componentId: string) => {
    event.stopPropagation();
    setHoveredComponent(componentId);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHoveredComponent(null);
    document.body.style.cursor = 'auto';
  };

  // Calculate offset corners by moving each edge perpendicular to itself
  const offsetCorners = useMemo(() => {
    if (footprint.length < 3) return footprint;

    const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

    // First, calculate the signed area to determine winding order
    let signedArea = 0;
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      signedArea += (footprint[j][0] - footprint[i][0]) * (footprint[j][1] + footprint[i][1]);
    }

    // Positive area = clockwise, negative = counter-clockwise
    // For area reduction, we need to offset inward
    const offsetDirection = signedArea > 0 ? 1 : -1;

    // Create offset edges by moving each edge perpendicular to itself
    const offsetEdges = [];
    for (let i = 0; i < footprint.length; i++) {
      const p1 = footprint[i];
      const p2 = footprint[(i + 1) % footprint.length];

      // Edge vector
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const edgeLen = Math.sqrt(dx * dx + dy * dy);

      if (edgeLen === 0) continue;

      // Perpendicular (rotated 90 degrees)
      // For reducing area: CW polygon needs right perpendicular, CCW needs left
      const perpX = (dy / edgeLen) * offsetDirection;
      const perpY = (-dx / edgeLen) * offsetDirection;

      // Offset edge endpoints
      offsetEdges.push({
        start: [p1[0] + perpX * wallThickness, p1[1] + perpY * wallThickness],
        end: [p2[0] + perpX * wallThickness, p2[1] + perpY * wallThickness],
        perpX,
        perpY
      });
    }

    // Find intersection points of consecutive offset edges to get new corners
    const corners = [];
    for (let i = 0; i < footprint.length; i++) {
      const edgeIndex1 = i;
      const edgeIndex2 = (i + 1) % footprint.length;

      const edge1 = offsetEdges[edgeIndex1];
      const edge2 = offsetEdges[edgeIndex2];

      if (!edge1 || !edge2 || offsetEdges.length !== footprint.length) {
        // If we don't have proper offset edges, fall back to simple offset
        const curr = footprint[i];
        const prev = footprint[(i - 1 + footprint.length) % footprint.length];
        const next = footprint[(i + 1) % footprint.length];

        // Simple offset toward center
        const centerX = footprint.reduce((sum, p) => sum + p[0], 0) / footprint.length;
        const centerY = footprint.reduce((sum, p) => sum + p[1], 0) / footprint.length;
        const dirX = centerX - curr[0];
        const dirY = centerY - curr[1];
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

        if (dirLen > 0) {
          corners.push([
            curr[0] + (dirX / dirLen) * wallThickness,
            curr[1] + (dirY / dirLen) * wallThickness
          ]);
        } else {
          corners.push(curr);
        }
        continue;
      }

      // Line intersection of two edges
      const x1 = edge1.start[0], y1 = edge1.start[1];
      const x2 = edge1.end[0], y2 = edge1.end[1];
      const x3 = edge2.start[0], y3 = edge2.start[1];
      const x4 = edge2.end[0], y4 = edge2.end[1];

      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

      if (Math.abs(denom) < 0.001) {
        // Parallel lines, use the shared point
        corners.push(edge1.end);
      } else {
        // Find intersection
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        corners.push([
          x1 + t * (x2 - x1),
          y1 + t * (y2 - y1)
        ]);
      }
    }

    console.log('Footprint length:', footprint.length, 'Offset corners length:', corners.length);

    // Ensure we always return the same number of corners as footprint points
    while (corners.length < footprint.length) {
      corners.push(footprint[corners.length]);
    }

    return corners;
  }, [footprint, insulation?.walls?.thickness]);

  return (
    <group>
      {/* Debug Axes - X (red), Y (green), Z (blue) */}
      <group>
        {/* X axis - Red */}
        <mesh position={[5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
        <mesh position={[10, 0, 0]}>
          <coneGeometry args={[0.3, 1, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>

        {/* Y axis - Green */}
        <mesh position={[0, 5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
          <meshBasicMaterial color="green" />
        </mesh>
        <mesh position={[0, 10, 0]}>
          <coneGeometry args={[0.3, 1, 8]} />
          <meshBasicMaterial color="green" />
        </mesh>

        {/* Z axis - Blue */}
        <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
          <meshBasicMaterial color="blue" />
        </mesh>
        <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.3, 1, 8]} />
          <meshBasicMaterial color="blue" />
        </mesh>

        {/* Origin sphere - White */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </group>

      {/* Wall Segments by Floor */}
      {footprint.length > 0 && (
        <group>
          {/* Generate walls for each floor */}
          {Array.from({ length: numberOfFloors }, (_, floor) => {
            // Skip if floor is hidden
            if (!visibleFloors.has(floor)) return null;

            const floorHeight = height / numberOfFloors;
            // Position walls to sit on the slab (bottom of wall at slab level)
            const slabY = floorHeight * floor;
            const floorY = slabY + floorHeight / 2;

            return (
              <group key={`floor-walls-${floor}`}>
                {footprint.map((outerCorner, index) => {
                  const nextOuterCorner = footprint[(index + 1) % footprint.length];
                  const innerCorner = offsetCorners[index] || outerCorner;  // Fallback if undefined
                  const nextInnerCorner = offsetCorners[(index + 1) % offsetCorners.length] || nextOuterCorner;  // Fallback

                  const wallId = `wall-floor${floor}-${index}`;
                  const isSelected = selectedComponent === wallId;
                  const isHovered = hoveredComponent === wallId;

                  // Wall connects between outer and inner edges
                  // Position is center of all 4 corners
                  const centerX = (outerCorner[0] + nextOuterCorner[0] + innerCorner[0] + nextInnerCorner[0]) / 4;
                  // Negate Z to match slab orientation (slabs rotate Y to -Z)
                  const centerZ = -(outerCorner[1] + nextOuterCorner[1] + innerCorner[1] + nextInnerCorner[1]) / 4;

                  // Calculate wall dimensions
                  const wallLength = Math.sqrt(
                    Math.pow(nextOuterCorner[0] - outerCorner[0], 2) +
                    Math.pow(nextOuterCorner[1] - outerCorner[1], 2)
                  );

                  // Calculate angle for rotation
                  const wallAngle = Math.atan2(
                    nextOuterCorner[1] - outerCorner[1],
                    nextOuterCorner[0] - outerCorner[0]
                  );

                  const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

                  // Calculate wall normal (perpendicular to wall, pointing outward)
                  const wallDX = nextOuterCorner[0] - outerCorner[0];
                  const wallDZ = nextOuterCorner[1] - outerCorner[1];
                  const wallNormalX = -wallDZ / wallLength;
                  // Negate to match coordinate system flip
                  const wallNormalZ = -wallDX / wallLength;

                  return (
                    <mesh
                      key={wallId}
                      position={[centerX, floorY, centerZ]}
                      rotation={[0, wallAngle, 0]}
                      castShadow
                      receiveShadow
                      onClick={(e) => handleClick(e, wallId)}
                      onContextMenu={(e) => handleRightClick(e, wallId, [wallNormalX, 0, wallNormalZ])}
                      onPointerOver={(e) => handlePointerOver(e, wallId)}
                      onPointerOut={handlePointerOut}
                    >
                      <boxGeometry args={[wallLength, floorHeight, wallThickness]} />
                      <meshPhysicalMaterial
                        color={isSelected ? '#10b981' :
                               isHovered ? '#0ea5e9' : buildingColor}
                        metalness={0.1}
                        roughness={0.7}
                        envMapIntensity={0.5}
                        transparent={showHeatParticles}
                        opacity={showHeatParticles ? 0.8 : 1}
                        emissive={isSelected ? '#10b981' : '#000000'}
                        emissiveIntensity={isSelected ? 0.2 : 0}
                        clippingPlanes={clippingPlanes}
                        side={2} // DoubleSide for proper clipping
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}

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

      {/* Windows and Doors distributed evenly */}
      {!showHeatParticles && footprint.length > 0 && (
        <group>
          {/* Calculate window and door positions with fixed 3m spacing */}
          {(() => {
            const doorCount = openings?.doors?.count || 2; // Default 2 doors
            const wallThickness = (insulation?.walls?.thickness || 600) / 1000;

            // Calculate perimeter segments with indices
            const segments: { start: [number, number], end: [number, number], length: number, index: number }[] = [];
            let totalPerimeter = 0;

            for (let i = 0; i < footprint.length; i++) {
              const start = footprint[i];
              const end = footprint[(i + 1) % footprint.length];
              const length = Math.sqrt(
                Math.pow(end[0] - start[0], 2) +
                Math.pow(end[1] - start[1], 2)
              );
              segments.push({ start, end, length, index: i });
              totalPerimeter += length;
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
              // Check if this wall gets a door (ground floor only)
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
                // Skip if floor is hidden
                if (!visibleFloors.has(floor)) continue;

                const isGroundFloor = floor === 0;
                const floorHeight = height / numberOfFloors;
                // Match wall positioning
                const slabY = floorHeight * floor;
                const floorY = slabY + floorHeight / 2;

                // Calculate total openings for this floor (windows + door if ground floor)
                const totalOpenings = windowCount + (hasDoor && isGroundFloor ? 1 : 0);
                if (totalOpenings === 0) continue;

                // Calculate even spacing across the wall
                const spacing = segment.length / (totalOpenings + 1);

                // Place door first if this is ground floor and wall has a door
                if (hasDoor && isGroundFloor) {
                  // Door at first position
                  const doorDistance = spacing;
                  const doorT = doorDistance / segment.length;
                  const doorX = segment.start[0] + doorT * (segment.end[0] - segment.start[0]);
                  // Negate Z to match wall coordinate system
                  const doorZ = -(segment.start[1] + doorT * (segment.end[1] - segment.start[1]));

                  const doorId = `door-${wallDoorIndex}`;
                  const isSelected = selectedComponent === doorId;
                  const isHovered = hoveredComponent === doorId;

                  openingComponents.push(
                    <mesh
                      key={doorId}
                      position={[doorX, slabY + 1.1, doorZ]}  // Position door from floor level
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
                  // Calculate position (skip first spot if door is present on ground floor)
                  const positionIndex = (hasDoor && isGroundFloor) ? i + 2 : i + 1;
                  const distanceAlongWall = spacing * positionIndex;

                  const t = distanceAlongWall / segment.length;
                  const x = segment.start[0] + t * (segment.end[0] - segment.start[0]);
                  // Negate Z to match wall coordinate system
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

            return openingComponents;
          })()}
        </group>
      )}

      {/* Floor with insulation thickness - only show when ground floor is visible */}
      {footprint.length > 0 && visibleFloors.has(0) && (
        <mesh
          position={[0, -(insulation?.floor?.thickness || 250) / 1000, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => handleClick(e, 'floor-ground')}
          onContextMenu={(e) => handleRightClick(e, 'floor-ground', [0, 1, 0])} // Floor normal points up
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
            side={2} // DoubleSide
            clippingPlanes={clippingPlanes}
          />
        </mesh>
      )}

      {/* Floor dividers between floors */}
      {footprint.length > 0 && numberOfFloors > 1 && (
        <group>
          {[...Array(numberOfFloors - 1)].map((_, floorIndex) => {
            // Floor divider belongs to the floor above it (it's the floor of that story)
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

                  // Create solid floor slab (no hole)
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
                  side={2} // DoubleSide
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

      {/* Intelligent roof system based on building shape - DISABLED FOR NOW */}
      {false && visibleFloors.has(numberOfFloors) && (
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
                            {/* Ridge runs east-west - North slope */}
                            <mesh
                              position={[0, ridgeHeight / 2, -slopeDepth / 2]}
                              rotation={[-Math.PI / 5, 0, 0]}
                              onClick={(e) => handleClick(e, `roof-north-${index}`)}
                              onContextMenu={(e) => {
                                // Calculate roof slope normal (tilted upward)
                                const angle = Math.PI / 5;
                                handleRightClick(e, `roof-north-${index}`, [0, Math.cos(angle), -Math.sin(angle)]);
                              }}
                              onPointerOver={(e) => handlePointerOver(e, `roof-north-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-north-${index}` ? '#ef4444' :
                                       hoveredComponent === `roof-north-${index}` ? '#f97316' : '#1f2937'}
                                roughness={0.9}
                                metalness={0.1}
                                emissive={selectedComponent === `roof-north-${index}` ? '#ef4444' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-north-${index}` ? 0.1 : 0}
                                clippingPlanes={clippingPlanes}
                              />
                            </mesh>
                            {/* South slope */}
                            <mesh
                              position={[0, ridgeHeight / 2, slopeDepth / 2]}
                              rotation={[Math.PI / 5, 0, 0]}
                              onClick={(e) => handleClick(e, `roof-south-${index}`)}
                              onPointerOver={(e) => handlePointerOver(e, `roof-south-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.3, slopeDepth * 1.1]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-south-${index}` ? '#ef4444' :
                                       hoveredComponent === `roof-south-${index}` ? '#f97316' : '#1f2937'}
                                roughness={0.9}
                                metalness={0.1}
                                emissive={selectedComponent === `roof-south-${index}` ? '#ef4444' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-south-${index}` ? 0.1 : 0}
                                clippingPlanes={clippingPlanes}
                              />
                            </mesh>
                            {/* Ridge beam */}
                            <mesh
                              position={[0, ridgeHeight, 0]}
                              onClick={(e) => handleClick(e, `roof-ridge-${index}`)}
                              onPointerOver={(e) => handlePointerOver(e, `roof-ridge-${index}`)}
                              onPointerOut={handlePointerOut}
                            >
                              <boxGeometry args={[ridgeLength, 0.4, 0.4]} />
                              <meshPhysicalMaterial
                                color={selectedComponent === `roof-ridge-${index}` ? '#a855f7' :
                                       hoveredComponent === `roof-ridge-${index}` ? '#8b5cf6' : '#111827'}
                                roughness={0.8}
                                emissive={selectedComponent === `roof-ridge-${index}` ? '#a855f7' : '#000000'}
                                emissiveIntensity={selectedComponent === `roof-ridge-${index}` ? 0.1 : 0}
                              />
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
      )}
    </group>
  );
}