'use client';

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';

interface MapTileProps {
  /** Center latitude */
  lat: number;
  /** Center longitude */
  lon: number;
  /** Size in meters (creates a square tile) */
  size?: number;
  /** Tile zoom level (12-18 recommended, higher = more detail) */
  zoom?: number;
  /** Map provider: 'opentopomap' | 'osm' | 'satellite' */
  provider?: 'opentopomap' | 'osm' | 'satellite';
  /** Position offset [x, y, z] */
  position?: [number, number, number];
}

export default function MapTile({
  lat,
  lon,
  size = 200, // 200m x 200m tile
  zoom = 17,
  provider = 'opentopomap',
  position = [0, -0.1, 0] // Slightly below ground
}: MapTileProps) {

  // Calculate tile coordinates from lat/lon
  const tileUrl = useMemo(() => {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const xtile = Math.floor(((lon + 180) / 360) * n);
    const ytile = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );

    // Select tile server based on provider
    let baseUrl = '';
    switch (provider) {
      case 'opentopomap':
        // OpenTopoMap - topographic maps with elevation shading
        baseUrl = `https://a.tile.opentopomap.org/${zoom}/${xtile}/${ytile}.png`;
        break;
      case 'osm':
        // OpenStreetMap standard
        baseUrl = `https://tile.openstreetmap.org/${zoom}/${xtile}/${ytile}.png`;
        break;
      case 'satellite':
        // ESRI World Imagery (satellite)
        baseUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ytile}/${xtile}`;
        break;
      default:
        baseUrl = `https://a.tile.opentopomap.org/${zoom}/${xtile}/${ytile}.png`;
    }

    console.log(`Loading ${provider} tile: z${zoom} x${xtile} y${ytile}`);
    return baseUrl;
  }, [lat, lon, zoom, provider]);

  // Load texture
  const texture = useTexture(tileUrl);

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]} // Horizontal plane
      receiveShadow
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.0}
        transparent
        opacity={0.7} // Slight transparency to blend with scene
      />
    </mesh>
  );
}
