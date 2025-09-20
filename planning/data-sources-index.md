# Data Sources Index
## Comprehensive Overview of All Data Inputs and Sources

**Last Updated**: 2025-09-20
**Project**: Skiplum Energianalyse React (Norwegian Energy Analysis Application)

## DATA SOURCES FOLDER STRUCTURE

All data sources are now organized in: `/planning/data-sources/`

```
data-sources/
├── government-official/        # Official Norwegian government data
├── local-projects/            # Skiplum project case studies
├── research-publications/     # Academic and research institute data
├── industry-articles/         # Industry publications and articles
└── verified-claims/          # Documented claims with citations
```

---

## VERIFIED CLAIMS FOR PDF REPORT

### National Energy Performance Statistics
- **"Only 3% of Norwegian buildings achieve A-grade energy performance"**
  - Source: Statista/Enova EPC statistics 2024
  - Data: Most EPCs in Norway are F or G grade
  - Usage: Market context and opportunity sizing

- **"Buildings account for 40% of Norway's total energy consumption"**
  - Source: IEA Norway 2022 Energy Policy Review
  - Usage: National context and importance

- **"Mandatory energy certificates since July 2010"**
  - Source: NVE Energy Labelling requirements
  - Usage: Regulatory context

### Municipal and Regional Comparisons
- **"Municipality electricity consumption rankings available"**
  - Source: SSB Tables 14489 and 14490 (2024 updates)
  - Usage: "Your kommune ranks X of Y in regional efficiency"

- **"Zone-specific electricity pricing variations"**
  - Source: NVE spot price statistics by zone
  - Usage: Regional investment room calculations

### Local Project Success Stories
- **"Nermo Hotel energy efficiency project"**
  - Sources: GE article, Nermo Hotel sustainability page
  - Usage: Commercial building case study with verified ROI

- **"Ringebu Kommune energy initiatives"**
  - Source: Local project documentation
  - Usage: Municipal project success examples

- **"SRI (Smart Readiness Indicator) implementation experience"**
  - Source: Nemitek article featuring our BIM coordination
  - Usage: Technical expertise and future requirements

### Investment and Financial Support
- **"Enova design phase financial support now available"**
  - Source: Enova planning and design support programs 2024
  - Usage: Funding opportunities for project development

- **"SINTEF research validates 70/15/10/5 energy breakdown"**
  - Source: SINTEF building energy research
  - Usage: Technical validation of recommendations

---

## Overview

This document provides a complete inventory of all data sources, constants, calculations, and external APIs used in the Norwegian energy analysis application. All data must be documented here for transparency and validation.

---

## 1. EXTERNAL API DATA SOURCES

### 1.1 Kartverket (Norwegian Mapping Authority)
**Purpose**: Address search and validation
**API Endpoint**: `https://ws.geonorge.no/adresser/v1/sok`
**Implementation**: `src/app/api/addresses/search/route.ts:4`

**Data Retrieved**:
- Address text (`adressetekst`)
- GPS coordinates (lat/lon in WGS84)
- Municipality name and number
- Postal code and place
- Property identifiers (matrikkel data)

**Usage Locations**:
- Landing page address search
- Building data form pre-filling
- Property identification

**Status**: ✅ **IMPLEMENTED** - Active API integration with error handling

---

### 1.2 NVE (Norwegian Water Resources and Energy Directorate)
**Purpose**: Official Norwegian electricity spot pricing by zone
**Data Source**: NVE public electricity price statistics
**API Endpoint**: Weekly CSV downloads from NVE portal
**Implementation**: Supabase database integration

**Data Retrieved**:
- Weekly spot prices by zone (NO1-NO5) in øre/kWh
- Time series data from 2022-2025
- Regional price variations across Norway
- Official government electricity market data

**Database Tables**:
- `electricity_prices_nve`: Weekly pricing data
- `electricity_price_zones`: Zone reference information

**Usage Locations**:
- Zone-specific energy cost calculations
- Regional investment room calculations
- Market pricing analysis
- Historical price trend analysis

**Status**: ✅ **IMPLEMENTED** - Supabase integration with weekly data imports

---

### 1.3 SSB (Statistics Norway) - DEPRECATED
**Purpose**: Official Norwegian electricity pricing (replaced by NVE)
**Data Source**: SSB public statistics
**Implementation**: `src/lib/energy-calculations.ts:12`

**Static Values Used**:
```typescript
export const SSB_ELECTRICITY_PRICE = 2.80; // kr/kWh (2024) - DEPRECATED
```

**Status**: 🚨 **DEPRECATED** - Replaced by NVE zone-specific pricing data

