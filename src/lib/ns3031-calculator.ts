/**
 * NS 3031:2014 Energy Calculation Engine
 * Professional Norwegian building energy analysis according to TEK17 § 14-2
 */

export interface BuildingGeometry {
  heatedFloorArea: number;      // m² - Oppvarmet BRA
  buildingHeight: number;       // m - Average building height
  wallArea: number;             // m² - External wall area
  roofArea: number;            // m² - Roof area
  floorArea: number;           // m² - Floor area
  windowArea: number;          // m² - Total window area
  doorArea?: number;           // m² - External door area
}

export interface BuildingEnvelope {
  uValueWalls: number;         // W/m²K - U-value walls
  uValueRoof: number;          // W/m²K - U-value roof
  uValueFloor: number;         // W/m²K - U-value floor
  uValueWindows: number;       // W/m²K - U-value windows
  uValueDoors?: number;        // W/m²K - U-value doors
  normalizedThermalBridge: number; // W/m²K - Normalized thermal bridge value
  airLeakageRate: number;      // ac/h - Air leakage at 50 Pa (n50)
  solarHeatGainCoeff: number;  // 0-1 - g-value for windows
}

export interface VentilationSystem {
  systemType: 'natural' | 'mechanical_exhaust' | 'balanced_with_hr' | 'balanced_without_hr';
  airflowRate: number;         // m³/h per m² - Ventilation rate
  heatRecoveryEfficiency: number; // 0-100 % - Heat recovery efficiency
  specificFanPower: number;    // kW/(m³/s) - SFP factor
}

export interface ClimateData {
  location: string;
  monthlyTemperatures: number[]; // °C - Average outdoor temperatures (12 months)
  monthlySolarRadiation: number[][]; // kWh/m² - Solar radiation [month][orientation] N,E,S,W
}

export interface BuildingType {
  category: 'Småhus' | 'Boligblokk' | 'Kontor' | 'Skole' | 'Barnehage' | 'Sykehus' | 'Hotell' | 'Handel';
  internalHeatGain: number;    // W/m² - People + equipment + lighting
  operatingHours: number;      // hours/day - Standard operating hours
  hotWaterDemand: number;      // kWh/m²/year - DHW demand
  lightingDemand: number;      // kWh/m²/year - Lighting energy
  equipmentDemand: number;     // kWh/m²/year - Equipment energy
}

export interface EnergyCalculationResult {
  // Primary results
  totalEnergyDemand: number;           // kWh/m²/year - Total net energy demand
  heatingDemand: number;               // kWh/m²/year - Space heating demand
  coolingDemand: number;               // kWh/m²/year - Space cooling demand
  dhwDemand: number;                   // kWh/m²/year - Domestic hot water
  lightingDemand: number;              // kWh/m²/year - Lighting
  equipmentDemand: number;             // kWh/m²/year - Equipment
  fanPumpDemand: number;               // kWh/m²/year - Fans and pumps

  // TEK17 compliance
  tek17EnergyFrame: number;            // kWh/m²/year - Legal energy frame
  isCompliant: boolean;                // TEK17 compliance status
  complianceMargin: number;            // % - Margin to energy frame

  // Heat loss breakdown
  transmissionLoss: number;            // W/K - HT
  ventilationLoss: number;             // W/K - HV
  infiltrationLoss: number;            // W/K - HI
  totalHeatLoss: number;               // W/K - Total

  // Monthly breakdown
  monthlyHeating: number[];            // kWh - Monthly heating demand
  monthlyCooling: number[];            // kWh - Monthly cooling demand
  monthlySolarGains: number[];         // kWh - Monthly solar gains
  monthlyInternalGains: number[];      // kWh - Monthly internal gains
}

/**
 * Default Oslo climate data (simplified)
 */
const OSLO_CLIMATE: ClimateData = {
  location: 'Oslo',
  monthlyTemperatures: [-3, -2, 2, 7, 13, 17, 19, 18, 13, 8, 3, -1],
  monthlySolarRadiation: [
    // [N, E, S, W] kWh/m² per month
    [5, 15, 30, 15],   // Jan
    [10, 25, 60, 25],  // Feb
    [20, 50, 120, 50], // Mar
    [40, 80, 180, 80], // Apr
    [60, 110, 220, 110], // May
    [70, 120, 240, 120], // Jun
    [70, 115, 230, 115], // Jul
    [50, 90, 190, 90], // Aug
    [30, 60, 130, 60], // Sep
    [15, 35, 80, 35],  // Oct
    [8, 20, 40, 20],   // Nov
    [5, 12, 25, 12],   // Dec
  ]
};

/**
 * NS 3031:2014 standardized building data (Appendix A)
 */
