# Technical Requirements for TEK17 Chapter 14 Energy Compliance Web Application

## Building a modern replacement for TEK-sjekk

This comprehensive technical guide provides the specific requirements, formulas, and implementation details needed to build a TEK17 Chapter 14 energy compliance web application that replaces the discontinued TEK-sjekk tool.

## 1. NS3031:2014 Standard Requirements for Heated BRA Calculation

### Core BRA Calculation Method

The NS3031:2014 standard defines **Oppvarmet BRA** (heated gross floor area) as the portion of BRA receiving heat from the building's heating system. The calculation follows NS 3940 "Areal- og volumberegninger av bygninger" with specific energy-related modifications.

**Key Formula:**
```
BRA = Sum of measurable floor areas + internal wall areas
Heated Volume = Oppvarmet BRA × room height
```

**Critical Implementation Rules:**
- Include all areas receiving heat from building's heating system
- Partially heated glass atria count as fully heated
- Process heat areas (sufficient internal gains) are considered unheated
- No horizontal planes every three meters for high ceiling spaces

### Required Input Fields for BRA Calculation:
- Total floor area per level (m²)
- Room heights (m)
- Internal wall thickness (m)
- Heated/unheated zone designation
- Process heat areas (if applicable)

## 2. TEK-sjekk Functionality Analysis

TEK-sjekk Energi was an Excel-based tool developed by SINTEF Byggforsk, operational until June 1, 2021. It provided compliance verification against TEK17 §14 requirements through validated calculations according to NS-EN 15265.

### Core TEK-sjekk Input Parameters

**Building Geometry:**
- Length, width, height
- Window/door areas (percentage of BRA)
- Window orientation (real building data)
- Building envelope areas (automated calculation)

**Performance Parameters:**
```
U-values (W/m²K):
- Walls: Input range 0.10-0.40
- Roof: Input range 0.08-0.30
- Floor: Input range 0.08-0.30
- Windows/doors: Input range 0.60-2.00

Additional Parameters:
- Normalized thermal bridge value: 0.03-0.10 W/m²K
- Air leakage N50: 0.3-3.0 h⁻¹
- Heat recovery efficiency: 50-90%
- SFP factor: 1.0-2.5 kW/(m³/s)
```

### TEK-sjekk Calculation Differences
Research showed TEK-sjekk calculated 2-8% lower heating energy demand compared to SIMIEN, with higher pump energy consumption for cooling systems. The tool included climate data for 9 Norwegian locations with Oslo required for compliance calculations.

## 3. Essential Formulas and Calculations for TEK17 Chapter 14

### Energy Frame Calculation

**Small Houses Formula:**
```
Energy Frame = 100 + 1600/A [kWh/m² per year]
Where A = heated BRA in m²
```

**Building Category Energy Frames:**
| Category | Energy Frame [kWh/m²/year] |
|----------|---------------------------|
| Residential blocks | 95 |
| Kindergartens | 135 |
| Office buildings | 115 |
| Schools | 110 |
| Hospitals | 225 (265 with restrictions) |
| Hotels | 170 |
| Retail | 180 |

### Heat Loss Calculations

**Heat Loss Number:**
```
Heat Loss Number = (HT + HV) / A

Where:
HT = Σ(Ui × Ai) + Σ(ψj × lj) + Σ(χk) [W/K]
HV = ρ × cp × qv × (1 - ηv) [W/K]
A = Heated BRA [m²]
```

**Component Definitions:**
- Ui: U-value for element i [W/(m²K)]
- Ai: Area of element i [m²]
- ψj: Linear thermal bridge coefficient [W/(mK)]
- lj: Length of linear thermal bridge [m]
- ρ: Air density (1.2 kg/m³)
- cp: Specific heat of air (1000 J/(kgK))
- qv: Ventilation flow [m³/s]
- ηv: Heat recovery efficiency

### U-Value Requirements

**Standard Requirements:**
```
Exterior walls: ≤ 0.18 W/(m²K)
Roofs: ≤ 0.13 W/(m²K)
Floors: ≤ 0.10 W/(m²K)
Windows/doors: ≤ 0.80 W/(m²K)
```

**Minimum Requirements (§14-3):**
```
Exterior walls: ≤ 0.22 W/(m²K)
Roofs: ≤ 0.18 W/(m²K)
Floors: ≤ 0.18 W/(m²K)
Windows/doors: ≤ 1.2 W/(m²K)
Air leakage: ≤ 1.5 h⁻¹ at 50 Pa
```

