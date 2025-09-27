-- Setup Notion Foreign Data Wrapper in Supabase
-- This allows you to edit configuration in Notion and have it sync to Supabase

-- Step 1: Install the Notion FDW extension (may need to be enabled in Supabase dashboard first)
CREATE EXTENSION IF NOT EXISTS wrappers;

-- Step 2: Create the foreign server
CREATE SERVER IF NOT EXISTS notion_server
  FOREIGN DATA WRAPPER wrappers
  OPTIONS (
    wrapper 'notion'
  );

-- Step 3: Create user mapping (you'll need to add your Notion API key)
-- Get your Notion integration token from: https://www.notion.so/my-integrations
-- Create a new integration and get the secret token
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER notion_server
  OPTIONS (
    api_key 'YOUR_NOTION_API_KEY_HERE' -- Replace with your actual Notion API key
  );

-- Step 4: Create foreign tables that map to your Notion databases
-- You need to share your Notion databases with your integration first!

-- Example: Map Notion calculations database to Supabase
CREATE FOREIGN TABLE IF NOT EXISTS notion_calculations (
  id text,
  name text,
  value numeric,
  unit text,
  category text,
  description text,
  min_value numeric,
  max_value numeric
)
  SERVER notion_server
  OPTIONS (
    database_id 'YOUR_NOTION_DATABASE_ID_HERE' -- Replace with your Notion database ID
  );

-- Example: Map Notion TEK17 database to Supabase
CREATE FOREIGN TABLE IF NOT EXISTS notion_tek17 (
  id text,
  building_type text,
  max_energy_kwh_m2 numeric,
  description text
)
  SERVER notion_server
  OPTIONS (
    database_id 'YOUR_NOTION_TEK17_DATABASE_ID_HERE' -- Replace with your Notion database ID
  );

-- Example: Map Notion feature flags database to Supabase
CREATE FOREIGN TABLE IF NOT EXISTS notion_features (
  id text,
  feature_name text,
  enabled boolean,
  rollout_percentage integer,
  description text
)
  SERVER notion_server
  OPTIONS (
    database_id 'YOUR_NOTION_FEATURES_DATABASE_ID_HERE' -- Replace with your Notion database ID
  );

-- Step 5: Create materialized views for better performance
-- These cache the Notion data in Supabase

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_notion_calculations AS
SELECT * FROM notion_calculations;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_notion_tek17 AS
SELECT * FROM notion_tek17;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_notion_features AS
SELECT * FROM notion_features;

-- Step 6: Create a function to sync Notion data to your existing tables
CREATE OR REPLACE FUNCTION sync_notion_to_supabase()
RETURNS void AS $$
BEGIN
  -- Sync calculations
  INSERT INTO calculations (name, value, unit, category, description, min_value, max_value)
  SELECT name, value, unit, category, description, min_value, max_value
  FROM notion_calculations
  ON CONFLICT (name) DO UPDATE SET
    value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    updated_at = NOW();

  -- Sync TEK17 requirements
  INSERT INTO tek17_requirements (building_type, max_energy_kwh_m2, description)
  SELECT building_type, max_energy_kwh_m2, description
  FROM notion_tek17
  ON CONFLICT (building_type) DO UPDATE SET
    max_energy_kwh_m2 = EXCLUDED.max_energy_kwh_m2,
    description = EXCLUDED.description,
    updated_at = NOW();

  -- Sync feature flags
  INSERT INTO feature_flags (feature_name, enabled, rollout_percentage, description)
  SELECT feature_name, enabled, rollout_percentage, description
  FROM notion_features
  ON CONFLICT (feature_name) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW mv_notion_calculations;
  REFRESH MATERIALIZED VIEW mv_notion_tek17;
  REFRESH MATERIALIZED VIEW mv_notion_features;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a scheduled job to sync every 5 minutes (using pg_cron if available)
-- Note: pg_cron needs to be enabled in Supabase dashboard
-- SELECT cron.schedule('sync-notion', '*/5 * * * *', 'SELECT sync_notion_to_supabase();');

-- Step 8: Create a manual sync function that can be called via API
CREATE OR REPLACE FUNCTION manual_sync_notion()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  PERFORM sync_notion_to_supabase();

  SELECT json_build_object(
    'success', true,
    'synced_at', NOW(),
    'calculations_count', (SELECT COUNT(*) FROM calculations),
    'tek17_count', (SELECT COUNT(*) FROM tek17_requirements),
    'features_count', (SELECT COUNT(*) FROM feature_flags)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON FOREIGN SERVER notion_server TO authenticated;
GRANT SELECT ON notion_calculations TO authenticated;
GRANT SELECT ON notion_tek17 TO authenticated;
GRANT SELECT ON notion_features TO authenticated;
GRANT SELECT ON mv_notion_calculations TO authenticated;
GRANT SELECT ON mv_notion_tek17 TO authenticated;
GRANT SELECT ON mv_notion_features TO authenticated;
GRANT EXECUTE ON FUNCTION sync_notion_to_supabase() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_sync_notion() TO authenticated;