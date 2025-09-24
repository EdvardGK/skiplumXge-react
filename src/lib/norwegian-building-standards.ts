/**
 * Norwegian Building Standards and Energy Consumption Data
 *
 * Data sources:
 * - NVE Report 2019-31: Official Norwegian energy consumption by building type
 * - SSB 10573: Residential energy consumption data (2022)
 * - Norwegian building regulations (TEK17)
 */

import { BuildingType } from '@/types/norwegian-energy';

// Energy consumption data from NVE Report 2019-31 and SSB
const ENERGY_CONSUMPTION_PER_M2: Record<BuildingType, number> = {
  // Residential (from SSB 2022 data)
  'Småhus': 150,           // Single-family homes
  'Flerbolig': 159,        // Multi-family buildings

  // Non-residential (from NVE Report 2019-31)
  'Barnehage': 200,        // Kindergarten
  'Kontor': 235,           // Office buildings
  'Skole': 170,            // Schools
  'Universitet': 180,      // Universities (similar to schools but higher density)
  'Sykehus': 380,          // Hospitals
  'Hotell': 240,           // Hotels
  'Handel': 311,           // Commercial/retail (Forretningsbygg)
  'Kultur': 245,           // Cultural buildings
  'Idrett': 235,           // Sports facilities
  'Industri': 255,         // Light industry/workshops
  'Andre': 235             // Other (default to office)
};

/**
 * Get energy consumption per square meter for a building type
 * Based on official Norwegian data from NVE Report 2019-31
 */
export function getEnergyConsumptionPerM2(buildingType: BuildingType): number {
  return ENERGY_CONSUMPTION_PER_M2[buildingType] || 235;
}

/**
 * Calculate annual energy consumption estimate
 */
export function calculateEnergyEstimate(buildingType: BuildingType, totalArea: number): number {
  const consumptionPerM2 = getEnergyConsumptionPerM2(buildingType);
  return Math.round(totalArea * consumptionPerM2);
}

/**
 * Get ceiling height based on Norwegian building standards
 *
 * Standards:
 * - Residential: 2.4m (TEK17 minimum)
 * - Office/institutional: 2.7m (standard practice)
 * - Industrial: 4.5m (workshop/factory standard)
 * - Commercial: Size-dependent (small shops vs large stores)
 */
export function getCeilingHeight(buildingType: BuildingType, totalArea: number): number {
  switch (buildingType) {
    // Residential: 2.4m standard
    case 'Småhus':
    case 'Flerbolig':
      return 2.4;

    // Office/institutional: 2.7m standard
    case 'Kontor':
    case 'Skole':
    case 'Universitet':
    case 'Barnehage':
    case 'Sykehus':
    case 'Hotell':
    case 'Kultur':
      return 2.7;

    // Industrial: 4.5m standard
    case 'Industri':
      return 4.5;

    // Sports: Higher ceilings for ball sports
    case 'Idrett':
      return 6.0;

    // Commercial: Size-based rules
    case 'Handel':
      if (totalArea < 150) return 2.7;      // Small shops
      if (totalArea < 500) return 3.0;      // Medium stores
      return 4.5;                           // Large stores (Ikea, Biltema, etc.)

    // Other types: 2.7m default
    default:
      return 2.7;
  }
}

/**
 * Calculate building volume (m³)
 */
export function calculateBuildingVolume(
  totalArea: number,
  buildingType: BuildingType
): number {
  const ceilingHeight = getCeilingHeight(buildingType, totalArea);
  return Math.round(totalArea * ceilingHeight);
}

/**
 * Get building standards summary for display
 */
export function getBuildingStandards(buildingType: BuildingType, totalArea: number) {
  return {
    energyConsumptionPerM2: getEnergyConsumptionPerM2(buildingType),
    ceilingHeight: getCeilingHeight(buildingType, totalArea),
    energyEstimate: calculateEnergyEstimate(buildingType, totalArea),
    volume: calculateBuildingVolume(totalArea, buildingType),
    dataSource: 'NVE Rapport 2019-31 / SSB 2022'
  };
}