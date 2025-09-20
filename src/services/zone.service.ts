import { supabaseClient } from '@/lib/supabase'
import type { MunicipalityPriceZone } from '@/lib/supabase'

// Cache for municipality-to-zone mapping
const zoneCache = new Map<string, string>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
let lastCacheUpdate = 0

export type PriceZone = 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5'

/**
 * Get electricity price zone for a Norwegian municipality
 * @param kommunenummer - Norwegian municipality number (e.g., "0301" for Oslo)
 * @returns Price zone (NO1-NO5) with NO1 as fallback
 */
export async function getPriceZoneByKommune(kommunenummer: string): Promise<PriceZone> {
  try {
    // Normalize municipality number (remove leading zeros if any, then pad to ensure consistency)
    const normalizedKommune = kommunenummer.replace(/^0+/, '').padStart(3, '0')

    // Check cache first
    if (zoneCache.has(normalizedKommune) && Date.now() - lastCacheUpdate < CACHE_DURATION) {
      return zoneCache.get(normalizedKommune) as PriceZone
    }

    // Use Supabase function for zone lookup
    const { data, error } = await supabaseClient.rpc('get_price_zone', {
      p_kommune_number: normalizedKommune
    })

    if (error) {
      console.warn(`Zone lookup failed for municipality ${normalizedKommune}:`, error.message)
      throw new Error(`Unable to determine price zone for municipality ${normalizedKommune}: ${error.message}`)
    }

    if (!data) {
      throw new Error(`No price zone data found for municipality ${normalizedKommune}`)
    }

    const zone = data as PriceZone

    // Cache the result
    zoneCache.set(normalizedKommune, zone)
    lastCacheUpdate = Date.now()

    return zone

  } catch (error) {
    console.warn(`Zone lookup failed for municipality ${kommunenummer}:`, error)
    throw error // Re-throw to let caller handle the error appropriately
  }
}

/**
 * Get zone information with municipality details
 * @param kommunenummer - Norwegian municipality number
 * @returns Zone info with municipality name and fylke
 */
export async function getZoneInfo(kommunenummer: string): Promise<{
  zone: PriceZone
  municipalityName: string | null
  fylkeName: string | null
}> {
  try {
    const normalizedKommune = kommunenummer.replace(/^0+/, '').padStart(3, '0')

    const { data, error } = await supabaseClient
      .from('municipality_price_zones')
      .select('price_zone, kommune_name, fylke_name')
      .eq('kommune_number', normalizedKommune)
      .single()

    if (error) {
      throw new Error(`Failed to get zone info for municipality ${normalizedKommune}: ${error.message}`)
    }

    if (!data) {
      throw new Error(`No zone information found for municipality ${normalizedKommune}`)
    }

    return {
      zone: data.price_zone as PriceZone,
      municipalityName: data.kommune_name,
      fylkeName: data.fylke_name
    }

  } catch (error) {
    console.warn(`Zone info lookup failed for municipality ${kommunenummer}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get all municipalities in a specific price zone
 * @param zone - Price zone (NO1-NO5)
 * @returns List of municipalities in the zone
 */
export async function getMunicipalitiesInZone(zone: PriceZone): Promise<MunicipalityPriceZone[]> {
  try {
    const { data, error } = await supabaseClient
      .from('municipality_price_zones')
      .select('*')
      .eq('price_zone', zone)
      .order('kommune_name')

    if (error) {
      throw new Error(`Failed to get municipalities for zone ${zone}: ${error.message}`)
    }

    return data || []

  } catch (error) {
    console.error(`Error fetching municipalities for zone ${zone}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get zone statistics (municipality count per zone)
 * @returns Zone distribution statistics
 */
export async function getZoneStatistics(): Promise<{
  zone: string
  municipalityCount: number
}[]> {
  try {
    // Use RPC function for zone statistics
    const { data, error } = await supabaseClient.rpc('get_zone_municipality_count')

    if (error) {
      throw new Error(`Failed to get zone statistics: ${error.message}`)
    }

    // Transform snake_case to camelCase to match interface
    return (data || []).map(item => ({
      zone: item.zone,
      municipalityCount: item.municipality_count
    }))

  } catch (error) {
    console.error('Error fetching zone statistics:', error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Get zone display name for UI
 * @param zone - Price zone code
 * @returns Human-readable zone name
 */
export function getZoneDisplayName(zone: PriceZone): string {
  const zoneNames: Record<PriceZone, string> = {
    'NO1': 'Østlandet (Eastern Norway)',
    'NO2': 'Sørlandet (Southern Norway)',
    'NO3': 'Midt-Norge (Central Norway)',
    'NO4': 'Nord-Norge (Northern Norway)',
    'NO5': 'Vestlandet (Western Norway)'
  }

  return zoneNames[zone] || zone
}

/**
 * Validate if a zone code is valid
 * @param zone - Zone code to validate
 * @returns True if valid Norwegian price zone
 */
export function isValidPriceZone(zone: string): zone is PriceZone {
  return ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'].includes(zone)
}

/**
 * Clear the zone cache (useful for testing or manual refresh)
 */
export function clearZoneCache(): void {
  zoneCache.clear()
  lastCacheUpdate = 0
}