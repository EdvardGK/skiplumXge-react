// Real electricity pricing from NVE/Nord Pool data

export type NorwegianPriceZone = 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';

export interface ElectricityPriceData {
  currentPrice: number; // øre/kWh
  weeklyPrices: Array<{
    week: string;
    averagePrice: number;
    zone: string;
  }>;
  averagePrice36Months: number;
  averagePrice12Months: number;
  averagePrice3Months: number;
  zone: NorwegianPriceZone;
  lastUpdated: string;
  networkFee: number;
  totalPrice: number;
}

// Cache for price data
const priceCache = new Map<string, { data: ElectricityPriceData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch real electricity price data from Supabase NVE data
 * @param zone Norwegian pricing zone (NO1-NO5)
 */
export async function getElectricityPriceData(zone: NorwegianPriceZone = 'NO1'): Promise<ElectricityPriceData> {
  // Check cache first
  const cacheKey = zone;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/electricity/prices?zone=${zone}&weeks=52`);

    if (!response.ok) {
      throw new Error(`Failed to fetch electricity prices: ${response.statusText}`);
    }

    const data: ElectricityPriceData = await response.json();

    // Cache the response
    priceCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch electricity prices:', error);

    // Return fallback data based on realistic prices
    return getFallbackPriceData(zone);
  }
}

/**
 * Get fallback price data based on realistic Norwegian electricity prices
 */
function getFallbackPriceData(zone: NorwegianPriceZone): ElectricityPriceData {
  // Realistic spot prices per zone (øre/kWh) based on 2024-2025 averages
  const zonePrices: Record<NorwegianPriceZone, number> = {
    'NO1': 45, // Southeast
    'NO2': 50, // Southwest (highest due to export)
    'NO3': 25, // Mid-Norway
    'NO4': 15, // North (cheapest due to hydro surplus)
    'NO5': 42, // West
  };

  const networkFees: Record<NorwegianPriceZone, number> = {
    'NO1': 42,
    'NO2': 45,
    'NO3': 40,
    'NO4': 38,
    'NO5': 43,
  };

  const spotPrice = zonePrices[zone];
  const networkFee = networkFees[zone];
  const taxes = 15;

  return {
    currentPrice: spotPrice,
    weeklyPrices: [],
    averagePrice36Months: spotPrice + 5, // Slightly higher historical average
    averagePrice12Months: spotPrice + 2,
    averagePrice3Months: spotPrice,
    zone,
    lastUpdated: new Date().toISOString(),
    networkFee,
    totalPrice: spotPrice + networkFee + taxes
  };
}

/**
 * Get the current electricity price for calculations (total including network fees)
 * Returns price in kr/kWh for compatibility with existing calculations
 */
export async function getCurrentElectricityPrice(zone: NorwegianPriceZone = 'NO1'): Promise<number> {
  const data = await getElectricityPriceData(zone);
  // Convert from øre/kWh to kr/kWh
  return data.totalPrice / 100;
}

/**
 * Synchronous version with fallback for immediate use
 */
export function getCurrentElectricityPriceSync(zone: NorwegianPriceZone = 'NO1'): number {
  // Check cache first
  const cached = priceCache.get(zone);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data.totalPrice / 100; // Convert to kr/kWh
  }

  // Return realistic fallback (total with network fees)
  const fallbackTotals: Record<NorwegianPriceZone, number> = {
    'NO1': 1.02, // 102 øre/kWh total
    'NO2': 1.10, // 110 øre/kWh total
    'NO3': 0.80, // 80 øre/kWh total
    'NO4': 0.68, // 68 øre/kWh total
    'NO5': 1.00, // 100 øre/kWh total
  };

  return fallbackTotals[zone];
}

/**
 * Detect Norwegian pricing zone from coordinates
 */
export function detectPriceZoneFromCoordinates(lat: number, lon: number): NorwegianPriceZone {
  // NO4 - North Norway (above ~66°N - Arctic Circle)
  if (lat > 66.0) {
    return 'NO4';
  }

  // NO3 - Mid-Norway (roughly 62°N to 66°N)
  if (lat > 62.0) {
    return 'NO3';
  }

  // NO5 - West Norway (Bergen area - west of 7°E, north of 60°N)
  if (lon < 7.0 && lat > 60.0) {
    return 'NO5';
  }

  // NO2 - Southwest Norway (Rogaland area - west of 7°E, south of 60°N)
  if (lon < 7.0 && lat <= 60.0) {
    return 'NO2';
  }

  // NO1 - Southeast Norway (Oslo and eastern regions - default)
  return 'NO1';
}

/**
 * Get zone-specific messaging based on price levels
 */
export function getZoneSpecificMessage(zone: NorwegianPriceZone, currentPrice: number): {
  title: string;
  description: string;
  focus: 'savings' | 'efficiency' | 'environment';
} {
  // Price in øre/kWh
  if (zone === 'NO4' && currentPrice < 20) {
    return {
      title: 'Norges laveste strømpriser',
      description: 'Selv med lave priser kan du spare 50% med varmepumpe. Fokuser på komfort og miljø.',
      focus: 'environment'
    };
  }

  if (zone === 'NO2' && currentPrice > 45) {
    return {
      title: 'Høye eksportpriser i din region',
      description: 'Spar opptil 70% på oppvarming med varmepumpe. Perfekt timing for energioppgradering.',
      focus: 'savings'
    };
  }

  if (currentPrice < 30) {
    return {
      title: 'Lave strømpriser nå',
      description: 'God tid for oppgradering før prisene stiger. Lås inn fremtidige besparelser.',
      focus: 'efficiency'
    };
  }

  if (currentPrice > 60) {
    return {
      title: 'Høye energikostnader',
      description: 'Kritisk behov for energieffektivisering. Start med varmepumpe for rask ROI.',
      focus: 'savings'
    };
  }

  // Default message
  return {
    title: 'Optimaliser energibruken',
    description: 'Reduser kostnader og miljøavtrykk med moderne energiløsninger.',
    focus: 'efficiency'
  };
}

/**
 * Calculate realistic savings based on actual electricity prices
 */
export async function calculateRealisticSavings(
  currentConsumption: number, // kWh/year
  zone: NorwegianPriceZone = 'NO1',
  heatingSystem: 'electric' | 'heatpump' | 'oil' | 'gas' = 'electric'
): Promise<{
  currentCost: number;
  potentialCost: number;
  annualSavings: number;
  savingsPercentage: number;
  paybackYears: number;
}> {
  const priceData = await getElectricityPriceData(zone);
  const pricePerKwh = priceData.totalPrice / 100; // Convert to kr/kWh

  const currentCost = currentConsumption * pricePerKwh;

  let potentialCost = currentCost;
  let savingsPercentage = 0;

  switch (heatingSystem) {
    case 'electric':
      // Heat pump can reduce heating consumption by 65-70%
      potentialCost = currentCost * 0.33; // 67% reduction
      savingsPercentage = 67;
      break;
    case 'oil':
    case 'gas':
      // Switching from fossil fuels to heat pump
      potentialCost = currentCost * 0.25; // 75% reduction
      savingsPercentage = 75;
      break;
    case 'heatpump':
      // Already efficient, consider solar
      potentialCost = currentCost * 0.80; // 20% with solar
      savingsPercentage = 20;
      break;
  }

  const annualSavings = currentCost - potentialCost;
  const investmentCost = heatingSystem === 'heatpump' ? 30000 : 150000; // Solar vs heat pump
  const paybackYears = investmentCost / annualSavings;

  return {
    currentCost: Math.round(currentCost),
    potentialCost: Math.round(potentialCost),
    annualSavings: Math.round(annualSavings),
    savingsPercentage: Math.round(savingsPercentage),
    paybackYears: Math.round(paybackYears * 10) / 10
  };
}

// Fallback price for synchronous operations (kr/kWh)
export const FALLBACK_ELECTRICITY_PRICE = 0.90; // 90 øre/kWh total (realistic 2024-2025 average)

// Zone information
export const ZONE_NAMES: Record<NorwegianPriceZone, string> = {
  'NO1': 'Øst-Norge (Oslo, Viken, Innlandet)',
  'NO2': 'Sørvest-Norge (Agder, Rogaland)',
  'NO3': 'Midt-Norge (Trøndelag, Møre og Romsdal)',
  'NO4': 'Nord-Norge (Nordland, Troms, Finnmark)',
  'NO5': 'Vest-Norge (Vestland)'
};