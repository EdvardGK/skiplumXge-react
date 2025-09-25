import { createSecureResponse, createSecureErrorResponse } from '@/lib/security';

// Frost API configuration
const FROST_BASE_URL = 'https://frost.met.no/api/v1';
const FROST_CLIENT_ID = process.env.FROST_CLIENT_ID;
const FROST_CLIENT_SECRET = process.env.FROST_CLIENT_SECRET;

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for climate data
const climateCache = new Map<string, { data: any; timestamp: number }>();

// Types for Frost API responses
export interface FrostStation {
  id: string;
  name: string;
  country: string;
  location: {
    latitude: number;
    longitude: number;
    elevation?: number;
  };
  validFrom: string;
  validTo?: string;
}

export interface FrostObservation {
  sourceId: string;
  referenceTime: string;
  observations: Array<{
    elementId: string;
    value: number;
    unit: string;
    timeOffset?: string;
  }>;
}

export interface ClimateData {
  station: FrostStation;
  temperatureData: Array<{
    date: string;
    avgTemp: number;
    minTemp: number;
    maxTemp: number;
  }>;
  heatingDegreeDays: number;
  coolingDegreeDays: number;
  climateZone: string;
  dataQuality: 'excellent' | 'good' | 'limited';
}

// Climate zone classification based on Norwegian geography
export function getClimateZone(latitude: number, longitude: number): string {
  // Simplified climate zone classification for Norway
  if (latitude > 69) return 'arctic';           // Finnmark
  if (latitude > 65) return 'subarctic';        // Northern Norway
  if (longitude < 8 && latitude > 60) return 'maritime_west'; // Western coast
  if (longitude > 15) return 'continental_east'; // Eastern Norway
  if (latitude > 62) return 'mountain';         // Central mountain regions
  return 'temperate_south';                     // Southern Norway
}

// Authentication helper
function createAuthHeader(): string {
  if (!FROST_CLIENT_ID || !FROST_CLIENT_SECRET) {
    throw new Error('Frost API credentials not configured');
  }

  const credentials = Buffer.from(`${FROST_CLIENT_ID}:${FROST_CLIENT_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

// Find nearest weather station
export async function findNearestStation(
  latitude: number,
  longitude: number,
  maxDistance: number = 50000 // 50km radius
): Promise<FrostStation | null> {
  try {
    const url = new URL(`${FROST_BASE_URL}/sources`);
    url.searchParams.set('geometry', `nearest(POINT(${longitude} ${latitude}))`);
    url.searchParams.set('types', 'SensorSystem');
    url.searchParams.set('fields', 'id,name,geometry,validFrom,validTo');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': createAuthHeader(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Frost API station search failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const station = data.data[0];
    return {
      id: station.id,
      name: station.name,
      country: 'Norway',
      location: {
        latitude: station.geometry.coordinates[1],
        longitude: station.geometry.coordinates[0],
        elevation: station.masl
      },
      validFrom: station.validFrom,
      validTo: station.validTo
    };

  } catch (error) {
    console.error('Error finding nearest Frost API station:', error);
    return null;
  }
}

// Get temperature observations
export async function getTemperatureData(
  stationId: string,
  fromDate: string,
  toDate: string
): Promise<FrostObservation[]> {
  try {
    const url = new URL(`${FROST_BASE_URL}/observations`);
    url.searchParams.set('sources', stationId);
    url.searchParams.set('elements', 'mean(air_temperature P1D),min(air_temperature P1D),max(air_temperature P1D)');
    url.searchParams.set('referencetime', `${fromDate}/${toDate}`);
    url.searchParams.set('fields', 'sourceId,referenceTime,observations');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': createAuthHeader(),
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Frost API temperature data failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];

  } catch (error) {
    console.error('Error fetching Frost API temperature data:', error);
    return [];
  }
}

// Calculate heating degree days (base 17°C for Norwegian buildings)
export function calculateHeatingDegreeDays(temperatureData: Array<{ avgTemp: number }>): number {
  const baseTemp = 17; // Norwegian standard base temperature

  return temperatureData.reduce((total, day) => {
    const degreeDays = Math.max(0, baseTemp - day.avgTemp);
    return total + degreeDays;
  }, 0);
}

// Calculate cooling degree days (base 22°C)
export function calculateCoolingDegreeDays(temperatureData: Array<{ avgTemp: number }>): number {
  const baseTemp = 22;

  return temperatureData.reduce((total, day) => {
    const degreeDays = Math.max(0, day.avgTemp - baseTemp);
    return total + degreeDays;
  }, 0);
}

// Main function to get comprehensive climate data
export async function getClimateData(
  latitude: number,
  longitude: number,
  year?: number
): Promise<ClimateData | null> {
  try {
    // Check cache first
    const cacheKey = `${latitude}-${longitude}-${year || 'recent'}`;
    const cached = climateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached climate data for ${latitude}, ${longitude}`);
      return cached.data;
    }

    // Find nearest weather station
    const station = await findNearestStation(latitude, longitude);
    if (!station) {
      console.log(`No weather station found near ${latitude}, ${longitude}`);
      return null;
    }

    // Set date range (previous year or specified year)
    const targetYear = year || new Date().getFullYear() - 1;
    const fromDate = `${targetYear}-01-01`;
    const toDate = `${targetYear}-12-31`;

    console.log(`Getting climate data for ${station.name} (${targetYear})`);

    // Get temperature observations
    const observations = await getTemperatureData(station.id, fromDate, toDate);

    if (observations.length === 0) {
      console.log(`No temperature data available for station ${station.id}`);
      return null;
    }

    // Process temperature data
    const temperatureData = observations.map(obs => {
      const temps = obs.observations;
      const avgTemp = temps.find(t => t.elementId.includes('mean'))?.value || 0;
      const minTemp = temps.find(t => t.elementId.includes('min'))?.value || 0;
      const maxTemp = temps.find(t => t.elementId.includes('max'))?.value || 0;

      return {
        date: obs.referenceTime.split('T')[0],
        avgTemp,
        minTemp,
        maxTemp
      };
    });

    // Calculate degree days
    const heatingDegreeDays = calculateHeatingDegreeDays(temperatureData);
    const coolingDegreeDays = calculateCoolingDegreeDays(temperatureData);

    // Determine climate zone
    const climateZone = getClimateZone(station.location.latitude, station.location.longitude);

    // Assess data quality
    const dataQuality: 'excellent' | 'good' | 'limited' =
      temperatureData.length > 350 ? 'excellent' :
      temperatureData.length > 300 ? 'good' : 'limited';

    const result: ClimateData = {
      station,
      temperatureData,
      heatingDegreeDays,
      coolingDegreeDays,
      climateZone,
      dataQuality
    };

    // Cache the result
    climateCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    console.log(`Climate data retrieved: ${heatingDegreeDays} HDD, ${coolingDegreeDays} CDD for ${station.name}`);

    return result;

  } catch (error) {
    console.error('Error getting climate data from Frost API:', error);
    return null;
  }
}

