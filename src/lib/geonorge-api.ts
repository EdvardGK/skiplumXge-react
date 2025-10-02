/**
 * Geonorge API Service
 *
 * Provides access to Norwegian public geospatial data:
 * - Property boundaries (cadastral data)
 * - Elevation data (terrain models)
 *
 * All APIs are free and open under CC BY 4.0 license
 */

import {
  PropertyBoundariesResponse,
  GeoKodingResponse,
  ElevationResponse,
  PropertyBoundary,
  TerrainGrid,
  GISCoordinate,
  ThreeJSCoordinate,
} from '@/types/geonorge';

// API Base URLs
const EIENDOM_API_BASE = 'https://ws.geonorge.no/eiendom/v1';
const HOYDEDATA_API_BASE = 'https://ws.geonorge.no/hoydedata/v1';

// ==================== PROPERTY BOUNDARIES ====================

/**
 * Fetch property boundaries near a coordinate point
 *
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param radius Search radius in meters (default: 10m)
 * @param koordsys Coordinate system EPSG code (default: 4258 = ETRS89)
 * @returns Property boundaries as GeoJSON FeatureCollection
 */
export async function fetchPropertyBoundaries(
  lat: number,
  lon: number,
  radius: number = 10,
  koordsys: string = '4258'
): Promise<PropertyBoundariesResponse | null> {
  try {
    const url = new URL(`${EIENDOM_API_BASE}/punkt/omrader`);
    url.searchParams.set('nord', lat.toString());
    url.searchParams.set('ost', lon.toString());
    url.searchParams.set('koordsys', koordsys);
    url.searchParams.set('radius', radius.toString());

    console.log('[Geonorge] Fetching property boundaries:', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[Geonorge] Property boundary fetch failed:', response.status);
      return null;
    }

    const data: PropertyBoundariesResponse = await response.json();
    console.log(`[Geonorge] Found ${data.features?.length || 0} property boundaries`);

    return data;
  } catch (error) {
    console.error('[Geonorge] Property boundary error:', error);
    return null;
  }
}

/**
 * Fetch property by matrikkel number (cadastral identifier)
 *
 * @param kommunenummer Municipality number
 * @param gardsnummer Farm number
 * @param bruksnummer Use number
 * @param omrade Include area/boundary geometry (default: true)
 * @returns Property data as GeoJSON
 */
export async function fetchPropertyByMatrikkel(
  kommunenummer: string,
  gardsnummer: string,
  bruksnummer: string,
  omrade: boolean = true
): Promise<GeoKodingResponse | null> {
  try {
    const url = new URL(`${EIENDOM_API_BASE}/geokoding`);
    url.searchParams.set('kommunenummer', kommunenummer);
    url.searchParams.set('gardsnummer', gardsnummer);
    url.searchParams.set('bruksnummer', bruksnummer);
    url.searchParams.set('omrade', omrade.toString());

    console.log('[Geonorge] Fetching property by matrikkel:', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[Geonorge] Matrikkel fetch failed:', response.status);
      return null;
    }

    const data: GeoKodingResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[Geonorge] Matrikkel error:', error);
    return null;
  }
}

// ==================== ELEVATION DATA ====================

/**
 * Fetch elevation for a single point
 *
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param koordsys Coordinate system EPSG code (default: 4258)
 * @returns Elevation in meters (null if not available)
 */
export async function fetchElevation(
  lat: number,
  lon: number,
  koordsys: string = '4258'
): Promise<number | null> {
  try {
    const url = new URL(`${HOYDEDATA_API_BASE}/punkt`);
    url.searchParams.set('nord', lat.toString());
    url.searchParams.set('ost', lon.toString());
    url.searchParams.set('koordsys', koordsys);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[Geonorge] Elevation fetch failed:', response.status);
      return null;
    }

    const data: ElevationResponse = await response.json();

    if (data.punkter && data.punkter.length > 0) {
      const point = data.punkter[0];
      return point.hoyde ?? null;
    }

    return null;
  } catch (error) {
    console.error('[Geonorge] Elevation error:', error);
    return null;
  }
}

