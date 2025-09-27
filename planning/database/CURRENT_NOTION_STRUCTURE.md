# Current Notion Database Structure
**Last Updated:** 2025-09-26
**Status:** Active Implementation

## Overview
This document describes the ACTUAL Notion database structure that syncs with Supabase for the SkiplumXGE energy analysis application. All property names are in English to match the Python sync script.

## Architecture
```
Notion (Configuration UI) → Python Sync → Supabase → Next.js App
                               ↓
                        Task Scheduler (6hr)
                               ↓
                        Notion Logs DB
```

## 1. Synced Configuration Databases

### 1.1 Calculations Database
**Notion ID:** `27a2fc6e265980dd911cef9a20616899`
**Supabase Table:** `calculations`
**Purpose:** Numeric configuration values for business logic

#### Properties (EXACT names):
| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Name** | Title | Unique identifier | `investment_multiplier` |
| **Value** | Number | The numeric value | `7` |
| **Unit** | Text | Unit of measurement | `x`, `%`, `kr/kWh` |
| **Category** | Select | Value category | See options below |
| **Description** | Text | What this value does | `Annual waste multiplied by this` |
| **Min Value** | Number | Minimum allowed | `5` |
| **Max Value** | Number | Maximum allowed | `10` |

**Category Options:**
- `area` - Area calculations
- `investment` - Investment calculations
- `energy` - Energy prices and factors
- `analysis` - Analysis thresholds
- `conversion` - Unit conversions
- `defaults` - Default values
- `metrics` - Performance metrics

#### Initial Data (from seed):
```
bra_adjustment: 8 (%)
investment_multiplier: 7 (x)
heating_investment_percentage: 70 (%)
lighting_investment_percentage: 15 (%)
other_investment_percentage: 15 (%)
base_electricity_price: 2.80 (kr/kWh)
grid_rent: 0.50 (kr/kWh)
good_tek17_threshold: 90 (%)
warning_tek17_threshold: 110 (%)
kwh_to_co2: 0.185 (kg/kWh)
default_floors: 2 (floors)
default_build_year: 1990 (year)
target_conversion_rate: 35 (%)
analysis_time_minutes: 2 (minutes)
```

---

### 1.2 Feature Flags Database
**Notion ID:** `27a2fc6e26598041ab4dcf7c090035d2`
**Supabase Table:** `feature_flags`
**Purpose:** Control feature rollout without code deployment

#### Properties (EXACT names):
| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Feature Name** | Title | Unique feature identifier | `pdf_export` |
| **Enabled** | Checkbox | Is feature active | ☑ or ☐ |
| **Rollout %** | Number | Percentage rollout (0-100) | `100` |
| **Description** | Text | What this feature does | `PDF report generation` |

#### Initial Data (from seed):
```
pdf_export: ☐ disabled (broken, needs fixing)
excel_export: ☐ disabled
email_capture: ☑ enabled (100%)
share_functionality: ☐ disabled
map_visualization: ☑ enabled (100%)
investment_breakdown: ☑ enabled (100%)
climate_data: ☐ disabled
consultation_booking: ☐ disabled
multi_building_support: ☑ enabled (100%)
demo_mode: ☐ disabled
```

---

### 1.3 Formulas Database
**Notion ID:** `27a2fc6e26598071912ec979a9c18a7a`
**Supabase Table:** `formulas`
**Purpose:** Configurable calculation logic

#### Properties (EXACT names):
| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Name** | Title | Formula identifier | `investment_room` |
| **Formula** | Text | The calculation string | `waste_cost * investment_multiplier` |
| **Variables** | Text | Comma-separated variables | `waste_cost, investment_multiplier` |
| **Description** | Text | What formula calculates | `Conservative investment room` |
| **Category** | Select | Formula category | See options below |

**Category Options:**
- `area` - Area calculations
- `energy` - Energy calculations
- `cost` - Cost calculations
- `compliance` - TEK17 compliance
- `waste` - Waste calculations
- `investment` - Investment calculations

#### Initial Data (from seed):
```
heated_bra: bra * (1 - bra_adjustment/100)
annual_energy: heated_bra * energy_per_m2
annual_cost: annual_energy * total_price_per_kwh
tek17_percentage: (actual_energy / tek17_requirement) * 100
annual_waste: annual_energy - (heated_bra * tek17_requirement)
waste_cost: annual_waste * total_price_per_kwh
investment_room: waste_cost * investment_multiplier
heating_investment: investment_room * (heating_investment_percentage/100)
lighting_investment: investment_room * (lighting_investment_percentage/100)
other_investment: investment_room * (other_investment_percentage/100)
```

