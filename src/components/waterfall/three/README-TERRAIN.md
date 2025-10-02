# 3D Terrain & Map Integration

Two components for adding map tiles and terrain to your Three.js building visualizations.

## Quick Start: Simple Map Tile

**MapTile.tsx** - Simple textured plane with OpenTopoMap imagery

```tsx
import MapTile from '@/components/waterfall/three/MapTile';

// In your Canvas scene:
<MapTile
  lat={59.9139}
  lon={10.7522}
  size={200}  // 200m x 200m
  zoom={17}   // Detail level
  provider="opentopomap"  // or 'osm' or 'satellite'
/>
```

### Usage Example in PropertyHeroSection

Add to the Canvas (around line 400-500):

```tsx
<Canvas
  camera={{ position: [30, 20, 30], fov: 50 }}
  shadows
>
  <Suspense fallback={null}>
    {/* Existing BuildingMesh */}
    <BuildingMesh
      footprint={footprintCoords}
      // ... other props
    />

    {/* NEW: Add map tile beneath building */}
    {buildingData.lat && buildingData.lon && (
      <MapTile
        lat={parseFloat(buildingData.lat)}
        lon={parseFloat(buildingData.lon)}
        size={200}
        zoom={17}
        provider="opentopomap"
        position={[0, -0.1, 0]}  // Slightly below ground level
      />
    )}

    <OrbitControls />
    <Environment preset="sunset" />
  </Suspense>
</Canvas>
```

## Advanced: 3D Terrain with Elevation

**TerrainMesh.tsx** - Full 3D terrain with real elevation data

```tsx
import TerrainMesh from '@/components/waterfall/three/TerrainMesh';

<TerrainMesh
  lat={59.9139}
  lon={10.7522}
  extent={100}           // 100m radius = 200x200m area
  resolution={64}        // 64x64 elevation grid
  elevationScale={2.0}   // Exaggerate height by 2x
  tileZoom={17}
/>
```

### Features

**MapTile** (Simple):
- ✅ Fast loading
- ✅ Multiple map providers (OpenTopoMap, OSM, Satellite)
- ✅ No external API calls
- ✅ Works with CORS
- ❌ Flat (no elevation)

**TerrainMesh** (Advanced):
- ✅ Real 3D elevation
- ✅ OpenTopoMap texture
- ✅ Configurable detail
- ✅ Elevation exaggeration
- ⚠️  Requires elevation API (rate limits apply)
- ⚠️  Slower initial load

## Map Providers

### OpenTopoMap (default)
- Topographic maps with elevation shading
- Shows contour lines and terrain
- Best for outdoor/terrain visualization
- URL: `https://a.tile.opentopomap.org/{z}/{x}/{y}.png`

### OpenStreetMap
- Standard street map
- Shows roads, buildings, labels
- Best for urban areas
- URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`

### Satellite (ESRI)
- Aerial/satellite imagery
- Real photography
- Best for realistic context
- URL: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`

## Zoom Levels

| Zoom | Scale | Use Case |
|------|-------|----------|
| 12   | ~4,900m | City overview |
| 14   | ~1,200m | Neighborhood |
| 16   | ~305m   | Block/street |
| 17   | ~152m   | Building detail (recommended) |
| 18   | ~76m    | Maximum detail |

## Coordinate System Alignment

The terrain/map automatically aligns with BuildingMesh coordinate system:

```
GIS (lat/lon) → Three.js:
- Longitude (East) → +X (Right)
- Latitude (North) → -Z (Into screen)
- Elevation → +Y (Up)
```

Both footprint polygon and map tile use the same transformation, so they align perfectly.

## Performance Tips

1. **Start with MapTile** for development (faster)
2. **Use TerrainMesh** only when elevation is critical
3. **Adjust resolution** based on terrain complexity:
   - Flat areas: `resolution={32}`
   - Hilly areas: `resolution={64}`
   - Mountains: `resolution={128}` (slow!)
4. **Cache tiles** by keeping zoom/position stable
5. **Limit extent** to visible area only

## Troubleshooting

### CORS Errors
If you get CORS errors with map tiles:

```tsx
// Option 1: Use CORS proxy (in MapTile.tsx)
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(tileUrl)}`;

// Option 2: Self-host tiles (advanced)
// Download tiles and serve from /public/tiles/
```

### Elevation API Rate Limits
Open-Elevation API has rate limits. For production:

```tsx
// Option 1: Use different elevation API
// - Mapbox Terrain API (requires key)
// - Google Elevation API (requires key)

// Option 2: Pre-download elevation data
// - Download SRTM data for your area
// - Serve from your own API
```

### Map Not Visible
Check these:

1. Position is below ground: `position={[0, -0.1, 0]}`
2. Coordinates are valid: `lat` and `lon` are numbers
3. Size matches scene scale: `size={200}` for 200m building
4. Opacity is visible: `opacity={0.7}`

## Example: Complete Integration

```tsx
export default function PropertyHeroSection({ buildingData }) {
  // ... existing code

  // Parse coordinates
  const lat = buildingData.lat ? parseFloat(buildingData.lat) : null;
  const lon = buildingData.lon ? parseFloat(buildingData.lon) : null;

  return (
    <Canvas>
      <Suspense fallback={null}>
        {/* Map tile (simple, fast) */}
        {lat && lon && (
          <MapTile
            lat={lat}
            lon={lon}
            size={200}
            zoom={17}
            provider="opentopomap"
            position={[0, -0.2, 0]}
          />
        )}

        {/* OR: 3D terrain (advanced, slower) */}
        {/* {lat && lon && (
          <TerrainMesh
            lat={lat}
            lon={lon}
            extent={100}
            resolution={64}
            elevationScale={1.5}
            tileZoom={17}
          />
        )} */}

        {/* Building */}
        <BuildingMesh
          footprint={footprintCoords}
          buildingType={buildingData.buildingType || 'Kontor'}
          numberOfFloors={buildingData.osmLevels || 2}
        />

        <OrbitControls />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  );
}
```

## Future Enhancements

- [ ] Multi-tile support (load surrounding tiles)
- [ ] Dynamic LOD (adjust detail based on camera distance)
- [ ] Tile caching (prevent re-downloads)
- [ ] Custom elevation shaders (GPU-based displacement)
- [ ] Shadow maps from terrain
- [ ] Clipping plane support for sectioning
