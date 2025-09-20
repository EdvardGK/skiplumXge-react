import { supabaseClient } from '@/lib/supabase'
import type { EnergyCertificate } from '@/lib/supabase'
import type { EnergyGrade } from '@/types/norwegian-energy'

// Cache for Enova certificate lookups
const certificateCache = new Map<string, EnergyCertificate | null>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface EnovaLookupResult {
  found: boolean
  certificate?: EnergyCertificate
  energyGrade?: EnergyGrade
  energyConsumption?: number
  status: 'Registrert' | 'Ikke registrert' | 'Utløpt'
  source: 'enova_database' | 'calculated' | 'not_found'
}

/**
 * Search for Enova energy certificate by property identifiers
 * @param address - Property address for fallback search
 * @param gnr - Gårdsnummer (farm number)
 * @param bnr - Bruksnummer (use number)
 * @returns Certificate information or null if not found
 */
export async function getEnovaGrade(
  address: string,
  gnr?: string,
  bnr?: string
): Promise<EnovaLookupResult> {
  try {
    // Require both gnr and bnr for lookup - no fallbacks
    if (!gnr || !bnr) {
      return {
        found: false,
        status: 'Ikke registrert',
        source: 'not_found'
      }
    }

    const cacheKey = `${gnr}_${bnr}`

    // Check cache first
    if (certificateCache.has(cacheKey)) {
      const cached = certificateCache.get(cacheKey)
      if (cached) {
        return {
          found: true,
          certificate: cached,
          energyGrade: mapEnergyClass(cached.energy_class),
          energyConsumption: cached.energy_consumption || undefined,
          status: 'Registrert',
          source: 'enova_database'
        }
      } else {
        return {
          found: false,
          status: 'Ikke registrert',
          source: 'not_found'
        }
      }
    }

    // Strict gnr/bnr lookup only
    const { data, error } = await supabaseClient
      .from('energy_certificates')
      .select('*')
      .eq('gnr', parseInt(gnr))
      .eq('bnr', parseInt(bnr))
      .single()

    // Cache the result (even if null)
    certificateCache.set(cacheKey, data)

    if (data && !error) {
      return {
        found: true,
        certificate: data,
        energyGrade: mapEnergyClass(data.energy_class),
        energyConsumption: data.energy_consumption || undefined,
        status: 'Registrert',
        source: 'enova_database'
      }
    } else {
      return {
        found: false,
        status: 'Ikke registrert',
        source: 'not_found'
      }
    }

  } catch (error) {
    console.warn(`Enova lookup failed for gnr=${gnr}, bnr=${bnr}:`, error)
    return {
      found: false,
      status: 'Ikke registrert',
      source: 'not_found'
    }
  }
}

/**
 * Get energy statistics for a postal code area
 * @param postalCode - Norwegian postal code
 * @returns Aggregated energy statistics for the area
 */
export async function getPostalEnergyStats(postalCode: string): Promise<{
  totalBuildings: number
  averageEnergyConsumption: number | null
  mostCommonEnergyClass: string | null
  constructionYearRange: string | null
}> {
  try {
    // Use RPC function for postal statistics
    const { data, error } = await supabaseClient.rpc('get_postal_statistics', {
      postal: postalCode
    })

    if (error) {
      throw new Error(`Failed to get postal energy statistics for ${postalCode}: ${error.message}`)
    }

    if (!data) {
      throw new Error(`No energy statistics found for postal code ${postalCode}`)
    }

    return data

  } catch (error) {
    console.warn(`Postal statistics lookup failed for ${postalCode}:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Search for similar buildings in the same area
 * @param address - Property address
 * @param buildingCategory - Building type to filter by
 * @returns List of similar buildings with energy data
 */
export async function getSimilarBuildings(
  address: string,
  buildingCategory?: string
): Promise<EnergyCertificate[]> {
  try {
    // Extract postal code from address
    const postalCodeMatch = address.match(/\b(\d{4})\b/)
    const postalCode = postalCodeMatch?.[0]

    if (!postalCode) {
      throw new Error('Postal code is required for building search')
    }

    let query = supabaseClient
      .from('energy_certificates')
      .select('*')
      .eq('postal_code', postalCode)
      .not('energy_consumption', 'is', null)
      .order('energy_consumption')
      .limit(10)

    if (buildingCategory) {
      query = query.eq('building_category', buildingCategory)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Similar buildings lookup failed: ${error.message}`)
    }

    return data || []

  } catch (error) {
    console.warn(`Similar buildings search failed:`, error)
    throw error // Re-throw to let caller handle appropriately
  }
}

/**
 * Map Enova energy class to our standard EnergyGrade
 * @param energyClass - Raw energy class from Enova database
 * @returns Standardized energy grade
 */
function mapEnergyClass(energyClass: string | null): EnergyGrade | undefined {
  if (!energyClass) return undefined

  const normalized = energyClass.toUpperCase().trim()

  // Handle different Enova class formats
  if (normalized.includes('A')) return 'A'
  if (normalized.includes('B')) return 'B'
  if (normalized.includes('C')) return 'C'
  if (normalized.includes('D')) return 'D'
  if (normalized.includes('E')) return 'E'
  if (normalized.includes('F')) return 'F'
  if (normalized.includes('G')) return 'G'

  return undefined
}

/**
 * Get energy grade color for UI display
 * @param grade - Energy grade
 * @returns CSS color class
 */
export function getEnergyGradeColor(grade: EnergyGrade): string {
  const colorMap: Record<EnergyGrade, string> = {
    'A': '#22c55e', // green-500
    'B': '#84cc16', // lime-500
    'C': '#eab308', // yellow-500
    'D': '#f97316', // orange-500
    'E': '#ef4444', // red-500
    'F': '#dc2626', // red-600
    'G': '#991b1b'  // red-800
  }

  return colorMap[grade] || '#6b7280' // gray-500 fallback
}

/**
 * Clear certificate cache (useful for testing)
 */
export function clearEnovaCache(): void {
  certificateCache.clear()
}

/**
 * Get energy grade description in Norwegian
 * @param grade - Energy grade
 * @returns Norwegian description
 */
export function getEnergyGradeDescription(grade: EnergyGrade): string {
  const descriptions: Record<EnergyGrade, string> = {
    'A': 'Svært lav energibruk',
    'B': 'Lav energibruk',
    'C': 'Middels energibruk',
    'D': 'Høy energibruk',
    'E': 'Svært høy energibruk',
    'F': 'Ekstremt høy energibruk',
    'G': 'Kritisk høy energibruk'
  }

  return descriptions[grade] || 'Ukjent energibruk'
}