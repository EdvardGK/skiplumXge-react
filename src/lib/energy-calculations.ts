import {
  BuildingType,
  HeatingSystem,
  LightingSystem,
  VentilationSystem,
  HotWaterSystem,
  EnergyGrade,
  TEK17_REQUIREMENTS,
  BuildingData,
  EnergyAnalysis,
  EnergySource,
  InvestmentGuidance,
  InvestmentRecommendation
} from '@/types/norwegian-energy';
import { getCurrentElectricityPriceSync, FALLBACK_ELECTRICITY_PRICE, type NorwegianPriceZone } from '@/lib/electricity-pricing';

// Norwegian investment analysis constants
const NORWEGIAN_DISCOUNT_RATE = 0.06; // 6% conservative discount rate for energy investments
const INVESTMENT_PERIOD_YEARS = 10; // Standard investment period for energy upgrades

// NPV calculation for Norwegian energy investments
function calculateNPV(annualSavings: number, discountRate: number = NORWEGIAN_DISCOUNT_RATE, years: number = INVESTMENT_PERIOD_YEARS): number {
  if (annualSavings <= 0) return 0;

  // NPV = Sum of (Annual Savings / (1 + discount rate)^year) for each year
  let npv = 0;
  for (let year = 1; year <= years; year++) {
    npv += annualSavings / Math.pow(1 + discountRate, year);
  }
  return Math.round(npv);
}

// Calculate present value factor for annuity
function getPresentValueFactor(discountRate: number = NORWEGIAN_DISCOUNT_RATE, years: number = INVESTMENT_PERIOD_YEARS): number {
  return (1 - Math.pow(1 + discountRate, -years)) / discountRate;
}

// Dynamic electricity pricing based on real NVE data
function getElectricityPrice(zone: NorwegianPriceZone = 'NO1'): number {
  try {
    // Use synchronous version for immediate calculations
    return getCurrentElectricityPriceSync(zone);
  } catch (error) {
    console.warn('Failed to get dynamic electricity price, using fallback:', error);
    return FALLBACK_ELECTRICITY_PRICE;
  }
}

// Energy consumption factors by system type (kWh/m²/år) - ELECTRICAL consumption only
const HEATING_CONSUMPTION: Record<HeatingSystem, number> = {
  'Elektrisitet': 120,
  'Varmepumpe': 40,
  'Bergvarme': 35,
  'Fjernvarme': 60,
  'Biobrensel': 5, // Only electricity for circulation fans, etc.
  'Olje': 15, // Only electricity for burner and circulation
  'Gass': 20, // Only electricity for ignition and circulation
};

const LIGHTING_CONSUMPTION: Record<LightingSystem, number> = {
  'LED': 8,
  'Fluorescerende': 15,
  'Halogen': 25,
  'Glødepære': 35,
};

const VENTILATION_CONSUMPTION: Record<VentilationSystem, number> = {
  'Naturlig': 2,
  'Mekanisk tilluft': 12,
  'Mekanisk fraluft': 10,
  'Balansert med varmegjenvinning': 8,
  'Balansert uten varmegjenvinning': 15,
};

const HOT_WATER_CONSUMPTION: Record<HotWaterSystem, number> = {
  'Elektrisitet': 25,
  'Varmepumpe': 12,
  'Solvarme': 3, // Only electricity for circulation pumps
  'Fjernvarme': 15,
  'Olje': 8, // Only electricity for burner and circulation
  'Gass': 10, // Only electricity for ignition and circulation
};

export interface BuildingEnergyData {
  buildingType: BuildingType;
  totalArea: number;
  heatedArea: number;
  heatingSystem: HeatingSystem;
  lightingSystem: LightingSystem;
  ventilationSystem: VentilationSystem;
  hotWaterSystem: HotWaterSystem;
  buildingYear?: number;
  priceZone?: NorwegianPriceZone; // Norwegian electricity pricing zone
}

