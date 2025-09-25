# Waterfall Dashboard Data Requirements

**Date**: January 25, 2025
**Status**: Phase 1 Complete - Mock Data Replaced with Placeholders
**Next Step**: Data Integration Strategy

## Overview

The waterfall dashboard has been built with placeholder text (`Input X here`) replacing all mock data. This document outlines every data point needed to make the dashboard functional with real Norwegian energy data.

## Data Requirements by Section

### Section 1: Property Hero Section

**Required Building Data:**
- `building_address` - Full Norwegian address
- `building_type` - Type (Kontor, Bolig, Småhus, etc.)
- `total_area` - Total BRA in m²
- `heated_area` - Heated area in m²
- `building_year` - Construction year
- `coordinates` - Lat/lon for 3D positioning
- `energy_class` - Current Enova energy class (A-G or "Ikke sertifisert")
- `energy_consumption` - Annual kWh/m²

**TEK17 Compliance Calculations:**
- `tek17_requirement` - Calculated based on building type
  - Kontor: 115 kWh/m²/år
  - Bolig: 105 kWh/m²/år
  - Other: 110 kWh/m²/år (default)
- `is_compliant` - Boolean: consumption <= requirement
- `compliance_percentage` - Deviation from requirement

**3D Building Generation:**
- `building_footprint` - Array of [lat,lon] coordinates from OSM/Kartverket
- `building_height` - Calculated from floors or estimated from age
- `roof_type` - Norwegian roof style (saddle, L-shape, T-shape)

### Section 2: Heat Loss Analysis

**Heat Loss Breakdown (percentages):**
- `wall_heat_loss_percent` - Yttervegger heat loss %
- `roof_heat_loss_percent` - Tak heat loss %
- `window_heat_loss_percent` - Vinduer heat loss %
- `floor_heat_loss_percent` - Gulv heat loss %
- `ventilation_heat_loss_percent` - Ventilasjon heat loss %

**Norwegian Building Physics Data:**
- `u_values` - Thermal transmittance for each component
- `building_age_category` - TEK17, TEK10, TEK97, or pre-TEK
- `insulation_status` - Current insulation levels
- `upgrade_priorities` - Ranked list of improvement areas

### Section 3: Seasonal Analysis

**Monthly Energy Data:**
- `winter_consumption_kwh_m2` - Average winter consumption
- `summer_consumption_kwh_m2` - Average summer consumption
- `seasonal_variation_ratio` - Multiplier between seasons
- `monthly_breakdown` - 12-month consumption array

**Climate Integration:**
- `monthly_temperatures` - Local temperature data
- `heating_degree_days` - Norwegian climate zones
- `weather_impact_factor` - Climate-adjusted consumption

### Section 4: Investment Waterfall

**Financial Calculations:**
- `annual_energy_waste_nok` - Money lost to inefficiency
- `calculated_investment_room_nok` - Budget for improvements (waste × 7)

**Investment Options (for each upgrade type):**
- `heat_pump_cost` - Varmepumpe investment cost
- `heat_pump_annual_saving` - Annual NOK savings
- `heat_pump_payback_years` - ROI timeline
- `insulation_cost` - Ytterveggisolering costs
- `insulation_annual_saving` - Annual savings
- `insulation_payback_years` - Payback period
- `window_cost` - New windows cost
- `window_annual_saving` - Annual savings
- `window_payback_years` - Payback timeline
- `led_cost` - LED lighting upgrade cost
- `led_annual_saving` - Annual savings
- `led_payback_years` - Payback period

**Budget Allocation:**
- `budget_percentage_used` - % of investment room for each option
- `total_investment_capacity` - Maximum recommended investment

### Section 5: Neighborhood Comparison

**Comparative Performance:**
- `building_consumption` - User's building consumption
- `building_energy_grade` - User's energy grade
- `neighborhood_average_consumption` - Local area average
- `neighborhood_average_grade` - Local area grade
- `best_in_area_consumption` - Top performer locally
- `best_in_area_grade` - Top performer grade
- `tek17_requirement` - Regulatory requirement

**3D Neighborhood Data:**
- `neighboring_buildings` - Array of nearby buildings with:
  - `building_footprint` - OSM footprint data
  - `building_height` - Estimated height
  - `efficiency_rating` - 0-1 scale for visualization
  - `energy_consumption` - kWh/m² for comparison
