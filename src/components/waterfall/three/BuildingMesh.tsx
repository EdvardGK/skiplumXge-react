'use client';

import { useRef, useMemo, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Mesh, Shape, Plane, Vector3, BoxGeometry } from 'three';
import * as THREE from 'three';
import WallSegments from './WallSegments';
import FloorComponents from './FloorComponents';
import WindowDoorComponents from './WindowDoorComponents';
import RoofComponent from './RoofComponent';
import { PropertyBoundaries } from './PropertyBoundary';
import type { PropertyBoundary } from '@/types/geonorge';

interface InsulationData {
  walls?: { thickness: number; uValue: number };
  roof?: { thickness: number; uValue: number };
  floor?: { thickness: number; uValue: number };
}

interface OpeningsData {
  windows?: { count: number; uValue: number };
  doors?: { count: number; uValue: number };
}

interface BuildingMeshProps {
  footprint: [number, number][];
  height?: number;
  numberOfFloors?: number;
  buildingType: string;
  insulation?: InsulationData;
  openings?: OpeningsData;
  onComponentSelect?: (componentId: string | null, componentType?: string, additionalInfo?: any) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>, componentId: string) => void;
  sectionPlane?: { active: boolean; axis: 'x' | 'y' | 'z'; position: number; normal?: [number, number, number] } | null;
  visibleFloors?: Set<number>;
  showFootprint?: boolean;
  showAxes?: boolean;
  showBoundingBox?: boolean;
  roofPlacementFloor?: number | null;
  // Property boundary data (optional)
  propertyBoundaries?: PropertyBoundary[];
  propertyCenter?: { lat: number; lon: number };
  showPropertyBoundaries?: boolean;
}