export interface BuildingEnergyDataMultiple {
  buildingType: BuildingType;
  totalArea: number;
  heatedArea: number;
  heatingSystems: EnergySource<HeatingSystem>[];
  lightingSystems: EnergySource<LightingSystem>[];
  ventilationSystem: VentilationSystem;
  hotWaterSystems: EnergySource<HotWaterSystem>[];
  buildingYear?: number;
  priceZone?: NorwegianPriceZone;
}

export interface EnergyCalculationResult {
  totalEnergyUse: number; // kWh/m²/år
  tek17Requirement: number; // kWh/m²/år
  isCompliant: boolean;
  deviation: number; // %
  energyGrade: EnergyGrade;
  annualEnergyConsumption: number; // kWh/år total
  annualEnergyCost: number; // kr/år
  annualWaste: number; // kWh/år over TEK17
  annualWasteCost: number; // kr/år waste cost
  investmentRoom: number; // kr (7 year NPV)
  npvOfWaste: number; // Full NPV calculation for reference
  presentValueFactor: number; // Present value factor used in calculations
  wastePerM2: number; // kWh/m²/år waste per square meter
  breakdown: {
    heating: number;
    lighting: number;
    ventilation: number;
    hotWater: number;
  };
}

// Calculate weighted consumption for multiple energy sources
function calculateWeightedConsumption<T extends string>(
  sources: EnergySource<T>[],
  consumptionMap: Record<T, number>
): number {
  if (!sources || sources.length === 0) return 0;

  return sources.reduce((total, source) => {
    const consumption = consumptionMap[source.type as T] || 0;
    return total + (consumption * (source.percentage / 100));
  }, 0);
}

export function calculateEnergyAnalysis(data: BuildingEnergyData): EnergyCalculationResult {
  // Get TEK17 requirement for building type
  const tek17Requirement = TEK17_REQUIREMENTS[data.buildingType];

  // Calculate energy consumption by system (kWh/m²/år)
  const heatingConsumption = HEATING_CONSUMPTION[data.heatingSystem];
  const lightingConsumption = LIGHTING_CONSUMPTION[data.lightingSystem];
  const ventilationConsumption = VENTILATION_CONSUMPTION[data.ventilationSystem];
  const hotWaterConsumption = HOT_WATER_CONSUMPTION[data.hotWaterSystem];

  // Building age factor (newer buildings are more efficient)
  const currentYear = new Date().getFullYear();
  const buildingAge = data.buildingYear ? currentYear - data.buildingYear : 24; // Default to 2000
  const ageFactor = Math.max(0.8, Math.min(1.2, 1 + (buildingAge - 20) * 0.01)); // 0.8 to 1.2 range

  // Calculate total energy use per m² (adjusted for building age)
  const totalEnergyUse = Math.round(
    (heatingConsumption + lightingConsumption + ventilationConsumption + hotWaterConsumption) * ageFactor
  );

  // Compliance check
  const isCompliant = totalEnergyUse <= tek17Requirement;
  const deviation = Math.round(((totalEnergyUse - tek17Requirement) / tek17Requirement) * 100);

  // Energy grade calculation
  const energyGrade = calculateEnergyGrade(totalEnergyUse, data.buildingType);

  // Get current electricity price (36-month average from SSB data) for the specific zone
  const electricityPrice = getElectricityPrice(data.priceZone || 'NO1');

  // Total annual consumption and costs
  const annualEnergyConsumption = totalEnergyUse * data.heatedArea;
  const annualEnergyCost = Math.round(annualEnergyConsumption * electricityPrice);

  // Waste calculation (only if over TEK17 requirement)
  const wastePerM2 = Math.max(0, totalEnergyUse - tek17Requirement);
  const annualWaste = wastePerM2 * data.heatedArea;
  const annualWasteCost = Math.round(annualWaste * electricityPrice);

  // NPV-based investment analysis (10 years at 6% discount rate)
  const presentValueFactor = getPresentValueFactor(); // 7.36 for 10 years at 6%
  const npvOfWaste = calculateNPV(annualWasteCost); // Full NPV calculation for reference
  const investmentRoom = Math.round(annualWasteCost * presentValueFactor);

  // Energy breakdown by system (actual percentages based on user's systems)
  const breakdown = {
    heating: Math.round((heatingConsumption / totalEnergyUse) * 100),
    lighting: Math.round((lightingConsumption / totalEnergyUse) * 100),
    ventilation: Math.round((ventilationConsumption / totalEnergyUse) * 100),
    hotWater: Math.round((hotWaterConsumption / totalEnergyUse) * 100),
  };

  return {
    totalEnergyUse,
    tek17Requirement,
    isCompliant,
    deviation,
    energyGrade,
    annualEnergyConsumption,
    annualEnergyCost,
    annualWaste,
    annualWasteCost,
    investmentRoom,
    npvOfWaste,
    presentValueFactor,
    wastePerM2,
    breakdown,
  };
}

