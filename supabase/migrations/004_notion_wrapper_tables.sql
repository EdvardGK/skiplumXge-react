-- Notion Wrapper Foreign Tables Setup
-- Run this after creating the wrapper "SkiplumXGE-Notion" in Supabase dashboard

-- The wrapper creates a server called: SkiplumXGE-Notion_server

-- Step 1: Create foreign tables for configuration data only

-- 1.1 Calculations Configuration Table
CREATE FOREIGN TABLE IF NOT EXISTS notion_calculations (
  "Name" text,                    -- name in Notion (Title property)
  "Value" numeric,                 -- value in Notion (Number property)
  "Unit" text,                     -- unit in Notion (Text property)
  "Category" text,                 -- category in Notion (Select property)
  "Description" text,              -- description in Notion (Text property)
  "Min Value" numeric,             -- min_value in Notion (Number property)
  "Max Value" numeric              -- max_value in Notion (Number property)
)
SERVER "SkiplumXGE-Notion_server"
OPTIONS (
  database_id 'YOUR_CALCULATIONS_DATABASE_ID'  -- Replace with your Notion database ID
);

-- 1.2 TEK17 Requirements Configuration Table
CREATE FOREIGN TABLE IF NOT EXISTS notion_tek17 (
  "Building Type" text,            -- building_type in Notion (Title property)
  "Max Energy" numeric,            -- max_energy_kwh_m2 in Notion (Number property)
  "Description" text               -- description in Notion (Text property)
)
SERVER "SkiplumXGE-Notion_server"
OPTIONS (
  database_id 'YOUR_TEK17_DATABASE_ID'  -- Replace with your Notion database ID
);

-- 1.3 Feature Flags Configuration Table
CREATE FOREIGN TABLE IF NOT EXISTS notion_features (
  "Feature Name" text,             -- feature_name in Notion (Title property)
  "Enabled" boolean,               -- enabled in Notion (Checkbox property)
  "Rollout %" numeric,             -- rollout_percentage in Notion (Number property)
  "Description" text               -- description in Notion (Text property)
)
SERVER "SkiplumXGE-Notion_server"
OPTIONS (
  database_id 'YOUR_FEATURES_DATABASE_ID'  -- Replace with your Notion database ID
);

-- 1.4 Formulas Configuration Table
CREATE FOREIGN TABLE IF NOT EXISTS notion_formulas (
  "Name" text,                     -- name in Notion (Title property)
  "Formula" text,                  -- formula in Notion (Text/Code property)
  "Variables" text,                -- variables in Notion (Text property - comma separated)
  "Description" text,              -- description in Notion (Text property)
  "Category" text                  -- category in Notion (Select property)
)
SERVER "SkiplumXGE-Notion_server"
OPTIONS (
  database_id 'YOUR_FORMULAS_DATABASE_ID'  -- Replace with your Notion database ID
);

-- Step 2: Create sync functions to copy from Notion to local tables

-- Function to sync calculations from Notion
CREATE OR REPLACE FUNCTION sync_notion_calculations()
RETURNS json AS $$
DECLARE
  count integer := 0;
BEGIN
  -- Insert or update calculations from Notion
  INSERT INTO calculations (name, value, unit, category, description, min_value, max_value)
  SELECT
    "Name",
    "Value",
    "Unit",
    "Category",
    "Description",
    "Min Value",
    "Max Value"
  FROM notion_calculations
  WHERE "Name" IS NOT NULL
  ON CONFLICT (name) DO UPDATE SET
    value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    min_value = EXCLUDED.min_value,
    max_value = EXCLUDED.max_value,
    updated_at = NOW();

  GET DIAGNOSTICS count = ROW_COUNT;

  RETURN json_build_object('calculations_synced', count);
END;
$$ LANGUAGE plpgsql;

-- Function to sync TEK17 requirements from Notion
CREATE OR REPLACE FUNCTION sync_notion_tek17()
RETURNS json AS $$
DECLARE
  count integer := 0;
