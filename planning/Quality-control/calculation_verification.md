# Calculation Verification - Waterfall Dashboard Project

**Purpose**: Verify mathematical formulas and calculations for accuracy and compliance
**Last Updated**: January 25, 2025
**Status**: Formula documentation and test case development

## TEK17 Energy Frame Calculations

### Small Houses (Småhus) Energy Frame Formula
**Formula**: `Energy Frame = 100 + 1600/A [kWh/m² per year]`
**Where**: A = heated BRA in m²
**Source**: `Technical-requirements_TEK17_claude.md`
**Original Regulation**: TEK17 § 14-2
**Verification Status**: ✅ VERIFIED - Official formula

**Test Cases**:
```javascript
// Test Case 1: Typical small house
const heatedBRA = 150; // m²
const energyFrame = 100 + (1600 / heatedBRA);
// Expected Result: 100 + 10.67 = 110.67 kWh/m²/year
console.assert(Math.abs(energyFrame - 110.67) < 0.1, "Small house calculation failed");

// Test Case 2: Large house
const heatedBRA_large = 200; // m²
const energyFrame_large = 100 + (1600 / heatedBRA_large);
// Expected Result: 100 + 8 = 108 kWh/m²/year
console.assert(Math.abs(energyFrame_large - 108) < 0.1, "Large house calculation failed");

// Test Case 3: Minimum realistic size
const heatedBRA_min = 70; // m² (minimum for non-holiday homes)
const energyFrame_min = 100 + (1600 / heatedBRA_min);
// Expected Result: 100 + 22.86 = 122.86 kWh/m²/year
console.assert(Math.abs(energyFrame_min - 122.86) < 0.1, "Minimum house calculation failed");
```

**Implementation Status**: Not yet implemented
**Code Location**: TBD - will be in energy calculation service

### Fixed Energy Frames for Building Categories
**Source**: TEK17 § 14-2 via Technical-requirements document
**Verification Status**: ✅ VERIFIED - Regulatory table

| Building Category | Energy Frame [kWh/m²/year] | Test Value | Verification |
|-------------------|---------------------------|------------|--------------|
| Residential blocks | 95 | 95.0 | ✅ VERIFIED |
| Office buildings | 115 | 115.0 | ✅ VERIFIED |
| Schools | 110 | 110.0 | ✅ VERIFIED |
| Kindergartens | 135 | 135.0 | ✅ VERIFIED |
| Hospitals | 225 | 225.0 | ✅ VERIFIED |
| Hotels | 170 | 170.0 | ✅ VERIFIED |
| Retail | 180 | 180.0 | ✅ VERIFIED |

## NS 3031:2014 Heat Loss Calculations

### Heat Loss Coefficient Formula
**Formula**: `HT = Σ(Ui × Ai) + Σ(ψj × lj) [W/K]`
**Where**:
- Ui = U-value for element i [W/(m²K)]
- Ai = Area of element i [m²]
- ψj = Linear thermal bridge coefficient [W/(mK)]
- lj = Length of linear thermal bridge [m]

**Source**: NS 3031:2014 via Technical-requirements document
**Verification Status**: ✅ VERIFIED - Published standard

**Test Case - Simple Building**:
```javascript
// Test building: 10m x 10m x 3m house
const buildingData = {
  walls: { area: 120, uValue: 0.18 }, // 4 walls: 10*3*4 = 120 m²
  roof: { area: 100, uValue: 0.13 },  // 10*10 = 100 m²
  floor: { area: 100, uValue: 0.10 }, // 10*10 = 100 m²
  windows: { area: 20, uValue: 0.80 } // 20 m² total windows
};

const thermalBridges = {
  wallFloor: { length: 40, psiValue: 0.05 }, // 10*4 = 40m perimeter
  wallRoof: { length: 40, psiValue: 0.05 },  // 10*4 = 40m perimeter
  windows: { length: 60, psiValue: 0.03 }    // Estimated window perimeter
};

// Calculate HT
const transmissionLoss =
  (buildingData.walls.area * buildingData.walls.uValue) +
  (buildingData.roof.area * buildingData.roof.uValue) +
  (buildingData.floor.area * buildingData.floor.uValue) +
  (buildingData.windows.area * buildingData.windows.uValue);

const thermalBridgeLoss =
  (thermalBridges.wallFloor.length * thermalBridges.wallFloor.psiValue) +
  (thermalBridges.wallRoof.length * thermalBridges.wallRoof.psiValue) +
  (thermalBridges.windows.length * thermalBridges.windows.psiValue);

const HT = transmissionLoss + thermalBridgeLoss;

// Expected calculations:
// Transmission: (120*0.18) + (100*0.13) + (100*0.10) + (20*0.80) = 21.6 + 13 + 10 + 16 = 60.6 W/K
// Thermal bridges: (40*0.05) + (40*0.05) + (60*0.03) = 2 + 2 + 1.8 = 5.8 W/K
// Total HT = 60.6 + 5.8 = 66.4 W/K

console.assert(Math.abs(HT - 66.4) < 0.1, "Heat loss coefficient calculation failed");
```

**Implementation Status**: Not yet implemented
**Code Location**: TBD - will be in NS 3031 calculation engine

### Ventilation Heat Loss Formula
**Formula**: `HV = V̇ × ρcp × (1 - ηv) [W/K]`
**Where**:
- V̇ = ventilation air rate [m³/s]
- ρcp = volumetric heat capacity of air ≈ 1200 J/(m³K) or 0.33 Wh/(m³K)
- ηv = heat recovery efficiency [decimal]

**Source**: NS 3031:2014 via Technical-requirements document
**Verification Status**: ✅ VERIFIED - Standard air properties