/**
 * Enhanced energy analysis that handles multiple energy sources with percentages
 */
export function calculateEnergyAnalysisMultiple(data: BuildingEnergyDataMultiple): EnergyCalculationResult {
  // Get TEK17 requirement for building type
  const tek17Requirement = TEK17_REQUIREMENTS[data.buildingType];

  // Calculate weighted energy consumption by system (kWh/m²/år)
  const heatingConsumption = calculateWeightedConsumption(data.heatingSystems, HEATING_CONSUMPTION);
  const lightingConsumption = calculateWeightedConsumption(data.lightingSystems, LIGHTING_CONSUMPTION);
  const ventilationConsumption = VENTILATION_CONSUMPTION[data.ventilationSystem];
  const hotWaterConsumption = calculateWeightedConsumption(data.hotWaterSystems, HOT_WATER_CONSUMPTION);

  // Building age factor (newer buildings are more efficient)
  const currentYear = new Date().getFullYear();
  const buildingAge = data.buildingYear ? currentYear - data.buildingYear : 24; // Default to 2000
  const ageFactor = Math.max(0.8, Math.min(1.2, 1 + (buildingAge - 20) * 0.01)); // 0.8 to 1.2 range

  // Calculate total energy use per m² (adjusted for building age)
  const totalEnergyUse = Math.round(
    (heatingConsumption + lightingConsumption + ventilationConsumption + hotWaterConsumption) * ageFactor
  );

  // Compliance check
  const isCompliant = totalEnergyUse <= tek17Requirement;
  const deviation = Math.round(((totalEnergyUse - tek17Requirement) / tek17Requirement) * 100);

  // Energy grade calculation
  const energyGrade = calculateEnergyGrade(totalEnergyUse, data.buildingType);

  // Get current electricity price (36-month average from SSB data) for the specific zone
  const electricityPrice = getElectricityPrice(data.priceZone || 'NO1');

  // Total annual consumption and costs
  const annualEnergyConsumption = totalEnergyUse * data.heatedArea;
  const annualEnergyCost = Math.round(annualEnergyConsumption * electricityPrice);

  // Waste calculation (only if over TEK17 requirement)
  const wastePerM2 = Math.max(0, totalEnergyUse - tek17Requirement);
  const annualWaste = wastePerM2 * data.heatedArea;
  const annualWasteCost = Math.round(annualWaste * electricityPrice);

  // NPV-based investment analysis (10 years at 6% discount rate)
  const presentValueFactor = getPresentValueFactor(); // 7.36 for 10 years at 6%
  const npvOfWaste = calculateNPV(annualWasteCost); // Full NPV calculation for reference
  const investmentRoom = Math.round(annualWasteCost * presentValueFactor);

  // Energy breakdown by system (actual percentages based on user's systems)
  const breakdown = {
    heating: Math.round((heatingConsumption / totalEnergyUse) * 100),
    lighting: Math.round((lightingConsumption / totalEnergyUse) * 100),
    ventilation: Math.round((ventilationConsumption / totalEnergyUse) * 100),
    hotWater: Math.round((hotWaterConsumption / totalEnergyUse) * 100),
  };

  return {
    totalEnergyUse,
    tek17Requirement,
    isCompliant,
    deviation,
    energyGrade,
    annualEnergyConsumption,
    annualEnergyCost,
    annualWaste,
    annualWasteCost,
    investmentRoom,
    npvOfWaste,
    presentValueFactor,
    wastePerM2,
    breakdown,
  };
}