const BUILDING_TYPES: Record<string, BuildingType> = {
  'Småhus': {
    category: 'Småhus',
    internalHeatGain: 5.4, // W/m² (people + equipment + lighting during operation)
    operatingHours: 16, // hours/day
    hotWaterDemand: 25, // kWh/m²/year
    lightingDemand: 15, // kWh/m²/year
    equipmentDemand: 25, // kWh/m²/year
  },
  'Boligblokk': {
    category: 'Boligblokk',
    internalHeatGain: 4.9,
    operatingHours: 16,
    hotWaterDemand: 25,
    lightingDemand: 10,
    equipmentDemand: 20,
  },
  'Kontor': {
    category: 'Kontor',
    internalHeatGain: 9.7,
    operatingHours: 10,
    hotWaterDemand: 5,
    lightingDemand: 25,
    equipmentDemand: 20,
  },
  'Skole': {
    category: 'Skole',
    internalHeatGain: 6.9,
    operatingHours: 8,
    hotWaterDemand: 10,
    lightingDemand: 20,
    equipmentDemand: 10,
  },
};

/**
 * Calculate TEK17 energy frame for building category
 */
export function calculateTEK17EnergyFrame(
  buildingCategory: string,
  heatedFloorArea: number
): number {
  switch (buildingCategory) {
    case 'Småhus':
      return 100 + (1600 / heatedFloorArea);
    case 'Boligblokk':
      return 95;
    case 'Kontor':
      return 115;
    case 'Skole':
      return 110;
    case 'Barnehage':
      return 135;
    case 'Sykehus':
      return 225;
    case 'Hotell':
      return 170;
    case 'Handel':
      return 180;
    default:
      return 115; // Default to office building
  }
}

/**
 * Calculate transmission heat loss coefficient (HT)
 * HT = Σ(Ui × Ai) + Σ(ψj × lj)
 */
export function calculateTransmissionLoss(
  geometry: BuildingGeometry,
  envelope: BuildingEnvelope
): number {
  // Main surfaces
  const wallLoss = envelope.uValueWalls * geometry.wallArea;
  const roofLoss = envelope.uValueRoof * geometry.roofArea;
  const floorLoss = envelope.uValueFloor * geometry.floorArea;
  const windowLoss = envelope.uValueWindows * geometry.windowArea;
  const doorLoss = envelope.uValueDoors ? envelope.uValueDoors * (geometry.doorArea || 0) : 0;

  // Linear thermal bridges (simplified as normalized value)
  const thermalBridgeLoss = envelope.normalizedThermalBridge * geometry.heatedFloorArea;

  return wallLoss + roofLoss + floorLoss + windowLoss + doorLoss + thermalBridgeLoss;
}

/**
 * Calculate ventilation heat loss coefficient (HV)
 * HV = V̇ × ρcp × (1 - ηv)
 */
export function calculateVentilationLoss(
  geometry: BuildingGeometry,
  ventilation: VentilationSystem
): number {
  const volumetricHeatCapacity = 0.33; // Wh/m³K for air
  const airflowRateTotal = (ventilation.airflowRate * geometry.heatedFloorArea) / 3600; // m³/s
  const heatRecoveryFactor = ventilation.heatRecoveryEfficiency / 100;

  return airflowRateTotal * volumetricHeatCapacity * 1000 * (1 - heatRecoveryFactor); // W/K
}

/**
 * Calculate infiltration heat loss coefficient (HI)
 * HI = V̇inf × ρcp
 */
export function calculateInfiltrationLoss(
  geometry: BuildingGeometry,
  envelope: BuildingEnvelope
): number {
  const volumetricHeatCapacity = 0.33; // Wh/m³K
  const buildingVolume = geometry.heatedFloorArea * geometry.buildingHeight;

  // Convert n50 to natural infiltration rate (divide by ~20 for typical conditions)
  const naturalInfiltrationRate = envelope.airLeakageRate / 20; // ac/h
  const infiltrationAirflow = (naturalInfiltrationRate * buildingVolume) / 3600; // m³/s

  return infiltrationAirflow * volumetricHeatCapacity * 1000; // W/K
}

/**
 * Calculate monthly solar gains
 */
export function calculateMonthlySolarGains(
  geometry: BuildingGeometry,
  envelope: BuildingEnvelope,
  windowOrientation: 'S' | 'N' | 'E' | 'W' | 'mixed' = 'mixed',
  climate: ClimateData = OSLO_CLIMATE
): number[] {
  const orientationIndex = windowOrientation === 'S' ? 2 : windowOrientation === 'N' ? 0 :
                          windowOrientation === 'E' ? 1 : windowOrientation === 'W' ? 3 : 2; // Default to south

  return climate.monthlySolarRadiation.map(monthData => {
    const solarRadiation = windowOrientation === 'mixed'
      ? (monthData[0] + monthData[1] + monthData[2] + monthData[3]) / 4 // Average all orientations
      : monthData[orientationIndex];

    return geometry.windowArea * envelope.solarHeatGainCoeff * solarRadiation;
  });
}

