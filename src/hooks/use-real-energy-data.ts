import { useState, useEffect } from 'react'
import { getEnovaGrade, type EnovaLookupResult } from '@/services/enova.service'
import { getTotalElectricityCost, getPriceHistory, type PriceData, type PriceHistoryData } from '@/services/pricing.service'
import { getZoneDisplayName, type PriceZone } from '@/services/zone.service'

export interface RealEnergyData {
  // Zone information
  priceZone: PriceZone | null
  zoneDisplayName: string | null

  // Enova certificate data
  enovaResult: EnovaLookupResult | null

  // Pricing information
  currentPricing: PriceData | null
  priceHistory: PriceHistoryData[]

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
 * @returns Real energy data and loading states
 */
export function useRealEnergyData(
  address?: string | null,
  priceZone?: PriceZone | null,
  gnr?: string | null,
  bnr?: string | null
): RealEnergyData {
  const [enovaResult, setEnovaResult] = useState<EnovaLookupResult | null>(null)
  const [currentPricing, setCurrentPricing] = useState<PriceData | null>(null)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([])

  const [isLoadingEnova, setIsLoadingEnova] = useState(false)
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [enovaError, setEnovaError] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Fetch Enova certificate data
  useEffect(() => {
    if (!address) {
      setEnovaResult(null)
      return
    }

    setIsLoadingEnova(true)
    setEnovaError(null)

    getEnovaGrade(address, gnr || undefined, bnr || undefined)
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
  }, [address, gnr, bnr])

  // Fetch current pricing data
  useEffect(() => {
    if (!priceZone) {
      setCurrentPricing(null)
      return
    }

    setIsLoadingPricing(true)
    setPricingError(null)

    getTotalElectricityCost(priceZone)
      .then(pricing => {
        setCurrentPricing(pricing)
        setPricingError(null)
      })
      .catch(error => {
        console.warn('Failed to fetch pricing data:', error)
        setPricingError(`Prisdata utilgjengelig: ${error.message}`)
        setCurrentPricing(null)
      })
      .finally(() => {
        setIsLoadingPricing(false)
      })
  }, [priceZone])

  // Fetch price history for charts
  useEffect(() => {
    if (!priceZone) {
      setPriceHistory([])
      return
    }

    setIsLoadingHistory(true)

    getPriceHistory(priceZone, 36) // 36 weeks of history
      .then(history => {
        setPriceHistory(history)
      })
      .catch(error => {
        console.warn('Failed to fetch price history:', error)
        setPriceHistory([]) // Empty array indicates no data available
      })
      .finally(() => {
        setIsLoadingHistory(false)
      })
  }, [priceZone])

  return {
    priceZone,
    zoneDisplayName: priceZone ? getZoneDisplayName(priceZone) : null,
    enovaResult,
    currentPricing,
    priceHistory,
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
 * @returns Combined real and calculated data for dashboard display
 */
export function useDashboardEnergyData(
  address?: string | null,
  priceZone?: PriceZone | null,
  gnr?: string | null,
  bnr?: string | null,
  calculatedEnergyData?: any // From existing energy calculations
) {
  const realData = useRealEnergyData(address, priceZone, gnr, bnr)

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