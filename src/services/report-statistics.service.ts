/**
 * Report Statistics Service
 *
 * Extracts statistical data from Supabase Enova database for PDF report generation
 * Provides verified claims and comparative statistics for Norwegian buildings
 */

import { supabaseClient } from '@/lib/supabase'
import type { EnergyGrade } from '@/types/norwegian-energy'

export interface NationalEnergyStatistics {
  totalBuildings: number
  gradeDistribution: Record<EnergyGrade, { count: number; percentage: number }>
  averageEnergyConsumption: number
  buildingsByCategory: Record<string, number>
  buildingsByConstructionYear: Record<string, number>
}

export interface MunicipalEnergyStatistics {
  kommuneName: string
  kommuneNumber: string
  totalBuildings: number
  averageEnergyConsumption: number
  mostCommonEnergyClass: EnergyGrade | null
  priceZone: string
  ranking?: {
    position: number
    totalMunicipalities: number
    percentile: number
  }
}

export interface RegionalComparison {
  userKommune: MunicipalEnergyStatistics
  neighboringKommuner: MunicipalEnergyStatistics[]
  priceZoneAverage: {
    averageEnergyConsumption: number
    totalBuildings: number
    bestPerformingKommune: string
  }
}

/**
 * Get national energy performance statistics from Enova database
 */
export async function getNationalEnergyStatistics(): Promise<NationalEnergyStatistics> {
  try {
    // Get total building count and grade distribution
    const { data: gradeData, error: gradeError } = await supabaseClient
      .from('energy_certificates')
      .select('energy_class, energy_consumption')
      .not('energy_class', 'is', null)

    if (gradeError) throw gradeError

    const totalBuildings = gradeData.length

    // Calculate grade distribution
    const gradeCounts: Record<string, number> = {}
    const energyConsumptions: number[] = []

    gradeData.forEach(cert => {
      const grade = cert.energy_class?.toUpperCase().trim()
      if (grade && ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(grade)) {
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1
      }

      if (cert.energy_consumption) {
        energyConsumptions.push(cert.energy_consumption)
      }
    })

    const gradeDistribution: Record<EnergyGrade, { count: number; percentage: number }> = {
      A: { count: gradeCounts.A || 0, percentage: ((gradeCounts.A || 0) / totalBuildings) * 100 },
      B: { count: gradeCounts.B || 0, percentage: ((gradeCounts.B || 0) / totalBuildings) * 100 },
      C: { count: gradeCounts.C || 0, percentage: ((gradeCounts.C || 0) / totalBuildings) * 100 },
      D: { count: gradeCounts.D || 0, percentage: ((gradeCounts.D || 0) / totalBuildings) * 100 },
      E: { count: gradeCounts.E || 0, percentage: ((gradeCounts.E || 0) / totalBuildings) * 100 },
      F: { count: gradeCounts.F || 0, percentage: ((gradeCounts.F || 0) / totalBuildings) * 100 },
      G: { count: gradeCounts.G || 0, percentage: ((gradeCounts.G || 0) / totalBuildings) * 100 }
    }

    const averageEnergyConsumption = energyConsumptions.reduce((a, b) => a + b, 0) / energyConsumptions.length

    // Get building category distribution
    const { data: categoryData } = await supabaseClient
      .from('energy_certificates')
      .select('building_category')
      .not('building_category', 'is', null)

    const buildingsByCategory: Record<string, number> = {}
    categoryData?.forEach(cert => {
      const category = cert.building_category
      if (category) {
        buildingsByCategory[category] = (buildingsByCategory[category] || 0) + 1
      }
    })

    // Get construction year distribution
    const { data: yearData } = await supabaseClient
      .from('energy_certificates')
      .select('construction_year')
      .not('construction_year', 'is', null)

    const buildingsByConstructionYear: Record<string, number> = {}
    yearData?.forEach(cert => {
      const year = cert.construction_year
      if (year) {
        const decade = `${Math.floor(year / 10) * 10}s`
        buildingsByConstructionYear[decade] = (buildingsByConstructionYear[decade] || 0) + 1
      }
    })

    return {
      totalBuildings,
      gradeDistribution,
      averageEnergyConsumption,
      buildingsByCategory,
      buildingsByConstructionYear
    }

  } catch (error) {
    console.error('Failed to get national energy statistics:', error)
    throw error
  }
}

/**
 * Get municipal energy statistics for a specific kommune
 */
