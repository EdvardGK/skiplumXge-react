/**
 * Hardcoded Defaults
 * Ultimate fallback values when all cache levels fail
 * These are critical values that must always be available
 */

export const HARDCODED_DEFAULTS: Record<string, any> = {
  // ============= Critical Calculations =============
  'calculations:bra_adjustment': {
    value: 8,
    unit: '%',
    description: 'Reduction from BRA to heated BRA'
  },
  'calculations:investment_multiplier': {
    value: 7,
    unit: 'x',
    description: 'Annual waste multiplied by this for investment room'
  },
  'calculations:heating_investment_percentage': {
    value: 70,
    unit: '%',
    description: 'SINTEF: Percentage of investment for heating'
  },
  'calculations:lighting_investment_percentage': {
    value: 15,
    unit: '%',
    description: 'SINTEF: Percentage of investment for lighting'
  },
  'calculations:other_investment_percentage': {
    value: 15,
    unit: '%',
    description: 'SINTEF: Percentage of investment for other'
  },
  'calculations:base_electricity_price': {
    value: 2.80,
    unit: 'kr/kWh',
    description: 'Base electricity price 2024 Norway'
  },
  'calculations:grid_rent': {
    value: 0.50,
    unit: 'kr/kWh',
    description: 'Grid rental cost Norway average'
  },

  // ============= TEK17 Requirements (§ 14-2) =============
  'tek17:Småhus': {
    max_energy_kwh_m2: 100,
    description: 'Eneboliger og rekkehus'
  },
  'tek17:Leilighetsblokk': {
    max_energy_kwh_m2: 95,
    description: 'Boligblokker'
  },
  'tek17:Barnehage': {
    max_energy_kwh_m2: 135,
    description: 'Barnehager'
  },
  'tek17:Kontorbygning': {
    max_energy_kwh_m2: 115,
    description: 'Kontorer og administrasjonsbygg'
  },
  'tek17:Skolebygg': {
    max_energy_kwh_m2: 110,
    description: 'Grunnskoler og videregående skoler'
  },
  'tek17:Universitet': {
    max_energy_kwh_m2: 125,
    description: 'Høyskoler og universiteter'
  },
  'tek17:Sykehus': {
    max_energy_kwh_m2: 225,
    description: 'Sykehus og helseinstitusjoner'
  },
  'tek17:Sykehjem': {
    max_energy_kwh_m2: 195,
    description: 'Sykehjem og omsorgsboliger'
  },
  'tek17:Hotellbygg': {
    max_energy_kwh_m2: 170,
    description: 'Hoteller og overnattingssteder'
  },
  'tek17:Idrettsbygg': {
    max_energy_kwh_m2: 145,
    description: 'Idrettshaller'
  },
  'tek17:Forretningsbygg': {
    max_energy_kwh_m2: 180,
    description: 'Butikker og kjøpesentre'
  },
  'tek17:Kulturbygg': {
    max_energy_kwh_m2: 130,
    description: 'Kulturbygg og forsamlingslokaler'
  },
  'tek17:Lett industri/verksted': {
    max_energy_kwh_m2: 140,
    description: 'Verksteder og lett industri'
  },

  // ============= Heat Source Options =============
  'heat_sources:electric': {
    name: 'Electric',
    norwegian_name: 'Elektrisitet',
    annual_efficiency: 100,
    typical_investment_kr: 0,
    typical_savings_percent: 0,
    description: 'Direkte elektrisk oppvarming med panelovner eller varmekabler',
    priority: 10
  },
  'heat_sources:heatpump_air_air': {
    name: 'Air-to-Air Heat Pump',
    norwegian_name: 'Varmepumpe luft-luft',
    efficiency_cop: 3.5,
    typical_investment_kr: 25000,
    typical_savings_percent: 67,
    description: 'Varmepumpe som varmer opp lufta direkte',
    priority: 1
  },
  'heat_sources:heatpump_air_water': {
    name: 'Air-to-Water Heat Pump',
    norwegian_name: 'Varmepumpe luft-vann',
    efficiency_cop: 3.0,
    typical_investment_kr: 80000,
    typical_savings_percent: 65,
    description: 'Varmepumpe tilkoblet vannbårent system',
    priority: 2
  },
  'heat_sources:ground_source': {
    name: 'Ground Source Heat Pump',
    norwegian_name: 'Bergvarme',
    efficiency_cop: 4.5,
    typical_investment_kr: 200000,
    typical_savings_percent: 75,
    description: 'Bergvarme med energibrønner',
    priority: 3
  },
  'heat_sources:district_heating': {
    name: 'District Heating',
    norwegian_name: 'Fjernvarme',
    annual_efficiency: 98,
    typical_investment_kr: 50000,
    typical_savings_percent: 40,
    description: 'Sentralt fjernvarmesystem',
    priority: 4
  },

  // ============= Critical UI Content =============
  'content:landing.title': {
    norwegian_text: 'Spar tusenvis på energikostnadene',
    english_text: 'Save thousands on energy costs'
  },
  'content:landing.subtitle': {
    norwegian_text: 'Oppdag besparingsmuligheter og TEK17-etterlevelse på minutter',
    english_text: 'Discover savings and TEK17 compliance in minutes'
  },
  'content:landing.cta.primary': {
    norwegian_text: 'Start analyse',
    english_text: 'Start analysis'
  },
  'content:error.general': {
    norwegian_text: 'Noe gikk galt. Vennligst prøv igjen.',
    english_text: 'Something went wrong. Please try again.'
  },

  // ============= Default Formulas =============
  'formulas:heated_bra': {
    formula: 'bra * (1 - bra_adjustment/100)',
    variables: ['bra', 'bra_adjustment'],
    description: 'Calculate heated BRA from total BRA'
  },
  'formulas:annual_energy': {
    formula: 'heated_bra * energy_per_m2',
    variables: ['heated_bra', 'energy_per_m2'],
    description: 'Total annual energy consumption'
  },
  'formulas:annual_waste': {
    formula: 'annual_energy - (heated_bra * tek17_requirement)',
    variables: ['annual_energy', 'heated_bra', 'tek17_requirement'],
    description: 'Energy waste above TEK17'
  },
  'formulas:investment_room': {
    formula: 'waste_cost * investment_multiplier',
    variables: ['waste_cost', 'investment_multiplier'],
    description: 'Conservative investment room'
  },

  // ============= Default Price Zones =============
  'municipalities:0301': {
    code: '0301',
    name: 'Oslo',
    fylke: 'Oslo',
    price_zone: 'NO1'
  },
  'municipalities:5001': {
    code: '5001',
    name: 'Trondheim',
    fylke: 'Trøndelag',
    price_zone: 'NO3'
  },
  'municipalities:4601': {
    code: '4601',
    name: 'Bergen',
    fylke: 'Vestland',
    price_zone: 'NO5'
  },

  // ============= Feature Flags =============
  'feature_flags:pdf_export': {
    enabled: false,
    rollout_percentage: 0,
    description: 'PDF report generation'
  },
  'feature_flags:email_capture': {
    enabled: true,
    rollout_percentage: 100,
    description: 'Email lead capture modal'
  },
  'feature_flags:map_visualization': {
    enabled: true,
    rollout_percentage: 100,
    description: 'Show building footprint on map'
  }
};

/**
 * Get a hardcoded default value by key
 */
export function getHardcodedDefault<T>(key: string): T | null {
  return HARDCODED_DEFAULTS[key] as T || null;
}

/**
 * Check if a hardcoded default exists
 */
export function hasHardcodedDefault(key: string): boolean {
  return key in HARDCODED_DEFAULTS;
}