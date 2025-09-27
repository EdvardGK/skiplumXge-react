// Server-side only coordinate transformation utilities
// This file should only be imported in server components or API routes

import proj4 from 'proj4';

// Define the projections
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

export function utm33ToWGS84(easting: number, northing: number): [number, number] {
  return proj4('EPSG:25833', 'EPSG:4326', [easting, northing]) as [number, number];
}

export function utm32ToWGS84(easting: number, northing: number): [number, number] {
  return proj4('EPSG:25832', 'EPSG:4326', [easting, northing]) as [number, number];
}

export function utmToWGS84(easting: number, northing: number, zone?: 32 | 33): [number, number] {
  const utmZone = zone || 33;
  return utmZone === 33 ? utm33ToWGS84(easting, northing) : utm32ToWGS84(easting, northing);
}