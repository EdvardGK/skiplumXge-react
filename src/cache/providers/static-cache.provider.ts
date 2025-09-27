/**
 * Static Cache Provider
 * Reads from pre-built JSON files that are bundled with the app
 */

import { ICacheProvider, CacheEntry, CachedConfiguration, CacheManifest } from '../config/cache-types';

// These will be imported at build time
// The actual JSON files will be created by the sync script
let staticCacheData: Partial<CachedConfiguration> | null = null;

// Lazy load the cache data
async function loadStaticCache(): Promise<Partial<CachedConfiguration>> {
  if (staticCacheData) return staticCacheData;

  try {
    // Dynamic imports for code splitting
    const [
      calculations,
      content,
      tek17Requirements,
      formulas,
      heatSources,
      municipalities,
      featureFlags,
      manifest
    ] = await Promise.all([
      import('@/data/cache/calculations.json').catch(() => null),
      import('@/data/cache/content-no.json').catch(() => null),
      import('@/data/cache/tek17-requirements.json').catch(() => null),
      import('@/data/cache/formulas.json').catch(() => null),
      import('@/data/cache/heat-sources.json').catch(() => null),
      import('@/data/cache/municipalities.json').catch(() => null),
      import('@/data/cache/feature-flags.json').catch(() => null),
      import('@/data/cache/manifest.json').catch(() => null)
    ]);

    staticCacheData = {
      calculations: calculations?.default || {},
      content: content?.default || {},
      tek17Requirements: tek17Requirements?.default || {},
      formulas: formulas?.default || {},
      heatSources: heatSources?.default || {},
      municipalities: (municipalities?.default || {}) as Record<string, any>,
      featureFlags: featureFlags?.default || {},
      manifest: (manifest?.default || {
        version: '0.0.0',
        generated: new Date().toISOString(),
        environment: 'development',
        items: {
          calculations: 0,
          content: 0,
          tek17_requirements: 0,
          formulas: 0,
          heat_sources: 0,
          municipalities: 0,
          feature_flags: 0
        },
        checksums: {
          calculations: '',
          content: '',
          tek17_requirements: '',
          formulas: '',
          heat_sources: '',
          municipalities: '',
          feature_flags: ''
        }
      }) as CacheManifest
    };

    return staticCacheData;
  } catch (error) {
    console.warn('Failed to load static cache:', error);
    return {};
  }
}

export class StaticCacheProvider implements ICacheProvider {
  private cache: Map<string, any> = new Map();
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const data = await loadStaticCache();

    // Flatten the structure for easier key-based access
    if (data.calculations) {
      Object.entries(data.calculations).forEach(([key, value]) => {
        this.cache.set(`calculations:${key}`, value);
      });
    }

    if (data.content) {
      Object.entries(data.content).forEach(([key, value]) => {
        this.cache.set(`content:${key}`, value);
      });
    }

    if (data.tek17Requirements) {
      Object.entries(data.tek17Requirements).forEach(([key, value]) => {
        this.cache.set(`tek17:${key}`, value);
      });
    }

    if (data.formulas) {
      Object.entries(data.formulas).forEach(([key, value]) => {
        this.cache.set(`formulas:${key}`, value);
      });
    }

    if (data.heatSources) {
      Object.entries(data.heatSources).forEach(([key, value]) => {
        this.cache.set(`heat_sources:${key}`, value);
      });
    }

    if (data.municipalities) {
      Object.entries(data.municipalities).forEach(([key, value]) => {
        this.cache.set(`municipalities:${key}`, value);
      });
    }

    if (data.featureFlags) {
      Object.entries(data.featureFlags).forEach(([key, value]) => {
        this.cache.set(`feature_flags:${key}`, value);
      });
    }

    // Store the entire collections as well
    this.cache.set('calculations', data.calculations);
    this.cache.set('content', data.content);
    this.cache.set('tek17_requirements', data.tek17Requirements);
    this.cache.set('formulas', data.formulas);
    this.cache.set('heat_sources', data.heatSources);
    this.cache.set('municipalities', data.municipalities);
    this.cache.set('feature_flags', data.featureFlags);
    this.cache.set('manifest', data.manifest);

    this.initialized = true;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.initialize();
    return this.cache.get(key) || null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Static cache is read-only
    console.warn('Cannot set values in static cache - it is read-only');
  }

  async delete(key: string): Promise<void> {
    // Static cache is read-only
    console.warn('Cannot delete from static cache - it is read-only');
  }

  async clear(): Promise<void> {
    // We can clear the in-memory map, but files remain
    this.cache.clear();
    this.initialized = false;
  }

  async has(key: string): Promise<boolean> {
    await this.initialize();
    return this.cache.has(key);
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    await this.initialize();
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = this.cache.get(key);
      if (value !== null && value !== undefined) {
        result.set(key, value);
      }
    }

    return result;
  }

  async setMany<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    // Static cache is read-only
    console.warn('Cannot set values in static cache - it is read-only');
  }

  // ============= Specific Getters =============

  async getCalculations() {
    await this.initialize();
    return this.cache.get('calculations') || {};
  }

  async getContent() {
    await this.initialize();
    return this.cache.get('content') || {};
  }

  async getTEK17Requirements() {
    await this.initialize();
    return this.cache.get('tek17_requirements') || {};
  }

  async getFormulas() {
    await this.initialize();
    return this.cache.get('formulas') || {};
  }

  async getHeatSources() {
    await this.initialize();
    return this.cache.get('heat_sources') || {};
  }

  async getMunicipalities() {
    await this.initialize();
    return this.cache.get('municipalities') || {};
  }

  async getFeatureFlags() {
    await this.initialize();
    return this.cache.get('feature_flags') || {};
  }

  async getManifest() {
    await this.initialize();
    return this.cache.get('manifest');
  }
}

// Singleton instance
let staticCache: StaticCacheProvider | null = null;

export function getStaticCache(): StaticCacheProvider {
  if (!staticCache) {
    staticCache = new StaticCacheProvider();
  }
  return staticCache;
}