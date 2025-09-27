/**
 * Cache Configuration
 * Defines TTL, strategies, and behavior for different cache categories
 */

import { CacheConfig } from './cache-types';

// Time constants in milliseconds
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Cache configuration for different data categories
 * Static data has longer TTL, dynamic data has shorter TTL
 */
export const CACHE_CONFIGURATION: Record<string, CacheConfig> = {
  // ============= Static Configuration (rarely changes) =============

  tek17Requirements: {
    ttl: 30 * DAY, // TEK17 requirements change very rarely
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: true
  },

  municipalities: {
    ttl: 30 * DAY, // Municipality data is very stable
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: false
  },

  heatSources: {
    ttl: 7 * DAY, // Heat source options change occasionally
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: true
  },

  formulas: {
    ttl: 7 * DAY, // Calculation formulas are stable
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: true
  },

  // ============= Semi-Dynamic Configuration =============

  calculations: {
    ttl: 1 * DAY, // Values like electricity prices may change daily
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: true
  },

  content: {
    ttl: 6 * HOUR, // UI text might be updated during the day
    staleWhileRevalidate: true,
    version: '1.0.0',
    fallbackToHardcoded: false
  },

  featureFlags: {
    ttl: 5 * MINUTE, // Feature flags need quick propagation
    staleWhileRevalidate: false, // Don't use stale feature flags
    version: '1.0.0',
    fallbackToHardcoded: false
  },

  // ============= Dynamic Data (not in static cache) =============

  electricityPrices: {
    ttl: 5 * MINUTE, // Real-time electricity prices
    staleWhileRevalidate: false,
    fallbackToHardcoded: false
  },

  userSessions: {
    ttl: 30 * MINUTE, // User session data
    staleWhileRevalidate: false,
    fallbackToHardcoded: false
  },

  searchResults: {
    ttl: 1 * HOUR, // Address search results
    staleWhileRevalidate: true,
    fallbackToHardcoded: false
  },

  energyCertificates: {
    ttl: 1 * DAY, // Enova certificate data
    staleWhileRevalidate: true,
    fallbackToHardcoded: false
  }
};

/**
 * Cache keys for consistent access across the application
 */
export const CACHE_KEYS = {
  // Configuration keys
  CALCULATIONS: 'cache:calculations',
  CONTENT: 'cache:content',
  TEK17_REQUIREMENTS: 'cache:tek17_requirements',
  FORMULAS: 'cache:formulas',
  HEAT_SOURCES: 'cache:heat_sources',
  MUNICIPALITIES: 'cache:municipalities',
  FEATURE_FLAGS: 'cache:feature_flags',

  // Manifest and meta
  MANIFEST: 'cache:manifest',
  VERSION: 'cache:version',
  LAST_SYNC: 'cache:last_sync',

  // Dynamic data keys
  ELECTRICITY_PRICES: 'cache:electricity_prices',
  USER_SESSION: 'cache:user_session',
  SEARCH_RESULTS: 'cache:search_results',
  ENERGY_CERTIFICATES: 'cache:energy_certificates',

  // Statistics
  CACHE_STATS: 'cache:statistics'
} as const;

/**
 * Fallback chain order - defines the sequence of cache levels to try
 */
export const CACHE_FALLBACK_CHAIN = [
  'memory',
  'localStorage',
  'staticJson',
  'supabaseCache',
  'supabaseDirect',
  'hardcodedDefaults'
] as const;

/**
 * Cache size limits
 */
export const CACHE_LIMITS = {
  MEMORY_MAX_SIZE_MB: 50,
  LOCALSTORAGE_MAX_SIZE_MB: 5,
  MAX_CACHE_AGE_DAYS: 90,
  MAX_ENTRIES_PER_CATEGORY: 10000
};

/**
 * Sync configuration
 */
export const SYNC_CONFIG = {
  CRON_SCHEDULE: '0 2 * * *', // 2 AM every day
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  BATCH_SIZE: 100, // Items per batch when syncing
  PARALLEL_REQUESTS: 3 // Max concurrent Supabase requests
};

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  CACHE_HIT_TARGET: 0.95, // 95% cache hit rate target
  MAX_LOAD_TIME_MS: 100, // Max acceptable load time
  SYNC_TIMEOUT_MS: 30000, // 30 seconds max for sync
  WARNING_MEMORY_USAGE_MB: 40 // Warn if memory usage exceeds this
};

/**
 * Get cache config for a specific key
 */
export function getCacheConfig(key: string): CacheConfig {
  // Extract category from cache key (e.g., 'cache:calculations' -> 'calculations')
  const category = key.replace('cache:', '');
  return CACHE_CONFIGURATION[category] || {
    ttl: 1 * HOUR,
    staleWhileRevalidate: true,
    fallbackToHardcoded: false
  };
}

/**
 * Check if a cache entry is still valid
 */
export function isCacheValid(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp < ttl;
}

/**
 * Check if we should revalidate stale cache
 */
export function shouldRevalidate(
  timestamp: number,
  ttl: number,
  staleWhileRevalidate: boolean
): boolean {
  const isStale = !isCacheValid(timestamp, ttl);
  return isStale && !staleWhileRevalidate;
}