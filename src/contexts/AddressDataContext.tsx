'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ============= Types =============

export interface MapBuilding {
  id: string
  type: string
  coordinates: [number, number][]
  area?: number
  levels?: number
  name?: string
  address?: string
  bygningsnummer?: string
  addressLabel?: string
  matchesSearchedAddress?: boolean
  calculatedLabel?: string
}

export interface EnovaCertificate {
  bygningsnummer: string
  kommunenummer?: string
  gnr?: string
  bnr?: string
  address?: string
  city?: string
  energyClass?: string
  buildingCategory?: string
  energyConsumption?: number
  constructionYear?: number
  organization_number?: string | null
}

export interface CadastralData {
  gnr: string
  bnr: string
  knr: string
  address: string
}

export interface AddressSessionData {
  buildings: MapBuilding[]
  certificates: EnovaCertificate[]
  cadastralData: CadastralData
  timestamp: number
}

// ============= Context =============

interface AddressDataContextType {
  getAddressData: (addressKey: string) => AddressSessionData | null
  setAddressData: (addressKey: string, data: Omit<AddressSessionData, 'timestamp'>) => void
  clearAddressData: (addressKey?: string) => void
  hasAddressData: (addressKey: string) => boolean
}

const AddressDataContext = createContext<AddressDataContextType | undefined>(undefined)

// ============= Provider =============

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const STORAGE_KEY = 'address_data_cache'

export function AddressDataProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Record<string, AddressSessionData>>({})
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)

        // Filter out expired entries
        const now = Date.now()
        const validEntries = Object.entries(parsed).reduce((acc, [key, value]) => {
          const data = value as AddressSessionData
          if (now - data.timestamp < CACHE_TTL) {
            acc[key] = data
          }
          return acc
        }, {} as Record<string, AddressSessionData>)

        setCache(validEntries)
      }
    } catch (error) {
      console.error('Failed to hydrate address cache:', error)
    }

    setIsHydrated(true)
  }, [])

  // Persist to localStorage whenever cache changes
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('Failed to persist address cache:', error)
    }
  }, [cache, isHydrated])

  const getAddressData = (addressKey: string): AddressSessionData | null => {
    const data = cache[addressKey]
    if (!data) return null

    // Check if expired
    const now = Date.now()
    if (now - data.timestamp > CACHE_TTL) {
      // Remove expired entry
      setCache(prev => {
        const next = { ...prev }
        delete next[addressKey]
        return next
      })
      return null
    }

    return data
  }

  const setAddressData = (
    addressKey: string,
    data: Omit<AddressSessionData, 'timestamp'>
  ) => {
    setCache(prev => ({
      ...prev,
      [addressKey]: {
        ...data,
        timestamp: Date.now()
      }
    }))
  }

  const clearAddressData = (addressKey?: string) => {
    if (addressKey) {
      setCache(prev => {
        const next = { ...prev }
        delete next[addressKey]
        return next
      })
    } else {
      setCache({})
    }
  }

  const hasAddressData = (addressKey: string): boolean => {
    const data = cache[addressKey]
    if (!data) return false

    const now = Date.now()
    return now - data.timestamp < CACHE_TTL
  }

  return (
    <AddressDataContext.Provider
      value={{
        getAddressData,
        setAddressData,
        clearAddressData,
        hasAddressData
      }}
    >
      {children}
    </AddressDataContext.Provider>
  )
}

// ============= Hook =============

export function useAddressData() {
  const context = useContext(AddressDataContext)
  if (context === undefined) {
    throw new Error('useAddressData must be used within AddressDataProvider')
  }
  return context
}

// ============= Utilities =============

/**
 * Generate consistent cache key from address parameters
 */
export function createAddressKey(params: {
  address?: string | null
  gnr?: string | null
  bnr?: string | null
  knr?: string | null
}): string {
  const { address, gnr, bnr, knr } = params

  // Prefer cadastral identifiers for uniqueness
  if (gnr && bnr && knr) {
    return `${knr}-${gnr}-${bnr}`
  }

  // Fallback to address
  if (address) {
    return address.toLowerCase().replace(/\s+/g, '-')
  }

  // Last resort - return empty string (will bypass cache)
  return ''
}