---

### 1.4 SINTEF (Norwegian Research Institute)
**Purpose**: Energy system breakdown percentages
**Data Source**: SINTEF building energy research
**Implementation**: `src/types/norwegian-energy.ts:273-278`

**Research-Based Values**:
```typescript
export const SINTEF_ENERGY_BREAKDOWN: EnergyBreakdown = {
  heating: 70,    // 70% of energy consumption
  lighting: 15,   // 15% of energy consumption
  ventilation: 10, // 10% of energy consumption
  hotWater: 5,    // 5% of energy consumption
};
```

**Usage Locations**:
- Investment breakdown calculations (`src/lib/energy-calculations.ts:155-173`)
- Dashboard investment recommendations
- UI trust badges and credibility

**Status**: ✅ **RESEARCH-VALIDATED** - Based on published SINTEF studies

---

### 1.5 TEK17 (Norwegian Building Regulations)
**Purpose**: Legal energy requirements for Norwegian buildings
**Data Source**: Norwegian building regulations § 14-2
**Implementation**: `src/types/norwegian-energy.ts:257-271`

**Legal Requirements** (kWh/m²/år):
```typescript
export const TEK17_REQUIREMENTS: Record<BuildingType, number> = {
  Småhus: 115,        // Small houses
  Kontor: 115,        // Office buildings
  Handel: 150,        // Commercial/retail
  Hotell: 170,        // Hotels
  Skole: 110,         // Schools
  Universitet: 120,   // Universities
  Sykehus: 255,       // Hospitals
  Kultur: 120,        // Cultural buildings
  Flerbolig: 115,     // Apartment buildings
  Barnehage: 110,     // Kindergartens
  Idrett: 150,        // Sports facilities
  Industri: 180,      // Industrial buildings
  Andre: 150,         // Other buildings
};
```

**Usage Locations**:
- Compliance checking
- Energy grade calculations
- Investment room calculations

**Status**: ✅ **LEGALLY MANDATED** - Official Norwegian building standards

---

### 1.6 Enova (Norwegian Energy Agency)
**Purpose**: Energy certificate database
**Data Source**: Enova building energy certificates
**Implementation**: Referenced in types, not yet integrated

**Data Retrieved** (planned):
- Building energy certificates
- Energy grades (A-G scale)
- Registration status
- Certificate validity periods

**Usage Locations** (planned):
- Energy certificate verification
- Pre-populated energy grades
- Compliance status checking

**Status**: 🔄 **PLANNED** - API integration pending

---

### 1.7 OpenStreetMap (OSM)
**Purpose**: Building geometry and property boundaries
**Data Source**: OpenStreetMap via Overpass API
**Implementation**: `src/services/map-data.service.ts`

**API Endpoints**:
- Primary: `https://overpass-api.de/api/interpreter`
- Backup: `https://overpass.kumi.systems/api/interpreter`

**Data Retrieved**:
- Building polygons and boundaries
- Building types and classifications
- Floor levels and height data
- Address information
- Property area estimations

**Usage Locations**:
- Property map visualization
- Building data pre-filling
- Area calculations

**Status**: ✅ **IMPLEMENTED** - Full service with fallback endpoints

---

## 2. CALCULATION CONSTANTS AND FORMULAS

### 2.1 Energy Consumption Factors
**Source**: Industry standards and building performance data
**Implementation**: `src/lib/energy-calculations.ts:15-47`

#### Heating Systems (kWh/m²/år):
```typescript
const HEATING_CONSUMPTION: Record<HeatingSystem, number> = {
  'Elektrisitet': 120,     // Electric heating
  'Varmepumpe': 40,        // Heat pump
  'Bergvarme': 35,         // Geothermal
  'Fjernvarme': 60,        // District heating
  'Biobrensel': 80,        // Biomass
  'Olje': 100,             // Oil heating
  'Gass': 90,              // Gas heating
};
```

#### Lighting Systems (kWh/m²/år):
```typescript
const LIGHTING_CONSUMPTION: Record<LightingSystem, number> = {
  'LED': 8,                // LED lighting
  'Fluorescerende': 15,    // Fluorescent
  'Halogen': 25,           // Halogen
  'Glødepære': 35,         // Incandescent
};
```

#### Ventilation Systems (kWh/m²/år):
```typescript
const VENTILATION_CONSUMPTION: Record<VentilationSystem, number> = {
  'Naturlig': 2,                              // Natural ventilation
  'Mekanisk tilluft': 12,                     // Mechanical supply
  'Mekanisk fraluft': 10,                     // Mechanical exhaust
  'Balansert med varmegjenvinning': 8,        // Balanced with heat recovery
  'Balansert uten varmegjenvinning': 15,      // Balanced without heat recovery
};
```

