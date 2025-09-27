# Notion Wrapper Setup Guide (Using Supabase UI)

## Overview
You've created the wrapper "SkiplumXGE-Notion" in Supabase. Now let's set up the foreign tables for configuration management.

## Step 1: Prepare Your Notion Databases

Create these 4 databases in Notion with **EXACT property names** (case-sensitive):

### 📊 Calculations Database
| Property Name | Type | Example Value |
|--------------|------|---------------|
| Name | Title | bra_adjustment |
| Value | Number | 8 |
| Unit | Text | % |
| Category | Select | investment |
| Description | Text | Reduction from BRA to heated BRA |
| Min Value | Number | 0 |
| Max Value | Number | 20 |

**Important values to add:**
- `bra_adjustment` = 8 (%)
- `investment_multiplier` = 7 (x)
- `heating_investment_percentage` = 70 (%)
- `lighting_investment_percentage` = 15 (%)
- `other_investment_percentage` = 15 (%)
- `base_electricity_price` = 2.80 (kr/kWh)
- `grid_rent` = 0.50 (kr/kWh)

### 🏢 TEK17 Database
| Property Name | Type | Example Value |
|--------------|------|---------------|
| Building Type | Title | Kontorbygning |
| Max Energy | Number | 115 |
| Description | Text | Kontorer og administrasjonsbygg |

**Add all 13 building types from the seed data**

### 🚀 Features Database
| Property Name | Type | Example Value |
|--------------|------|---------------|
| Feature Name | Title | pdf_export |
| Enabled | Checkbox | ☐ |
| Rollout % | Number | 0 |
| Description | Text | PDF report generation |

### 🧮 Formulas Database
| Property Name | Type | Example Value |
|--------------|------|---------------|
| Name | Title | heated_bra |
| Formula | Text | bra * (1 - bra_adjustment/100) |
| Variables | Text | bra, bra_adjustment |
| Description | Text | Calculate heated BRA from total BRA |
| Category | Select | area |

## Step 2: Share Databases with Integration

1. Open each database in Notion
2. Click "..." menu → "Add connections"
3. Search for your integration (the one whose API key you used)
4. Click "Confirm"

## Step 3: Get Database IDs

From each database URL in Notion:
```
https://www.notion.so/yourworkspace/Database-Name-abc123def456...
                                                   ^^^^^^^^^^^^^^^
```
The database ID is the 32-character string (letters and numbers).

## Step 4: Add Foreign Tables in Supabase

### Option A: Using Supabase UI

1. Go to Database → Wrappers
2. Click on "SkiplumXGE-Notion"
3. Click "Add foreign table"
4. For each table, enter:

**Calculations Table:**
- Table name: `notion_calculations`
- Database ID: (your calculations database ID)
- Click "Add table"

**TEK17 Table:**
- Table name: `notion_tek17`
- Database ID: (your TEK17 database ID)
- Click "Add table"

**Features Table:**
- Table name: `notion_features`
- Database ID: (your features database ID)
- Click "Add table"

**Formulas Table:**
- Table name: `notion_formulas`
- Database ID: (your formulas database ID)
- Click "Add table"

### Option B: Using SQL

1. Update `004_notion_wrapper_tables.sql` with your database IDs
2. Run it in SQL Editor

## Step 5: Test the Connection

Run this in SQL Editor to verify it works:
```sql
-- Test each foreign table
SELECT * FROM notion_calculations LIMIT 1;
SELECT * FROM notion_tek17 LIMIT 1;
SELECT * FROM notion_features LIMIT 1;
SELECT * FROM notion_formulas LIMIT 1;
```

If you get data back, it's working!

## Step 6: Sync Data to Local Tables

Run the sync function to copy Notion data to your local Supabase tables:
```sql
SELECT sync_all_notion_config();
```

This will return something like:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "results": {
    "calculations": {"calculations_synced": 10},
    "tek17": {"tek17_synced": 13},
    "features": {"features_synced": 8},
    "formulas": {"formulas_synced": 10}
  }
}
```

## Step 7: Add Sync Button to Admin Panel

Update your `/admin` page to include a sync button:

```typescript
const syncFromNotion = async () => {
  const { data, error } = await supabase
    .rpc('sync_all_notion_config');

  if (error) {
    console.error('Sync failed:', error);
    alert('Sync failed! Check console.');
  } else {
    console.log('Sync result:', data);
    alert(`Synced successfully!
      Calculations: ${data.results.calculations.calculations_synced}
      TEK17: ${data.results.tek17.tek17_synced}
      Features: ${data.results.features.features_synced}
      Formulas: ${data.results.formulas.formulas_synced}
    `);
    // Refresh your configuration display
    loadConfiguration();
  }
};
```

## Step 8: Set Up Automatic Sync (Optional)

### Using pg_cron (if enabled):
```sql
-- Sync every hour
SELECT cron.schedule(
  'sync-notion-config',
  '0 * * * *',
  'SELECT sync_all_notion_config();'
);
```

### Using Vercel Cron:
Create an API route that calls the sync function, then schedule it in `vercel.json`.

## How to Use

### Making Changes:
1. Edit values in your Notion databases
2. Click sync button in admin panel (or wait for auto-sync)
3. Changes appear in your app immediately

### Example: Changing BRA Adjustment
1. Open Calculations database in Notion
2. Find "bra_adjustment" row
3. Change Value from 8 to 12
4. Run sync
5. App now uses 12% reduction instead of 8%

### Example: Disabling a Feature
1. Open Features database in Notion
2. Find "pdf_export" row
3. Uncheck "Enabled"
4. Run sync
5. PDF export is now disabled in the app

## Troubleshooting

### "relation does not exist"
- Make sure you created the foreign tables
- Check that the wrapper name is exactly "SkiplumXGE-Notion_server"

### No data returned
- Verify databases are shared with integration
- Check that property names match exactly (case-sensitive!)
- Make sure there's data in your Notion databases

### Sync succeeds but counts are 0
- Check that Notion property names match the foreign table column names
- Verify data types match (Number for numeric fields, etc.)

### "permission denied"
- Run the GRANT statements from the SQL script
- Make sure you're logged in as authenticated user

## What's Protected

✅ **Configuration in Notion:**
- Calculations and formulas
- TEK17 requirements
- Feature flags
- UI strings (optional)

❌ **Data stays in Supabase:**
- Energy certificates
- User analyses
- Electricity prices (real-time)
- Email leads
- Generated reports

This keeps a clean separation between configuration (Notion) and business data (Supabase)!