BEGIN
  INSERT INTO tek17_requirements (building_type, max_energy_kwh_m2, description)
  SELECT
    "Building Type",
    "Max Energy",
    "Description"
  FROM notion_tek17
  WHERE "Building Type" IS NOT NULL
  ON CONFLICT (building_type) DO UPDATE SET
    max_energy_kwh_m2 = EXCLUDED.max_energy_kwh_m2,
    description = EXCLUDED.description,
    updated_at = NOW();

  GET DIAGNOSTICS count = ROW_COUNT;

  RETURN json_build_object('tek17_synced', count);
END;
$$ LANGUAGE plpgsql;

-- Function to sync feature flags from Notion
CREATE OR REPLACE FUNCTION sync_notion_features()
RETURNS json AS $$
DECLARE
  count integer := 0;
BEGIN
  INSERT INTO feature_flags (feature_name, enabled, rollout_percentage, description)
  SELECT
    "Feature Name",
    COALESCE("Enabled", false),
    COALESCE("Rollout %", 0)::integer,
    "Description"
  FROM notion_features
  WHERE "Feature Name" IS NOT NULL
  ON CONFLICT (feature_name) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    description = EXCLUDED.description,
    updated_at = NOW();

  GET DIAGNOSTICS count = ROW_COUNT;

  RETURN json_build_object('features_synced', count);
END;
$$ LANGUAGE plpgsql;

-- Function to sync formulas from Notion
CREATE OR REPLACE FUNCTION sync_notion_formulas()
RETURNS json AS $$
DECLARE
  count integer := 0;
BEGIN
  INSERT INTO formulas (name, formula, variables, description, category)
  SELECT
    "Name",
    "Formula",
    string_to_array(COALESCE("Variables", ''), ','),
    "Description",
    "Category"
  FROM notion_formulas
  WHERE "Name" IS NOT NULL
  ON CONFLICT (name) DO UPDATE SET
    formula = EXCLUDED.formula,
    variables = EXCLUDED.variables,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    updated_at = NOW();

  GET DIAGNOSTICS count = ROW_COUNT;

  RETURN json_build_object('formulas_synced', count);
END;
$$ LANGUAGE plpgsql;

-- Master sync function
CREATE OR REPLACE FUNCTION sync_all_notion_config()
RETURNS json AS $$
DECLARE
  calc_result json;
  tek17_result json;
  features_result json;
  formulas_result json;
BEGIN
  -- Sync all configuration types
  calc_result := sync_notion_calculations();
  tek17_result := sync_notion_tek17();
  features_result := sync_notion_features();
  formulas_result := sync_notion_formulas();

  -- Log the sync
  INSERT INTO audit_log (action, details, timestamp)
  VALUES (
    'notion_config_sync',
    json_build_object(
      'calculations', calc_result,
      'tek17', tek17_result,
      'features', features_result,
      'formulas', formulas_result
    ),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'timestamp', NOW(),
    'results', json_build_object(
      'calculations', calc_result,
      'tek17', tek17_result,
      'features', features_result,
      'formulas', formulas_result
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create views for easy querying
CREATE OR REPLACE VIEW v_notion_calculations AS
SELECT * FROM notion_calculations;

CREATE OR REPLACE VIEW v_notion_tek17 AS
SELECT * FROM notion_tek17;

CREATE OR REPLACE VIEW v_notion_features AS
SELECT * FROM notion_features;

CREATE OR REPLACE VIEW v_notion_formulas AS
SELECT * FROM notion_formulas;

-- Grant permissions
GRANT SELECT ON notion_calculations TO authenticated;
GRANT SELECT ON notion_tek17 TO authenticated;
GRANT SELECT ON notion_features TO authenticated;
GRANT SELECT ON notion_formulas TO authenticated;
GRANT SELECT ON v_notion_calculations TO authenticated;
GRANT SELECT ON v_notion_tek17 TO authenticated;
GRANT SELECT ON v_notion_features TO authenticated;
GRANT SELECT ON v_notion_formulas TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_notion_config() TO authenticated;

-- Test query to verify connection (run this after setup)
-- SELECT * FROM notion_calculations LIMIT 1;