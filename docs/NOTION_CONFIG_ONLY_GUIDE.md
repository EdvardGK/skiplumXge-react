# Notion Configuration Management Guide

## Overview
This guide sets up Notion as a **configuration-only** interface. Real data (energy certificates, user analyses, etc.) stays in Supabase.

## What Goes in Notion vs Supabase

### ✅ Notion (Configuration Only)
- **Calculations**: BRA adjustment (-8%), investment multiplier (7x), percentages
- **TEK17 Requirements**: Building types and their kWh/m² limits
- **Feature Flags**: Enable/disable features without deploying
- **Formulas**: Calculation logic that might need tweaking
- **UI Content** (optional): Text strings, labels, messages

### ❌ NOT in Notion (Stays in Supabase)
- Energy certificates from Enova
- Electricity prices
- User analyses and saved data
- Email leads
- Generated reports
- Any actual user or business data

## Quick Setup

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Create new integration "Skiplum Config"
3. Copy the token (starts with `secret_`)

### 2. Create These 4 Notion Databases

#### 📊 Calculations
| Column Name | Type | Example |
|------------|------|---------|
| name | Title | bra_adjustment |
| value | Number | 8 |
| unit | Text | % |
| category | Select | investment |
| description | Text | Reduction from BRA |
| min_value | Number | 0 |
| max_value | Number | 20 |

**Add these rows:**
- `bra_adjustment` = 8 (%)
- `investment_multiplier` = 7 (x)
- `heating_investment_percentage` = 70 (%)
- `lighting_investment_percentage` = 15 (%)
- `other_investment_percentage` = 15 (%)
- `base_electricity_price` = 2.80 (kr/kWh)

#### 🏢 TEK17 Requirements
| Column Name | Type | Example |
|------------|------|---------|
| building_type | Title | Kontorbygning |
| max_energy_kwh_m2 | Number | 115 |
| description | Text | Kontorer |

**Add all 13 building types from the migration script**

#### 🚀 Feature Flags
| Column Name | Type | Example |
|------------|------|---------|
| feature_name | Title | pdf_export |
| enabled | Checkbox | ☐ |
| rollout_percentage | Number | 0 |
| description | Text | PDF generation |

**Add these features:**
- `pdf_export` (disabled until fixed)
- `email_capture` (enabled)
- `map_visualization` (enabled)
- `investment_breakdown` (enabled)

#### 🧮 Formulas
| Column Name | Type | Example |
|------------|------|---------|
| name | Title | heated_bra |
| formula | Text | bra * (1 - bra_adjustment/100) |
| variables | Text | bra, bra_adjustment |
| description | Text | Calculate heated BRA |
| category | Select | area |

**Add formulas from migration script**

### 3. Share Databases with Integration
For each database:
1. Click "..." → "Add connections"
2. Select your integration
3. Confirm

### 4. Get Database IDs
From each database URL:
```
https://notion.so/workspace/xxxxx-32characterID
                                 ^^^^^^^^^^^^^^^^
```

### 5. Update and Run SQL Script
Edit `003_notion_config_wrapper.sql`:
- Replace `YOUR_NOTION_INTEGRATION_TOKEN`
- Replace each `YOUR_XXX_DATABASE_ID`

Run in Supabase SQL Editor

### 6. Test the Sync

#### Manual sync from SQL:
```sql
SELECT sync_notion_config();
```

#### From your app:
```typescript
// Add sync button to admin panel
const syncConfig = async () => {
  const { data, error } = await supabase
    .rpc('api_sync_config_from_notion')

  if (data?.success) {
    console.log('Config synced:', data.synced)
    // Refresh your config
  }
}
```

## Example Notion Workflow

### Adjusting Energy Calculations
1. Open Calculations database in Notion
2. Find `bra_adjustment`
3. Change from 8 to 12 (testing more conservative BRA)
4. Run sync
5. App now uses BRA - 12% instead of BRA - 8%

### Testing New Features
1. Open Feature Flags database
2. Set `pdf_export` enabled = true
3. Set rollout_percentage = 10 (10% of users)
4. Run sync
5. PDF export now available to 10% of users

### Updating TEK17 Requirements
1. Open TEK17 database
2. Update `Kontorbygning` from 115 to 110 kWh/m²
3. Run sync
4. All office buildings now measured against stricter standard

## Benefits of This Approach

✅ **Clear separation**: Config in Notion, data in Supabase
✅ **No risk**: Can't accidentally edit user data from Notion
✅ **Version history**: Notion tracks all changes
✅ **Collaboration**: Comments and mentions in Notion
✅ **Business friendly**: Non-developers can adjust calculations
✅ **Safe experimentation**: Test new values easily

## What This DOESN'T Do

❌ Cannot edit energy certificates
❌ Cannot change electricity prices (use Supabase directly)
❌ Cannot modify user analyses
❌ Cannot access email leads
❌ Cannot touch any real business data

## Sync Strategies

### Option 1: Manual Button (Recommended)
Add sync button to your `/admin` page - full control

### Option 2: Scheduled (Every 15 min)
```sql
SELECT cron.schedule('sync-config', '*/15 * * * *', 'SELECT sync_notion_config();');
```

### Option 3: On Deploy
Add to your deployment script to sync on each deploy

## Troubleshooting

### "Cannot read foreign table"
- Check database is shared with integration
- Verify database ID is correct

### Values not updating
- Check column names match exactly
- Ensure sync function ran successfully
- Look for conflicts in unique constraints

### Want to add more config?
1. Add to Notion database
2. Update foreign table definition
3. Update sync function
4. Run migration

## Security Notes

- Notion integration is READ-ONLY
- User data never exposed to Notion
- Config changes are logged in audit_log table
- Only configuration values can be modified