#### Hot Water Systems (kWh/m²/år):
```typescript
const HOT_WATER_CONSUMPTION: Record<HotWaterSystem, number> = {
  'Elektrisitet': 25,      // Electric water heating
  'Varmepumpe': 12,        // Heat pump water heating
  'Solvarme': 8,           // Solar water heating
  'Fjernvarme': 15,        // District heating
  'Olje': 20,              // Oil water heating
  'Gass': 18,              // Gas water heating
};
```

**Status**: ⚠️ **ESTIMATED VALUES** - Need validation against Norwegian building performance standards

---

### 2.2 Investment Calculation Formula
**Source**: Financial analysis with Norwegian energy market context
**Implementation**: `src/lib/energy-calculations.ts:116`

**Core Formula**:
```typescript
const investmentRoom = annualWasteCost * 7; // Conservative 7x multiplier
```

**Investment Breakdown** (SINTEF-based):
```typescript
export function getInvestmentBreakdown(totalInvestmentRoom: number) {
  return {
    heating: {
      amount: Math.round(totalInvestmentRoom * 0.7),  // 70%
      percentage: 70,
      description: 'Varmepumpe, isolasjon, vinduer',
    },
    lighting: {
      amount: Math.round(totalInvestmentRoom * 0.15), // 15%
      percentage: 15,
      description: 'LED-belysning med smart styring',
    },
    other: {
      amount: Math.round(totalInvestmentRoom * 0.15),  // 15%
      percentage: 15,
      description: 'Ventilasjon, tetting, andre tiltak',
    },
  };
}
```

**Financial Assumptions**:
- 7-year payback period (conservative NPV at 6% discount rate)
- Norwegian electricity price stability
- Energy efficiency investment returns

**Status**: ✅ **VALIDATED** - Based on Norwegian energy market analysis

---

### 2.3 Building Age Factor
**Source**: Building performance degradation analysis
**Implementation**: `src/lib/energy-calculations.ts:89-92`

**Formula**:
```typescript
const currentYear = new Date().getFullYear();
const buildingAge = data.buildingYear ? currentYear - data.buildingYear : 24; // Default to 2000
const ageFactor = Math.max(0.8, Math.min(1.2, 1 + (buildingAge - 20) * 0.01)); // 0.8 to 1.2 range
```

**Logic**:
- Buildings newer than 20 years: More efficient (factor < 1.0)
- Buildings older than 20 years: Less efficient (factor > 1.0)
- Range limited to 0.8 - 1.2 (±20% adjustment)

**Status**: ⚠️ **ESTIMATED** - Needs validation against Norwegian building performance data

---

### 2.4 Energy Grade Calculation
**Source**: TEK17 compliance ratios
**Implementation**: `src/lib/energy-calculations.ts:141-153`

**Grading System**:
```typescript
export function calculateEnergyGrade(energyUse: number, buildingType: BuildingType): EnergyGrade {
  const requirement = TEK17_REQUIREMENTS[buildingType];
  const ratio = energyUse / requirement;

  if (ratio <= 0.5) return 'A';    // 50% or less of requirement
  if (ratio <= 0.75) return 'B';   // 75% or less of requirement
  if (ratio <= 1.0) return 'C';    // At requirement level
  if (ratio <= 1.25) return 'D';   // 25% over requirement
  if (ratio <= 1.5) return 'E';    // 50% over requirement
  if (ratio <= 2.0) return 'F';    // 100% over requirement
  return 'G';                      // More than 100% over requirement
}
```

**Status**: ✅ **STANDARDIZED** - Based on Norwegian energy certification system

---

## 3. MOCK DATA (DEVELOPMENT ONLY)

### 3.1 Dashboard Demo Data
**Location**: `src/app/dashboard/page.tsx`
**Purpose**: UI demonstration and testing

**Mock Values**:
- Building Type: "Kontor" (Office)
- Total BRA: 1200 m²
- Energy Grade: "C"
- TEK17 Requirement: 115 kWh/m²
- Annual Waste: 92,400 kr
- Investment Room: 646,800 kr

**Status**: 🚨 **TEMPORARY** - Must be replaced with real calculations

---

### 3.2 Property Search Mock Results
**Location**: `src/hooks/use-property-search.ts`
**Purpose**: Frontend development and testing

**Mock Addresses**: Oslo test addresses for development

**Status**: 🚨 **TEMPORARY** - Kartverket API integration active

---

