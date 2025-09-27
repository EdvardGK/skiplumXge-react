-- Notion Configuration Wrapper for Supabase
-- This ONLY syncs configuration variables from Notion, not actual data
-- Energy certificates, user data, etc. stay in Supabase only

-- Step 1: Install the wrapper extension
CREATE EXTENSION IF NOT EXISTS wrappers;

-- Step 2: Create the foreign server for Notion
CREATE SERVER IF NOT EXISTS notion_config_server
  FOREIGN DATA WRAPPER wrappers
  OPTIONS (
    wrapper 'notion'
  );

-- Step 3: Create user mapping with your Notion API key
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER notion_config_server
  OPTIONS (
    api_key 'YOUR_NOTION_INTEGRATION_TOKEN' -- Replace with your secret_xxx token
  );

-- Step 4: Create foreign tables for CONFIGURATION ONLY

-- 4.1: Calculations configuration (BRA adjustment, multipliers, etc.)
CREATE FOREIGN TABLE IF NOT EXISTS notion_calculations_config (
  name text,
  value numeric,
  unit text,
  category text,
  description text,
  min_value numeric,
  max_value numeric
)
  SERVER notion_config_server
  OPTIONS (
    database_id 'YOUR_CALCULATIONS_DATABASE_ID' -- Replace with Notion database ID
  );

-- 4.2: TEK17 requirements configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_tek17_config (
  building_type text,
  max_energy_kwh_m2 numeric,
  description text
)
  SERVER notion_config_server
  OPTIONS (
    database_id 'YOUR_TEK17_DATABASE_ID' -- Replace with Notion database ID
  );

-- 4.3: Feature flags configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_feature_flags_config (
  feature_name text,
  enabled boolean,
  rollout_percentage integer,
  description text
)
  SERVER notion_config_server
  OPTIONS (
    database_id 'YOUR_FEATURES_DATABASE_ID' -- Replace with Notion database ID
  );

-- 4.4: Formulas configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_formulas_config (
  name text,
  formula text,
  variables text[], -- Array of variable names
  description text,
  category text
)
  SERVER notion_config_server
  OPTIONS (
    database_id 'YOUR_FORMULAS_DATABASE_ID' -- Replace with Notion database ID
  );

-- 4.5: UI Content strings (optional - only if you want to manage text in Notion)
CREATE FOREIGN TABLE IF NOT EXISTS notion_content_config (
  key text,
  norwegian_text text,
  english_text text,
  category text,
  context text
)
  SERVER notion_config_server
  OPTIONS (
    database_id 'YOUR_CONTENT_DATABASE_ID' -- Replace with Notion database ID (optional)
  );

-- Step 5: Create sync function for configuration ONLY
CREATE OR REPLACE FUNCTION sync_notion_config()
RETURNS json AS $$
DECLARE
  calc_count integer := 0;
  tek17_count integer := 0;
  feature_count integer := 0;
  formula_count integer := 0;
  content_count integer := 0;