**Test Case**:
```javascript
// Typical residential ventilation: 0.5 air changes per hour for 300m³ volume
const buildingVolume = 300; // m³ (10m x 10m x 3m)
const airChangesPerHour = 0.5; // h⁻¹
const ventilationRate = (buildingVolume * airChangesPerHour) / 3600; // Convert to m³/s
const airHeatCapacity = 1200; // J/(m³K)
const heatRecoveryEfficiency = 0.8; // 80% efficient

const HV = ventilationRate * airHeatCapacity * (1 - heatRecoveryEfficiency);

// Expected calculation:
// V̇ = 300 * 0.5 / 3600 = 0.0417 m³/s
// HV = 0.0417 * 1200 * (1 - 0.8) = 0.0417 * 1200 * 0.2 = 10.0 W/K

console.assert(Math.abs(HV - 10.0) < 0.1, "Ventilation heat loss calculation failed");
```

**Implementation Status**: Not yet implemented

## Norwegian Building Standards Verification

### Thermal Transmittance (U-value) Requirements
**Source**: TEK17 § 14-3 via Technical-requirements document
**Verification Status**: ✅ VERIFIED - Regulatory minimums

**Standard Requirements**:
```javascript
const tek17_standard_requirements = {
  exteriorWalls: { max: 0.18, unit: "W/(m²K)" },
  roofs: { max: 0.13, unit: "W/(m²K)" },
  floors: { max: 0.10, unit: "W/(m²K)" },
  windows: { max: 0.80, unit: "W/(m²K)" }
};

const tek17_minimum_requirements = {
  exteriorWalls: { max: 0.22, unit: "W/(m²K)" },
  roofs: { max: 0.18, unit: "W/(m²K)" },
  floors: { max: 0.18, unit: "W/(m²K)" },
  windows: { max: 1.2, unit: "W/(m²K)" },
  airLeakage: { max: 1.5, unit: "h⁻¹ at 50 Pa" }
};
```

**Test Function**:
```javascript
function checkTEK17Compliance(building) {
  const compliance = {
    meetsStandard: true,
    meetsMinimum: true,
    details: {}
  };

  // Check against standard requirements
  Object.keys(tek17_standard_requirements).forEach(component => {
    const required = tek17_standard_requirements[component].max;
    const actual = building[component];

    compliance.details[component] = {
      actual: actual,
      standardRequired: required,
      minimumRequired: tek17_minimum_requirements[component].max,
      meetsStandard: actual <= required,
      meetsMinimum: actual <= tek17_minimum_requirements[component].max
    };

    if (actual > required) compliance.meetsStandard = false;
    if (actual > tek17_minimum_requirements[component].max) compliance.meetsMinimum = false;
  });

  return compliance;
}
```

**Implementation Status**: Framework defined, needs integration

## Energy Balance Calculations

### Monthly Energy Balance (Simplified)
**Formula**: `Enet = Qloss - ηgain × Qgain`
**Where**:
- Enet = net energy need for heating
- Qloss = total heat loss
- Qgain = total free heat gains (internal + solar)
- ηgain = utilization factor for gains

**Source**: NS 3031:2014 methodology
**Verification Status**: ⚠️ COMPLEX - Requires full implementation to verify

**Test Case Structure** (Implementation required):
```javascript
// Monthly calculation example for January
const january_conditions = {
  outdoorTemp: -5, // °C average for Oslo
  indoorTemp: 21,  // °C standard setpoint
  hoursInMonth: 31 * 24, // 744 hours

  // Building from previous test case
  HT: 66.4, // W/K from transmission losses
  HV: 10.0,  // W/K from ventilation

  // Internal gains (W)
  internalGains: {
    people: 2 * 100, // 2 people * 100W each
    lighting: 15 * 100 / 1000, // 15 kWh/m²/year / 12 months / hours * area
    equipment: 25 * 100 / 1000  // Similar calculation
  },

  // Solar gains (limited in January)
  solarGains: 50 // W average for month
};

// This requires full implementation to verify
// Qloss = (HT + HV) × ΔT × hours = (66.4 + 10.0) × (21-(-5)) × 744
// Expected: 76.4 × 26 × 744 = 1,481,030 Wh = 1,481 kWh for January
```

**Implementation Status**: Framework defined, complex calculation needs full development

## Quality Control Checklist

### Formula Verification Status
- ✅ TEK17 Energy Frame formulas - VERIFIED
- ✅ Heat Loss Coefficient (HT) - VERIFIED
- ✅ Ventilation Heat Loss (HV) - VERIFIED
- ✅ U-value requirements - VERIFIED
- ⚠️ Monthly energy balance - NEEDS IMPLEMENTATION
- ⚠️ Solar gain calculations - NEEDS RESEARCH
- ⚠️ Internal gain standards - NEEDS VERIFICATION

### Test Case Status
- ✅ Small house energy frame - TEST CASES COMPLETE
- ✅ Heat loss coefficient - TEST CASES COMPLETE
- ✅ Ventilation heat loss - TEST CASES COMPLETE
- ⚠️ Monthly energy balance - TEST FRAMEWORK ONLY
- ❌ Full building analysis - NOT YET DEVELOPED

### Implementation Requirements
1. Create calculation service with verified formulas
2. Implement test cases as unit tests
3. Add input validation for physical constraints
4. Create compliance checking functions
5. Develop monthly calculation engine

---

## Notes
- All formulas marked "VERIFIED" are ready for implementation
- Test cases should be implemented as automated unit tests
- Complex calculations need step-by-step verification during development
- Monthly energy balance requires careful implementation of NS 3031:2014 methodology
- Consider external validation against established tools like SIMIEN for complex cases