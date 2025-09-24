// Norwegian Energy Analysis Types
// Based on TEK17 standards and Norwegian data sources

export interface Address {
  adressetekst: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  municipality: string;
  postalCode: string;
  postalPlace?: string;
  streetName?: string;
  houseNumber?: string;
  houseLetter?: string;
  municipalityNumber: string;
  priceZone: 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';
  matrikkel?: MatrikkelData;
  // Buildings at this specific address
  buildings?: BuildingInfo[];
  hasMultipleBuildings?: boolean;
}

// Property is the main entity - identified by gnr/bnr
export interface Property {
  id: string; // Unique ID: `${gnr}-${bnr}`
  gnr: string; // Gårdsnummer (primary key part 1)
  bnr: string; // Bruksnummer (primary key part 2)
  addresses: Address[]; // Multiple addresses can point to same property
  municipality: string;
  municipalityNumber: string;
  priceZone: 'NO1' | 'NO2' | 'NO3' | 'NO4' | 'NO5';
}

export interface BuildingInfo {
  bygningsnummer: string; // Building number within the property
  gnr: string; // Links back to property
  bnr: string; // Links back to property
  address: string; // Specific address this building belongs to
  buildingType?: string;
  buildingYear?: number;
  totalArea?: number;
  coordinates?: {
    lat: number;
    lon: number;
  };
  enovaStatus?: {
    isRegistered: boolean;
    energyGrade?: EnergyGrade;
    certificateId?: string;
  };
  // Map data availability
  hasMapData?: boolean;
}