export function calculateEnergyGrade(energyUse: number, buildingType: BuildingType): EnergyGrade {
  const requirement = TEK17_REQUIREMENTS[buildingType];
  const ratio = energyUse / requirement;

  // Energy grade thresholds based on TEK17 requirements
  if (ratio <= 0.5) return 'A';
  if (ratio <= 0.75) return 'B';
  if (ratio <= 1.0) return 'C';
  if (ratio <= 1.25) return 'D';
  if (ratio <= 1.5) return 'E';
  if (ratio <= 2.0) return 'F';
  return 'G';
}

export function getInvestmentBreakdown(totalInvestmentRoom: number) {
  return {
    heating: {
      amount: Math.round(totalInvestmentRoom * 0.7),
      percentage: 70,
      description: 'Varmepumpe, isolasjon, vinduer',
    },
    lighting: {
      amount: Math.round(totalInvestmentRoom * 0.15),
      percentage: 15,
      description: 'LED-belysning med smart styring',
    },
    other: {
      amount: Math.round(totalInvestmentRoom * 0.15),
      percentage: 15,
      description: 'Ventilasjon, tetting, andre tiltak',
    },
  };
}

/**
 * Format Norwegian currency with proper thousand separators
 * @param amount Amount in NOK
 * @returns Formatted string with Norwegian thousand separators
 */
