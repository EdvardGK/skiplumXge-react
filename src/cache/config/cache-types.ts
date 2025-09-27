/**
 * Cache Layer Type Definitions
 * Defines all interfaces for the cache system
 */

// ============= Core Cache Types =============

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
  checksum?: string;
}

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate: boolean;
  version?: string;
  fallbackToHardcoded?: boolean;
}

export type CacheLevel =
  | 'memory'
  | 'localStorage'
  | 'staticJson'
  | 'supabaseCache'
  | 'supabaseDirect'
  | 'hardcodedDefaults';

// ============= Domain-Specific Types =============

export interface CachedCalculation {
  id: string;
  name: string;
  value: number;
  unit?: string;
  category: string;
  description?: string;
  min_value?: number;
  max_value?: number;
}

export interface CachedContent {
  id: string;
  key: string;
  norwegian_text: string;
  english_text?: string;
  category: string;
  context?: string;
}

export interface CachedTEK17Requirement {
  id: string;
  building_type: string;
  max_energy_kwh_m2: number;
  description?: string;
  source: string;
}

export interface CachedFormula {
  id: string;
  name: string;
  formula: string;
  variables: string[];
  description?: string;
  category: string;
}

export interface CachedHeatSource {
  id: string;
  name: string;
  norwegian_name: string;
  efficiency_cop?: number; // Coefficient of Performance for heat pumps
  annual_efficiency?: number; // Annual efficiency percentage
  typical_investment_kr: number;
  typical_savings_percent: number;
  description: string;
  advantages: string[];
  disadvantages: string[];
  suitable_for: string[]; // Building types
  priority: number; // Display order
}

export interface CachedMunicipality {
  code: string;
  name: string;
  fylke: string;
  price_zone: 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';
  climate_zone?: string;
  heating_degree_days?: number;
}

export interface CachedFeatureFlag {
  id: string;
  feature_name: string;
  enabled: boolean;
  rollout_percentage: number;
  description?: string;
}

// ============= Aggregate Cache Types =============

export interface CacheManifest {
  version: string;
  generated: string;
  environment: 'development' | 'staging' | 'production';
  items: {
    calculations: number;
    content: number;
    tek17_requirements: number;
    formulas: number;
    heat_sources: number;
    municipalities: number;
    feature_flags: number;
  };
  checksums: {
    calculations: string;
    content: string;
    tek17_requirements: string;
    formulas: string;
    heat_sources: string;
    municipalities: string;
    feature_flags: string;
  };
  lastSyncTimestamp?: string;
  syncStatus?: 'success' | 'partial' | 'failed';
}

export interface CachedConfiguration {
  calculations: Record<string, CachedCalculation>;
  content: Record<string, CachedContent>;
  tek17Requirements: Record<string, CachedTEK17Requirement>;
  formulas: Record<string, CachedFormula>;
  heatSources: Record<string, CachedHeatSource>;
  municipalities: Record<string, CachedMunicipality>;
  featureFlags: Record<string, CachedFeatureFlag>;
  manifest: CacheManifest;
}

// ============= Cache Provider Interfaces =============

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  setMany<T>(entries: Map<string, T>, ttl?: number): Promise<void>;
}

// ============= Cache Events =============

export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'sync' | 'error';
  key?: string;
  level?: CacheLevel;
  timestamp: number;
  metadata?: any;
}

export interface CacheSyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  duration: number;
  timestamp: string;
}

// ============= Norwegian Energy Domain Types =============

export interface EnergyCalculationParams {
  // From cached calculations
  bra_adjustment: number;
  investment_multiplier: number;
  heating_investment_percentage: number;
  lighting_investment_percentage: number;
  other_investment_percentage: number;
  base_electricity_price: number;
  grid_rent: number;
  good_tek17_threshold: number;
  warning_tek17_threshold: number;
  kwh_to_co2: number;
  default_floors: number;
  default_build_year: number;
  target_conversion_rate: number;
  analysis_time_minutes: number;
}

export interface HeatSourceRecommendation {
  heatSource: CachedHeatSource;
  suitabilityScore: number; // 0-100
  estimatedSavings: number; // kr/year
  paybackYears: number;
  co2Reduction: number; // kg/year
  reasons: string[];
}

// ============= Cache Statistics =============

export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  averageLoadTime: number;
  memorySizeBytes: number;
  localStorageSizeBytes: number;
  lastSync: string;
  errors: number;
}