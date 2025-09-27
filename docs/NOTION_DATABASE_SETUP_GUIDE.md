# Notion Database Setup Guide

## Quick Start Checklist

This guide helps you create the Notion databases needed for the SkiplumXGE energy analysis configuration system.

## Step 1: Create the 4 Configuration Databases

### 1.1 Calculations Database
**Purpose:** Numeric values for business logic

1. Create new database in Notion
2. Name it: "SkiplumXGE - Calculations"
3. Add these properties (EXACT names, case-sensitive):
   - **Name** (Title - already exists)
   - **Value** (Number)
   - **Unit** (Text)
   - **Category** (Select) with options: area, investment, energy, analysis, conversion, defaults, metrics
   - **Description** (Text)
   - **Min Value** (Number)
   - **Max Value** (Number)

4. Get the database ID (from Share → Copy link, the ID is the part before the ?)
5. Verify it matches: `27a2fc6e265980dd911cef9a20616899`

### 1.2 Feature Flags Database
**Purpose:** Control feature rollout

1. Create new database: "SkiplumXGE - Feature Flags"
2. Add properties:
   - **Feature Name** (Title - rename from "Name")
   - **Enabled** (Checkbox)
   - **Rollout %** (Number)
   - **Description** (Text)

3. Database ID should be: `27a2fc6e26598041ab4dcf7c090035d2`

### 1.3 Formulas Database
**Purpose:** Calculation logic

1. Create new database: "SkiplumXGE - Formulas"
2. Add properties:
   - **Name** (Title)
   - **Formula** (Text)
   - **Variables** (Text)
   - **Description** (Text)
   - **Category** (Select) with options: area, energy, cost, compliance, waste, investment

3. Database ID should be: `27a2fc6e26598071912ec979a9c18a7a`

### 1.4 Content Database
**Purpose:** UI strings and marketing copy

1. Create new database: "SkiplumXGE - Content"
2. Add properties:
   - **Key** (Title - rename from "Name")
   - **Norwegian Text** (Text)
   - **English Text** (Text)
   - **Category** (Select) with options: landing, dashboard, form, report, error, success
   - **Context** (Text)

3. Get the database ID and save it

## Step 2: Create Supporting Databases

### 2.1 Projects Database
1. Create new database: "Projects"
2. Add properties:
   - **Name** (Title)
   - **Description** (Text)
   - **Status** (Select) with options: Active, Paused, Archived
   - **Owner** (People)

3. Add entry: "SkiplumXGE" with Status: Active

### 2.2 Automation Logs Database
1. Create new database: "Automation Logs"
2. Add ALL properties from `/docs/NOTION_LOGGING_DATABASE_SETUP_V2.md`
3. Key properties include:
   - Run ID, Script Name, Project (relation), Status, timestamps, error tracking, etc.

## Step 3: Populate Initial Data

### Calculations (Copy these entries):
```
Name: bra_adjustment
Value: 8
Unit: %
Category: area
Description: Reduction from BRA to heated BRA

Name: investment_multiplier
Value: 7
Unit: x
Category: investment
Description: Annual waste multiplied by this for investment room

Name: heating_investment_percentage
Value: 70
Unit: %
Category: investment
Description: Percentage of investment for heating

Name: lighting_investment_percentage
Value: 15
Unit: %
Category: investment
Description: Percentage of investment for lighting

Name: base_electricity_price
Value: 2.80
Unit: kr/kWh
Category: energy
Description: Base electricity price 2024
```

### Feature Flags (Copy these entries):
```
Feature Name: pdf_export
Enabled: ☐
Rollout %: 0
Description: PDF report generation - currently broken

Feature Name: email_capture
Enabled: ☑
Rollout %: 100
Description: Email lead capture modal

Feature Name: map_visualization
Enabled: ☑
Rollout %: 100
Description: Show building footprint on map
```

### Formulas (Copy these entries):
```
Name: heated_bra
Formula: bra * (1 - bra_adjustment/100)
Variables: bra, bra_adjustment
Description: Calculate heated BRA from total BRA
Category: area

Name: investment_room
Formula: waste_cost * investment_multiplier
Variables: waste_cost, investment_multiplier
Description: Conservative investment room
Category: investment
```

### Content (Copy key entries):
```
Key: landing.title
Norwegian Text: Spar tusenvis på energikostnadene
English Text: Save thousands on energy costs
Category: landing
Context: Main headline

Key: landing.cta.primary
Norwegian Text: Start analyse
English Text: Start analysis
Category: landing
Context: Primary CTA button

Key: dashboard.investment.title
Norwegian Text: Investeringsrom
English Text: Investment Room
Category: dashboard
Context: Investment card title
```

## Step 4: Configure Environment Variables

Add to your `.env` file (location: `D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\.env`):

```env
# Existing variables...

# Add Content database ID after creating it
NOTION_CONTENT_DB_ID=YOUR_CONTENT_DATABASE_ID_HERE

# Add logging databases
NOTION_LOGGING_DB_ID=YOUR_LOGGING_DATABASE_ID_HERE
NOTION_PROJECT_DB_ID=YOUR_PROJECTS_DATABASE_ID_HERE
```

## Step 5: Update Sync Script

1. Open `notion_sync_with_logging.py`
2. Update the content database ID:
   ```python
   "content": "YOUR_CONTENT_DATABASE_ID_HERE"
   ```

## Step 6: Test the Sync

```bash
cd D:\AutomatiseringGullbrand\skiplumXGE\notion-supabase\scripts
python notion_sync_with_logging.py
```

Expected output:
```
NOTION → SUPABASE SYNC
✓ Synced X calculations
✓ Synced X feature flags
✓ Synced X formulas
✓ Synced X content items
SYNC COMPLETE
```

## Step 7: Set Up Task Scheduler

1. Open Windows Task Scheduler
2. Create new task: "SkiplumXGE Notion Sync"
3. Trigger: Every 6 hours
4. Action: Run `run_sync_actual.bat`
5. Settings: Run whether user is logged in or not

## Troubleshooting

### If database IDs don't match:
- The IDs in the sync script may need updating
- Use the IDs from your actual Notion databases

### If sync fails:
- Check property names match EXACTLY (case-sensitive)
- Verify .env file has correct API keys
- Check Supabase tables exist

### To get a database ID:
1. Open the database in Notion
2. Click Share button
3. Copy link
4. The ID is between the last `/` and the `?`
5. Example: notion.so/workspace/`27a2fc6e265980dd911cef9a20616899`?v=xxx

## Complete Data Reference

See `/planning/database/CURRENT_NOTION_STRUCTURE.md` for:
- Complete list of all data entries
- Full property specifications
- Category options for each field

## Benefits Once Complete

✅ Engineers can adjust values without touching code
✅ Marketing can update copy independently
✅ Feature flags for safe rollouts
✅ Full audit trail of all changes
✅ Changes live within 6 hours (or instant with manual sync)