export function formatNOK(amount: number): string {
  return amount.toLocaleString('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format energy consumption with proper units
 * @param amount Energy amount in kWh
 * @returns Formatted string with Norwegian thousand separators and kWh unit
 */
export function formatEnergyUse(amount: number): string {
  return `${amount.toLocaleString('nb-NO')} kWh`;
}

/**
 * Get the current electricity price used in calculations
 * @param zone Norwegian pricing zone (defaults to NO1)
 * @returns Current electricity price in kr/kWh (36-month average from SSB data)
 */
export function getCurrentElectricityPriceForDisplay(zone: NorwegianPriceZone = 'NO1'): number {
  return getElectricityPrice(zone);
}

/**
 * Adapter function to convert BuildingData to BuildingEnergyData and perform energy analysis
 */
export function performEnergyAnalysis(buildingData: BuildingData): EnergyAnalysis {
  // Get primary systems (highest percentage or first in list)
  const primaryHeating = buildingData.energySystems.heating[0]?.type || 'Elektrisitet';
  const primaryLighting = buildingData.energySystems.lighting[0]?.type || 'LED';
  const primaryHotWater = buildingData.energySystems.hotWater[0]?.type || 'Elektrisitet';

  // Convert BuildingData to BuildingEnergyData format (using primary systems for now)
  const energyData: BuildingEnergyData = {
    buildingType: buildingData.type,
    totalArea: buildingData.totalArea,
    heatedArea: buildingData.heatedArea,
    heatingSystem: primaryHeating as HeatingSystem,
    lightingSystem: primaryLighting as LightingSystem,
    ventilationSystem: buildingData.energySystems.ventilation,
    hotWaterSystem: primaryHotWater as HotWaterSystem,
    buildingYear: buildingData.buildingYear,
    priceZone: 'NO1', // Default to Oslo region
  };

  // Perform the energy calculation
  const result = calculateEnergyAnalysis(energyData);

  // Convert EnergyCalculationResult to EnergyAnalysis format
  return {
    energyGrade: result.energyGrade,
    totalEnergyUse: result.totalEnergyUse,
    heatingEnergyUse: result.breakdown.heating, // Use percentage as proxy for heating energy
    tek17Requirement: result.tek17Requirement,
    compliance: {
      isCompliant: result.isCompliant,
      deviation: result.deviation,
      requirement: result.tek17Requirement,
      actual: result.totalEnergyUse,
    },
    breakdown: {
      heating: result.breakdown.heating,
      lighting: result.breakdown.lighting,
      ventilation: result.breakdown.ventilation,
      hotWater: result.breakdown.hotWater,
    },
    recommendations: [], // Empty array - will be populated by calculateInvestmentGuidance
  };
}

/**
 * Calculate investment guidance based on building data and energy analysis
 */
export function calculateInvestmentGuidance(
  buildingData: BuildingData,
  energyAnalysis: EnergyAnalysis
): InvestmentGuidance {
  // Use the enhanced energy analysis for multiple sources
  const energyData: BuildingEnergyDataMultiple = {
    buildingType: buildingData.type,
    totalArea: buildingData.totalArea,
    heatedArea: buildingData.heatedArea,
    heatingSystems: buildingData.energySystems.heating,
    lightingSystems: buildingData.energySystems.lighting,
    ventilationSystem: buildingData.energySystems.ventilation,
    hotWaterSystems: buildingData.energySystems.hotWater,
    buildingYear: buildingData.buildingYear,
    priceZone: 'NO1',
  };

  const result = calculateEnergyAnalysisMultiple(energyData);
  const breakdown = getInvestmentBreakdown(result.investmentRoom);

  // Generate recommendations based on current systems
  const recommendations: InvestmentRecommendation[] = [];

  // Helper function to check if a system type exists with significant percentage
  const hasSystemType = <T>(systems: EnergySource<T>[], type: T, minPercentage = 30): boolean => {
    return systems.some(s => s.type === type && s.percentage >= minPercentage);
  };

  // Helper function to get total percentage for a system type
  const getSystemPercentage = <T>(systems: EnergySource<T>[], type: T): number => {
    return systems.filter(s => s.type === type).reduce((sum, s) => sum + s.percentage, 0);
  };

  // Heating recommendations
  const electricHeatingPercentage = getSystemPercentage(buildingData.energySystems.heating, 'Elektrisitet');
  if (electricHeatingPercentage > 30) {
    recommendations.push({
      system: 'heating',
      title: 'Installere varmepumpe',
      description: `Redusere ${electricHeatingPercentage}% elektrisk oppvarming med varmepumpe (60-70% besparelse)`,
      annualSavings: Math.round(result.annualWasteCost * 0.7 * (electricHeatingPercentage / 100)),
      estimatedCost: breakdown.heating.amount,
      paybackPeriod: Math.round(breakdown.heating.amount / (result.annualWasteCost * 0.7 * (electricHeatingPercentage / 100))),
      priority: electricHeatingPercentage > 60 ? 'high' : 'medium',
    });
  }

  // Lighting recommendations - if less than 70% LED
  const ledPercentage = getSystemPercentage(buildingData.energySystems.lighting, 'LED');
  if (ledPercentage < 70) {
    const nonLedPercentage = 100 - ledPercentage;
    recommendations.push({
      system: 'lighting',
      title: 'Oppgradere til LED-belysning',
      description: `Erstatte ${nonLedPercentage}% av belysning med smart LED-system`,
      annualSavings: Math.round(result.annualWasteCost * 0.15 * (nonLedPercentage / 100)),
      estimatedCost: breakdown.lighting.amount,
      paybackPeriod: Math.round(breakdown.lighting.amount / (result.annualWasteCost * 0.15 * (nonLedPercentage / 100))),
      priority: nonLedPercentage > 50 ? 'high' : 'medium',
    });
  }

  return {
    annualEnergyWaste: result.annualWaste,
    annualCostWaste: result.annualWasteCost,
    conservativeInvestmentRoom: result.investmentRoom,
    breakdown,
    recommendations,
  };
}