- `success_stories` - Local renovation examples

### Section 6: Action Plan

**Implementation Data:**
- `assessment_duration` - Time for energy assessment
- `assessment_cost` - Price for professional evaluation
- `planning_duration` - Timeline for action plan creation
- `implementation_duration` - Expected renovation timeline
- `implementation_cost` - Total project costs

**Contact & Conversion:**
- `consultation_availability` - Available appointment slots
- `report_generation_data` - PDF content requirements
- `contractor_recommendations` - Qualified local contractors

## Data Sources & Integration Strategy

### Primary Norwegian Data Sources

**Address & Building Registry:**
- Kartverket Address API: Building footprints, coordinates
- SSB Building Statistics: Construction data, building types
- Matrikkelen: Property registry data

**Energy Performance:**
- Enova Energy Certificate Database: Existing certifications
- SINTEF Research Data: Heat loss coefficients, upgrade costs
- Norwegian Energy Authority: TEK17 requirements

**Pricing & Market Data:**
- NVE Electricity Prices: Real-time energy costs
- SSB Construction Costs: Renovation price indices
- Local Contractor Networks: Installation costs

### Data Processing Pipeline

**Stage 1: Address Resolution**
```
User Address Input → Kartverket API → Building Coordinates + Footprint
```

**Stage 2: Building Analysis**
```
Building Data → SINTEF Physics Models → Heat Loss Breakdown
```

**Stage 3: Financial Calculations**
```
Energy Waste + Market Prices → Investment Recommendations + ROI
```

**Stage 4: Neighborhood Context**
```
Location + Building Type → Comparative Performance + Success Stories
```

## Implementation Priorities

### Phase 1: Core Data Integration (Week 1-2)
1. **Address Resolution**: Kartverket API for building footprints
2. **Basic Energy Calculations**: TEK17 compliance + heat loss
3. **Investment Logic**: ROI calculations with SINTEF data
4. **Static Neighborhood**: Basic comparative data

### Phase 2: Dynamic Data (Week 3-4)
1. **Real-time Pricing**: Energy cost calculations
2. **Weather Integration**: Seasonal adjustments
3. **Live Neighborhood**: OSM building fetching
4. **Success Stories**: Local case studies

### Phase 3: Advanced Features (Week 5-6)
1. **3D Roof Geometry**: L-shape and T-shape algorithms
2. **Performance Optimization**: LOD system for neighborhoods
3. **Real-time Updates**: Live data feeds
4. **Machine Learning**: Consumption predictions

## API Requirements

### New Endpoints Needed
```typescript
// Energy analysis calculation
POST /api/energy/analyze
{
  buildingData: BuildingInput,
  climateZone: string
} → EnergyAnalysisResult

// Investment recommendations
POST /api/investment/calculate
{
  energyWaste: number,
  buildingType: string,
  location: string
} → InvestmentOptions[]

// Neighborhood comparison
GET /api/neighborhood/compare
?lat=${lat}&lon=${lon}&buildingType=${type}
→ NeighborhoodComparison

// 3D building generation
GET /api/buildings/3d
?address=${address}
→ Building3DData
```

### Enhanced Existing Endpoints
- `/api/addresses/search` - Add building footprint data
- `/api/buildings/detect` - Include energy certificates
- `/api/dashboard/data` - Expand to waterfall requirements

## Success Metrics

### Data Quality KPIs
- **Address Resolution**: 95%+ successful building detection
- **Energy Calculations**: <5% deviation from professional assessments
- **Investment Accuracy**: ROI predictions within 15% of actual
- **Neighborhood Coverage**: 80%+ buildings with comparison data

### Performance Targets
- **Data Loading**: <2 seconds for complete waterfall
- **3D Rendering**: <3 seconds for neighborhood visualization
- **Real-time Updates**: <500ms for calculation changes
- **Mobile Performance**: Maintain 30+ FPS on 3D sections

## Next Steps

1. **Immediate**: Connect existing energy calculations from grid dashboard
2. **Week 1**: Implement heat loss physics from SINTEF models
3. **Week 2**: Add investment calculations with Norwegian pricing
4. **Week 3**: Integrate Kartverket building footprints for 3D
5. **Week 4**: Add neighborhood comparison with OSM data

This comprehensive data integration will transform the waterfall dashboard from a beautiful prototype into a fully functional Norwegian energy analysis tool.