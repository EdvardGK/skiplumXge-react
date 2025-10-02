'use client';

import { useMemo, useEffect, useState } from 'react';
import { PlaneGeometry, TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';
import { fetchTerrainGrid } from '@/lib/geonorge-api';
import type { TerrainGrid } from '@/types/geonorge';

interface TerrainMeshProps {
  /** Center latitude of the terrain */
  lat: number;
  /** Center longitude of the terrain */
  lon: number;
  /** Extent in meters (how far from center in each direction) */
  extent?: number;
  /** Resolution of the elevation grid (samples per side) */
  resolution?: number;
  /** Z-scale multiplier for elevation (exaggerate height) */
  elevationScale?: number;
  /** Tile zoom level for map texture (12-18 recommended) */
  tileZoom?: number;
}

export default function TerrainMesh({
  lat,
  lon,
  extent = 100, // 100m radius = 200m x 200m area
  resolution = 32, // 32x32 elevation grid (optimized: 1024 points = 21 API calls)
  elevationScale = 1.0,
  tileZoom = 17
}: TerrainMeshProps) {
  const [terrainGrid, setTerrainGrid] = useState<TerrainGrid | null>(null);
  const [mapTileUrl, setMapTileUrl] = useState<string | null>(null);

  // Calculate tile coordinates from lat/lon
  const tileCoords = useMemo(() => {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, tileZoom);
    const xtile = Math.floor(((lon + 180) / 360) * n);
    const ytile = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x: xtile, y: ytile, z: tileZoom };
  }, [lat, lon, tileZoom]);

  // Generate map tile URL (OpenTopoMap)
  useEffect(() => {
    // OpenTopoMap tile server
    const url = `https://a.tile.opentopomap.org/${tileCoords.z}/${tileCoords.x}/${tileCoords.y}.png`;
    setMapTileUrl(url);
    console.log('Loading terrain tile:', url);
  }, [tileCoords]);

  // Fetch elevation data from Kartverket
  useEffect(() => {
    const fetchElevation = async () => {
      try {
        console.log('[TerrainMesh] Fetching Kartverket elevation data...');
        const grid = await fetchTerrainGrid(lat, lon, extent, resolution);

        if (!grid) {
          console.warn('[TerrainMesh] Elevation fetch failed, using flat terrain');
          // Create flat terrain grid as fallback
          setTerrainGrid({
            width: extent * 2,
            height: extent * 2,
            samplesX: resolution,
            samplesY: resolution,
            elevations: new Array(resolution * resolution).fill(0),
            center: { lat, lon },
            minElevation: 0,
            maxElevation: 0,
            dataSource: 'fallback-flat',
          });
          return;
        }

        setTerrainGrid(grid);
        console.log(
          `[TerrainMesh] Loaded ${grid.elevations.length} elevation points, ` +
            `range: ${grid.minElevation.toFixed(1)}m - ${grid.maxElevation.toFixed(1)}m`
        );
      } catch (error) {
        console.error('[TerrainMesh] Failed to fetch elevation data:', error);
        // Fallback to flat terrain
        setTerrainGrid({
          width: extent * 2,
          height: extent * 2,
          samplesX: resolution,
          samplesY: resolution,
          elevations: new Array(resolution * resolution).fill(0),
          center: { lat, lon },
          minElevation: 0,
          maxElevation: 0,
          dataSource: 'fallback-flat',
        });
      }
    };

    fetchElevation();
  }, [lat, lon, extent, resolution]);

  // Create terrain geometry with elevation displacement
  const geometry = useMemo(() => {
    if (!terrainGrid) return null;

    const geom = new PlaneGeometry(
      terrainGrid.width, // width in meters
      terrainGrid.height, // depth in meters
      terrainGrid.samplesX - 1, // width segments
      terrainGrid.samplesY - 1  // depth segments
    );

    // Apply elevation to vertices
    const positions = geom.attributes.position.array as Float32Array;

    for (let i = 0; i < terrainGrid.elevations.length; i++) {
      // Z coordinate (height) is every 3rd value in position array
      const vertexIndex = i * 3 + 2;
      // Relative elevation from minimum (so terrain sits at y=0 at lowest point)
      const relativeElevation = (terrainGrid.elevations[i] - terrainGrid.minElevation) * elevationScale;
      positions[vertexIndex] = relativeElevation;
    }

    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals(); // Recalculate normals for proper lighting

    console.log(
      `[TerrainMesh] Created geometry: ${terrainGrid.width}m × ${terrainGrid.height}m, ` +
        `${terrainGrid.samplesX}×${terrainGrid.samplesY} samples`
    );

    return geom;
  }, [terrainGrid, elevationScale]);

  // Load map texture with CORS proxy if needed
  const textureUrl = useMemo(() => {
    if (!mapTileUrl) return '';
    // OpenTopoMap supports CORS, but some tile servers don't
    // If you get CORS errors, uncomment this proxy:
    // return `https://corsproxy.io/?${encodeURIComponent(mapTileUrl)}`;
    return mapTileUrl;
  }, [mapTileUrl]);

  const mapTexture = mapTileUrl ? useLoader(TextureLoader, textureUrl) : null;

  if (!geometry || !mapTexture || !terrainGrid) {
    return null; // Loading...
  }

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to horizontal (XZ plane)
      position={[0, 0, 0]} // Position at origin
      receiveShadow
    >
      <meshStandardMaterial
        map={mapTexture}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}
