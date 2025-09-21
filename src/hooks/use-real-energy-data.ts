import { useState, useEffect } from 'react'
import { getEnovaGrade, type EnovaLookupResult } from '@/services/enova.service'
import { getTotalElectricityCost, getPriceHistory, get36MonthAverageByZone, getPriceZoneByKommune, type PriceData, type PriceHistoryData } from '@/services/pricing.service'
import { getZoneDisplayName, type PriceZone } from '@/services/zone.service'
import { VERIFIED_NORWEGIAN_ENERGY_DATA } from '@/lib/data/verified-sources'

export interface RealEnergyData {
  // Zone information
  priceZone: PriceZone | null
  zoneDisplayName: string | null

  // Enova certificate data
  enovaResult: EnovaLookupResult | null

  // Pricing information
  currentPricing: PriceData | null
  priceHistory: PriceHistoryData[]
  average36MonthPrice: number | null

  // Loading states
  isLoadingEnova: boolean
  isLoadingPricing: boolean
  isLoadingHistory: boolean

  // Error states
  enovaError: string | null
  pricingError: string | null
}

/**
 * Hook to fetch real energy data for dashboard
 * @param address - Property address
 * @param priceZone - Electricity price zone from address search
 * @param gnr - Gårdsnummer for Enova lookup
 * @param bnr - Bruksnummer for Enova lookup
 * @param municipalityNumber - Municipality number for price zone lookup
 * @param bygningsnummer - Building number for specific Enova certificate lookup
 * @param directCertificateData - Certificate data passed directly from building selector
 * @returns Real energy data and loading states
 */
