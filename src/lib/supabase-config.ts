import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for configuration data
export interface Calculation {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  category: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  updated_at: string;
}

export interface Content {
  id: string;
  key: string;
  norwegian_text: string;
  english_text: string | null;
  category: string;
  context: string | null;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  feature_name: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  updated_at: string;
}

export interface Formula {
  id: string;
  name: string;
  formula: string;
  variables: string[];
  description: string | null;
  category: string | null;
  updated_at: string;
}

export interface TEK17Requirement {
  id: string;
  building_type: string;
  max_energy_kwh_m2: number;
  description: string | null;
  source: string;
  updated_at: string;
}

// Configuration cache with TTL
class ConfigurationCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes cache

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const configCache = new ConfigurationCache();

// Configuration API
export const SupabaseConfig = {
  // Get all calculations or by category
  async getCalculations(category?: string): Promise<Calculation[]> {
    const cacheKey = `calculations_${category || 'all'}`;
    const cached = configCache.get<Calculation[]>(cacheKey);
    if (cached) return cached;

    let query = supabase.from('calculations').select('*');
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching calculations:', error);
      return [];
    }

    configCache.set(cacheKey, data);
    return data || [];
  },

  // Get single calculation by name
  async getCalculation(name: string): Promise<number | null> {
    const calculations = await this.getCalculations();
    const calc = calculations.find(c => c.name === name);
    return calc?.value || null;
  },

  // Get all content or by category
  async getContent(category?: string): Promise<Content[]> {
    const cacheKey = `content_${category || 'all'}`;
    const cached = configCache.get<Content[]>(cacheKey);
    if (cached) return cached;

    let query = supabase.from('content').select('*');
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching content:', error);
      return [];
    }

    configCache.set(cacheKey, data);
    return data || [];
  },

  // Get single content string by key
  async getText(key: string, language: 'norwegian' | 'english' = 'norwegian'): Promise<string> {
    const content = await this.getContent();
    const item = content.find(c => c.key === key);
    if (!item) return key; // Return key as fallback

    return language === 'norwegian' ? item.norwegian_text : (item.english_text || item.norwegian_text);
  },

  // Get all feature flags
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const cached = configCache.get<FeatureFlag[]>('feature_flags');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('feature_flags')
      .select('*');

    if (error) {
      console.error('Error fetching feature flags:', error);
      return [];
    }

    configCache.set('feature_flags', data);
    return data || [];
  },

  // Check if feature is enabled
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    const flag = flags.find(f => f.feature_name === featureName);
    return flag?.enabled || false;
  },

  // Get all formulas or by category
  async getFormulas(category?: string): Promise<Formula[]> {
    const cacheKey = `formulas_${category || 'all'}`;
    const cached = configCache.get<Formula[]>(cacheKey);
    if (cached) return cached;

    let query = supabase.from('formulas').select('*');
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching formulas:', error);
      return [];
    }

    configCache.set(cacheKey, data);
    return data || [];
  },

  // Get TEK17 requirements
  async getTEK17Requirements(): Promise<TEK17Requirement[]> {
    const cached = configCache.get<TEK17Requirement[]>('tek17_requirements');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('tek17_requirements')
      .select('*')
      .order('building_type');

    if (error) {
      console.error('Error fetching TEK17 requirements:', error);
      return [];
    }

    configCache.set('tek17_requirements', data);
    return data || [];
  },

  // Get TEK17 limit for specific building type
  async getTEK17Limit(buildingType: string): Promise<number | null> {
    const requirements = await this.getTEK17Requirements();
    const req = requirements.find(r => r.building_type === buildingType);
    return req?.max_energy_kwh_m2 || null;
  },

  // Execute formula with variables
  async executeFormula(formulaName: string, variables: Record<string, number>): Promise<number | null> {
    const formulas = await this.getFormulas();
    const formula = formulas.find(f => f.name === formulaName);
    if (!formula) return null;

    try {
      // Create a safe evaluation context
      const func = new Function(...Object.keys(variables), `return ${formula.formula}`);
      return func(...Object.values(variables));
    } catch (error) {
      console.error(`Error executing formula ${formulaName}:`, error);
      return null;
    }
  },

  // Clear cache (useful for force refresh)
  clearCache(): void {
    configCache.clear();
  },

  // Subscribe to real-time updates
  subscribeToUpdates(
    table: 'calculations' | 'content' | 'feature_flags' | 'formulas' | 'tek17_requirements',
    callback: (payload: any) => void
  ) {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // Clear cache for this table
          configCache.clear();
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  },
};