### Total Net Energy Demand Calculation

The net energy demand includes eight primary posts:
1. Space heating
2. Ventilation heating
3. Hot water heating
4. Ventilation cooling
5. Space cooling
6. Lighting
7. Technical equipment
8. Fan/pump power

## 4. Input Requirements for Different Accuracy Levels

### Lightweight Mode (70% Accuracy)

**Essential Inputs (8 parameters):**
- Building location (municipality)
- Building category (dropdown)
- Heated floor area (m²)
- Basic geometry (footprint, height)
- U-values for major elements
- Air leakage rate
- Heating system type
- Ventilation type

**Acceptable Assumptions:**
- Standard Oslo climate data
- Normalized occupancy patterns per NS 3031
- Default equipment loads by category
- Standard hot water consumption
- Simplified thermal bridges (0.05 W/m²K)

### Advanced Mode (80-85% Accuracy)

**Complete Dataset (30+ parameters):**

All lightweight inputs plus:
- Detailed geometry with orientation
- Shading from neighboring buildings  
- Actual thermal bridge values
- Heat recovery efficiency (%)
- Specific fan power (kW/(m³/s))
- Window-to-wall ratios by orientation
- Occupancy schedules
- Equipment specifications
- HVAC system details
- Solar/renewable systems

**Parameter Sensitivity Ranking:**
1. **Highest Impact:** Heating system, envelope U-values, air leakage
2. **Medium Impact:** Thermal bridges, window area, internal loads
3. **Lower Impact:** Schedules, microclimate, control strategies

## 5. User-Friendly Design Best Practices

### Progressive Disclosure Pattern

Implement a staged approach with clear visual progress indicators:

**Stage 1: Building Basics**
```html
<form>
  <select name="buildingType">
    <option>Småhus</option>
    <option>Boligblokk</option>
    <option>Kontorbygg</option>
  </select>
  <input type="number" name="heatedBRA" placeholder="Heated floor area (m²)">
  <input type="text" name="location" placeholder="Municipality or postal code">
</form>
```

**Stage 2: Envelope Properties**
- U-values with sliders and numeric input
- Visual diagrams showing building components
- Contextual help with typical values

**Stage 3: Systems**
- HVAC selection with images
- Efficiency inputs with ranges
- Renewable energy options

### Visual Feedback Elements

**Compliance Status Indicators:**
- Traffic light system (red/yellow/green)
- Progress bars showing performance vs. requirements
- Real-time calculation updates
- Gauge charts for energy intensity

**Dashboard KPIs:**
```javascript
const coreKPIs = {
  energyIntensity: value + ' kWh/m²/year',
  complianceStatus: 'Pass/Fail',
  energyFrame: calculated + '/' + required,
  costEstimate: 'NOK ' + annualCost,
  emissions: 'kg CO2/m²/year'
};
```

## 6. KPI Calculations and Presentation

### Primary TEK17 Compliance KPIs

**Energy Use Intensity (EUI):**
```
EUI = Total Annual Energy / Heated BRA
Display: Gauge chart with TEK17 limit line
```

**Compliance Ratio:**
```
Ratio = Calculated Energy Frame / Required Energy Frame
Display: Progress bar (green < 1.0, red > 1.0)
```

**Component Performance:**
```javascript
const componentKPIs = {
  walls: { current: 0.20, required: 0.18, status: 'fail' },
  roof: { current: 0.12, required: 0.13, status: 'pass' },
  windows: { current: 0.75, required: 0.80, status: 'pass' }
};
```

### Visualization Strategy

Use consistent color coding:
- **Green:** Compliant/Good performance
- **Yellow:** Marginal/Attention needed
- **Red:** Non-compliant/Poor performance
- **Blue:** Informational/Neutral

## 7. Building Category-Specific Requirements

### Småhus (Small Houses)

**Specific Inputs:**
- Chimney requirement check
- Basement heating status
- Holiday home designation

**Calculation Adjustments:**
```javascript
if (buildingType === 'småhus') {
  energyFrame = 100 + (1600 / heatedBRA);
  if (heatedBRA < 70) {
    applySimplifiedRequirements();
  }
}
```

### Boligblokk (Apartment Buildings)

**Additional Requirements:**
- Central heating system specification
- Individual metering capability
- Common area energy allocation

**Fixed Energy Frame:** 95 kWh/m²/year

### Special Building Types

**Hospitals/Nursing Homes:**
- Higher energy frames (225-265 kWh/m²/year)
- Special ventilation requirements
- Process load exclusions

