# Hardcoded Values Migration Tracker

## Overview
This document tracks all hardcoded values found in the application that are being migrated to Supabase for configuration management via Notion.

## Migration Status

### ✅ Calculations (Migrated to `calculations` table)

| Value | Current Location | Hardcoded Value | Supabase Key | Status |
|-------|-----------------|-----------------|--------------|--------|
| BRA Adjustment | `/utils/energy.ts` | -8% | `bra_adjustment` | ✅ Migrated |
| Investment Multiplier | `/dashboard/page.tsx` | 7x | `investment_multiplier` | ✅ Migrated |
| Heating % | `/dashboard/page.tsx` | 70% | `heating_investment_percentage` | ✅ Migrated |
| Lighting % | `/dashboard/page.tsx` | 15% | `lighting_investment_percentage` | ✅ Migrated |
| Other % | `/dashboard/page.tsx` | 15% | `other_investment_percentage` | ✅ Migrated |
| Electricity Price | `/api/energy/calculations.ts` | 2.80 kr/kWh | `base_electricity_price` | ✅ Migrated |
| Grid Rent | Calculated | 0.50 kr/kWh | `grid_rent` | ✅ Migrated |

### ✅ TEK17 Requirements (Migrated to `tek17_requirements` table)

| Building Type | TEK17 Limit (kWh/m²) | Status |
|--------------|---------------------|--------|
| Småhus | 100 | ✅ Migrated |
| Leilighetsblokk | 95 | ✅ Migrated |
| Barnehage | 135 | ✅ Migrated |
| Kontorbygning | 115 | ✅ Migrated |
| Skolebygg | 110 | ✅ Migrated |
| Universitet | 125 | ✅ Migrated |
| Sykehus | 225 | ✅ Migrated |
| Sykehjem | 195 | ✅ Migrated |
| Hotellbygg | 170 | ✅ Migrated |
| Idrettsbygg | 145 | ✅ Migrated |
| Forretningsbygg | 180 | ✅ Migrated |
| Kulturbygg | 130 | ✅ Migrated |
| Lett industri/verksted | 140 | ✅ Migrated |

### ✅ Feature Flags (Migrated to `feature_flags` table)

| Feature | Current State | Supabase Key | Status |
|---------|--------------|--------------|--------|
| PDF Export | Broken | `pdf_export` | ✅ Migrated (disabled) |
| Excel Export | Not connected | `excel_export` | ✅ Migrated (disabled) |
| Email Capture | Working | `email_capture` | ✅ Migrated (enabled) |
| Share Function | Not implemented | `share_functionality` | ✅ Migrated (disabled) |
| Map Viz | Working | `map_visualization` | ✅ Migrated (enabled) |
| Investment Breakdown | Working | `investment_breakdown` | ✅ Migrated (enabled) |

### ✅ Formulas (Migrated to `formulas` table)

| Formula | Current Implementation | Supabase Key | Status |
|---------|----------------------|--------------|--------|
| Heated BRA | `bra * 0.92` | `heated_bra` | ✅ Migrated |
| Annual Energy | `heated_bra * energy_per_m2` | `annual_energy` | ✅ Migrated |
| Annual Cost | `annual_energy * price` | `annual_cost` | ✅ Migrated |
| TEK17 % | `(actual / requirement) * 100` | `tek17_percentage` | ✅ Migrated |
| Annual Waste | `energy - tek17_baseline` | `annual_waste` | ✅ Migrated |
| Investment Room | `waste_cost * 7` | `investment_room` | ✅ Migrated |

### ✅ UI Content (Migrated to `content` table)

| Content Type | Count | Status |
|-------------|-------|--------|
| Landing page strings | 10+ | ✅ Migrated |
| Dashboard labels | 15+ | ✅ Migrated |
| Form labels | 8+ | ✅ Migrated |
| Error messages | 5+ | ✅ Migrated |
| Success messages | 3+ | ✅ Migrated |

## Files That Need Updates

### High Priority (Core calculations)
1. ❌ `/src/app/dashboard/page.tsx` - Replace mock calculations
2. ❌ `/src/utils/energy-calculations.ts` - Use Supabase formulas
3. ❌ `/src/app/api/energy/calculations/route.ts` - Read from Supabase

### Medium Priority (UI strings)
1. ❌ `/src/app/page.tsx` - Landing page text
2. ❌ `/src/app/select-building/page.tsx` - Form labels
3. ❌ `/src/components/dashboard/` - All dashboard components

### Low Priority (Feature flags)
1. ❌ Conditional rendering based on feature flags
2. ❌ Admin panel to toggle features

## Next Steps

1. **Run migration scripts** in Supabase
2. **Create Supabase client helper** for fetching config
3. **Update calculation functions** to use Supabase values
4. **Replace hardcoded UI strings** with database content
5. **Set up real-time subscriptions** for live updates
6. **Configure Notion wrapper** for admin interface

## Benefits Once Complete

- ✅ No code changes needed for formula adjustments
- ✅ A/B testing via configuration changes
- ✅ Content management without deployments
- ✅ Feature toggles for gradual rollouts
- ✅ Audit trail of all changes
- ✅ Business users can manage calculations