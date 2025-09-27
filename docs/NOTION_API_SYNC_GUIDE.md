# Notion API Sync Setup (No Wrappers Required)

## Overview
Since the `wrappers` extension isn't available in your Supabase instance, this guide uses a simpler API-based approach to sync configuration from Notion.

## Architecture
```
Notion → API Route → Supabase Staging → Configuration Tables
```

## Setup Steps

### 1. Run the Alternative SQL Migration
Run `003_notion_config_alternative.sql` in Supabase SQL Editor. This creates:
- Staging tables for imports
- Sync functions
- No foreign data wrapper needed!

### 2. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Create new integration "Skiplum Config"
3. Grant these capabilities:
   - Read content ✅
   - No other permissions needed
4. Copy the secret token

### 3. Create Notion Databases

Create these 4 databases in Notion with exact column names:

#### Calculations
- `name` (Title)
- `value` (Number)
- `unit` (Text)
- `category` (Select: area, investment, energy, analysis, defaults)
- `description` (Text)
- `min_value` (Number)
- `max_value` (Number)

#### TEK17 Requirements
- `building_type` (Title)
- `max_energy_kwh_m2` (Number)
- `description` (Text)

#### Feature Flags
- `feature_name` (Title)
- `enabled` (Checkbox)
- `rollout_percentage` (Number)
- `description` (Text)

#### Formulas
- `name` (Title)
- `formula` (Text)
- `variables` (Text) - comma-separated list
- `description` (Text)
- `category` (Select: area, energy, cost, investment)

### 4. Share Databases with Integration
For each database:
1. Click "..." → "Add connections"
2. Select your integration
3. Confirm

### 5. Get Database IDs
From each database page URL:
```
https://notion.so/yourworkspace/Title-abc123...
                                      ^^^^^^^^^
```
The ID is the 32-character string after the title.

### 6. Add Environment Variables
Add to `.env.local`:
```env
# Notion Configuration
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_CALCULATIONS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_TEK17_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_FEATURES_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_FORMULAS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase Service Key (for admin operations)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. Test the Sync

#### Manual Sync Button
Add to your admin panel:

```typescript
const syncFromNotion = async () => {
  try {
    const response = await fetch('/api/admin/sync-notion', {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      alert('Configuration synced successfully!');
      // Refresh your config display
      loadConfiguration();
    } else {
      console.error('Sync failed:', data);
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
};

// In your JSX
<Button onClick={syncFromNotion}>
  Sync from Notion
</Button>
```

#### Check Sync Status
```typescript
const checkSyncStatus = async () => {
  const response = await fetch('/api/admin/sync-notion');
  const data = await response.json();
  console.log('Last syncs:', data.last_syncs);
};
```

## Automatic Sync Options

### Option 1: Vercel Cron (Production)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/sync-notion",
    "schedule": "0 */6 * * *"
  }]
}
```
This syncs every 6 hours.

### Option 2: GitHub Action
Create `.github/workflows/sync-notion.yml`:
```yaml
name: Sync Notion Config
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: |
          curl -X POST https://your-app.vercel.app/api/admin/sync-notion \
            -H "Authorization: Bearer ${{ secrets.SYNC_SECRET }}"
```

### Option 3: Manual Trigger
Just use the sync button in your admin panel when needed.

## Security Considerations

### Add Authentication (Recommended)
Update the API route to check for admin auth:

```typescript
// In route.ts
export async function POST(request: Request) {
  // Check for admin token
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SYNC_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of sync logic
}
```

Then add `ADMIN_SYNC_TOKEN` to your environment variables.

## Troubleshooting

### "NOTION_API_KEY is not defined"
- Make sure `.env.local` has all required variables
- Restart your Next.js dev server after adding env vars

### "Database not found"
- Verify database ID is correct
- Check that database is shared with integration

### "import_notion_config function not found"
- Run the SQL migration first (`003_notion_config_alternative.sql`)

### Sync succeeds but no data appears
- Check Notion database has rows
- Verify column names match exactly
- Look at sync logs in `notion_sync_log` table

## Benefits of This Approach

✅ **No extension required** - Works with standard Supabase
✅ **Full control** - You control when syncs happen
✅ **Audit trail** - All syncs logged in database
✅ **Flexible** - Easy to add custom validation
✅ **Secure** - Can add authentication layers

## What Gets Synced

✅ Calculations (BRA adjustment, multipliers, prices)
✅ TEK17 building requirements
✅ Feature flags (enable/disable features)
✅ Calculation formulas

❌ NOT synced (stays in Supabase only):
- Energy certificates
- User data
- Electricity prices (real-time)
- Email leads
- Generated reports