/**
 * Cache Manager
 * Orchestrates multiple cache providers with fallback chain
 */

import { ICacheProvider, CacheLevel, CacheEvent, CacheStatistics } from '../config/cache-types';
import { CACHE_FALLBACK_CHAIN, getCacheConfig, isCacheValid } from '../config/cache-config';
import { getMemoryCache } from './memory-cache.provider';
import { getLocalStorageCache } from './localstorage-cache.provider';
import { getStaticCache } from './static-cache.provider';
import { supabaseClient } from '@/lib/supabase';

// Import hardcoded defaults as ultimate fallback
import { HARDCODED_DEFAULTS } from '../utils/hardcoded-defaults';

export class CacheManager {
  private providers: Map<CacheLevel, ICacheProvider>;
  private events: CacheEvent[] = [];
  private stats: CacheStatistics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    averageLoadTime: 0,
    memorySizeBytes: 0,
    localStorageSizeBytes: 0,
    lastSync: '',
    errors: 0
  };

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    this.providers.set('memory', getMemoryCache());
    this.providers.set('localStorage', getLocalStorageCache());
    this.providers.set('staticJson', getStaticCache());
    // Supabase providers will be initialized on-demand
  }

  /**
   * Get a value with automatic fallback through the cache chain
   */
  async get<T>(key: string, options?: { skipLevels?: CacheLevel[] }): Promise<T | null> {
    const startTime = Date.now();
    const config = getCacheConfig(key);

    // Try each cache level in order
    for (const level of CACHE_FALLBACK_CHAIN) {
      // Skip levels if requested
      if (options?.skipLevels?.includes(level)) continue;

      try {
        const value = await this.getFromLevel<T>(level, key);

        if (value !== null) {
          // Cache hit
          this.recordEvent({
            type: 'hit',
            key,
            level,
            timestamp: Date.now()
          });

          this.stats.hits++;
          this.updateHitRate();

          // Populate higher cache levels (cache promotion)
          await this.populateUpperLevels(level, key, value, config.ttl);

          const loadTime = Date.now() - startTime;
          this.updateAverageLoadTime(loadTime);

          return value;
        }
      } catch (error) {
        console.warn(`Cache level ${level} error for ${key}:`, error);
        this.stats.errors++;
        continue;
      }
    }

    // Cache miss
    this.recordEvent({
      type: 'miss',
      key,
      timestamp: Date.now()
    });

    this.stats.misses++;
    this.updateHitRate();

    return null;
  }

  /**
   * Set a value in specified cache levels
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      levels?: CacheLevel[];
      ttl?: number;
    }
  ): Promise<void> {
    const config = getCacheConfig(key);
    const ttl = options?.ttl || config.ttl;
    const levels = options?.levels || ['memory', 'localStorage'];

    for (const level of levels) {
      const provider = this.providers.get(level);
      if (provider) {
        try {
          await provider.set(key, value, ttl);
          this.recordEvent({
            type: 'set',
            key,
            level,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn(`Failed to set ${key} in ${level}:`, error);
        }
      }
    }
  }

  /**
   * Delete a value from all cache levels
   */
  async delete(key: string): Promise<void> {
    for (const [level, provider] of this.providers) {
      try {
        await provider.delete(key);
        this.recordEvent({
          type: 'delete',
          key,
          level,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn(`Failed to delete ${key} from ${level}:`, error);
      }
    }
  }

  /**
   * Clear all cache levels
   */
  async clear(options?: { levels?: CacheLevel[] }): Promise<void> {
    const levels = options?.levels || Array.from(this.providers.keys());

    for (const level of levels) {
      const provider = this.providers.get(level);
      if (provider) {
        try {
          await provider.clear();
          this.recordEvent({
            type: 'clear',
            level,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn(`Failed to clear ${level}:`, error);
        }
      }
    }
  }

  // ============= Private Helper Methods =============

  private async getFromLevel<T>(level: CacheLevel, key: string): Promise<T | null> {
    switch (level) {
      case 'memory':
      case 'localStorage':
      case 'staticJson':
        const provider = this.providers.get(level);
        return provider ? await provider.get<T>(key) : null;

      case 'supabaseCache':
        return await this.getFromSupabaseCache<T>(key);

      case 'supabaseDirect':
        return await this.getFromSupabaseDirect<T>(key);

      case 'hardcodedDefaults':
        return this.getHardcodedDefault<T>(key);

      default:
        return null;
    }
  }

  private async getFromSupabaseCache<T>(key: string): Promise<T | null> {
    // This would be a cached version of Supabase data
    // For now, we'll skip to direct Supabase
    return null;
  }

  private async getFromSupabaseDirect<T>(key: string): Promise<T | null> {
    try {
      // For now, return null since the configuration tables aren't created in Supabase yet
      // Once the tables are created and types are generated, this can be implemented
      // The static JSON cache and hardcoded defaults will provide the data instead

      console.debug(`Supabase direct fetch skipped for ${key} - using cache fallback`);
      return null;

      // Future implementation when tables exist:
      /*
      const supabase = supabaseClient;
      const [table, field] = key.split(':');

      switch (table) {
        case 'calculations':
          const { data: calc } = await supabase
            .from('calculations')
            .select('*')
            .eq('name', field)
            .single();
          return calc as T;

        case 'municipalities':
          const { data: municipality } = await supabase
            .from('municipality_price_zones')
            .select('*')
            .eq('municipality_code', field)
            .single();
          return municipality as T;

        default:
          return null;
      }
      */
    } catch (error) {
      console.error(`Supabase fetch error for ${key}:`, error);
      return null;
    }
  }

  private getHardcodedDefault<T>(key: string): T | null {
    return (HARDCODED_DEFAULTS[key] as T) || null;
  }

  private async populateUpperLevels<T>(
    foundLevel: CacheLevel,
    key: string,
    value: T,
    ttl: number
  ): Promise<void> {
    const levelIndex = CACHE_FALLBACK_CHAIN.indexOf(foundLevel);
    if (levelIndex <= 0) return; // Already at highest level

    // Populate all higher levels
    for (let i = 0; i < levelIndex; i++) {
      const level = CACHE_FALLBACK_CHAIN[i];
      const provider = this.providers.get(level);

      if (provider && level !== 'staticJson') {
        // Don't try to write to read-only static cache
        try {
          await provider.set(key, value, ttl);
        } catch (error) {
          console.warn(`Failed to populate ${level} with ${key}:`, error);
        }
      }
    }
  }

  private recordEvent(event: CacheEvent) {
    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private updateHitRate() {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateAverageLoadTime(loadTime: number) {
    const currentAvg = this.stats.averageLoadTime;
    const totalRequests = this.stats.hits + this.stats.misses;

    this.stats.averageLoadTime =
      (currentAvg * (totalRequests - 1) + loadTime) / totalRequests;
  }

  // ============= Public Statistics Methods =============

  getStatistics(): CacheStatistics {
    // Update memory sizes
    const memoryProvider = this.providers.get('memory') as any;
    const localStorageProvider = this.providers.get('localStorage') as any;

    if (memoryProvider?.getStatistics) {
      this.stats.memorySizeBytes = memoryProvider.getStatistics().sizeBytes;
    }

    if (localStorageProvider?.getStatistics) {
      this.stats.localStorageSizeBytes = localStorageProvider.getStatistics().sizeBytes;
    }

    return { ...this.stats };
  }

  getEvents(limit: number = 100): CacheEvent[] {
    return this.events.slice(-limit);
  }

  resetStatistics() {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      averageLoadTime: 0,
      memorySizeBytes: 0,
      localStorageSizeBytes: 0,
      lastSync: '',
      errors: 0
    };
    this.events = [];
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

// Export convenience functions
export async function getFromCache<T>(key: string): Promise<T | null> {
  return getCacheManager().get<T>(key);
}

export async function setInCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  return getCacheManager().set(key, value, { ttl });
}

export async function deleteFromCache(key: string): Promise<void> {
  return getCacheManager().delete(key);
}

export async function clearCache(levels?: CacheLevel[]): Promise<void> {
  return getCacheManager().clear({ levels });
}