BEGIN
  -- Sync calculations configuration
  WITH notion_data AS (
    SELECT * FROM notion_calculations_config
  )
  INSERT INTO calculations (name, value, unit, category, description, min_value, max_value)
  SELECT name, value, unit, category, description, min_value, max_value
  FROM notion_data
  ON CONFLICT (name) DO UPDATE SET
    value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    updated_at = NOW();

  GET DIAGNOSTICS calc_count = ROW_COUNT;

  -- Sync TEK17 requirements
  WITH notion_data AS (
    SELECT * FROM notion_tek17_config
  )
  INSERT INTO tek17_requirements (building_type, max_energy_kwh_m2, description)
  SELECT building_type, max_energy_kwh_m2, description
  FROM notion_data
  ON CONFLICT (building_type) DO UPDATE SET
    max_energy_kwh_m2 = EXCLUDED.max_energy_kwh_m2,
    description = EXCLUDED.description,
    updated_at = NOW();

  GET DIAGNOSTICS tek17_count = ROW_COUNT;

  -- Sync feature flags
  WITH notion_data AS (
    SELECT * FROM notion_feature_flags_config
  )
  INSERT INTO feature_flags (feature_name, enabled, rollout_percentage, description)
  SELECT feature_name, enabled, rollout_percentage, description
  FROM notion_data
  ON CONFLICT (feature_name) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

  GET DIAGNOSTICS feature_count = ROW_COUNT;

  -- Sync formulas
  WITH notion_data AS (
    SELECT * FROM notion_formulas_config
  )
  INSERT INTO formulas (name, formula, variables, description, category)
  SELECT name, formula, variables, description, category
  FROM notion_data
  ON CONFLICT (name) DO UPDATE SET
    formula = EXCLUDED.formula,
    variables = EXCLUDED.variables,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    updated_at = NOW();

  GET DIAGNOSTICS formula_count = ROW_COUNT;

  -- Sync content (optional)
  -- Uncomment if you want to manage UI strings in Notion
  /*
  WITH notion_data AS (
    SELECT * FROM notion_content_config
  )
  INSERT INTO content (key, norwegian_text, english_text, category, context)
  SELECT key, norwegian_text, english_text, category, context
  FROM notion_data
  ON CONFLICT (key) DO UPDATE SET
    norwegian_text = EXCLUDED.norwegian_text,
    english_text = EXCLUDED.english_text,
    category = EXCLUDED.category,
    context = EXCLUDED.context,
    updated_at = NOW();

  GET DIAGNOSTICS content_count = ROW_COUNT;
  */

  -- Return sync summary
  RETURN json_build_object(
    'success', true,
    'timestamp', NOW(),
    'synced', json_build_object(
      'calculations', calc_count,
      'tek17_requirements', tek17_count,
      'feature_flags', feature_count,
      'formulas', formula_count,
      'content', content_count
    ),
    'note', 'Configuration variables synced from Notion. User data remains in Supabase only.'
  );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a view to see what will be synced (for debugging)
CREATE OR REPLACE VIEW v_notion_config_preview AS
SELECT
  'calculation' as type,
  name as key,
  value::text as value,
  category,
  description
FROM notion_calculations_config
UNION ALL
SELECT
  'tek17' as type,
  building_type as key,
  max_energy_kwh_m2::text as value,
  'building' as category,
  description
FROM notion_tek17_config
UNION ALL
SELECT
  'feature' as type,
  feature_name as key,
  CASE WHEN enabled THEN 'enabled' ELSE 'disabled' END as value,
  'feature' as category,
  description
FROM notion_feature_flags_config
UNION ALL
SELECT
  'formula' as type,
  name as key,
  formula as value,
  category,
  description
FROM notion_formulas_config;

-- Step 7: API function for manual sync (can be called from your app)
CREATE OR REPLACE FUNCTION api_sync_config_from_notion()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Only sync configuration, never touch real data
  SELECT sync_notion_config() INTO result;

  -- Log the sync
  INSERT INTO audit_log (action, details, timestamp)
  VALUES ('notion_config_sync', result, NOW());

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create audit log table for tracking config changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Grant minimal permissions (read-only on foreign tables)
GRANT SELECT ON notion_calculations_config TO authenticated;
GRANT SELECT ON notion_tek17_config TO authenticated;
GRANT SELECT ON notion_feature_flags_config TO authenticated;
GRANT SELECT ON notion_formulas_config TO authenticated;
GRANT SELECT ON v_notion_config_preview TO authenticated;
GRANT EXECUTE ON FUNCTION api_sync_config_from_notion() TO authenticated;

-- Step 10: Optional - Schedule automatic sync (requires pg_cron)
-- This syncs configuration every 15 minutes
-- SELECT cron.schedule('sync-notion-config', '*/15 * * * *', 'SELECT sync_notion_config();');

-- IMPORTANT: User data tables are NEVER touched by Notion sync
-- These remain Supabase-only:
-- - energy_certificates (Enova data)
-- - electricity_prices (real-time prices)
-- - user_analyses (saved user work)
-- - leads (email captures)
-- - reports (generated PDFs)