// Get climate summary for multiple locations (e.g., major Norwegian cities)
export async function getClimateComparisons(): Promise<Record<string, ClimateData | null>> {
  const majorCities = [
    { name: 'Oslo', lat: 59.9139, lng: 10.7522 },
    { name: 'Bergen', lat: 60.3913, lng: 5.3221 },
    { name: 'Trondheim', lat: 63.4305, lng: 10.3951 },
    { name: 'Stavanger', lat: 58.9700, lng: 5.7331 },
    { name: 'Tromsø', lat: 69.6492, lng: 18.9553 }
  ];

  const comparisons: Record<string, ClimateData | null> = {};

  // Get climate data for each city
  for (const city of majorCities) {
    try {
      comparisons[city.name] = await getClimateData(city.lat, city.lng);
    } catch (error) {
      console.error(`Failed to get climate data for ${city.name}:`, error);
      comparisons[city.name] = null;
    }
  }

  return comparisons;
}

// Utility function to convert coordinates from postal code (placeholder for future enhancement)
export async function getCoordinatesFromPostalCode(postalCode: string): Promise<{lat: number, lng: number} | null> {
  // This would integrate with your existing address/postal code lookup
  // For now, return some default coordinates based on major regions
  const postalRegions: Record<string, {lat: number, lng: number}> = {
    '0': { lat: 59.9139, lng: 10.7522 }, // Oslo region
    '1': { lat: 59.9139, lng: 10.7522 }, // Oslo region
    '2': { lat: 59.9139, lng: 10.7522 }, // Oslo region
    '3': { lat: 59.9139, lng: 10.7522 }, // Oslo region
    '4': { lat: 58.9700, lng: 5.7331 }, // Stavanger region
    '5': { lat: 60.3913, lng: 5.3221 }, // Bergen region
    '6': { lat: 63.4305, lng: 10.3951 }, // Trondheim region
    '7': { lat: 63.4305, lng: 10.3951 }, // Trondheim region
    '8': { lat: 69.6492, lng: 18.9553 }, // Tromsø region
    '9': { lat: 69.6492, lng: 18.9553 }  // Tromsø region
  };

  const firstDigit = postalCode.charAt(0);
  return postalRegions[firstDigit] || null;
}