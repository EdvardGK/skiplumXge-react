import { NextRequest } from 'next/server';
import { supabaseClient } from '@/lib/supabase';
import { createSecureResponse, createSecureErrorResponse, rateLimit, getClientIP } from '@/lib/security';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const priceCache = new Map<string, { data: any; timestamp: number }>();

export interface ElectricityPriceData {
  week: string;
  averagePrice: number; // øre/kWh
  zone: string;
}

export interface PriceResponse {
  currentPrice: number; // øre/kWh
  weeklyPrices: ElectricityPriceData[];
  averagePrice36Months: number;
  averagePrice12Months: number;
  averagePrice3Months: number;
  zone: string;
  lastUpdated: string;
  networkFee: number; // nettleie estimate
  totalPrice: number; // spot + nettleie + fees
}

// Network fees by zone (approximate øre/kWh)
const NETWORK_FEES: Record<string, number> = {
  'NO1': 42, // Southeast
  'NO2': 45, // Southwest
  'NO3': 40, // Mid-Norway
  'NO4': 38, // North
  'NO5': 43, // West
};

const TAXES_AND_FEES = 15; // Additional taxes and fees in øre/kWh

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`electricity-prices:${clientIP}`, 100, 60000);

    if (!rateLimitResult.allowed) {
      return createSecureErrorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    const searchParams = request.nextUrl.searchParams;
    const zone = searchParams.get('zone') || 'NO1';
    const weeks = parseInt(searchParams.get('weeks') || '52'); // How many weeks of history

    // Validate zone
    if (!['NO1', 'NO2', 'NO3', 'NO4', 'NO5'].includes(zone)) {
      return createSecureErrorResponse('Invalid price zone', 400);
    }

    // Check cache
    const cacheKey = `${zone}-${weeks}`;
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached electricity prices for ${zone}`);
      return createSecureResponse(cached.data);
    }

    console.log(`Fetching electricity prices for zone ${zone}, last ${weeks} weeks`);

    // Query Supabase for electricity prices
    const { data: prices, error } = await supabaseClient
      .from('electricity_prices_nve')
      .select('*')
      .eq('zone', zone)
      .order('week', { ascending: false })
      .limit(weeks);

    if (error) {
      console.error('Failed to fetch electricity prices:', error);
      throw new Error('Failed to fetch electricity prices');
    }

    if (!prices || prices.length === 0) {
      return createSecureErrorResponse('No price data available for this zone', 404);
    }

    // Process the data
    const weeklyPrices: ElectricityPriceData[] = prices.map(row => ({
      week: row.week,
      averagePrice: row.spot_price_ore_kwh || 0,
      zone: row.zone
    }));

    // Calculate averages
    const currentPrice = weeklyPrices[0]?.averagePrice || 0;

    // 3-month average (13 weeks)
    const last3Months = weeklyPrices.slice(0, Math.min(13, weeklyPrices.length));
    const averagePrice3Months = last3Months.reduce((sum, p) => sum + p.averagePrice, 0) / last3Months.length;

    // 12-month average (52 weeks)
    const last12Months = weeklyPrices.slice(0, Math.min(52, weeklyPrices.length));
    const averagePrice12Months = last12Months.reduce((sum, p) => sum + p.averagePrice, 0) / last12Months.length;

    // 36-month average (156 weeks) - fetch more data if needed
    let averagePrice36Months = averagePrice12Months; // Fallback to 12-month if not enough data
    if (weeks < 156) {
      // Need to fetch more data for 36-month average
      const { data: extendedPrices, error: extendedError } = await supabaseClient
        .from('electricity_prices_nve')
        .select('*')
        .eq('zone', zone)
        .order('week', { ascending: false })
        .limit(156);

      if (!extendedError && extendedPrices && extendedPrices.length > 0) {
        const extended = extendedPrices.map(row => row.spot_price_ore_kwh || 0);
        averagePrice36Months = extended.reduce((sum, p) => sum + p, 0) / extended.length;
      }
    } else {
      // We have enough data
      const last36Months = weeklyPrices.slice(0, Math.min(156, weeklyPrices.length));
      averagePrice36Months = last36Months.reduce((sum, p) => sum + p.averagePrice, 0) / last36Months.length;
    }

    // Get network fee for the zone
    const networkFee = NETWORK_FEES[zone] || 40;

    // Calculate total price (spot + network + fees)
    const totalPrice = currentPrice + networkFee + TAXES_AND_FEES;

    const response: PriceResponse = {
      currentPrice: Math.round(currentPrice * 100) / 100,
      weeklyPrices: weeklyPrices.slice(0, 52), // Return max 52 weeks for charts
      averagePrice36Months: Math.round(averagePrice36Months * 100) / 100,
      averagePrice12Months: Math.round(averagePrice12Months * 100) / 100,
      averagePrice3Months: Math.round(averagePrice3Months * 100) / 100,
      zone,
      lastUpdated: new Date().toISOString(),
      networkFee,
      totalPrice: Math.round(totalPrice * 100) / 100
    };

    // Cache the response
    priceCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return createSecureResponse(response);

  } catch (error) {
    console.error('Electricity price API error:', error);

    // Return fallback prices if database fails
    const fallbackPrices: PriceResponse = {
      currentPrice: 45, // Reasonable fallback
      weeklyPrices: [],
      averagePrice36Months: 50,
      averagePrice12Months: 48,
      averagePrice3Months: 45,
      zone: request.nextUrl.searchParams.get('zone') || 'NO1',
      lastUpdated: new Date().toISOString(),
      networkFee: 40,
      totalPrice: 100
    };

    return createSecureResponse(fallbackPrices);
  }
}