// For building selection in forms
export interface SelectedBuilding {
  address: string;
  gnr: string;
  bnr: string;
  bygningsnummer: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface MatrikkelData {
  gardsnummer?: string;
  bruksnummer?: string;
  bygningsnummer?: string; // Building number for Enova lookups
  buildingId?: string | null;
  propertyId?: string | null;
  buildingType?: string | null;
  buildingYear?: number | null;
  totalArea?: number | null;
  heatedArea?: number | null;
}

export interface BuildingData {
  type: BuildingType;
  totalArea: number; // BRA (Bruksareal) in m²
  heatedArea: number; // Oppvarmet areal in m²
  buildingYear?: number;
  energySystems: EnergySystems;
  municipality: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

export type BuildingType =
  | 'Småhus'
  | 'Kontor'
  | 'Handel'
  | 'Hotell'
  | 'Skole'
  | 'Universitet'
  | 'Sykehus'
  | 'Kultur'
  | 'Flerbolig'
  | 'Barnehage'
  | 'Idrett'
  | 'Industri'
  | 'Andre';

export interface EnergySource<T = string> {
  type: T;
  percentage: number;  // 0-100
  ranking: 'primary' | 'secondary' | 'tertiary';
}

export interface EnergySystems {
  heating: EnergySource<HeatingSystem>[];  // Multiple heating sources with percentages
  lighting: EnergySource<LightingSystem>[];  // Multiple lighting types with percentages
  ventilation: VentilationSystem;  // Usually single system
  hotWater: EnergySource<HotWaterSystem>[];  // Multiple hot water sources with percentages
}

export type HeatingSystem =
  | 'Elektrisitet'
  | 'Varmepumpe'
  | 'Fjernvarme'
  | 'Biobrensel'
  | 'Olje'
  | 'Gass'
  | 'Bergvarme';

export type LightingSystem = 'LED' | 'Fluorescerende' | 'Halogen' | 'Glødepære';

export type VentilationSystem =
  | 'Naturlig'
  | 'Mekanisk tilluft'
  | 'Mekanisk fraluft'
  | 'Balansert med varmegjenvinning'
  | 'Balansert uten varmegjenvinning';

export type HotWaterSystem =
  | 'Elektrisitet'
  | 'Varmepumpe'
  | 'Solvarme'
  | 'Fjernvarme'
  | 'Olje'
  | 'Gass';

// Energy Analysis Results
export interface EnergyAnalysis {
  energyGrade: EnergyGrade;
  totalEnergyUse: number; // kWh/m²/år
  heatingEnergyUse: number; // kWh/m²/år
  tek17Requirement: number; // kWh/m²/år based on building type
  compliance: TEK17Compliance;
  breakdown: EnergyBreakdown;
  recommendations: EnergyRecommendation[];
}

export type EnergyGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface TEK17Compliance {
  isCompliant: boolean;
  deviation: number; // Positive = over limit, negative = under limit
  requirement: number; // kWh/m²/år
  actual: number; // kWh/m²/år
}

export interface EnergyBreakdown {
  heating: number; // Percentage (typically 70%)
  lighting: number; // Percentage (typically 15%)
  ventilation: number; // Percentage (typically 10%)
  hotWater: number; // Percentage (typically 5%)
}

export interface EnergyRecommendation {
  category: 'heating' | 'lighting' | 'ventilation' | 'insulation' | 'windows';
  title: string;
  description: string;
  estimatedSavings: number; // kWh/år
  estimatedCost: number; // NOK
  paybackYears: number;
  priority: 'high' | 'medium' | 'low';
}

// Investment Calculations
export interface InvestmentGuidance {
  annualEnergyWaste: number; // kWh/år
  annualCostWaste: number; // NOK/år (based on SSB electricity prices)
  conservativeInvestmentRoom: number; // NOK (7 years of savings)
  breakdown: InvestmentBreakdown;
  recommendations: InvestmentRecommendation[];
}

export interface InvestmentBreakdown {
  heating: {
    amount: number; // NOK (70% of investment room)
    percentage: number; // 70
    description: string;
  };
  lighting: {
    amount: number; // NOK (15% of investment room)
    percentage: number; // 15
    description: string;
  };
  other: {
    amount: number; // NOK (15% of investment room)
    percentage: number; // 15
    description: string;
  };
}

export interface InvestmentRecommendation {
  system: 'heating' | 'lighting' | 'insulation' | 'ventilation';
  title: string;
  description: string;
  estimatedCost: number; // NOK
  annualSavings: number; // NOK/år
  paybackPeriod: number; // years
  priority: 'high' | 'medium' | 'low';
}

// Norwegian Data Sources
export interface NorwegianDataSources {
  kartverket: {
    endpoint: string;
    apiKey?: string;
  };
  ssb: {
    electricityPrice: number; // kr/kWh current price
    lastUpdated: Date;
  };
  tek17: {
    standards: Record<BuildingType, number>; // kWh/m²/år requirements
  };
  sintef: {
    energyBreakdown: EnergyBreakdown;
    source: string;
  };
  enova: {
    endpoint: string;
    apiKey?: string;
  };
}

// Enova (Norwegian energy certificate database)
export interface EnovaStatus {
  isRegistered: boolean;
  energyGrade?: EnergyGrade;
  registrationDate?: Date;
  validUntil?: Date;
  status: 'Registrert' | 'Ikke registrert' | 'Utløpt';
}

// API Response Types
export interface KartverketResponse {
  adresser: Array<{
    adressetekst: string;
    koordinater: {
      breddegrad: number;
      lengdegrad: number;
    };
    kommune: string;
    postnummer: string;
    poststed: string;
  }>;
}

export interface SSBEnergyPriceResponse {
  spotPrice: number; // øre/kWh
  networkCost: number; // øre/kWh
  taxes: number; // øre/kWh
  totalPrice: number; // kr/kWh
  date: string;
}

// UI State Types
export interface PropertySearchState {
  query: string;
  results: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  error: string | null;
}

export interface EnergyDashboardState {
  buildingData: BuildingData | null;
  energyAnalysis: EnergyAnalysis | null;
  investmentGuidance: InvestmentGuidance | null;
  enovaStatus: EnovaStatus | null;
  isCalculating: boolean;
  error: string | null;
}

export interface AppState {
  propertySearch: PropertySearchState;
  energyDashboard: EnergyDashboardState;
  ui: {
    theme: 'light' | 'dark';
    language: 'nb' | 'en';
  };
}

// Form Types
export interface PropertySearchForm {
  address: string;
}

export interface BuildingDataForm {
  buildingType: BuildingType;
  totalArea: number;
  heatedArea: number;
  buildingYear?: number;
  heatingSystems: EnergySource<HeatingSystem>[];  // Multiple heating sources with percentages
  lightingSystems: EnergySource<LightingSystem>[];  // Multiple lighting types with percentages
  ventilationSystem: VentilationSystem;
  hotWaterSystems: EnergySource<HotWaterSystem>[];  // Multiple hot water sources with percentages
}

// Constants
export const TEK17_REQUIREMENTS: Record<BuildingType, number> = {
  Småhus: 115,
  Kontor: 115,
  Handel: 150,
  Hotell: 170,
  Skole: 110,
  Universitet: 120,
  Sykehus: 255,
  Kultur: 120,
  Flerbolig: 115,
  Barnehage: 110,
  Idrett: 150,
  Industri: 180,
  Andre: 150,
};

export const SINTEF_ENERGY_BREAKDOWN: EnergyBreakdown = {
  heating: 70,
  lighting: 15,
  ventilation: 10,
  hotWater: 5,
};

// Utility Types
export type CreatePropertyAnalysis = (
  buildingData: BuildingData
) => Promise<{
  energyAnalysis: EnergyAnalysis;
  investmentGuidance: InvestmentGuidance;
  enovaStatus: EnovaStatus;
}>;

export type CalculateInvestmentRoom = (
  annualWasteCost: number,
  multiplier?: number
) => number;

export type GetEnergyGrade = (
  energyUse: number,
  buildingType: BuildingType
) => EnergyGrade;