export function useRealEnergyData(
  address?: string | null,
  priceZone?: PriceZone | null,
  gnr?: string | null,
  bnr?: string | null,
  municipalityNumber?: string | null,
  bygningsnummer?: string | null,
  directCertificateData?: {
    energyClass?: string | null,
    energyConsumption?: number | null,
    buildingCategory?: string | null,
    constructionYear?: number | null
  } | null
): RealEnergyData {
  const [resolvedPriceZone, setResolvedPriceZone] = useState<PriceZone | null>(priceZone || null)
  const [enovaResult, setEnovaResult] = useState<EnovaLookupResult | null>(null)
  const [currentPricing, setCurrentPricing] = useState<PriceData | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([])
  const [average36MonthPrice, setAverage36MonthPrice] = useState<number | null>(null)

  const [isLoadingEnova, setIsLoadingEnova] = useState(false)
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [enovaError, setEnovaError] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Resolve price zone from municipality number if not provided
  useEffect(() => {
    if (priceZone) {
      setResolvedPriceZone(priceZone)
      return
    }

    if (!municipalityNumber) {
      setResolvedPriceZone(null)
      return
    }

    getPriceZoneByKommune(municipalityNumber)
      .then(zone => {
        setResolvedPriceZone(zone)
      })
      .catch(error => {
        console.warn('Failed to resolve price zone from municipality:', error)
        setResolvedPriceZone('NO1') // Default fallback
      })
  }, [priceZone, municipalityNumber])

  // Fetch Enova certificate data or use direct data
  useEffect(() => {
    // If we have direct certificate data, use it instead of API call
    if (directCertificateData && directCertificateData.energyClass) {
      setIsLoadingEnova(true)

      // Map energy class to EnergyGrade format
      const mapEnergyClass = (energyClass: string): any => {
        const normalized = energyClass.toUpperCase().trim()
        if (normalized.includes('A')) return 'A'
        if (normalized.includes('B')) return 'B'
        if (normalized.includes('C')) return 'C'
        if (normalized.includes('D')) return 'D'
        if (normalized.includes('E')) return 'E'
        if (normalized.includes('F')) return 'F'
        if (normalized.includes('G')) return 'G'
        return undefined
      }

      const result = {
        found: true,
        energyGrade: mapEnergyClass(directCertificateData.energyClass),
        energyConsumption: directCertificateData.energyConsumption || undefined,
        status: 'Registrert' as const,
        source: 'enova_database' as const
      }

      setEnovaResult(result)
      setEnovaError(null)
      setIsLoadingEnova(false)
      return
    }

    // Fallback to API lookup if no direct data
    if (!address) {
      setEnovaResult(null)
      return
    }

    setIsLoadingEnova(true)
    setEnovaError(null)

    getEnovaGrade(municipalityNumber || '', gnr || '', bnr || '', bygningsnummer || undefined, address || undefined)
      .then(result => {
        setEnovaResult(result)
        setEnovaError(null)
      })
      .catch(error => {
        console.warn('Failed to fetch Enova data:', error)
        setEnovaError(`Enova-data utilgjengelig: ${error.message}`)
        setEnovaResult(null)
      })
      .finally(() => {
        setIsLoadingEnova(false)
      })
  }, [address, gnr, bnr, bygningsnummer, directCertificateData])

  // Fetch current pricing data and 36-month average
  useEffect(() => {
    if (!resolvedPriceZone) {
      setCurrentPricing(null)
      setAverage36MonthPrice(null)
      return
    }

    setIsLoadingPricing(true)
    setPricingError(null)

    // Fetch both current pricing and 36-month average
    Promise.all([
      getTotalElectricityCost(resolvedPriceZone),
      get36MonthAverageByZone(resolvedPriceZone)
    ])
      .then(([pricing, average36m]) => {
        setCurrentPricing(pricing)
        setAverage36MonthPrice(average36m)
        setPricingError(null)
      })
      .catch(error => {
        console.warn('Failed to fetch pricing data:', error)
        setPricingError(`Prisdata utilgjengelig: ${error.message}`)
        setCurrentPricing(null)
        setAverage36MonthPrice(null)
      })
      .finally(() => {
        setIsLoadingPricing(false)
      })
  }, [resolvedPriceZone])

  // Fetch price history for charts
  useEffect(() => {
    if (!resolvedPriceZone) {
      setPriceHistory([])
      return
    }

    setIsLoadingHistory(true)

    getPriceHistory(resolvedPriceZone, 36) // 36 weeks of history
      .then(history => {
        console.log('✅ Real NVE price history loaded:', history.length, 'weeks')
        console.log('Sample prices:', history.slice(0, 3).map(h => `${h.week}: ${h.spotPrice} øre/kWh`))
        setPriceHistory(history)
      })
      .catch(error => {
        console.error('❌ Failed to fetch price history from NVE:', error)
        console.log('Using empty price history - chart should show "no data"')
        setPriceHistory([]) // Empty array indicates no data available
      })
      .finally(() => {
        setIsLoadingHistory(false)
      })
  }, [resolvedPriceZone])

  return {
    priceZone: resolvedPriceZone,
    zoneDisplayName: resolvedPriceZone ? getZoneDisplayName(resolvedPriceZone) : null,
    enovaResult,
    currentPricing,
    priceHistory,
    average36MonthPrice,
    isLoadingEnova,
    isLoadingPricing,
    isLoadingHistory,
    enovaError,
    pricingError
  }
}

/**
 * Hook for simplified dashboard data that combines real and calculated values
 * @param address - Property address
 * @param priceZone - Electricity price zone
 * @param gnr - Gårdsnummer
 * @param bnr - Bruksnummer
 * @param calculatedEnergyData - Calculated energy data from building inputs
 * @param municipalityNumber - Municipality number for price zone lookup
 * @param bygningsnummer - Building number for specific Enova certificate lookup
 * @param directCertificateData - Certificate data passed directly from building selector
 * @returns Combined real and calculated data for dashboard display
 */
