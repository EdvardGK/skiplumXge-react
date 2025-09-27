# Notion → Supabase Configuration Setup Guide

## Overview
This guide helps you set up Notion as your configuration interface, with automatic syncing to Supabase.

## Step 1: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Skiplum Energy Config"
4. Select your workspace
5. Give it these capabilities:
   - Read content
   - Update content (optional, for two-way sync)
6. Copy the "Internal Integration Token" (starts with `secret_`)

## Step 2: Create Notion Databases

Create these databases in Notion with the exact property names:

### 📊 Calculations Database
Properties:
- `name` (Title) - e.g., "bra_adjustment"
- `value` (Number) - e.g., 8
- `unit` (Text) - e.g., "%"
- `category` (Select) - Options: area, investment, energy, analysis, conversion, defaults, metrics
- `description` (Text)
- `min_value` (Number)
- `max_value` (Number)

### 🏢 TEK17 Requirements Database
Properties:
- `building_type` (Title) - e.g., "Kontorbygning"
- `max_energy_kwh_m2` (Number) - e.g., 115
- `description` (Text)

### 🚀 Feature Flags Database
Properties:
- `feature_name` (Title) - e.g., "pdf_export"
- `enabled` (Checkbox)
- `rollout_percentage` (Number) - 0-100
- `description` (Text)

### 📝 Content Database (Optional)
Properties:
- `key` (Title) - e.g., "landing.title"
- `norwegian_text` (Text)
- `english_text` (Text)
- `category` (Select) - Options: landing, dashboard, form, error, success
- `context` (Text)

## Step 3: Share Databases with Integration

1. Open each database in Notion
2. Click "..." menu → "Add connections"
3. Search for your "Skiplum Energy Config" integration
4. Click "Confirm"

## Step 4: Get Database IDs

1. Open each database in Notion
2. Copy the URL, it looks like:
   ```
   https://www.notion.so/workspace/Database-Name-1234567890abcdef1234567890abcdef
   ```
3. The database ID is the 32-character string: `1234567890abcdef1234567890abcdef`

## Step 5: Enable Wrappers in Supabase

1. Go to your Supabase dashboard
2. Navigate to Database → Extensions
3. Search for "wrappers"
4. Click "Enable" if not already enabled

## Step 6: Run the Setup Script

1. Go to SQL Editor in Supabase
2. Update the `003_notion_fdw_setup.sql` script with:
   - Your Notion API key (replace `YOUR_NOTION_API_KEY_HERE`)
   - Your database IDs (replace `YOUR_NOTION_DATABASE_ID_HERE`)
3. Run the script

## Step 7: Initial Data Population

In Notion, add your configuration values:

### Example Calculations
| name | value | unit | category | description |
|------|-------|------|----------|-------------|
| bra_adjustment | 8 | % | area | Reduction from BRA to heated BRA |
| investment_multiplier | 7 | x | investment | Annual waste multiplied by this |
| heating_investment_percentage | 70 | % | investment | Percentage for heating |
| base_electricity_price | 2.80 | kr/kWh | energy | Base electricity price 2024 |

### Example TEK17 Requirements
| building_type | max_energy_kwh_m2 | description |
|--------------|-------------------|-------------|
| Kontorbygning | 115 | Kontorer og administrasjonsbygg |
| Småhus | 100 | Eneboliger og rekkehus |
| Leilighetsblokk | 95 | Boligblokker |

### Example Feature Flags
| feature_name | enabled | rollout_percentage | description |
|-------------|---------|-------------------|-------------|
| pdf_export | false | 0 | PDF report generation |
| email_capture | true | 100 | Email lead capture modal |
| map_visualization | true | 100 | Show building on map |

## Step 8: Test the Sync

### Manual Sync via SQL
```sql
SELECT sync_notion_to_supabase();
```

### Manual Sync via API
Create an API route in your Next.js app:

```typescript
// app/api/admin/sync-notion/route.ts
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // Need service key for admin operations
  )

  const { data, error } = await supabase
    .rpc('manual_sync_notion')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
```

Then add a sync button to your admin panel:

```typescript
const syncNotion = async () => {
  const response = await fetch('/api/admin/sync-notion', { method: 'POST' })
  const data = await response.json()
  console.log('Sync result:', data)
  // Refresh your configuration
  loadConfiguration()
}
```

## Step 9: Set Up Automatic Sync (Optional)

### Option A: Cron Job in Supabase
If pg_cron is enabled:
```sql
SELECT cron.schedule('sync-notion', '*/5 * * * *', 'SELECT sync_notion_to_supabase();');
```

### Option B: Vercel Cron
In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sync-notion",
    "schedule": "*/5 * * * *"
  }]
}
```

### Option C: Notion Webhook (Advanced)
Use Notion's API to detect changes and trigger sync immediately.

## Step 10: Monitor Configuration

1. Visit `/admin` in your app to see current values
2. Edit values in Notion
3. Wait for sync or trigger manually
4. See updated values in admin panel

## Troubleshooting

### "Permission denied for foreign table"
- Make sure you've shared the Notion database with your integration

### "Invalid API key"
- Double-check your Notion integration token
- Ensure it starts with `secret_`

### "Database not found"
- Verify the database ID is correct (32 characters)
- Check that the database is shared with the integration

### Changes not syncing
- Check if materialized views need refreshing
- Look for errors in Supabase logs
- Verify the sync function is running

## Benefits of This Setup

✅ **No code changes** for configuration updates
✅ **Business users** can manage settings
✅ **Version history** in Notion
✅ **Comments and collaboration** in Notion
✅ **Real-time updates** to your app
✅ **A/B testing** via feature flags
✅ **Formula adjustments** without deployment

## Security Notes

- Never commit your Notion API key to git
- Use environment variables for sensitive data
- Restrict write access to configuration tables
- Monitor sync logs for errors
- Consider rate limiting sync operations