---

### 1.4 Content Database (NEW - Needs sync script update)
**Notion ID:** `[TO BE CREATED]`
**Supabase Table:** `content`
**Purpose:** UI strings and marketing copy

#### Properties (EXACT names):
| Property Name | Type | Description | Example |
|--------------|------|-------------|---------|
| **Key** | Title | Unique content key | `landing.title` |
| **Norwegian Text** | Text | Norwegian version | `Spar tusenvis på energikostnadene` |
| **English Text** | Text | English version | `Save thousands on energy costs` |
| **Category** | Select | Content category | See options below |
| **Context** | Text | Where it's used | `Main headline on landing page` |

**Category Options:**
- `landing` - Landing page content
- `dashboard` - Dashboard labels
- `form` - Form fields and labels
- `report` - Report generation
- `error` - Error messages
- `success` - Success messages

#### Initial Data (from seed):
```
landing.title: "Spar tusenvis på energikostnadene"
landing.subtitle: "Oppdag besparingsmuligheter og TEK17-etterlevelse på minutter"
landing.cta.primary: "Start analyse"
dashboard.investment.title: "Investeringsrom"
dashboard.waste.title: "Årlig sløsing"
form.bra.label: "Bruttoareal (BRA) m²"
error.calculation: "Kunne ikke beregne energianalyse"
success.email: "E-post sendt! Vi kontakter deg snart."
[... 25+ total entries ...]
```

---

## 2. Supporting Databases (Not synced to Supabase)

### 2.1 Projects Database
**Purpose:** Organize automation logs by project

#### Properties:
| Property Name | Type | Description |
|--------------|------|-------------|
| **Name** | Title | Project name |
| **Description** | Text | Project description |
| **Status** | Select | Active, Paused, Archived |
| **Owner** | People | Project owner |
| **Created** | Created time | Auto-populated |

**Initial Entry:** SkiplumXGE

---

### 2.2 Automation Logs Database
**Purpose:** Track all sync operations

See `/docs/NOTION_LOGGING_DATABASE_SETUP_V2.md` for complete schema.

Key properties:
- Run ID (Title)
- Script Name (Text) - Auto-detected
- Project (Relation) - Links to Projects
- Status (Select) - Success, Failed, Partial, Running
- Timestamps, durations, error tracking, etc.

---

## 3. Static Supabase Tables (No Notion sync)

### 3.1 tek17_requirements
**Purpose:** Legal building standards from TEK17 § 14-2
**Why not synced:** Regulatory data that shouldn't change

Contains 13 building types with max kWh/m² values:
- Småhus: 100
- Leilighetsblokk: 95
- Barnehage: 135
- Kontorbygning: 115
- [... etc ...]

---

## Implementation Checklist

### Phase 1: Create Databases
- [ ] Create Calculations database in Notion
- [ ] Create Feature Flags database in Notion
- [ ] Create Formulas database in Notion
- [ ] Create Content database in Notion
- [ ] Create Projects database in Notion
- [ ] Create Automation Logs database in Notion

### Phase 2: Configure
- [ ] Get all database IDs
- [ ] Update .env file with IDs
- [ ] Update sync script for Content table
- [ ] Add logging database ID

### Phase 3: Populate
- [ ] Add calculation values from seed
- [ ] Add feature flags from seed
- [ ] Add formulas from seed
- [ ] Add content strings from seed
- [ ] Add SkiplumXGE project

### Phase 4: Test
- [ ] Test sync script locally
- [ ] Verify data in Supabase
- [ ] Check logging works
- [ ] Set up Task Scheduler

---

## Important Notes

1. **Property names must match EXACTLY** - The sync script is case-sensitive
2. **Use Text fields for most properties** - Not Select (except where specified)
3. **One-way sync only** - Notion → Supabase
4. **Supabase is source of truth** for the app
5. **Notion is just the editing UI** for business users

## Benefits
✅ Non-technical users can adjust business logic
✅ Marketing can update copy without deployment
✅ Full audit trail in both systems
✅ Changes live within 6 hours (or manual sync)
✅ No code changes needed for config updates