export function useDashboardEnergyData(
  address?: string | null,
  priceZone?: PriceZone | null,
  gnr?: string | null,
  bnr?: string | null,
  calculatedEnergyData?: any, // From existing energy calculations
  municipalityNumber?: string | null,
  bygningsnummer?: string | null,
  directCertificateData?: {
    energyClass?: string | null,
    energyConsumption?: number | null,
    buildingCategory?: string | null,
    constructionYear?: number | null
  } | null
) {
  const realData = useRealEnergyData(address, priceZone, gnr, bnr, municipalityNumber, bygningsnummer, directCertificateData)

  // Only show real Enova data - no fallback to calculated data
  const energyGrade = realData.enovaResult?.found
    ? realData.enovaResult.energyGrade
    : undefined // No fallback - only show real certificates

  const energyConsumption = realData.enovaResult?.found
    ? realData.enovaResult.energyConsumption
    : undefined // No fallback - only show real certificates

  const enovaStatus = realData.enovaResult?.found
    ? 'Registrert'
    : realData.enovaError
    ? 'Data utilgjengelig'
    : 'Ikke registrert'

  const currentSpotPrice = realData.currentPricing?.spotPrice || null
  const totalElectricityPrice = realData.currentPricing?.totalPrice || null
  const average36MonthPrice = realData.average36MonthPrice || null

  return {
    // Combined energy data
    energyGrade,
    energyConsumption,
    enovaStatus,
    isEnovaRegistered: realData.enovaResult?.found || false,

    // Pricing data
    priceZone: realData.priceZone,
    zoneDisplayName: realData.zoneDisplayName,
    currentSpotPrice,
    totalElectricityPrice,
    average36MonthPrice,
    priceHistory: realData.priceHistory,

    // Loading states
    isLoadingEnova: realData.isLoadingEnova,
    isLoadingPricing: realData.isLoadingPricing,
    isLoadingHistory: realData.isLoadingHistory,

    // Error states
    hasErrors: !!(realData.enovaError || realData.pricingError),
    errors: [realData.enovaError, realData.pricingError].filter(Boolean),

    // Raw data for advanced use
    rawEnovaResult: realData.enovaResult,
    rawPricingData: realData.currentPricing
  }
}

/**
 * Get verified energy benchmarks for building type comparison
 * @param buildingType - Type of building for benchmark lookup
 * @returns Verified benchmark data with credibility information
 */
export function getVerifiedEnergyBenchmarks(buildingType?: string) {
  const benchmarks = VERIFIED_NORWEGIAN_ENERGY_DATA.energyBenchmarks
  const caseStudy = VERIFIED_NORWEGIAN_ENERGY_DATA.caseStudies.ringebuUngdomsskole

  // Map common building types to our verified benchmarks
  const typeMappings = {
    'residential': benchmarks.buildingTypes.residentialHouse,
    'apartment': benchmarks.buildingTypes.residentialApartment,
    'office': benchmarks.buildingTypes.office,
    'retail': benchmarks.buildingTypes.retail,
    'school': benchmarks.buildingTypes.school,
    'hospital': benchmarks.buildingTypes.hospital,
    'hotel': benchmarks.buildingTypes.hotel,
    'warehouse': benchmarks.buildingTypes.warehouse,
    'restaurant': benchmarks.buildingTypes.restaurant
  }

  const currentBenchmark = buildingType
    ? typeMappings[buildingType.toLowerCase() as keyof typeof typeMappings]
    : undefined

  return {
    // Current building type benchmark
    currentBuildingBenchmark: currentBenchmark,

    // All building type benchmarks
    allBenchmarks: benchmarks.buildingTypes,

    // TEK17 legal requirements
    tek17Requirements: benchmarks.tek17Requirements,

    // Case study for credibility
    verifiedCaseStudy: {
      name: caseStudy.name,
      energyReduction: caseStudy.energyMetrics.energyReduction,
      roi: caseStudy.financialMetrics.internalRateOfReturn,
      payback: caseStudy.financialMetrics.paybackPeriod,
      municipality: caseStudy.municipality
    },

    // Investment formulas
    investmentCalculation: VERIFIED_NORWEGIAN_ENERGY_DATA.investmentFormulas,

    // Credibility statements for reports
    credibilityStatements: VERIFIED_NORWEGIAN_ENERGY_DATA.credibilityStatements
  }
}