**Log Buildings:**
- Modified U-value requirements
- Higher air leakage allowance (≤4.0 h⁻¹)
- Minimum 8" log dimension

## 8. Existing Buildings vs New Construction

### New Construction Requirements

Must comply with:
- Energy frames (§14-2)
- Minimum requirements (§14-3)
- Fossil fuel prohibition (§14-4)
- Energy flexibility (>1000 m²)

### Existing Building Approach

**Modified Requirements:**
- Apply "to extent relevant"
- Focus on cost-effective improvements
- Major renovation triggers full compliance
- Cultural heritage exceptions allowed

**Implementation Logic:**
```javascript
function determineRequirements(building) {
  if (building.isNew) {
    return fullTEK17Requirements;
  } else if (building.majorRenovation) {
    return fullTEK17Requirements;
  } else if (building.culturalHeritage) {
    return modifiedRequirements;
  } else {
    return proportionalRequirements;
  }
}
```

## 9. Energy Supply Requirements (§14-4)

### Fossil Fuel Prohibition

**Implementation Check:**
```javascript
const prohibitedSystems = [
  'oil_boiler',
  'gas_boiler_fossil',
  'paraffin_heater'
];

const allowedSystems = [
  'heat_pump',
  'electric',
  'district_heating',
  'biomass_boiler',
  'solar_thermal'
];
```

### Energy Flexibility Requirements (Buildings >1000 m²)

**Calculation:**
```
Required flexible capacity = 0.60 × Net heating demand
Low-temperature capability = Max 60°C supply
Central plant area = 10 m² + (0.01 × heated BRA) [max 100 m²]
```

**Input Fields Required:**
- Primary heating system
- Secondary heating capability
- Distribution temperature
- Central plant dimensions

## 10. Exceptions and Special Cases (§14-5)

### Size-Based Exceptions

```javascript
function applyExceptions(building) {
  const bra = building.heatedBRA;
  const type = building.type;
  
  if (type === 'holiday_home' && bra <= 70) {
    return NO_ENERGY_REQUIREMENTS;
  }
  
  if (bra <= 70 && type === 'freestanding') {
    return {
      requirements: [
        'minimumRequirements',
        'fossilFuelProhibition'
      ],
      exempt: ['energyFrames', 'energyFlexibility']
    };
  }
  
  if (type === 'holiday_home' && bra <= 150) {
    return SIMPLIFIED_REQUIREMENTS;
  }
}
```

### Renewable Energy Production Bonus

**Calculation:**
```
If renewable_production >= 20 kWh/m²/year:
  energy_frame_bonus = min(10, actual_production - 20)
  adjusted_frame = base_frame + energy_frame_bonus
```

### Low Temperature Buildings

Buildings with intended temperature <15°C:
- Apply transmission heat loss check only
- Compare to fully heated equivalent
- Document "reasonable" energy use

## Implementation Architecture Recommendation

### Technology Stack

**Backend:**
- Node.js/Python with EnergyPlus engine
- PostgreSQL for building data
- Redis for calculation caching
- REST API with OpenAPI specification

**Frontend:**
- React.js with Material-UI
- D3.js for visualizations
- Progressive Web App capabilities
- Responsive design for mobile

**Calculation Engine:**
```python
class TEK17Calculator:
    def __init__(self):
        self.ns3031 = NS3031Engine()
        self.validator = TEK17Validator()
    
    def calculate(self, building_data):
        # Calculate energy demand
        energy = self.ns3031.calculate_energy_demand(
            geometry=building_data.geometry,
            envelope=building_data.envelope,
            systems=building_data.systems
        )
        
        # Check compliance
        compliance = self.validator.check_compliance(
            energy_use=energy.total,
            building_type=building_data.type,
            heated_bra=building_data.heated_bra
        )
        
        return {
            'energy_frame': energy.frame,
            'compliance': compliance.status,
            'details': energy.breakdown
        }
```

### Database Schema

```sql
CREATE TABLE calculations (
    id UUID PRIMARY KEY,
    building_type VARCHAR(50),
    heated_bra DECIMAL(10,2),
    energy_frame DECIMAL(10,2),
    calculation_params JSONB,
    results JSONB,
    compliance_status VARCHAR(20),
    created_at TIMESTAMP
);
```

This comprehensive technical specification provides all the formulas, input requirements, and implementation details needed to build a robust TEK17 Chapter 14 energy compliance web application that effectively replaces TEK-sjekk while incorporating modern web technologies and user experience best practices.