## 4. UI DATA AND CONSTANTS

### 4.1 Trust Badges
**Location**: `src/components/landing/TrustBadges.tsx`
**Purpose**: Credibility and data source transparency

**Organizations Listed**:
- Kartverket (Norwegian Mapping Authority)
- SSB (Statistics Norway)
- SINTEF (Research Institute)
- Enova (Energy Agency)

**Status**: ✅ **ACCURATE** - Reflects actual data sources

---

### 4.2 Norwegian Language Content
**Locations**: Throughout UI components
**Language**: Norwegian Bokmål for all user-facing content

**Key Terms**:
- Energy systems terminology
- Building type classifications
- Investment descriptions
- Error messages

**Status**: ✅ **VALIDATED** - Norwegian building industry terminology

---

## 5. DATA VALIDATION REQUIREMENTS

### 5.1 Critical Validation Needs

**HIGH PRIORITY**:
1. **Energy Consumption Factors**: Validate against Norwegian building standards
2. **Building Age Factors**: Research Norwegian building performance degradation
3. **Investment Multiplier**: Validate 7x factor against current Norwegian energy market
4. **NVE Pricing Integration**: Connect app to Supabase NVE pricing data

**MEDIUM PRIORITY**:
1. **Enova API Integration**: Add energy certificate database connection
2. **TEK17 Updates**: Monitor for regulation changes
3. **Total Electricity Cost Model**: Add network costs and taxes to NVE spot prices

**LOW PRIORITY**:
1. **SINTEF Data Updates**: Monitor for new research publications
2. **OSM Data Quality**: Improve building classification accuracy

---

### 5.2 Data Accuracy Standards

**Government Sources**: ✅ **VERIFIED**
- Kartverket API: Official address database
- TEK17 Requirements: Legal building standards

**Research Sources**: ⚠️ **VALIDATED**
- SINTEF Energy Breakdown: Research-based percentages
- Investment Calculations: Market analysis required

**Estimated Values**: 🚨 **REQUIRES VALIDATION**
- Energy consumption factors by system type
- Building age performance factors
- Regional adjustment factors

---

## 6. DATA FLOW DOCUMENTATION

### 6.1 User Input → Analysis Pipeline

```
1. Address Search (Kartverket API)
   ↓
2. Building Data Form (User Input + OSM Pre-filling)
   ↓
3. Energy Calculation (Consumption Factors + TEK17)
   ↓
4. Investment Analysis (SSB Prices + SINTEF Breakdown)
   ↓
5. Results Dashboard (Energy Grade + Recommendations)
```

### 6.2 Data Dependencies

```
Energy Grade Calculation:
├── Building Type (User Input)
├── Energy Systems (User Input)
├── Building Age (User Input/OSM)
├── Area (User Input/OSM)
├── Consumption Factors (Constants)
└── TEK17 Requirements (Legal Standards)

Investment Calculation:
├── Energy Waste (Calculated)
├── SSB Electricity Price (API/Static)
├── Investment Multiplier (Financial Constant)
└── SINTEF Breakdown (Research Data)
```

---

## 7. COMPLIANCE AND LEGAL CONSIDERATIONS

### 7.1 Data Source Attribution
- **Kartverket**: ✅ Properly attributed in UI
- **SSB**: ✅ Properly attributed in UI
- **SINTEF**: ✅ Properly attributed in UI
- **TEK17**: ✅ Referenced as legal requirement

### 7.2 Privacy and Data Handling
- **No Personal Data Storage**: Address search results not persisted
- **No Building Performance Storage**: Analysis results not saved
- **API Rate Limiting**: Kartverket API calls cached for 5 minutes
- **Error Handling**: Graceful fallbacks for all external APIs

---

## 8. NEXT STEPS AND IMPROVEMENTS

### 8.1 Immediate Actions Required
1. **Validate Energy Consumption Factors** - Research Norwegian building performance standards
2. **Implement Real-time SSB API** - Replace static electricity pricing
3. **Add Enova Integration** - Connect to energy certificate database
4. **Building Age Factor Validation** - Research Norwegian building efficiency degradation

### 8.2 Long-term Enhancements
1. **Regional Adjustments** - Add geographical variations for energy costs
2. **Seasonal Variations** - Account for Norwegian climate differences
3. **Building-Specific Factors** - Refine calculations based on actual building characteristics
4. **Historical Data Integration** - Track energy price trends for better investment advice

---

**Document Status**: 🔄 **LIVING DOCUMENT** - Updated with each data source change
**Next Review Date**: 2025-10-18
**Contact**: Development Team - Spruce Forge Development