export async function getMunicipalEnergyStatistics(
  kommuneNumber: string
): Promise<MunicipalEnergyStatistics | null> {
  try {
    // Get kommune info and price zone
    const { data: kommuneInfo } = await supabaseClient
      .from('municipality_price_zones')
      .select('kommune_name, price_zone')
      .eq('kommune_number', kommuneNumber)
      .single()

    if (!kommuneInfo) return null

    // Get energy statistics for this kommune
    const { data: certificates } = await supabaseClient
      .from('energy_certificates')
      .select('energy_class, energy_consumption')
      .eq('knr', parseInt(kommuneNumber))
      .not('energy_class', 'is', null)

    if (!certificates || certificates.length === 0) return null

    const totalBuildings = certificates.length

    // Calculate average energy consumption
    const validConsumptions = certificates
      .filter(cert => cert.energy_consumption)
      .map(cert => cert.energy_consumption as number)

    const averageEnergyConsumption = validConsumptions.length > 0
      ? validConsumptions.reduce((a, b) => a + b, 0) / validConsumptions.length
      : 0

    // Find most common energy class
    const classCounts: Record<string, number> = {}
    certificates.forEach(cert => {
      const grade = cert.energy_class?.toUpperCase().trim()
      if (grade) {
        classCounts[grade] = (classCounts[grade] || 0) + 1
      }
    })

    const mostCommonEnergyClass = Object.entries(classCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as EnergyGrade | null

    return {
      kommuneName: kommuneInfo.kommune_name,
      kommuneNumber,
      totalBuildings,
      averageEnergyConsumption,
      mostCommonEnergyClass,
      priceZone: kommuneInfo.price_zone
    }

  } catch (error) {
    console.error(`Failed to get municipal statistics for kommune ${kommuneNumber}:`, error)
    return null
  }
}

/**
 * Get regional comparison data for report
 */
export async function getRegionalComparison(
  kommuneNumber: string
): Promise<RegionalComparison | null> {
  try {
    const userKommune = await getMunicipalEnergyStatistics(kommuneNumber)
    if (!userKommune) return null

    // Get neighboring kommuner in same price zone
    const { data: sameZoneKommuner } = await supabaseClient
      .from('municipality_price_zones')
      .select('kommune_number, kommune_name')
      .eq('price_zone', userKommune.priceZone)
      .neq('kommune_number', kommuneNumber)
      .limit(5)

    const neighboringKommuner: MunicipalEnergyStatistics[] = []

    if (sameZoneKommuner) {
      for (const kommune of sameZoneKommuner) {
        const stats = await getMunicipalEnergyStatistics(kommune.kommune_number)
        if (stats) {
          neighboringKommuner.push(stats)
        }
      }
    }

    // Calculate price zone average
    const allZoneKommuner = [userKommune, ...neighboringKommuner]
    const priceZoneAverage = {
      averageEnergyConsumption: allZoneKommuner.reduce((sum, k) => sum + k.averageEnergyConsumption, 0) / allZoneKommuner.length,
      totalBuildings: allZoneKommuner.reduce((sum, k) => sum + k.totalBuildings, 0),
      bestPerformingKommune: allZoneKommuner
        .sort((a, b) => a.averageEnergyConsumption - b.averageEnergyConsumption)[0]?.kommuneName || ''
    }

    return {
      userKommune,
      neighboringKommuner,
      priceZoneAverage
    }

  } catch (error) {
    console.error(`Failed to get regional comparison for kommune ${kommuneNumber}:`, error)
    return null
  }
}

/**
 * Generate verified claims for PDF report based on user data
 */
export async function generateReportClaims(
  userAddress: string,
  userKommuneNumber?: string
): Promise<{
  nationalClaims: string[]
  regionalClaims: string[]
  opportunityClaims: string[]
}> {
  try {
    const nationalStats = await getNationalEnergyStatistics()

    const nationalClaims = [
      `Kun ${nationalStats.gradeDistribution.A.percentage.toFixed(1)}% av norske bygninger oppnår energikarakter A`,
      `${(nationalStats.gradeDistribution.F.percentage + nationalStats.gradeDistribution.G.percentage).toFixed(1)}% av bygninger har karakter F eller G`,
      `Gjennomsnittlig energiforbruk i Norge er ${Math.round(nationalStats.averageEnergyConsumption)} kWh/m²/år`,
      `Totalt ${nationalStats.totalBuildings.toLocaleString()} bygninger er energimerket i Norge`
    ]

    let regionalClaims: string[] = []
    let opportunityClaims: string[] = []

    if (userKommuneNumber) {
      const regionalData = await getRegionalComparison(userKommuneNumber)

      if (regionalData) {
        regionalClaims = [
          `${regionalData.userKommune.kommuneName} har ${regionalData.userKommune.totalBuildings} energimerkede bygninger`,
          `Gjennomsnittlig forbruk i din kommune: ${Math.round(regionalData.userKommune.averageEnergyConsumption)} kWh/m²/år`,
          `Du befinner deg i strømområde ${regionalData.userKommune.priceZone}`,
          `Beste kommune i ditt strømområde: ${regionalData.priceZoneAverage.bestPerformingKommune}`
        ]

        const userConsumption = regionalData.userKommune.averageEnergyConsumption
        const nationalAverage = nationalStats.averageEnergyConsumption

        if (userConsumption > nationalAverage) {
          opportunityClaims.push(`Din kommune ligger ${Math.round(((userConsumption - nationalAverage) / nationalAverage) * 100)}% over landsgjennomsnittet`)
        } else {
          opportunityClaims.push(`Din kommune ligger ${Math.round(((nationalAverage - userConsumption) / nationalAverage) * 100)}% under landsgjennomsnittet`)
        }
      }
    }

    return {
      nationalClaims,
      regionalClaims,
      opportunityClaims
    }

  } catch (error) {
    console.error('Failed to generate report claims:', error)
    return {
      nationalClaims: [],
      regionalClaims: [],
      opportunityClaims: []
    }
  }
}