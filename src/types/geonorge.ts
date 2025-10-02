/**
 * TypeScript types for Geonorge API responses
 *
 * APIs covered:
 * - Property (Eiendom) API: https://ws.geonorge.no/eiendom/v1/
 * - Elevation (Høydedata) API: https://ws.geonorge.no/hoydedata/v1/
 */

// ==================== PROPERTY / EIENDOM API ====================

/**
 * GeoJSON Feature representing a property boundary (teig)
 */
export interface PropertyBoundaryFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][]; // GeoJSON polygon coordinates
  };
  properties: {
    kommunenummer?: string;
    gardsnummer?: string;
    bruksnummer?: string;
    festenummer?: string;
    seksjonsnummer?: string;
    teigid?: string;
    teigtype?: string;
    arealmerking?: string;
  };
}

/**
 * Response from /punkt/omrader endpoint (property boundaries near coordinates)
 */
export interface PropertyBoundariesResponse {
  type: 'FeatureCollection';
  features: PropertyBoundaryFeature[];
  crs?: {
    type: string;
    properties: {
      name: string; // e.g., "EPSG:4326"
    };
  };
}

/**
 * Response from /geokoding endpoint (property by matrikkel number)
 */
export interface GeoKodingResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point' | 'Polygon';
      coordinates: number[] | number[][][];
    };
    properties: {
      kommunenummer: string;
      gardsnummer: string;
      bruksnummer: string;
      festenummer?: string;
      seksjonsnummer?: string;
      representasjonspunkt?: {
        lat: number;
        lon: number;
        epsg: string;
      };
    };
  }>;
}

// ==================== ELEVATION / HØYDEDATA API ====================

/**
 * Single elevation point result
 */
export interface ElevationPoint {
  koordsys: string; // EPSG code e.g., "4326"
  nord: number; // Latitude
  ost: number; // Longitude
  /** Height in meters (or depth if negative) */
  hoyde?: number;
  /** Data source used (e.g., "dtm1", "dtm10") */
  datakilde?: string;
  /** Terrain type (e.g., "land", "vann") */
  terrengtype?: string;
  /** Any errors encountered */
  feilmelding?: string;
}

/**
 * Response from /punkt endpoint (elevation for coordinates)
 */
export interface ElevationResponse {
  punkter: ElevationPoint[];
}

/**
 * Available data sources for elevation
 */
export interface ElevationDataSource {
  datakilde: string; // e.g., "dtm1", "dtm10"
  beskrivelse: string;
  opplosning?: number; // Resolution in meters
  dekningsomrade?: string; // Coverage area description
}

/**
 * Response from /datakilder endpoint (list of elevation data sources)
 */
export interface ElevationDataSourcesResponse {
  datakilder: ElevationDataSource[];
}

// ==================== HELPER TYPES ====================

/**
 * Coordinate pair in GIS convention (lon/East, lat/North)
 */
export interface GISCoordinate {
  lon: number; // East (X in GIS)
  lat: number; // North (Y in GIS)
}

/**
 * Coordinate pair in Three.js convention
 */
export interface ThreeJSCoordinate {
  x: number; // Right (East)
  y: number; // Up (elevation)
  z: number; // Forward (negative = North)
}

/**
 * Property boundary data in simplified format
 */
export interface PropertyBoundary {
  /** Property matrikkel identifier */
  matrikkel: {
    kommunenummer: string;
    gardsnummer: string;
    bruksnummer: string;
    festenummer?: string;
    seksjonsnummer?: string;
  };
  /** Boundary polygon coordinates in GIS format [lon, lat] */
  coordinates: number[][][]; // Polygon with possible holes
  /** Area in square meters (calculated from coordinates) */
  area?: number;
  /** Center point of the property */
  center?: GISCoordinate;
}

/**
 * Terrain elevation grid
 */
export interface TerrainGrid {
  /** Grid width in meters */
  width: number;
  /** Grid height in meters */
  height: number;
  /** Number of samples in X direction */
  samplesX: number;
  /** Number of samples in Y direction */
  samplesY: number;
  /** Elevation values in row-major order (Y varies fastest) */
  elevations: number[];
  /** Center coordinate of the grid */
  center: GISCoordinate;
  /** Minimum elevation in the grid */
  minElevation: number;
  /** Maximum elevation in the grid */
  maxElevation: number;
  /** Data source used */
  dataSource: string;
}
