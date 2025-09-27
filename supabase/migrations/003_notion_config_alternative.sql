-- Alternative Notion Configuration Setup for Supabase
-- This version works WITHOUT the wrappers extension
-- Uses a simpler approach with API-based syncing

-- IMPORTANT: Since wrappers extension is not available,
-- we'll use a different approach with webhook/API syncing

-- Step 1: Create a staging table for Notion imports
CREATE TABLE IF NOT EXISTS notion_config_staging (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type TEXT NOT NULL, -- 'calculation', 'tek17', 'feature', 'formula'
  config_data JSONB NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create a sync log table
CREATE TABLE IF NOT EXISTS notion_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  details JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create functions to process staged data

-- Function to sync calculations from staged JSON
CREATE OR REPLACE FUNCTION sync_staged_calculations()
RETURNS integer AS $$
DECLARE
  record RECORD;
  count integer := 0;
BEGIN
  FOR record IN
    SELECT config_data
    FROM notion_config_staging
    WHERE config_type = 'calculation'
    ORDER BY imported_at DESC
    LIMIT 100
  LOOP
    INSERT INTO calculations (
      name, value, unit, category, description, min_value, max_value
    ) VALUES (
      record.config_data->>'name',
      (record.config_data->>'value')::numeric,
      record.config_data->>'unit',
      record.config_data->>'category',
      record.config_data->>'description',
      (record.config_data->>'min_value')::numeric,
      (record.config_data->>'max_value')::numeric
    )
    ON CONFLICT (name) DO UPDATE SET
      value = EXCLUDED.value,
      unit = EXCLUDED.unit,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      min_value = EXCLUDED.min_value,
      max_value = EXCLUDED.max_value,
      updated_at = NOW();

    count := count + 1;
  END LOOP;

  -- Clean up processed records
  DELETE FROM notion_config_staging
  WHERE config_type = 'calculation';

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to sync TEK17 requirements from staged JSON
CREATE OR REPLACE FUNCTION sync_staged_tek17()
RETURNS integer AS $$
DECLARE
  record RECORD;
  count integer := 0;
BEGIN
  FOR record IN
    SELECT config_data
    FROM notion_config_staging
    WHERE config_type = 'tek17'
    ORDER BY imported_at DESC
  LOOP
    INSERT INTO tek17_requirements (
      building_type, max_energy_kwh_m2, description
    ) VALUES (
      record.config_data->>'building_type',
      (record.config_data->>'max_energy_kwh_m2')::numeric,
      record.config_data->>'description'
    )
    ON CONFLICT (building_type) DO UPDATE SET
      max_energy_kwh_m2 = EXCLUDED.max_energy_kwh_m2,
      description = EXCLUDED.description,
      updated_at = NOW();

    count := count + 1;
  END LOOP;

  -- Clean up processed records
  DELETE FROM notion_config_staging
  WHERE config_type = 'tek17';

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to sync feature flags from staged JSON
CREATE OR REPLACE FUNCTION sync_staged_features()
RETURNS integer AS $$
DECLARE
  record RECORD;
  count integer := 0;
BEGIN
  FOR record IN
    SELECT config_data
    FROM notion_config_staging
    WHERE config_type = 'feature'
    ORDER BY imported_at DESC
  LOOP
    INSERT INTO feature_flags (
      feature_name, enabled, rollout_percentage, description
    ) VALUES (
      record.config_data->>'feature_name',
      (record.config_data->>'enabled')::boolean,
      (record.config_data->>'rollout_percentage')::integer,
      record.config_data->>'description'
    )
    ON CONFLICT (feature_name) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      rollout_percentage = EXCLUDED.rollout_percentage,
      description = EXCLUDED.description,
      updated_at = NOW();

    count := count + 1;
  END LOOP;

  -- Clean up processed records
  DELETE FROM notion_config_staging
  WHERE config_type = 'feature';

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to sync formulas from staged JSON
CREATE OR REPLACE FUNCTION sync_staged_formulas()
RETURNS integer AS $$
DECLARE
  record RECORD;
  count integer := 0;
BEGIN
  FOR record IN
    SELECT config_data
    FROM notion_config_staging
    WHERE config_type = 'formula'
    ORDER BY imported_at DESC
  LOOP
    INSERT INTO formulas (
      name, formula, variables, description, category
    ) VALUES (
      record.config_data->>'name',
      record.config_data->>'formula',
      ARRAY(SELECT jsonb_array_elements_text(record.config_data->'variables')),
      record.config_data->>'description',
      record.config_data->>'category'
    )
    ON CONFLICT (name) DO UPDATE SET
      formula = EXCLUDED.formula,
      variables = EXCLUDED.variables,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      updated_at = NOW();

    count := count + 1;
  END LOOP;

  -- Clean up processed records
  DELETE FROM notion_config_staging
  WHERE config_type = 'formula';

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Master sync function
CREATE OR REPLACE FUNCTION sync_all_staged_config()
RETURNS json AS $$
DECLARE
  calc_count integer;
  tek17_count integer;
  feature_count integer;
  formula_count integer;
  result json;
BEGIN
  -- Sync all configuration types
  calc_count := sync_staged_calculations();
  tek17_count := sync_staged_tek17();
  feature_count := sync_staged_features();
  formula_count := sync_staged_formulas();

  -- Build result
  result := json_build_object(
    'success', true,
    'timestamp', NOW(),
    'synced', json_build_object(
      'calculations', calc_count,
      'tek17_requirements', tek17_count,
      'feature_flags', feature_count,
      'formulas', formula_count
    )
  );

  -- Log the sync
  INSERT INTO notion_sync_log (sync_type, status, details)
  VALUES ('full_sync', 'success', result);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- API function to import configuration data
CREATE OR REPLACE FUNCTION import_notion_config(
  config_type text,
  config_items jsonb
) RETURNS json AS $$
DECLARE
  item jsonb;
  count integer := 0;
BEGIN
  -- Validate config_type
  IF config_type NOT IN ('calculation', 'tek17', 'feature', 'formula') THEN
    RETURN json_build_object('error', 'Invalid config_type');
  END IF;

  -- Insert each item into staging
  FOR item IN SELECT * FROM jsonb_array_elements(config_items)
  LOOP
    INSERT INTO notion_config_staging (config_type, config_data)
    VALUES (config_type, item);
    count := count + 1;
  END LOOP;

  -- Auto-sync after import
  PERFORM sync_all_staged_config();

  RETURN json_build_object(
    'success', true,
    'imported', count,
    'type', config_type
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON notion_config_staging TO authenticated;
GRANT SELECT ON notion_sync_log TO authenticated;
GRANT EXECUTE ON FUNCTION import_notion_config TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_staged_config TO authenticated;

-- Create indexes for performance
CREATE INDEX idx_notion_staging_type ON notion_config_staging(config_type);
CREATE INDEX idx_notion_staging_imported ON notion_config_staging(imported_at DESC);
CREATE INDEX idx_sync_log_synced ON notion_sync_log(synced_at DESC);