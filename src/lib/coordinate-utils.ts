// Coordinate transformation utilities for Matrikkel API
// Converts between different coordinate systems used in Norwegian mapping

import proj4 from 'proj4';

// Define the projections
// EUREF89 UTM zone 32 (EPSG:25832) - Used in southern Norway
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');

// EUREF89 UTM zone 33 (EPSG:25833) - Used in eastern/northern Norway
proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs');

// WGS84 (EPSG:4326) - Standard web mapping coordinates
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

/**
 * Convert UTM zone 33 coordinates to WGS84 (lat/lng)
 * @param easting - X coordinate in UTM zone 33
 * @param northing - Y coordinate in UTM zone 33
 * @returns [longitude, latitude] in WGS84
 */
export function utm33ToWGS84(easting: number, northing: number): [number, number] {
  return proj4('EPSG:25833', 'EPSG:4326', [easting, northing]) as [number, number];
}

/**
 * Convert UTM zone 32 coordinates to WGS84 (lat/lng)
 * @param easting - X coordinate in UTM zone 32
 * @param northing - Y coordinate in UTM zone 32
 * @returns [longitude, latitude] in WGS84
 */
export function utm32ToWGS84(easting: number, northing: number): [number, number] {
  return proj4('EPSG:25832', 'EPSG:4326', [easting, northing]) as [number, number];
}

/**
 * Convert WGS84 (lat/lng) to UTM zone 33
 * @param lng - Longitude in WGS84
 * @param lat - Latitude in WGS84
 * @returns [easting, northing] in UTM zone 33
 */
export function wgs84ToUtm33(lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:25833', [lng, lat]) as [number, number];
}

/**
 * Convert WGS84 (lat/lng) to UTM zone 32
 * @param lng - Longitude in WGS84
 * @param lat - Latitude in WGS84
 * @returns [easting, northing] in UTM zone 32
 */
export function wgs84ToUtm32(lng: number, lat: number): [number, number] {
  return proj4('EPSG:4326', 'EPSG:25832', [lng, lat]) as [number, number];
}

/**
 * Determine which UTM zone to use based on longitude
 * Norway uses zone 32 for western parts and zone 33 for eastern parts
 * @param longitude - Longitude in decimal degrees
 * @returns UTM zone number (32 or 33)
 */
export function getUtmZone(longitude: number): 32 | 33 {
  // Zone 33 is used east of 12°E
  return longitude >= 12 ? 33 : 32;
}

/**
 * Convert UTM coordinates to WGS84, automatically detecting the zone
 * @param easting - X coordinate in UTM
 * @param northing - Y coordinate in UTM
 * @param zone - UTM zone (32 or 33), if not provided will use zone 33 as default
 * @returns [longitude, latitude] in WGS84
 */
export function utmToWGS84(easting: number, northing: number, zone?: 32 | 33): [number, number] {
  const utmZone = zone || 33; // Default to zone 33 if not specified
  return utmZone === 33 ? utm33ToWGS84(easting, northing) : utm32ToWGS84(easting, northing);
}

/**
 * Convert an array of coordinate pairs from UTM to WGS84
 * @param coordinates - Flat array of coordinates [x1, y1, x2, y2, ...]
 * @param zone - UTM zone (32 or 33)
 * @returns Array of [latitude, longitude] pairs for Leaflet
 */
export function convertCoordinateArray(coordinates: number[], zone?: 32 | 33): [number, number][] {
  const latLngCoords: [number, number][] = [];

  for (let i = 0; i < coordinates.length; i += 2) {
    if (i + 1 < coordinates.length) {
      const [lng, lat] = utmToWGS84(coordinates[i], coordinates[i + 1], zone);
      latLngCoords.push([lat, lng]); // Leaflet expects [lat, lng]
    }
  }

  return latLngCoords;
}

/**
 * Convert boundary data from Matrikkel format to Leaflet format
 * @param boundary - Boundary object with UTM coordinates
 * @param zone - UTM zone (32 or 33)
 * @returns Array of [latitude, longitude] pairs for Leaflet polygon
 */
export function convertBoundaryToLatLng(
  boundary: { yttergrense?: { koordinater: number[] } },
  zone?: 32 | 33
): [number, number][] | null {
  if (!boundary.yttergrense?.koordinater) return null;

  return convertCoordinateArray(boundary.yttergrense.koordinater, zone);
}

/**
 * Calculate the center point of a polygon
 * @param coordinates - Array of [latitude, longitude] pairs
 * @returns Center point as [latitude, longitude]
 */
export function getPolygonCenter(coordinates: [number, number][]): [number, number] {
  if (coordinates.length === 0) return [0, 0];

  let sumLat = 0;
  let sumLng = 0;

  for (const [lat, lng] of coordinates) {
    sumLat += lat;
    sumLng += lng;
  }

  return [sumLat / coordinates.length, sumLng / coordinates.length];
}

/**
 * Calculate bounding box for a set of coordinates
 * @param coordinates - Array of [latitude, longitude] pairs
 * @returns Bounding box as [[minLat, minLng], [maxLat, maxLng]]
 */
export function getBoundingBox(coordinates: [number, number][]): [[number, number], [number, number]] {
  if (coordinates.length === 0) return [[0, 0], [0, 0]];

  let minLat = coordinates[0][0];
  let maxLat = coordinates[0][0];
  let minLng = coordinates[0][1];
  let maxLng = coordinates[0][1];

  for (const [lat, lng] of coordinates) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return [[minLat, minLng], [maxLat, maxLng]];
}