/**
 * LocalStorage Cache Provider
 * Browser localStorage with automatic cleanup and size management
 */

import { ICacheProvider, CacheEntry } from '../config/cache-types';
import { CACHE_LIMITS, CACHE_KEYS } from '../config/cache-config';

export class LocalStorageCacheProvider implements ICacheProvider {
  private readonly prefix = 'skiplum_cache:';
  private readonly maxSizeBytes: number;

  constructor() {
    this.maxSizeBytes = CACHE_LIMITS.LOCALSTORAGE_MAX_SIZE_MB * 1024 * 1024;

    // Clean up expired entries on initialization
    if (typeof window !== 'undefined') {
      this.cleanupExpired();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    try {
      const storedValue = localStorage.getItem(this.prefix + key);
      if (!storedValue) return null;

      const entry: CacheEntry<T> = JSON.parse(storedValue);

      // Check if entry is expired
      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`LocalStorage cache get error for ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600000): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl
      };

      const serialized = JSON.stringify(entry);
      const entrySize = serialized.length * 2; // UTF-16

      // Check if we have enough space
      if (entrySize > this.maxSizeBytes) {
        console.warn(`Cache entry too large for localStorage: ${key}`);
        return;
      }

      // Try to make space if needed
      const currentSize = this.getCurrentSize();
      if (currentSize + entrySize > this.maxSizeBytes) {
        await this.makeSpace(entrySize);
      }

      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      // Likely quota exceeded
      console.warn(`LocalStorage cache set error for ${key}:`, error);

      // Try to clean up and retry once
      await this.cleanupOldest();
      try {
        const entry: CacheEntry<T> = {
          data: value,
          timestamp: Date.now(),
          ttl
        };
        localStorage.setItem(this.prefix + key, JSON.stringify(entry));
      } catch {
        // Give up if still failing
        console.error(`Failed to cache ${key} in localStorage`);
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Only clear our prefixed keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async has(key: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const storedValue = localStorage.getItem(this.prefix + key);
    if (!storedValue) return false;

    try {
      const entry: CacheEntry = JSON.parse(storedValue);
      if (this.isExpired(entry)) {
        await this.delete(key);
        return false;
      }
      return true;
    } catch {
      return false;
    }
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

  private getCurrentSize(): number {
    if (typeof window === 'undefined') return 0;

    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += (key.length + value.length) * 2; // UTF-16
        }
      }
    }
    return totalSize;
  }

  private async cleanupExpired(): Promise<void> {
    if (typeof window === 'undefined') return;

    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const entry: CacheEntry = JSON.parse(value);
            if (this.isExpired(entry)) {
              keysToDelete.push(key);
            }
          }
        } catch {
          // Invalid entry, delete it
          keysToDelete.push(key!);
        }
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  private async cleanupOldest(): Promise<void> {
    if (typeof window === 'undefined') return;

    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const entry: CacheEntry = JSON.parse(value);
            entries.push({ key, timestamp: entry.timestamp });
          }
        } catch {
          // Invalid entry, delete it
          localStorage.removeItem(key!);
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }

  private async makeSpace(requiredBytes: number): Promise<void> {
    await this.cleanupExpired();

    const currentSize = this.getCurrentSize();
    if (currentSize + requiredBytes > this.maxSizeBytes) {
      await this.cleanupOldest();
    }
  }

  // ============= Statistics Methods =============

  getStatistics() {
    if (typeof window === 'undefined') {
      return {
        entries: 0,
        sizeBytes: 0,
        maxSizeBytes: this.maxSizeBytes,
        utilizationPercent: 0
      };
    }

    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        count++;
      }
    }

    const currentSize = this.getCurrentSize();

    return {
      entries: count,
      sizeBytes: currentSize,
      maxSizeBytes: this.maxSizeBytes,
      utilizationPercent: (currentSize / this.maxSizeBytes) * 100
    };
  }
}

// Singleton instance
let localStorageCache: LocalStorageCacheProvider | null = null;

export function getLocalStorageCache(): LocalStorageCacheProvider {
  if (!localStorageCache) {
    localStorageCache = new LocalStorageCacheProvider();
  }
  return localStorageCache;
}