/**
 * Calculate monthly internal gains
 */
export function calculateMonthlyInternalGains(
  geometry: BuildingGeometry,
  buildingType: BuildingType
): number[] {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return daysInMonth.map(days => {
    return buildingType.internalHeatGain * geometry.heatedFloorArea * buildingType.operatingHours * days / 1000; // kWh
  });
}

/**
 * Main NS 3031:2014 energy calculation
 */
export function calculateBuildingEnergyDemand(
  geometry: BuildingGeometry,
  envelope: BuildingEnvelope,
  ventilation: VentilationSystem,
  buildingCategory: string,
  climate: ClimateData = OSLO_CLIMATE
): EnergyCalculationResult {
  // Get standardized building data
  const buildingType = BUILDING_TYPES[buildingCategory] || BUILDING_TYPES['Småhus'];

  // Calculate heat loss coefficients
  const HT = calculateTransmissionLoss(geometry, envelope);
  const HV = calculateVentilationLoss(geometry, ventilation);
  const HI = calculateInfiltrationLoss(geometry, envelope);
  const totalHeatLoss = HT + HV + HI;

  // Calculate monthly solar and internal gains
  const monthlySolarGains = calculateMonthlySolarGains(geometry, envelope, 'mixed', climate);
  const monthlyInternalGains = calculateMonthlyInternalGains(geometry, buildingType);

  // Monthly energy balance calculation
  const monthlyHeating: number[] = [];
  const monthlyCooling: number[] = [];
  const setpointTemperature = 21; // °C

  climate.monthlyTemperatures.forEach((outdoorTemp, month) => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    const hoursInMonth = daysInMonth * 24;

    // Heat loss for the month
    const temperatureDifference = setpointTemperature - outdoorTemp;
    const monthlyHeatLoss = totalHeatLoss * temperatureDifference * hoursInMonth / 1000; // kWh

    // Total gains
    const totalGains = monthlySolarGains[month] + monthlyInternalGains[month];

    // Simplified utilization factor (assumes τ = 15 hours for typical buildings)
    const gainLossRatio = totalGains / Math.max(monthlyHeatLoss, 1);
    const utilizationFactor = gainLossRatio !== 1 ?
      (1 - Math.pow(gainLossRatio, 0.8)) / (1 - Math.pow(gainLossRatio, 0.8 + 1)) :
      0.5;

    // Net heating demand
    const netHeating = Math.max(0, monthlyHeatLoss - totalGains * utilizationFactor);
    const netCooling = Math.max(0, (totalGains * utilizationFactor) - monthlyHeatLoss);

    monthlyHeating.push(netHeating);
    monthlyCooling.push(netCooling);
  });

  // Annual totals
  const annualHeating = monthlyHeating.reduce((sum, val) => sum + val, 0);
  const annualCooling = monthlyCooling.reduce((sum, val) => sum + val, 0);

  // Specific energy demands (per m²)
  const heatingDemand = annualHeating / geometry.heatedFloorArea;
  const coolingDemand = annualCooling / geometry.heatedFloorArea;
  const dhwDemand = buildingType.hotWaterDemand;
  const lightingDemand = buildingType.lightingDemand;
  const equipmentDemand = buildingType.equipmentDemand;

  // Fan and pump energy (simplified)
  const fanPumpDemand = (ventilation.airflowRate * geometry.heatedFloorArea * ventilation.specificFanPower *
    buildingType.operatingHours * 365) / (1000 * geometry.heatedFloorArea); // kWh/m²/year

  // Total energy demand
  const totalEnergyDemand = heatingDemand + coolingDemand + dhwDemand + lightingDemand + equipmentDemand + fanPumpDemand;

  // TEK17 compliance
  const tek17EnergyFrame = calculateTEK17EnergyFrame(buildingCategory, geometry.heatedFloorArea);
  const isCompliant = totalEnergyDemand <= tek17EnergyFrame;
  const complianceMargin = ((totalEnergyDemand - tek17EnergyFrame) / tek17EnergyFrame) * 100;

  return {
    totalEnergyDemand,
    heatingDemand,
    coolingDemand,
    dhwDemand,
    lightingDemand,
    equipmentDemand,
    fanPumpDemand,
    tek17EnergyFrame,
    isCompliant,
    complianceMargin,
    transmissionLoss: HT,
    ventilationLoss: HV,
    infiltrationLoss: HI,
    totalHeatLoss,
    monthlyHeating,
    monthlyCooling,
    monthlySolarGains,
    monthlyInternalGains,
  };
}