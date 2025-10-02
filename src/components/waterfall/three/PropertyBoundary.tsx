'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { gisToThreeJS } from '@/lib/geonorge-api';
import type { PropertyBoundary } from '@/types/geonorge';

interface PropertyBoundaryProps {
  /** Property boundary data from Geonorge API */
  property: PropertyBoundary;
  /** Center coordinate for offset calculation */
  centerLat: number;
  centerLon: number;
  /** Color of the boundary line (defaults to CSS --warning variable) */
  color?: string;
  /** Line width */
  lineWidth?: number;
  /** Show as dashed line */
  dashed?: boolean;
  /** Elevation offset (Y position in Three.js) */
  elevation?: number;
  /** Whether this is the focus property */
  isFocus?: boolean;
}

// Helper to get CSS variable color
const getCSSColor = (variableName: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
};

/**
 * PropertyBoundary - Renders Norwegian cadastral property boundaries in 3D
 *
 * CRITICAL COORDINATE TRANSFORMATION:
 * GIS (Geonorge) coordinates are [lon, lat] in XY plane
 * Three.js coordinates require transformation to XZ ground plane with Y-up
 *
 * Transformation: [lon, lat] → [x, 0, -z]
 * - lon (East) → x (Right)
 * - lat (North) → -z (Forward/negative)
 * - ground level → y = 0
 */
export default function PropertyBoundary({
  property,
  centerLat,
  centerLon,
  color, // Will use CSS variable if not provided
  lineWidth = 2,
  dashed = true,
  elevation = 0.1, // Slightly above ground to prevent z-fighting
  isFocus = false,
}: PropertyBoundaryProps) {
  // Get color from CSS variables or use provided color
  const boundaryColor = color || getCSSColor('--warning', '#f59e0b');
  const lightBoundaryColor = getCSSColor('--warning-foreground', '#fbbf24');
  // Convert GeoJSON coordinates to Three.js coordinate system
  const boundaryPoints = useMemo(() => {
    // Approximate meters per degree at this latitude
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

    // Get outer ring of the property boundary (first array in coordinates)
    const outerRing = property.coordinates[0];

    // Convert each coordinate to Three.js space
    const points = outerRing.map((coord) => {
      // GeoJSON format: [longitude, latitude]
      const lon = coord[0];
      const lat = coord[1];

      // Calculate offset in meters from center
      const offsetLon = (lon - centerLon) * metersPerDegreeLon;
      const offsetLat = (lat - centerLat) * metersPerDegreeLat;

      // Transform to Three.js coordinates
      // CRITICAL: GIS Y (North) becomes -Z in Three.js
      const threeCoords = gisToThreeJS(offsetLon, offsetLat, elevation);

      return new THREE.Vector3(threeCoords.x, threeCoords.y, threeCoords.z);
    });

    // Close the loop by adding first point at the end
    points.push(points[0].clone());

    return points;
  }, [property, centerLat, centerLon, elevation]);

  // Build matrikkel identifier for popup/tooltip
  const matrikkelId = useMemo(() => {
    const { kommunenummer, gardsnummer, bruksnummer } = property.matrikkel;
    return `${kommunenummer}/${gardsnummer}/${bruksnummer}`;
  }, [property]);

  if (boundaryPoints.length < 2) {
    console.warn('[PropertyBoundary] Not enough points to render boundary');
    return null;
  }

  return (
    <group>
      {/* Property boundary line */}
      <Line
        points={boundaryPoints}
        color={isFocus ? boundaryColor : lightBoundaryColor}
        lineWidth={isFocus ? lineWidth : lineWidth * 0.75}
        dashed={dashed}
        dashSize={dashed ? 0.5 : undefined}
        gapSize={dashed ? 0.3 : undefined}
        transparent
        opacity={isFocus ? 0.9 : 0.6}
      />

      {/* Optional: Add small markers at corners for focus property */}
      {isFocus &&
        boundaryPoints.slice(0, -1).map((point, index) => (
          <mesh key={`corner-${index}`} position={point}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={boundaryColor} opacity={0.7} transparent />
          </mesh>
        ))}

      {/* Optional: Text label showing matrikkel ID at center */}
      {isFocus && property.center && (
        <group
          position={(() => {
            const centerOffsetLon =
              (property.center.lon - centerLon) * (111320 * Math.cos((centerLat * Math.PI) / 180));
            const centerOffsetLat = (property.center.lat - centerLat) * 111320;
            const centerThree = gisToThreeJS(centerOffsetLon, centerOffsetLat, elevation + 0.5);
            return [centerThree.x, centerThree.y, centerThree.z];
          })()}
        >
          {/* Simple text placeholder - in production, use @react-three/drei Text */}
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color={boundaryColor} visible={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * PropertyBoundaries - Renders multiple property boundaries
 */
interface PropertyBoundariesProps {
  /** Array of property boundaries */
  properties: PropertyBoundary[];
  /** Center coordinate for offset calculation */
  centerLat: number;
  centerLon: number;
  /** Index of the focus property (typically 0) */
  focusIndex?: number;
  /** Elevation offset */
  elevation?: number;
}

export function PropertyBoundaries({
  properties,
  centerLat,
  centerLon,
  focusIndex = 0,
  elevation = 0.1,
}: PropertyBoundariesProps) {
  if (!properties || properties.length === 0) {
    console.warn('[PropertyBoundaries] No properties to render');
    return null;
  }

  return (
    <group name="property-boundaries">
      {properties.map((property, index) => (
        <PropertyBoundary
          key={`property-${index}`}
          property={property}
          centerLat={centerLat}
          centerLon={centerLon}
          isFocus={index === focusIndex}
          elevation={elevation}
        />
      ))}
    </group>
  );
}
