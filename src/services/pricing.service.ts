import { supabaseClient } from '@/lib/supabase'
import type { ElectricityPrice } from '@/lib/supabase'
import type { PriceZone } from '@/services/zone.service'

// Cache for pricing data
const priceCache = new Map<string, number>()
const historyCache = new Map<string, ElectricityPrice[]>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour for current prices
const HISTORY_CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours for historical data

// Network costs and taxes (approximate Norwegian values in øre/kWh)
const NETWORK_COST_ORE_KWH = 50 // Network costs (~50 øre/kWh)
const TAXES_AND_FEES_ORE_KWH = 20 // Taxes and fees (~20 øre/kWh)

export interface PriceData {
  spotPrice: number // øre/kWh
  networkCost: number // øre/kWh
  taxes: number // øre/kWh
  totalPrice: number // kr/kWh
  zone: PriceZone
  week: string
  year: number
}

export interface PriceHistoryData {
  week: string
  year: number
  weekNumber: number
  spotPrice: number // øre/kWh
  totalPrice: number // kr/kWh
  zone: PriceZone
  date?: Date
}

/**
 * Get price zone for a municipality
 * @param kommunenummer - Norwegian municipality number from address search
 * @returns Price zone (NO1-NO5) or null if not found
 */
export async function getPriceZoneByKommune(kommunenummer: string): Promise<PriceZone | null> {
  try {
    const { data, error } = await supabaseClient
      .from('municipality_price_zones')
      .select('price_zone')
      .eq('kommune_number', kommunenummer)
      .single()

    if (error || !data) {
      console.warn(`Zone lookup failed for kommune ${kommunenummer}:`, error?.message)
      return 'NO1' // Default fallback to Eastern Norway
    }

    return data.price_zone as PriceZone

  } catch (error) {
    console.warn(`Zone lookup error for kommune ${kommunenummer}:`, error)
    return 'NO1' // Default fallback
  }
}

/**
 * Get current electricity spot price for a specific zone
 * @param zone - Norwegian electricity price zone (NO1-NO5)
 * @returns Current spot price in øre/kWh
 */
export async function getCurrentPriceByZone(zone: PriceZone): Promise<number> {
  try {
    const cacheKey = `current_${zone}`

    // Check cache first
    if (priceCache.has(cacheKey)) {
      return priceCache.get(cacheKey)!
    }

    // Get most recent price data for the zone
    const { data, error } = await supabaseClient
      .from('electricity_prices_nve')
      .select('spot_price_ore_kwh')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      throw new Error(`Failed to get current price for zone ${zone}: ${error.message}`)
    }

    if (!data) {
      throw new Error(`No current price data found for zone ${zone}`)
    }

    const spotPrice = data.spot_price_ore_kwh

    // Cache the result
    priceCache.set(cacheKey, spotPrice)
    setTimeout(() => priceCache.delete(cacheKey), CACHE_DURATION)

    return spotPrice

  } catch (error) {
    console.warn(`Current price lookup failed for zone ${zone}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get 36-month average electricity price for a specific zone
 * @param zone - Norwegian electricity price zone (NO1-NO5)
 * @returns 36-month average price in øre/kWh
 */
export async function get36MonthAverageByZone(zone: PriceZone): Promise<number> {
  try {
    const cacheKey = `average_36m_${zone}`

    // Check cache first
    if (priceCache.has(cacheKey)) {
      return priceCache.get(cacheKey)!
    }

    // Get last 36 months of quarterly data for the zone
    const { data, error } = await supabaseClient
      .from('electricity_prices_nve')
      .select('spot_price_ore_kwh')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(144) // Approximately 36 months of weekly data

    if (error) {
      throw new Error(`Failed to get historical prices for zone ${zone}: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`No historical price data found for zone ${zone}`)
    }

    // Calculate average
    const totalPrice = data.reduce((sum, week) => sum + week.spot_price_ore_kwh, 0)
    const averagePrice = Math.round(totalPrice / data.length)

    // Cache the result (longer cache for averages)
    priceCache.set(cacheKey, averagePrice)
    setTimeout(() => priceCache.delete(cacheKey), HISTORY_CACHE_DURATION)

    return averagePrice

  } catch (error) {
    console.warn(`36-month average lookup failed for zone ${zone}:`, error)
    throw error
  }
}

/**
 * Get total electricity cost including spot price, network costs, and taxes
 * @param zone - Norwegian electricity price zone
 * @returns Total cost in kr/kWh
 */
