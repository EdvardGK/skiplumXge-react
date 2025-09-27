# Power Automate Notion Sync Setup

## Overview
This Python script syncs configuration from Notion to Supabase using Power Automate Cloud.

## Prerequisites

1. **Update the Python script** (`scripts/notion_supabase_sync.py`):
   - Replace `SUPABASE_URL` with your actual Supabase project URL
   - Replace `SUPABASE_KEY` with your Supabase service key
   - The Notion API key is already set

## Power Automate Cloud Setup

### Step 1: Create a New Cloud Flow

1. Go to [Power Automate](https://make.powerautomate.com/)
2. Click **+ Create** → **Scheduled cloud flow**
3. Name: "Sync Notion to Supabase"
4. Set schedule (e.g., every 6 hours)
5. Click **Create**

### Step 2: Add Python Script Action

1. Click **+ New step**
2. Search for **"Run Python script"**
3. Select the **Python Script** action

### Step 3: Configure Python Script

1. **Copy the entire content** of `notion_supabase_sync.py`
2. **Paste it** into the Python script editor
3. **No input parameters needed** - everything is hardcoded

### Step 4: Parse the Output (Optional)

If you want to use the results:

1. Add action **"Parse JSON"**
2. Content: Output from Python script
3. Schema:
```json
{
  "type": "object",
  "properties": {
    "calculations": { "type": "integer" },
    "features": { "type": "integer" },
    "formulas": { "type": "integer" },
    "success": { "type": "boolean" },
    "timestamp": { "type": "string" },
    "error": { "type": "string" }
  }
}
```

### Step 5: Add Notifications (Optional)

Add actions to notify you of sync results:
- **Send an email** with sync results
- **Post to Teams** channel
- **Create a log entry** in SharePoint

## Manual Testing

### Test Locally First

1. Install dependencies:
```bash
pip install requests
```

2. Update credentials in the script

3. Run locally:
```bash
python scripts/notion_supabase_sync.py
```

### Test in Power Automate

1. Save your flow
2. Click **Test** → **Manually**
3. Click **Run flow**
4. Check the run history for results

## What Gets Synced

### From Notion:
- **Calculations**: BRA adjustment, multipliers, prices
- **Feature Flags**: Enable/disable features
- **Formulas**: Calculation logic

### To Supabase Tables:
- `calculations` table
- `feature_flags` table
- `formulas` table

## Monitoring

The script outputs:
```json
{
  "calculations": 10,
  "features": 8,
  "formulas": 10,
  "success": true,
  "timestamp": "2024-01-15T10:30:00"
}
```

## Troubleshooting

### "Module not found"
Power Automate Cloud includes `requests` by default. If not available, use `urllib` instead.

### "401 Unauthorized"
- Check your Notion API key
- Verify databases are shared with integration

### "Connection refused"
- Verify Supabase URL is correct
- Check service key has write permissions

### Nothing syncs
- Ensure Notion databases have data
- Check property names match exactly
- Verify Supabase tables exist

## Alternative: Azure Functions

If Power Automate Python is limited, deploy as Azure Function:

1. Create Azure Function App (Python)
2. Deploy the script
3. Set environment variables for credentials
4. Trigger via Timer or HTTP
5. Call from Power Automate using HTTP action

## Security Notes

- Store credentials in Power Automate variables or Azure Key Vault
- Don't commit credentials to Git
- Use service keys with minimal permissions
- Monitor sync logs for failures

## Benefits

✅ **No infrastructure** - Runs in Power Automate Cloud
✅ **Scheduled syncs** - Automatic updates
✅ **Error handling** - Built-in retry logic
✅ **Notifications** - Email/Teams alerts
✅ **Audit trail** - Full run history
✅ **Free tier** - Included in most Office 365 plans