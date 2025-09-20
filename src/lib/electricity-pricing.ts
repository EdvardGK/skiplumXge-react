import electricityPricesData from '@/data/ssb-electricity-prices.json';

export type NorwegianPriceZone = 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';

export interface QuarterlyElectricityPrice {
  quarter: string; // "2022K1", "2022K2", etc.
  date: string; // "2022-01-01"
  priceOrePerKwh: number; // øre/kWh from SSB
  priceKrPerKwh: number; // kr/kWh (calculated)
  notes?: string; // Context about the price
}

export interface ElectricityPriceData {
  prices: QuarterlyElectricityPrice[];
  average36Month: number; // kr/kWh
  zone: NorwegianPriceZone;
  dataSource: {
    name: string;
    table: string;
    url: string;
    license: string;
    description: string;
    lastUpdated: string;
  };
  summary: {
    totalQuarters: number;
    period: string;
    averagePrice36Months: number;
    highestPrice: {
      quarter: string;
      price: number;
    };
    lowestPrice: {
      quarter: string;
      price: number;
    };
    priceVolatility: string;
  };
}

export interface ZoneComparison {
  zone: NorwegianPriceZone;
  zoneName: string;
  currentPrice: number;
  average36Month: number;
  percentageDifferenceFromNO1: number;
}

/**
 * Get all quarterly electricity price data from SSB for a specific zone
 * @param zone Norwegian pricing zone (NO1-NO5)
 */
export function getElectricityPriceData(zone: NorwegianPriceZone = 'NO1'): ElectricityPriceData {
  const prices = electricityPricesData.quarterlyPricesByZone[zone];
  const average36Month = electricityPricesData.summary.averagePricesByZone[zone];

  return {
    prices,
    average36Month,
    zone,
    dataSource: electricityPricesData.dataSource,
    summary: {
      totalQuarters: electricityPricesData.summary.totalQuarters,
      period: electricityPricesData.summary.period,
      averagePrice36Months: average36Month,
      highestPrice: {
        quarter: prices.reduce((max, p) => p.priceKrPerKwh > max.priceKrPerKwh ? p : max).quarter,
        price: Math.max(...prices.map(p => p.priceKrPerKwh))
      },
      lowestPrice: {
        quarter: prices.reduce((min, p) => p.priceKrPerKwh < min.priceKrPerKwh ? p : min).quarter,
        price: Math.min(...prices.map(p => p.priceKrPerKwh))
      },
      priceVolatility: electricityPricesData.summary.priceVolatility
    },
  };
}

/**
 * Calculate the 36-month (12 quarters) rolling average electricity price
 * @param prices Array of quarterly prices
 * @param endQuarter Optional end quarter, defaults to latest
 * @returns Average price in kr/kWh
 */
export function calculate36MonthAverage(
  prices: QuarterlyElectricityPrice[],
  endQuarter?: string
): number {
  let relevantPrices = prices;

  // Filter to end quarter if specified
  if (endQuarter) {
    const endIndex = prices.findIndex(p => p.quarter === endQuarter);
    if (endIndex >= 0) {
      relevantPrices = prices.slice(0, endIndex + 1);
    }
  }

  // Get last 12 quarters (36 months)
  const last36Months = relevantPrices.slice(-12);

  if (last36Months.length === 0) {
    return 2.80; // Fallback to static price if no data
  }

  const total = last36Months.reduce((sum, price) => sum + price.priceKrPerKwh, 0);
  return Math.round((total / last36Months.length) * 100) / 100; // Round to 2 decimals
}

/**
 * Get the current electricity price to use in calculations
 * Uses 36-month average as recommended benchmark
 * @param zone Norwegian pricing zone (defaults to NO1 - Oslo)
 */
export function getCurrentElectricityPrice(zone: NorwegianPriceZone = 'NO1'): number {
  const data = getElectricityPriceData(zone);
  return data.average36Month;
}

/**
 * Get electricity price for a specific quarter
 * @param quarter Quarter in format "2024K1", "2024K2", etc.
 * @returns Price in kr/kWh or null if not found
 */
export function getPriceForQuarter(quarter: string): number | null {
  const data = getElectricityPriceData();
  const quarterData = data.prices.find(p => p.quarter === quarter);
  return quarterData ? quarterData.priceKrPerKwh : null;
}

/**
 * Get prices for a specific year
 * @param year Year as number (2022, 2023, 2024)
 * @returns Array of quarterly prices for that year
 */
export function getPricesForYear(year: number): QuarterlyElectricityPrice[] {
  const data = getElectricityPriceData();
  return data.prices.filter(p => p.quarter.startsWith(year.toString()));
}

/**
 * Get price trend information (whether prices are trending up or down)
 * @returns Object with trend direction and percentage change
 */