// Helper function to get all config at once (for admin panel)
export async function getAllConfiguration() {
  const [calculations, content, featureFlags, formulas, tek17Requirements] = await Promise.all([
    SupabaseConfig.getCalculations(),
    SupabaseConfig.getContent(),
    SupabaseConfig.getFeatureFlags(),
    SupabaseConfig.getFormulas(),
    SupabaseConfig.getTEK17Requirements(),
  ]);

  return {
    calculations,
    content,
    featureFlags,
    formulas,
    tek17Requirements,
  };
}

// Energy calculation helpers using configuration
export async function calculateWithConfig(buildingData: {
  bra: number;
  buildingType: string;
  energyPerM2?: number;
}) {
  // Fetch all needed calculations
  const [
    braAdjustment,
    investmentMultiplier,
    heatingPercentage,
    lightingPercentage,
    otherPercentage,
    electricityPrice,
    gridRent,
    tek17Limit,
  ] = await Promise.all([
    SupabaseConfig.getCalculation('bra_adjustment'),
    SupabaseConfig.getCalculation('investment_multiplier'),
    SupabaseConfig.getCalculation('heating_investment_percentage'),
    SupabaseConfig.getCalculation('lighting_investment_percentage'),
    SupabaseConfig.getCalculation('other_investment_percentage'),
    SupabaseConfig.getCalculation('base_electricity_price'),
    SupabaseConfig.getCalculation('grid_rent'),
    SupabaseConfig.getTEK17Limit(buildingData.buildingType),
  ]);

  // Execute formulas
  const heatedBra = await SupabaseConfig.executeFormula('heated_bra', {
    bra: buildingData.bra,
    bra_adjustment: braAdjustment || 8,
  });

  const totalPricePerKwh = (electricityPrice || 2.80) + (gridRent || 0.50);
  const energyPerM2 = buildingData.energyPerM2 || tek17Limit || 115;

  const annualEnergy = await SupabaseConfig.executeFormula('annual_energy', {
    heated_bra: heatedBra || buildingData.bra * 0.92,
    energy_per_m2: energyPerM2,
  });

  const annualCost = await SupabaseConfig.executeFormula('annual_cost', {
    annual_energy: annualEnergy || 0,
    total_price_per_kwh: totalPricePerKwh,
  });

  const tek17Percentage = await SupabaseConfig.executeFormula('tek17_percentage', {
    actual_energy: energyPerM2,
    tek17_requirement: tek17Limit || 115,
  });

  const annualWaste = await SupabaseConfig.executeFormula('annual_waste', {
    annual_energy: annualEnergy || 0,
    heated_bra: heatedBra || buildingData.bra * 0.92,
    tek17_requirement: tek17Limit || 115,
  });

  const wasteCost = await SupabaseConfig.executeFormula('waste_cost', {
    annual_waste: Math.max(0, annualWaste || 0),
    total_price_per_kwh: totalPricePerKwh,
  });

  const investmentRoom = await SupabaseConfig.executeFormula('investment_room', {
    waste_cost: wasteCost || 0,
    investment_multiplier: investmentMultiplier || 7,
  });

  return {
    heatedBra: heatedBra || buildingData.bra * 0.92,
    annualEnergy: annualEnergy || 0,
    annualCost: annualCost || 0,
    tek17Percentage: tek17Percentage || 100,
    tek17Limit: tek17Limit || 115,
    annualWaste: Math.max(0, annualWaste || 0),
    wasteCost: Math.max(0, wasteCost || 0),
    investmentRoom: investmentRoom || 0,
    investmentBreakdown: {
      heating: (investmentRoom || 0) * ((heatingPercentage || 70) / 100),
      lighting: (investmentRoom || 0) * ((lightingPercentage || 15) / 100),
      other: (investmentRoom || 0) * ((otherPercentage || 15) / 100),
    },
  };
}