export default function BuildingMesh({
  footprint,
  height: providedHeight,
  numberOfFloors = 2,
  buildingType,
  insulation = {
    walls: { thickness: 200, uValue: 0.18 },
    roof: { thickness: 300, uValue: 0.13 },
    floor: { thickness: 250, uValue: 0.15 }
  },
  openings = {
    windows: { count: 8, uValue: 1.2 },
    doors: { count: 1, uValue: 1.5 }
  },
  onComponentSelect,
  onContextMenu,
  sectionPlane,
  visibleFloors = new Set(Array.from({ length: (numberOfFloors || 2) + 1 }, (_, i) => i)),
  showFootprint = true,
  showAxes = false,
  showBoundingBox = true,
  roofPlacementFloor = null,
  propertyBoundaries,
  propertyCenter,
  showPropertyBoundaries = true,
}: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Create clipping planes for sectioning
  const clippingPlanes = useMemo(() => {
    if (!sectionPlane?.active) return [];

    const plane = new Plane();
    const normal = new Vector3();

    if (sectionPlane.normal) {
      normal.set(sectionPlane.normal[0], sectionPlane.normal[1], sectionPlane.normal[2]);
    } else {
      if (sectionPlane.axis === 'x') normal.set(1, 0, 0);
      else if (sectionPlane.axis === 'y') normal.set(0, 1, 0);
      else if (sectionPlane.axis === 'z') normal.set(0, 0, 1);
    }

    plane.setFromNormalAndCoplanarPoint(normal, new Vector3(
      sectionPlane.axis === 'x' ? sectionPlane.position : 0,
      sectionPlane.axis === 'y' ? sectionPlane.position : 0,
      sectionPlane.axis === 'z' ? sectionPlane.position : 0
    ));

    return [plane];
  }, [sectionPlane]);

  // Calculate building height
  const height = useMemo(() => {
    if (providedHeight) return providedHeight;

    let floorHeight: number;
    switch (buildingType.toLowerCase()) {
      case 'bolig':
      case 'enebolig':
      case 'småhus':
      case 'rekkehus':
        floorHeight = 2.7;
        break;
      case 'kontor':
      case 'butikk':
      case 'skole':
        floorHeight = 3.0;
        break;
      case 'industri':
      case 'lager':
      case 'sykehus':
        floorHeight = 4.5;
        break;
      default:
        floorHeight = 3.0;
    }

    return numberOfFloors * floorHeight;
  }, [providedHeight, buildingType, numberOfFloors]);

  // Building color based on type
  const buildingColor = useMemo(() => {
    switch (buildingType.toLowerCase()) {
      case 'kontor':
        return '#0891b2';
      case 'bolig':
        return '#10b981';
      case 'barnehage':
        return '#06b6d4';
      case 'sykehus':
        return '#8b5cf6';
      default:
        return '#0ea5e9';
    }
  }, [buildingType]);

  // Handle component clicks
  const handleClick = (event: ThreeEvent<MouseEvent>, componentId: string) => {
    event.stopPropagation();
    setSelectedComponent(componentId);

    if (onComponentSelect) {
      let componentType = '';
      componentType = componentId.includes('roof') ? 'Tak' :
                     componentId.includes('window') ? 'Vindu' :
                     componentId.includes('door') ? 'Dør' :
                     componentId.includes('wall') ? `Vegg ${componentId.split('-')[1]}` :
                     componentId.includes('floor-divider') ? `Etasje ${parseInt(componentId.split('-')[2]) + 1}` :
                     componentId.includes('floor') ? 'Gulv' : 'Komponent';

      onComponentSelect(componentId, componentType, {});
    }
  };

  // Handle right-click for context menu
  const handleRightClick = (event: ThreeEvent<MouseEvent>, componentId: string, normal?: [number, number, number]) => {
    event.stopPropagation();
    if (onContextMenu) {
      const intersectionPoint = event.point;
      const eventWithData = {
        ...event,
        normal: normal || [0, 1, 0],
        intersectionPoint: [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z]
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


  return (
    <group>
      {/* Debug Axes */}
      {showAxes && (
        <group>
          <mesh position={[5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh position={[10, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>
          <mesh position={[0, 10, 0]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="green" />
          </mesh>
          <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
            <meshBasicMaterial color="blue" />
          </mesh>
          <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshBasicMaterial color="blue" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="white" />
          </mesh>
        </group>
      )}

      {/* Building Footprint */}
      {showFootprint && footprint.length > 0 && (
        <mesh
          position={[0, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedComponent(null);
            if (onComponentSelect) onComponentSelect(null, undefined);
          }}
        >
          <shapeGeometry args={[(() => {
            const shape = new Shape();
            footprint.forEach((point, index) => {
              if (index === 0) shape.moveTo(point[0], point[1]);
              else shape.lineTo(point[0], point[1]);
            });
            shape.closePath();
            return shape;
          })()]} />
          <meshBasicMaterial color="#4a5568" opacity={0.5} transparent side={2} />
        </mesh>
      )}

      {/* Bounding Box */}
      {showBoundingBox && footprint.length > 0 && (() => {
        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        footprint.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });

        const centerX = (minX + maxX) / 2;
        const centerZ = -(minY + maxY) / 2;
        const width = maxX - minX;
        const depth = maxY - minY;

        return (
          <group>
            {/* Bottom box outline */}
            <lineSegments position={[centerX, 0.01, centerZ]}>
              <edgesGeometry args={[new THREE.BoxGeometry(width, 0.01, depth)]} />
              <lineBasicMaterial color="#00ffff" linewidth={2} opacity={0.6} transparent />
            </lineSegments>

            {/* Top box outline */}
            <lineSegments position={[centerX, height, centerZ]}>
              <edgesGeometry args={[new THREE.BoxGeometry(width, 0.01, depth)]} />
              <lineBasicMaterial color="#00ffff" linewidth={2} opacity={0.6} transparent />
            </lineSegments>

            {/* Vertical edges */}
            {[
              [minX, -minY],
              [maxX, -minY],
              [maxX, -maxY],
              [minX, -maxY]
            ].map(([x, z], i) => (
              <mesh key={`bbox-edge-${i}`} position={[x, height / 2, z]}>
                <cylinderGeometry args={[0.05, 0.05, height, 8]} />
                <meshBasicMaterial color="#00ffff" opacity={0.6} transparent />
              </mesh>
            ))}

            {/* Grid lines extending from polygon edges to bounding box */}
            {footprint.map((point, index) => {
              const nextPoint = footprint[(index + 1) % footprint.length];

              // Edge direction (parallel to polygon edge)
              const edgeDX = nextPoint[0] - point[0];
              const edgeDY = nextPoint[1] - point[1];
              const edgeLength = Math.sqrt(edgeDX * edgeDX + edgeDY * edgeDY);

              // Normalized edge direction
              const edgeUnitX = edgeDX / edgeLength;
              const edgeUnitY = edgeDY / edgeLength;

              const gridLines = [];

              // From point, extend parallel to edge in both directions to bbox
              const p1X = point[0];
              const p1Y = point[1];

              // Extend forward (toward nextPoint direction)
              let tMax = Infinity;

              // Check intersection with all 4 bbox edges
              if (edgeUnitX > 0.001) {
                tMax = Math.min(tMax, (maxX - p1X) / edgeUnitX);
              } else if (edgeUnitX < -0.001) {
                tMax = Math.min(tMax, (minX - p1X) / edgeUnitX);
              }

              if (edgeUnitY > 0.001) {
                tMax = Math.min(tMax, (maxY - p1Y) / edgeUnitY);
              } else if (edgeUnitY < -0.001) {
                tMax = Math.min(tMax, (minY - p1Y) / edgeUnitY);
              }

              // Extend backward (opposite direction)
              let tMin = -Infinity;

              if (edgeUnitX > 0.001) {
                tMin = Math.max(tMin, (minX - p1X) / edgeUnitX);
              } else if (edgeUnitX < -0.001) {
                tMin = Math.max(tMin, (maxX - p1X) / edgeUnitX);
              }

              if (edgeUnitY > 0.001) {
                tMin = Math.max(tMin, (minY - p1Y) / edgeUnitY);
              } else if (edgeUnitY < -0.001) {
                tMin = Math.max(tMin, (maxY - p1Y) / edgeUnitY);
              }

              gridLines.push(
                <line key={`grid-${index}-line`}>
                  <bufferGeometry>
                    <bufferAttribute
                      attach="attributes-position"
                      args={[new Float32Array([
                        p1X + tMin * edgeUnitX, 0.5, -(p1Y + tMin * edgeUnitY),
                        p1X + tMax * edgeUnitX, 0.5, -(p1Y + tMax * edgeUnitY)
                      ]), 3]}
                    />
                  </bufferGeometry>
                  <lineBasicMaterial color="#00ffff" opacity={0.3} transparent />
                </line>
              );

              return gridLines;
            })}

            {/* Grid Tiles - 1m regular grid */}
            {(() => {
              const tiles: React.ReactElement[] = [];
              const gridSize = 1.0; // 1 meter tiles
              let tileCounter = 0;

              // Point-in-polygon test
              const isPointInPolygon = (px: number, py: number): boolean => {
                let inside = false;
                for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
                  const xi = footprint[i][0], yi = footprint[i][1];
                  const xj = footprint[j][0], yj = footprint[j][1];

                  const intersect = ((yi > py) !== (yj > py))
                    && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                  if (intersect) inside = !inside;
                }
                return inside;
              };

              // Store green tiles info for coverage calculation
              const greenTiles: Array<{x: number, y: number, size: number}> = [];

              // Create regular 1m grid covering bounding box
              for (let gx = minX; gx < maxX; gx += gridSize) {
                for (let gy = minY; gy < maxY; gy += gridSize) {
                  const centerX = gx + gridSize / 2;
                  const centerY = gy + gridSize / 2;

                  // Check if this tile center is within bounds
                  if (centerX > maxX || centerY > maxY) continue;

                  const isInside = isPointInPolygon(centerX, centerY);
                  const tileId = `tile-${tileCounter++}`;

                  // Store green tile data
                  if (isInside) {
                    greenTiles.push({x: gx, y: gy, size: gridSize});
                  }

                  // Create tile square
                  const shape = new Shape();
                  shape.moveTo(gx, gy);
                  shape.lineTo(gx + gridSize, gy);
                  shape.lineTo(gx + gridSize, gy + gridSize);
                  shape.lineTo(gx, gy + gridSize);
                  shape.closePath();

                  tiles.push(
                    <mesh
                      key={tileId}
                      position={[0, 0.02, 0]}
                      rotation={[-Math.PI / 2, 0, 0]}
                      renderOrder={0}
                    >
                      <shapeGeometry args={[shape]} />
                      <meshBasicMaterial
                        color={isInside ? '#00ff00' : '#ff0000'}
                        opacity={0.3}
                        transparent
                      />
                    </mesh>
                  );
                }
              }

              // Expose greenTiles for coverage calculation
              (window as any).__greenTiles = greenTiles;

              return tiles;
            })()}

            {/* Grid-aligned tiles - sectioned by grid lines */}
            {(() => {
              const gridAlignedTiles: React.ReactElement[] = [];

              // Point-in-polygon test (same as 1x1m tiles)
              const isPointInPolygon = (px: number, py: number): boolean => {
                let inside = false;
                for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
                  const xi = footprint[i][0], yi = footprint[i][1];
                  const xj = footprint[j][0], yj = footprint[j][1];

                  const intersect = ((yi > py) !== (yj > py))
                    && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                  if (intersect) inside = !inside;
                }
                return inside;
              };

              // Function to find intersection between two lines
              const lineIntersection = (
                p1: [number, number], d1: [number, number],
                p2: [number, number], d2: [number, number]
              ): [number, number] | null => {
                const denom = d1[0] * d2[1] - d1[1] * d2[0];
                if (Math.abs(denom) < 0.0001) return null; // Parallel lines

                const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / denom;
                return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
              };

              // Collect grid lines (one per polygon edge)
              const rawGridLines: Array<{
                point: [number, number];
                unitX: number;
                unitY: number;
              }> = [];

              footprint.forEach((point, index) => {
                const nextPoint = footprint[(index + 1) % footprint.length];
                const edgeDX = nextPoint[0] - point[0];
                const edgeDY = nextPoint[1] - point[1];
                const edgeLength = Math.sqrt(edgeDX * edgeDX + edgeDY * edgeDY);

                rawGridLines.push({
                  point: point,
                  unitX: edgeDX / edgeLength,
                  unitY: edgeDY / edgeLength
                });
              });

              // Merge near-parallel lines (< 2 degrees, < 200mm distance) - very conservative
              const gridLines: Array<{
                point: [number, number];
                unitX: number;
                unitY: number;
              }> = [];
              const merged = new Set<number>();

              const angleDiffDegrees = (ux1: number, uy1: number, ux2: number, uy2: number): number => {
                const dot = ux1 * ux2 + uy1 * uy2;
                const clampedDot = Math.max(-1, Math.min(1, dot));
                return Math.acos(Math.abs(clampedDot)) * 180 / Math.PI;
              };

              const distancePointToLine = (px: number, py: number, lp: [number, number], lux: number, luy: number): number => {
                const dx = px - lp[0];
                const dy = py - lp[1];
                return Math.abs(dx * (-luy) + dy * lux);
              };

              for (let i = 0; i < rawGridLines.length; i++) {
                if (merged.has(i)) continue;

                const line1 = rawGridLines[i];
                const similarLines = [i];

                for (let j = i + 1; j < rawGridLines.length; j++) {
                  if (merged.has(j)) continue;

                  const line2 = rawGridLines[j];

                  const angleDiff = angleDiffDegrees(line1.unitX, line1.unitY, line2.unitX, line2.unitY);
                  const dist1 = distancePointToLine(line2.point[0], line2.point[1], line1.point, line1.unitX, line1.unitY);
                  const dist2 = distancePointToLine(line1.point[0], line1.point[1], line2.point, line2.unitX, line2.unitY);
                  const avgDist = (dist1 + dist2) / 2;

                  // Much stricter: only merge if nearly identical (< 2 degrees, < 200mm)
                  if (angleDiff < 2 && avgDist < 0.2) {
                    similarLines.push(j);
                    merged.add(j);
                  }
                }

                // Average the direction and position of similar lines
                let avgUnitX = 0, avgUnitY = 0;
                let avgPointX = 0, avgPointY = 0;

                similarLines.forEach(idx => {
                  const line = rawGridLines[idx];
                  avgUnitX += line.unitX;
                  avgUnitY += line.unitY;
                  avgPointX += line.point[0];
                  avgPointY += line.point[1];
                });

                avgUnitX /= similarLines.length;
                avgUnitY /= similarLines.length;
                avgPointX /= similarLines.length;
                avgPointY /= similarLines.length;

                // Normalize direction
                const length = Math.sqrt(avgUnitX * avgUnitX + avgUnitY * avgUnitY);
                avgUnitX /= length;
                avgUnitY /= length;

                gridLines.push({
                  point: [avgPointX, avgPointY],
                  unitX: avgUnitX,
                  unitY: avgUnitY
                });
              }

              // Create tiles from grid line intersections
              let tileCounter = 0;
              const processedTiles = new Set<string>();

              for (let i = 0; i < gridLines.length; i++) {
                for (let j = i + 1; j < gridLines.length; j++) {
                  const line1 = gridLines[i];
                  const line2 = gridLines[j];

                  // Find all intersections on line1 and line2 with other grid lines
                  const line1Ints: Array<{point: [number, number], lineIdx: number}> = [];
                  const line2Ints: Array<{point: [number, number], lineIdx: number}> = [];

                  for (let k = 0; k < gridLines.length; k++) {
                    if (k === i || k === j) continue;

                    const lineK = gridLines[k];

                    const int1 = lineIntersection(line1.point, [line1.unitX, line1.unitY], lineK.point, [lineK.unitX, lineK.unitY]);
                    if (int1 && int1[0] >= minX && int1[0] <= maxX && int1[1] >= minY && int1[1] <= maxY) {
                      line1Ints.push({point: int1, lineIdx: k});
                    }

                    const int2 = lineIntersection(line2.point, [line2.unitX, line2.unitY], lineK.point, [lineK.unitX, lineK.unitY]);
                    if (int2 && int2[0] >= minX && int2[0] <= maxX && int2[1] >= minY && int2[1] <= maxY) {
                      line2Ints.push({point: int2, lineIdx: k});
                    }
                  }

                  // Create quads from consecutive intersection pairs
                  line1Ints.forEach((int1a, idx1) => {
                    if (idx1 >= line1Ints.length - 1) return;
                    const int1b = line1Ints[idx1 + 1];

                    line2Ints.forEach((int2a, idx2) => {
                      if (idx2 >= line2Ints.length - 1) return;
                      const int2b = line2Ints[idx2 + 1];

                      // Check if they share the same perpendicular lines (forming a proper quad)
                      if (int1a.lineIdx === int2a.lineIdx && int1b.lineIdx === int2b.lineIdx) {
                        const centerX = (int1a.point[0] + int1b.point[0] + int2a.point[0] + int2b.point[0]) / 4;
                        const centerY = (int1a.point[1] + int1b.point[1] + int2a.point[1] + int2b.point[1]) / 4;

                        const tileKey = `${centerX.toFixed(2)},${centerY.toFixed(2)}`;
                        if (!processedTiles.has(tileKey)) {
                          processedTiles.add(tileKey);

                          // Sort points by angle from centroid
                          const points = [int1a.point, int1b.point, int2a.point, int2b.point];
                          const sortedPoints = points.sort((a, b) => {
                            const angleA = Math.atan2(a[1] - centerY, a[0] - centerX);
                            const angleB = Math.atan2(b[1] - centerY, b[0] - centerX);
                            return angleA - angleB;
                          });

                          // Create quad shape
                          const shape = new Shape();
                          shape.moveTo(sortedPoints[0][0], sortedPoints[0][1]);
                          shape.lineTo(sortedPoints[1][0], sortedPoints[1][1]);
                          shape.lineTo(sortedPoints[2][0], sortedPoints[2][1]);
                          shape.lineTo(sortedPoints[3][0], sortedPoints[3][1]);
                          shape.closePath();

                          const tileId = tileCounter++;

                          // Binary decision: tile is inside OR outside based on center point
                          // A tile cannot be "in between" - it's one or the other
                          const isInside = isPointInPolygon(centerX, centerY);
                          const tileColor = isInside ? '#00ff00' : '#ff0000';

                          gridAlignedTiles.push(
                            <group key={`grid-tile-${tileId}`}>
                              {/* Coverage color layer */}
                              <mesh
                                position={[0, 1.0, 0]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                renderOrder={2}
                              >
                                <shapeGeometry args={[shape]} />
                                <meshBasicMaterial
                                  color={tileColor}
                                  opacity={0.9}
                                  transparent
                                />
                              </mesh>
                              {/* Tile edges */}
                              <lineSegments
                                position={[0, 1.01, 0]}
                                rotation={[-Math.PI / 2, 0, 0]}
                                renderOrder={3}
                              >
                                <edgesGeometry args={[new THREE.ShapeGeometry(shape)]} />
                                <lineBasicMaterial
                                  color="#ffffff"
                                  linewidth={2}
                                />
                              </lineSegments>
                            </group>
                          );
                        }
                      }
                    });
                  });
                }
              }

              return gridAlignedTiles;
            })()}

            {/* Neighbor analysis layer - 1m above green/red layer */}
            {(() => {
              const neighborTiles: React.ReactElement[] = [];

              // Point-in-polygon test
              const isPointInPolygon = (px: number, py: number): boolean => {
                let inside = false;
                for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
                  const xi = footprint[i][0], yi = footprint[i][1];
                  const xj = footprint[j][0], yj = footprint[j][1];

                  const intersect = ((yi > py) !== (yj > py))
                    && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                  if (intersect) inside = !inside;
                }
                return inside;
              };

              // Function to find intersection between two lines
              const lineIntersection = (
                p1: [number, number], d1: [number, number],
                p2: [number, number], d2: [number, number]
              ): [number, number] | null => {
                const denom = d1[0] * d2[1] - d1[1] * d2[0];
                if (Math.abs(denom) < 0.0001) return null;
                const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / denom;
                return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
              };

              // Collect grid lines (same as before, with merging)
              const rawGridLines: Array<{
                point: [number, number];
                unitX: number;
                unitY: number;
              }> = [];

              footprint.forEach((point, index) => {
                const nextPoint = footprint[(index + 1) % footprint.length];
                const edgeDX = nextPoint[0] - point[0];
                const edgeDY = nextPoint[1] - point[1];
                const edgeLength = Math.sqrt(edgeDX * edgeDX + edgeDY * edgeDY);

                rawGridLines.push({
                  point: point,
                  unitX: edgeDX / edgeLength,
                  unitY: edgeDY / edgeLength
                });
              });

              // Merge near-parallel lines
              const gridLines: Array<{
                point: [number, number];
                unitX: number;
                unitY: number;
              }> = [];
              const merged = new Set<number>();

              const angleDiffDegrees = (ux1: number, uy1: number, ux2: number, uy2: number): number => {
                const dot = ux1 * ux2 + uy1 * uy2;
                const clampedDot = Math.max(-1, Math.min(1, dot));
                return Math.acos(Math.abs(clampedDot)) * 180 / Math.PI;
              };

              const distancePointToLine = (px: number, py: number, lp: [number, number], lux: number, luy: number): number => {
                const dx = px - lp[0];
                const dy = py - lp[1];
                return Math.abs(dx * (-luy) + dy * lux);
              };

              for (let i = 0; i < rawGridLines.length; i++) {
                if (merged.has(i)) continue;
                const line1 = rawGridLines[i];
                const similarLines = [i];

                for (let j = i + 1; j < rawGridLines.length; j++) {
                  if (merged.has(j)) continue;
                  const line2 = rawGridLines[j];
                  const angleDiff = angleDiffDegrees(line1.unitX, line1.unitY, line2.unitX, line2.unitY);
                  const dist1 = distancePointToLine(line2.point[0], line2.point[1], line1.point, line1.unitX, line1.unitY);
                  const dist2 = distancePointToLine(line1.point[0], line1.point[1], line2.point, line2.unitX, line2.unitY);
                  const avgDist = (dist1 + dist2) / 2;

                  if (angleDiff < 2 && avgDist < 0.2) {
                    similarLines.push(j);
                    merged.add(j);
                  }
                }

                let avgUnitX = 0, avgUnitY = 0, avgPointX = 0, avgPointY = 0;
                similarLines.forEach(idx => {
                  const line = rawGridLines[idx];
                  avgUnitX += line.unitX;
                  avgUnitY += line.unitY;
                  avgPointX += line.point[0];
                  avgPointY += line.point[1];
                });

                avgUnitX /= similarLines.length;
                avgUnitY /= similarLines.length;
                avgPointX /= similarLines.length;
                avgPointY /= similarLines.length;

                const length = Math.sqrt(avgUnitX * avgUnitX + avgUnitY * avgUnitY);
                avgUnitX /= length;
                avgUnitY /= length;

                gridLines.push({
                  point: [avgPointX, avgPointY],
                  unitX: avgUnitX,
                  unitY: avgUnitY
                });
              }

              // Build tile list with adjacency info
              interface TileInfo {
                id: number;
                center: [number, number];
                points: [number, number][];
                isGreen: boolean;
                edges: Array<{p1: [number, number], p2: [number, number]}>;
              }

              const allTiles: TileInfo[] = [];
              let tileCounter = 0;
              const processedTiles = new Set<string>();

              for (let i = 0; i < gridLines.length; i++) {
                for (let j = i + 1; j < gridLines.length; j++) {
                  const line1 = gridLines[i];
                  const line2 = gridLines[j];

                  const line1Ints: Array<{point: [number, number], lineIdx: number}> = [];
                  const line2Ints: Array<{point: [number, number], lineIdx: number}> = [];

                  for (let k = 0; k < gridLines.length; k++) {
                    if (k === i || k === j) continue;
                    const lineK = gridLines[k];

                    const int1 = lineIntersection(line1.point, [line1.unitX, line1.unitY], lineK.point, [lineK.unitX, lineK.unitY]);
                    if (int1 && int1[0] >= minX && int1[0] <= maxX && int1[1] >= minY && int1[1] <= maxY) {
                      line1Ints.push({point: int1, lineIdx: k});
                    }

                    const int2 = lineIntersection(line2.point, [line2.unitX, line2.unitY], lineK.point, [lineK.unitX, lineK.unitY]);
                    if (int2 && int2[0] >= minX && int2[0] <= maxX && int2[1] >= minY && int2[1] <= maxY) {
                      line2Ints.push({point: int2, lineIdx: k});
                    }
                  }

                  line1Ints.forEach((int1a, idx1) => {
                    if (idx1 >= line1Ints.length - 1) return;
                    const int1b = line1Ints[idx1 + 1];

                    line2Ints.forEach((int2a, idx2) => {
                      if (idx2 >= line2Ints.length - 1) return;
                      const int2b = line2Ints[idx2 + 1];

                      if (int1a.lineIdx === int2a.lineIdx && int1b.lineIdx === int2b.lineIdx) {
                        const centerX = (int1a.point[0] + int1b.point[0] + int2a.point[0] + int2b.point[0]) / 4;
                        const centerY = (int1a.point[1] + int1b.point[1] + int2a.point[1] + int2b.point[1]) / 4;

                        const tileKey = `${centerX.toFixed(2)},${centerY.toFixed(2)}`;
                        if (!processedTiles.has(tileKey)) {
                          processedTiles.add(tileKey);

                          const points = [int1a.point, int1b.point, int2a.point, int2b.point];
                          const sortedPoints = points.sort((a, b) => {
                            const angleA = Math.atan2(a[1] - centerY, a[0] - centerX);
                            const angleB = Math.atan2(b[1] - centerY, b[0] - centerX);
                            return angleA - angleB;
                          });

                          const isGreen = isPointInPolygon(centerX, centerY);

                          // Store edges
                          const edges = [];
                          for (let e = 0; e < 4; e++) {
                            edges.push({
                              p1: sortedPoints[e],
                              p2: sortedPoints[(e + 1) % 4]
                            });
                          }

                          allTiles.push({
                            id: tileCounter++,
                            center: [centerX, centerY],
                            points: sortedPoints,
                            isGreen,
                            edges
                          });
                        }
                      }
                    });
                  });
                }
              }

              // Check adjacency: two tiles share an edge if they have 2 matching corner points
              const edgesMatch = (edge1: {p1: [number, number], p2: [number, number]}, edge2: {p1: [number, number], p2: [number, number]}): boolean => {
                const tolerance = 0.01;
                const dist = (p1: [number, number], p2: [number, number]) =>
                  Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);

                return (dist(edge1.p1, edge2.p1) < tolerance && dist(edge1.p2, edge2.p2) < tolerance) ||
                       (dist(edge1.p1, edge2.p2) < tolerance && dist(edge1.p2, edge2.p1) < tolerance);
              };

              // For each green tile, count green neighbors
              allTiles.forEach(tile => {
                if (!tile.isGreen) return; // Only process green tiles

                let greenNeighborCount = 0;

                // Check all other tiles
                allTiles.forEach(otherTile => {
                  if (tile.id === otherTile.id) return;
                  if (!otherTile.isGreen) return; // Only count green neighbors

                  // Check if they share an edge
                  let sharedEdges = 0;
                  tile.edges.forEach(edge1 => {
                    otherTile.edges.forEach(edge2 => {
                      if (edgesMatch(edge1, edge2)) {
                        sharedEdges++;
                      }
                    });
                  });

                  // If they share at least one edge, they're neighbors
                  if (sharedEdges > 0) {
                    greenNeighborCount++;
                  }
                });

                // Color based on green neighbor count
                const tileColor = greenNeighborCount >= 2 ? '#ff00ff' : '#00ffff'; // Magenta : Teal

                const shape = new Shape();
                shape.moveTo(tile.points[0][0], tile.points[0][1]);
                shape.lineTo(tile.points[1][0], tile.points[1][1]);
                shape.lineTo(tile.points[2][0], tile.points[2][1]);
                shape.lineTo(tile.points[3][0], tile.points[3][1]);
                shape.closePath();

                neighborTiles.push(
                  <mesh
                    key={`neighbor-tile-${tile.id}`}
                    position={[0, 2.0, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    renderOrder={4}
                  >
                    <shapeGeometry args={[shape]} />
                    <meshBasicMaterial
                      color={tileColor}
                      opacity={0.7}
                      transparent
                    />
                  </mesh>
                );
              });

              return neighborTiles;
            })()}
          </group>
        );
      })()}

      {/* Wall Segments */}
      {footprint.length > 0 && (
        <WallSegments
          footprint={footprint}
          numberOfFloors={numberOfFloors}
          height={height}
          visibleFloors={visibleFloors}
          insulation={insulation}
          buildingColor={buildingColor}
          selectedComponent={selectedComponent}
          hoveredComponent={hoveredComponent}
          clippingPlanes={clippingPlanes}
          handleClick={handleClick}
          handleRightClick={handleRightClick}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
        />
      )}

      {/* Windows and Doors */}
      {footprint.length > 0 && (
        <WindowDoorComponents
          footprint={footprint}
          numberOfFloors={numberOfFloors}
          height={height}
          visibleFloors={visibleFloors}
          insulation={insulation}
          openings={openings}
          selectedComponent={selectedComponent}
          hoveredComponent={hoveredComponent}
          clippingPlanes={clippingPlanes}
          handleClick={handleClick}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
        />
      )}

      {/* Floor Components */}
      {footprint.length > 0 && (
        <FloorComponents
          footprint={footprint}
          numberOfFloors={numberOfFloors}
          height={height}
          visibleFloors={visibleFloors}
          insulation={insulation}
          selectedComponent={selectedComponent}
          hoveredComponent={hoveredComponent}
          clippingPlanes={clippingPlanes}
          handleClick={handleClick}
          handleRightClick={handleRightClick}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
        />
      )}

      {/* Roof Component */}
      {visibleFloors.has(numberOfFloors) && (
        <RoofComponent
          footprint={footprint}
          height={height}
          numberOfFloors={numberOfFloors}
          roofPlacementFloor={roofPlacementFloor}
          selectedComponent={selectedComponent}
          hoveredComponent={hoveredComponent}
          clippingPlanes={clippingPlanes}
          handleClick={handleClick}
          handleRightClick={handleRightClick}
          handlePointerOver={handlePointerOver}
          handlePointerOut={handlePointerOut}
        />
      )}

      {/* Property Boundaries (Cadastral Lines) */}
      {showPropertyBoundaries && propertyBoundaries && propertyCenter && (
        <PropertyBoundaries
          properties={propertyBoundaries}
          centerLat={propertyCenter.lat}
          centerLon={propertyCenter.lon}
          focusIndex={0}
          elevation={0.1} // Slightly above ground to prevent z-fighting
        />
      )}
    </group>
  );
}