/**
 * Fetch elevation for multiple points (batch request)
 *
 * @param points Array of coordinates [{lat, lon}, ...]
 * @param koordsys Coordinate system EPSG code (default: 4258)
 * @returns Array of elevation values (null for unavailable points)
 *
 * Note: API supports max 50 points per request
 */
export async function fetchElevationBatch(
  points: Array<{ lat: number; lon: number }>,
  koordsys: string = '4258'
): Promise<(number | null)[]> {
  // Enforce API limit of 50 points
  if (points.length > 50) {
    console.warn('[Geonorge] Batch elevation limited to 50 points, truncating');
    points = points.slice(0, 50);
  }

  try {
    const url = new URL(`${HOYDEDATA_API_BASE}/punkt`);
    url.searchParams.set('koordsys', koordsys);

    // Build punkter parameter: "lat1,lon1|lat2,lon2|..."
    const punkterParam = points.map((p) => `${p.lat},${p.lon}`).join('|');
    url.searchParams.set('punkter', punkterParam);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('[Geonorge] Batch elevation fetch failed:', response.status);
      return points.map(() => null);
    }

    const data: ElevationResponse = await response.json();

    // Map results back to input order
    return points.map((_, index) => {
      const point = data.punkter?.[index];
      return point?.hoyde ?? null;
    });
  } catch (error) {
    console.error('[Geonorge] Batch elevation error:', error);
    return points.map(() => null);
  }
}

/**
 * Fetch terrain elevation grid for an area
 *
 * Creates a regular grid of elevation samples optimized for Three.js terrain mesh
 *
 * @param centerLat Center latitude
 * @param centerLon Center longitude
 * @param extent Size in meters (grid will be extent × extent)
 * @param resolution Number of samples per side (e.g., 32 for 32×32 grid)
 * @returns Terrain grid data ready for Three.js PlaneGeometry
 */
export async function fetchTerrainGrid(
  centerLat: number,
  centerLon: number,
  extent: number = 100,
  resolution: number = 32
): Promise<TerrainGrid | null> {
  try {
    // Calculate approximate meters per degree at this latitude
    const metersPerDegreeLat = 111320; // Constant
    const metersPerDegreeLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

    // Calculate offset in degrees
    const latOffset = extent / metersPerDegreeLat;
    const lonOffset = extent / metersPerDegreeLon;

    // Generate grid of sample points
    const gridPoints: Array<{ lat: number; lon: number }> = [];

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        // Sample points evenly distributed across the grid
        const lat = centerLat - latOffset + (2 * latOffset * i) / (resolution - 1);
        const lon = centerLon - lonOffset + (2 * lonOffset * j) / (resolution - 1);
        gridPoints.push({ lat, lon });
      }
    }

    console.log(`[Geonorge] Fetching ${gridPoints.length} elevation points for ${extent}m terrain grid`);

    // Split into batches of 50 (API limit)
    const batches: Array<Array<{ lat: number; lon: number }>> = [];
    for (let i = 0; i < gridPoints.length; i += 50) {
      batches.push(gridPoints.slice(i, i + 50));
    }

    console.log(`[Geonorge] Processing ${batches.length} batches for terrain grid`);

    // Fetch all batches
    const batchResults = await Promise.all(batches.map((batch) => fetchElevationBatch(batch)));

    // Flatten results
    const elevations = batchResults.flat();

    // Handle missing elevations (use average of available data)
    const validElevations = elevations.filter((e) => e !== null) as number[];
    const avgElevation = validElevations.length > 0
      ? validElevations.reduce((sum, e) => sum + e, 0) / validElevations.length
      : 0;

    const filledElevations = elevations.map((e) => e ?? avgElevation);

    const minElevation = Math.min(...filledElevations);
    const maxElevation = Math.max(...filledElevations);

    console.log(
      `[Geonorge] Terrain grid complete: ${filledElevations.length} points, ` +
        `elevation range ${minElevation.toFixed(1)}m - ${maxElevation.toFixed(1)}m`
    );

    return {
      width: extent * 2,
      height: extent * 2,
      samplesX: resolution,
      samplesY: resolution,
      elevations: filledElevations,
      center: { lat: centerLat, lon: centerLon },
      minElevation,
      maxElevation,
      dataSource: 'kartverket-hoydedata',
    };
  } catch (error) {
    console.error('[Geonorge] Terrain grid error:', error);
    return null;
  }
}

