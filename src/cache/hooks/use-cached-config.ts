/**
 * React Hook for accessing cached configuration
 * Provides a simple interface to get configuration values with automatic caching
 */

import { useEffect, useState, useCallback } from 'react';
import { getCacheManager } from '../providers/cache-manager';
import type { CachedCalculation, CachedContent, CachedTEK17Requirement, CachedHeatSource, CacheLevel } from '../config/cache-types';

interface UseCachedConfigOptions {
  fallbackValue?: any;
  skipCache?: boolean;
  ttl?: number;
}

interface CachedConfigResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for any cached configuration value
 */
export function useCachedConfig<T = any>(
  key: string,
  options?: UseCachedConfigOptions
): CachedConfigResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheManager = getCacheManager();

      // Skip cache if requested
      const skipLevels = options?.skipCache
        ? (['memory', 'localStorage', 'staticJson'] as CacheLevel[])
        : undefined;

      const value = await cacheManager.get<T>(key, { skipLevels });

      if (value === null && options?.fallbackValue !== undefined) {
        setData(options.fallbackValue);
      } else {
        setData(value);
      }
    } catch (err) {
      console.error(`Error fetching cached config for ${key}:`, err);
      setError(err as Error);

      if (options?.fallbackValue !== undefined) {
        setData(options.fallbackValue);
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, options?.skipCache, options?.fallbackValue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook specifically for calculation values
 */
export function useCachedCalculation(
  name: string,
  options?: UseCachedConfigOptions
): CachedConfigResult<CachedCalculation> {
  return useCachedConfig<CachedCalculation>(`calculations:${name}`, options);
}

/**
 * Hook for getting all calculations
 */
export function useAllCalculations(): CachedConfigResult<Record<string, CachedCalculation>> {
  return useCachedConfig<Record<string, CachedCalculation>>('calculations');
}

/**
 * Hook specifically for UI content strings
 */
export function useCachedContent(
  key: string,
  options?: UseCachedConfigOptions
): CachedConfigResult<CachedContent> {
  return useCachedConfig<CachedContent>(`content:${key}`, options);
}

/**
 * Hook for getting content text directly (Norwegian by default)
 */
export function useContentText(
  key: string,
  language: 'norwegian' | 'english' = 'norwegian'
): string {
  const { data, isLoading } = useCachedContent(key);

  if (isLoading || !data) {
    return ''; // Return empty string while loading
  }

  return language === 'norwegian'
    ? data.norwegian_text
    : data.english_text || data.norwegian_text;
}

/**
 * Hook for TEK17 requirements
 */
export function useTEK17Requirement(
  buildingType: string
): CachedConfigResult<CachedTEK17Requirement> {
  return useCachedConfig<CachedTEK17Requirement>(`tek17:${buildingType}`);
}

/**
 * Hook for all TEK17 requirements
 */
export function useAllTEK17Requirements(): CachedConfigResult<Record<string, CachedTEK17Requirement>> {
  return useCachedConfig<Record<string, CachedTEK17Requirement>>('tek17_requirements');
}

/**
 * Hook for heat source options
 */
export function useHeatSource(
  sourceId: string
): CachedConfigResult<CachedHeatSource> {
  return useCachedConfig<CachedHeatSource>(`heat_sources:${sourceId}`);
}

/**
 * Hook for all heat sources
 */
export function useAllHeatSources(): CachedConfigResult<Record<string, CachedHeatSource>> {
  return useCachedConfig<Record<string, CachedHeatSource>>('heat_sources');
}

/**
 * Hook for feature flags
 */
export function useFeatureFlag(featureName: string): boolean {
  const { data } = useCachedConfig<{ enabled: boolean; rollout_percentage: number }>(
    `feature_flags:${featureName}`,
    { fallbackValue: { enabled: false, rollout_percentage: 0 } }
  );

  if (!data) return false;

  // Check rollout percentage
  if (data.rollout_percentage < 100) {
    // Simple rollout based on random number
    // In production, this should be based on user ID for consistency
    const random = Math.random() * 100;
    return data.enabled && random <= data.rollout_percentage;
  }

  return data.enabled;
}

/**
 * Hook for municipality data
 */
export function useMunicipality(code: string) {
  return useCachedConfig(`municipalities:${code}`);
}

/**
 * Hook to get specific calculation value directly
 */
export function useCalculationValue(name: string, defaultValue: number = 0): number {
  const { data, isLoading } = useCachedCalculation(name);

  if (isLoading || !data) {
    return defaultValue;
  }

  return data.value;
}

/**
 * Hook to get multiple calculation values at once
 */
export function useCalculationValues(
  names: string[]
): Record<string, number> {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchValues = async () => {
      const cacheManager = getCacheManager();
      const result: Record<string, number> = {};

      for (const name of names) {
        const calc = await cacheManager.get<CachedCalculation>(`calculations:${name}`);
        if (calc) {
          result[name] = calc.value;
        }
      }

      setValues(result);
    };

    fetchValues();
  }, [names.join(',')]); // Re-fetch if names change

  return values;
}