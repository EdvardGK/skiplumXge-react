/**
 * Memory Cache Provider
 * In-memory caching with LRU eviction and size limits
 */

import { ICacheProvider, CacheEntry } from '../config/cache-types';
import { CACHE_LIMITS } from '../config/cache-config';

export class MemoryCacheProvider implements ICacheProvider {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[];
  private currentSizeBytes: number;
  private maxSizeBytes: number;

  constructor() {
    this.cache = new Map();
    this.accessOrder = [];
    this.currentSizeBytes = 0;
    this.maxSizeBytes = CACHE_LIMITS.MEMORY_MAX_SIZE_MB * 1024 * 1024;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is still valid
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttl: number = 3600000): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl
    };

    // Calculate approximate size
    const entrySize = this.calculateSize(entry);

    // Evict if necessary
    while (this.currentSizeBytes + entrySize > this.maxSizeBytes && this.accessOrder.length > 0) {
      await this.evictLRU();
    }

    // Store the entry
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.currentSizeBytes += entrySize;
  }

  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSizeBytes -= this.calculateSize(entry);
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSizeBytes = 0;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
      }
    }

    return result;
  }

  async setMany<T>(entries: Map<string, T>, ttl: number = 3600000): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  // ============= Helper Methods =============

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) return;

    // Get least recently used key
    const lruKey = this.accessOrder[0];
    await this.delete(lruKey);
  }

  private calculateSize(entry: CacheEntry): number {
    // Rough estimate of object size in bytes
    try {
      return JSON.stringify(entry).length * 2; // UTF-16 chars
    } catch {
      return 1024; // Default 1KB if serialization fails
    }
  }

  // ============= Statistics Methods =============

  getStatistics() {
    return {
      entries: this.cache.size,
      sizeBytes: this.currentSizeBytes,
      maxSizeBytes: this.maxSizeBytes,
      utilizationPercent: (this.currentSizeBytes / this.maxSizeBytes) * 100,
      oldestEntry: this.accessOrder[0] || null,
      newestEntry: this.accessOrder[this.accessOrder.length - 1] || null
    };
  }
}

// Singleton instance
let memoryCache: MemoryCacheProvider | null = null;

export function getMemoryCache(): MemoryCacheProvider {
  if (!memoryCache) {
    memoryCache = new MemoryCacheProvider();
  }
  return memoryCache;
}