// ==================== COORDINATE TRANSFORMATIONS ====================

/**
 * Transform GIS coordinates to Three.js coordinate system
 *
 * CRITICAL: Correct coordinate system transformation
 *
 * GIS Convention (Geonorge APIs):
 * - X = East (longitude)
 * - Y = North (latitude)
 * - Footprints in XY plane
 *
 * Three.js Convention:
 * - X = Right (East)
 * - Y = Up (vertical/elevation)
 * - Z = Forward (negative = into screen = North)
 * - Ground plane = XZ
 *
 * @param gisX East coordinate (longitude offset)
 * @param gisY North coordinate (latitude offset)
 * @param elevation Height in meters (default: 0 for ground level)
 * @returns Three.js coordinate
 */
export function gisToThreeJS(gisX: number, gisY: number, elevation: number = 0): ThreeJSCoordinate {
  return {
    x: gisX, // East stays X
    y: elevation, // Elevation becomes Y (up)
    z: -gisY, // North becomes -Z (CRITICAL: negation for correct orientation)
  };
}

/**
 * Transform Three.js coordinates back to GIS
 *
 * @param threeX Three.js X coordinate
 * @param threeY Three.js Y coordinate (elevation)
 * @param threeZ Three.js Z coordinate
 * @returns GIS coordinate (lon offset, lat offset, elevation)
 */
export function threeJSToGIS(
  threeX: number,
  threeY: number,
  threeZ: number
): { gisX: number; gisY: number; elevation: number } {
  return {
    gisX: threeX, // X stays East
    gisY: -threeZ, // -Z becomes North (reverse the negation)
    elevation: threeY, // Y is elevation
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Parse property boundary GeoJSON and simplify to usable format
 *
 * @param response Property boundaries response from API
 * @returns Simplified property boundary data
 */
export function parsePropertyBoundaries(response: PropertyBoundariesResponse): PropertyBoundary[] {
  if (!response.features || response.features.length === 0) {
    return [];
  }

  return response.features
    .filter((feature) => feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
    .map((feature) => {
      const props = feature.properties;
      let coordinates: number[][][];

      if (feature.geometry.type === 'Polygon') {
        coordinates = feature.geometry.coordinates as number[][][];
      } else {
        // MultiPolygon: take the first polygon
        coordinates = (feature.geometry.coordinates as number[][][][])[0];
      }

      // Calculate center point (simple average)
      const allPoints = coordinates[0]; // Outer ring
      const center = allPoints.reduce(
        (acc, point) => ({
          lon: acc.lon + point[0] / allPoints.length,
          lat: acc.lat + point[1] / allPoints.length,
        }),
        { lon: 0, lat: 0 }
      );

      return {
        matrikkel: {
          kommunenummer: props.kommunenummer || '',
          gardsnummer: props.gardsnummer || '',
          bruksnummer: props.bruksnummer || '',
          festenummer: props.festenummer,
          seksjonsnummer: props.seksjonsnummer,
        },
        coordinates,
        center,
      };
    });
}

/**
 * Calculate approximate area of a polygon in square meters
 *
 * Uses simple planar approximation (good for small areas at Norwegian latitudes)
 *
 * @param coordinates Polygon coordinates [[lon, lat], ...]
 * @param lat Approximate latitude for meter conversion
 * @returns Area in square meters
 */
export function calculatePolygonArea(coordinates: number[][], lat: number): number {
  if (coordinates.length < 3) return 0;

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos((lat * Math.PI) / 180);

  // Convert to meters
  const metersCoords = coordinates.map((coord) => [coord[0] * metersPerDegreeLon, coord[1] * metersPerDegreeLat]);

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < metersCoords.length; i++) {
    const j = (i + 1) % metersCoords.length;
    area += metersCoords[i][0] * metersCoords[j][1];
    area -= metersCoords[j][0] * metersCoords[i][1];
  }

  return Math.abs(area) / 2;
}