export function getPriceTrend(): {
  direction: 'up' | 'down' | 'stable';
  percentageChange: number;
  description: string;
} {
  const data = getElectricityPriceData();
  const prices = data.prices;

  if (prices.length < 2) {
    return {
      direction: 'stable',
      percentageChange: 0,
      description: 'Insufficient data for trend analysis'
    };
  }

  const latest = prices[prices.length - 1];
  const previous = prices[prices.length - 2];

  const percentageChange = Math.round(((latest.priceKrPerKwh - previous.priceKrPerKwh) / previous.priceKrPerKwh) * 100);

  let direction: 'up' | 'down' | 'stable';
  let description: string;

  if (Math.abs(percentageChange) < 5) {
    direction = 'stable';
    description = `Prices stable (${percentageChange > 0 ? '+' : ''}${percentageChange}% from previous quarter)`;
  } else if (percentageChange > 0) {
    direction = 'up';
    description = `Prices trending up (+${percentageChange}% from previous quarter)`;
  } else {
    direction = 'down';
    description = `Prices trending down (${percentageChange}% from previous quarter)`;
  }

  return {
    direction,
    percentageChange,
    description
  };
}

/**
 * Compare current price to historical average
 * @returns Object with comparison information
 */
export function compareToHistoricalAverage(): {
  currentPrice: number;
  historicalAverage: number;
  difference: number;
  percentageDifference: number;
  isAboveAverage: boolean;
  description: string;
} {
  const data = getElectricityPriceData();
  const currentPrice = data.prices[data.prices.length - 1].priceKrPerKwh;
  const historicalAverage = data.average36Month;

  const difference = Math.round((currentPrice - historicalAverage) * 100) / 100;
  const percentageDifference = Math.round(((currentPrice - historicalAverage) / historicalAverage) * 100);
  const isAboveAverage = currentPrice > historicalAverage;

  const description = isAboveAverage
    ? `Current prices are ${percentageDifference}% above the 36-month average`
    : `Current prices are ${Math.abs(percentageDifference)}% below the 36-month average`;

  return {
    currentPrice,
    historicalAverage,
    difference,
    percentageDifference,
    isAboveAverage,
    description
  };
}

/**
 * Detect Norwegian pricing zone from coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Detected pricing zone or NO1 as fallback
 */
export function detectPriceZoneFromCoordinates(lat: number, lon: number): NorwegianPriceZone {
  // Rough coordinate-based zone detection for Norway
  // These are approximate boundaries - real implementation would use proper GIS data

  // NO4 - North Norway (above ~66°N - Arctic Circle)
  if (lat > 66.0) {
    return 'NO4';
  }

  // NO3 - Mid-Norway (roughly 62°N to 66°N)
  if (lat > 62.0) {
    return 'NO3';
  }

  // NO5 - West Norway (roughly west of 8°E, south of 62°N)
  if (lon < 8.0 && lat > 58.0) {
    return 'NO5';
  }

  // NO2 - Southwest Norway (roughly west of 8°E, south of 58°N)
  if (lon < 8.0 && lat <= 58.0) {
    return 'NO2';
  }

  // NO1 - Southeast Norway (default for Oslo area and eastern regions)
  return 'NO1';
}

/**
 * Get zone comparison data showing all 5 zones with prices and differences
 */
export function getZoneComparison(): ZoneComparison[] {
  const zones: NorwegianPriceZone[] = ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'];
  const no1Average = electricityPricesData.summary.averagePricesByZone.NO1;

  return zones.map(zone => {
    const average36Month = electricityPricesData.summary.averagePricesByZone[zone];
    const currentPrice = electricityPricesData.summary.currentQuarterPrices[zone];
    const percentageDifferenceFromNO1 = Math.round(((average36Month - no1Average) / no1Average) * 100);

    return {
      zone,
      zoneName: electricityPricesData.priceZones[zone],
      currentPrice,
      average36Month,
      percentageDifferenceFromNO1
    };
  });
}

/**
 * Get price comparison between two zones
 * @param zone1 First zone to compare
 * @param zone2 Second zone to compare
 */
export function compareZones(zone1: NorwegianPriceZone, zone2: NorwegianPriceZone) {
  const price1 = electricityPricesData.summary.averagePricesByZone[zone1];
  const price2 = electricityPricesData.summary.averagePricesByZone[zone2];

  const difference = Math.round((price1 - price2) * 100) / 100;
  const percentageDifference = Math.round(((price1 - price2) / price2) * 100);

  return {
    zone1,
    zone2,
    price1,
    price2,
    difference,
    percentageDifference,
    isZone1Higher: price1 > price2,
    description: `${zone1} is ${Math.abs(percentageDifference)}% ${price1 > price2 ? 'higher' : 'lower'} than ${zone2}`
  };
}

/**
 * Get zone name from zone code
 * @param zone Zone code (NO1-NO5)
 */
export function getZoneName(zone: NorwegianPriceZone): string {
  return electricityPricesData.priceZones[zone];
}

/**
 * Get all available zones with their names
 */
export function getAllZones(): Array<{ code: NorwegianPriceZone; name: string }> {
  return Object.entries(electricityPricesData.priceZones).map(([code, name]) => ({
    code: code as NorwegianPriceZone,
    name
  }));
}

// Static fallback price (keep as backup)
export const FALLBACK_ELECTRICITY_PRICE = 2.80; // kr/kWh