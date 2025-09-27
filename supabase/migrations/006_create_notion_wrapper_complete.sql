-- Complete Notion Wrapper Setup via SQL
-- This creates the wrapper and foreign tables all in one go

-- Step 1: Enable the wrappers extension if not already enabled
CREATE EXTENSION IF NOT EXISTS wrappers;

-- Step 2: Create the foreign server for Notion
CREATE SERVER IF NOT EXISTS notion_server
FOREIGN DATA WRAPPER wrappers
OPTIONS (
  wrapper_type 'notion',
  api_url 'https://api.notion.com/v1',
  api_key 'YOUR_NOTION_API_KEY'  -- Replace with your actual API key via Supabase dashboard
);

-- Step 3: Create foreign tables

-- Calculations Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_calculations (
  id text,
  last_edited_time timestamp,
  properties jsonb
)
SERVER notion_server
OPTIONS (
  database_id '27a2fc6e265980dd911cef9a20616899'
);

-- Feature Flags Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_features (
  id text,
  last_edited_time timestamp,
  properties jsonb
)
SERVER notion_server
OPTIONS (
  database_id '27a2fc6e26598041ab4dcf7c090035d2'
);

-- Formulas Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_formulas (
  id text,
  last_edited_time timestamp,
  properties jsonb
)
SERVER notion_server
OPTIONS (
  database_id '27a2fc6e26598071912ec979a9c18a7a'
);

-- Step 4: Test the connection
SELECT COUNT(*) as calc_count FROM notion_calculations;
SELECT COUNT(*) as feature_count FROM notion_features;
SELECT COUNT(*) as formula_count FROM notion_formulas;

-- Step 5: Create views to parse the JSONB properties
CREATE OR REPLACE VIEW v_notion_calculations AS
SELECT
  id,
  last_edited_time,
  properties->>'Name' as name,
  (properties->>'Value')::numeric as value,
  properties->>'Unit' as unit,
  properties->>'Category' as category,
  properties->>'Description' as description,
  (properties->>'Min Value')::numeric as min_value,
  (properties->>'Max Value')::numeric as max_value
FROM notion_calculations;

CREATE OR REPLACE VIEW v_notion_features AS
SELECT
  id,
  last_edited_time,
  properties->>'Feature Name' as feature_name,
  (properties->>'Enabled')::boolean as enabled,
  (properties->>'Rollout %')::numeric as rollout_percentage,
  properties->>'Description' as description
FROM notion_features;

CREATE OR REPLACE VIEW v_notion_formulas AS
SELECT
  id,
  last_edited_time,
  properties->>'Name' as name,
  properties->>'Formula' as formula,
  properties->>'Variables' as variables,
  properties->>'Description' as description,
  properties->>'Category' as category
FROM notion_formulas;

-- Grant permissions
GRANT USAGE ON FOREIGN SERVER notion_server TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;