export async function getTotalElectricityCost(zone: PriceZone): Promise<PriceData> {
  try {
    const spotPrice = await getCurrentPriceByZone(zone)
    const totalOreKwh = spotPrice + NETWORK_COST_ORE_KWH + TAXES_AND_FEES_ORE_KWH
    const totalKrKwh = totalOreKwh / 100

    // Get week info for current price
    const { data } = await supabaseClient
      .from('electricity_prices_nve')
      .select('week, year')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .single()

    return {
      spotPrice,
      networkCost: NETWORK_COST_ORE_KWH,
      taxes: TAXES_AND_FEES_ORE_KWH,
      totalPrice: totalKrKwh,
      zone,
      week: data?.week || '0-2025',
      year: data?.year || 2025
    }

  } catch (error) {
    console.warn(`Total cost calculation failed for zone ${zone}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get price history for charts (36 weeks by default)
 * @param zone - Norwegian electricity price zone
 * @param weeks - Number of weeks to retrieve (default: 36)
 * @returns Historical price data
 */
export async function getPriceHistory(
  zone: PriceZone,
  weeks: number = 36
): Promise<PriceHistoryData[]> {
  try {
    const cacheKey = `history_${zone}_${weeks}`

    // Check cache first
    if (historyCache.has(cacheKey)) {
      return historyCache.get(cacheKey)!
    }

    const { data, error } = await supabaseClient
      .from('electricity_prices_nve')
      .select('week, year, week_number, spot_price_ore_kwh')
      .eq('zone', zone)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(weeks)

    if (error) {
      throw new Error(`Failed to get price history for zone ${zone}: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(`No price history data found for zone ${zone}`)
    }

    const history: PriceHistoryData[] = data.map(price => ({
      week: price.week,
      year: price.year,
      weekNumber: price.week_number,
      spotPrice: price.spot_price_ore_kwh,
      totalPrice: (price.spot_price_ore_kwh + NETWORK_COST_ORE_KWH + TAXES_AND_FEES_ORE_KWH) / 100,
      zone,
      date: getDateFromWeek(price.year, price.week_number)
    })).reverse() // Reverse to get chronological order

    // Cache the result
    historyCache.set(cacheKey, history)
    setTimeout(() => historyCache.delete(cacheKey), HISTORY_CACHE_DURATION)

    return history

  } catch (error) {
    console.warn(`Price history lookup failed for zone ${zone}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get average price over a time period for investment calculations
 * @param zone - Norwegian electricity price zone
 * @param months - Number of months to average (default: 36)
 * @returns Average total price in kr/kWh
 */
export async function getAveragePriceForInvestment(
  zone: PriceZone,
  months: number = 36
): Promise<number> {
  try {
    const weeks = Math.ceil(months * 4.33) // Convert months to weeks
    const history = await getPriceHistory(zone, weeks)

    if (history.length === 0) {
      throw new Error(`No price history available for investment calculation in zone ${zone}`)
    }

    const avgSpotPrice = history.reduce((sum, p) => sum + p.spotPrice, 0) / history.length
    const avgTotalPrice = (avgSpotPrice + NETWORK_COST_ORE_KWH + TAXES_AND_FEES_ORE_KWH) / 100

    return avgTotalPrice

  } catch (error) {
    console.warn(`Average price calculation failed for zone ${zone}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}


/**
 * Convert year and week number to Date object
 * @param year - Year
 * @param week - Week number
 * @returns Date object for the start of the week
 */
function getDateFromWeek(year: number, week: number): Date {
  const date = new Date(year, 0, 1) // January 1st
  date.setDate(date.getDate() + (week - 1) * 7) // Add weeks
  return date
}

/**
 * Get ISO week number for a date
 * @param date - Date object
 * @returns Week number (1-53)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get zone-specific pricing insights for UI
 * @param zone - Price zone
 * @returns Zone description and current status
 */
export function getZonePricingInsights(zone: PriceZone): {
  description: string
  trend: 'low' | 'medium' | 'high'
  factors: string[]
} {
  const insights: Record<PriceZone, {
    description: string
    trend: 'low' | 'medium' | 'high'
    factors: string[]
  }> = {
    'NO1': {
      description: 'Østlandet - høy befolkningstetthet og industri',
      trend: 'medium',
      factors: ['Oslo-området', 'Høy forbruk', 'God nettkapasitet']
    },
    'NO2': {
      description: 'Sørlandet - balansert tilbud og etterspørsel',
      trend: 'medium',
      factors: ['Stabil region', 'Moderat industri', 'Vannkraft']
    },
    'NO3': {
      description: 'Midt-Norge - rikelig vannkraft',
      trend: 'low',
      factors: ['Vannkraftproduksjon', 'Lavere befolkning', 'Energiintensiv industri']
    },
    'NO4': {
      description: 'Nord-Norge - lavest strømpriser',
      trend: 'low',
      factors: ['Lav befolkningstetthet', 'Vannkraft overskudd', 'Lang avstand']
    },
    'NO5': {
      description: 'Vestlandet - industri og befolkning',
      trend: 'high',
      factors: ['Bergen-området', 'Petroleumsindustri', 'Høy etterspørsel']
    }
  }

  return insights[zone]
}

/**
 * Clear pricing cache (useful for testing)
 */
export function clearPricingCache(): void {
  priceCache.clear()
  historyCache.clear()
}