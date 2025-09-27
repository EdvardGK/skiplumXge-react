-- Create Foreign Tables for Notion Wrapper
-- First, check what servers exist
-- Run this query first to see the exact server name:
-- SELECT srvname FROM pg_foreign_server;

-- The server name might be one of these formats:
-- SkiplumXGE_Notion_server
-- skiplumxge_notion_server
-- SkiplumXGE-Notion_server

-- 1. Calculations Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_calculations (
  id text,
  last_edited_time timestamp,
  "Name" text,
  "Value" numeric,
  "Unit" text,
  "Category" text,
  "Description" text,
  "Min Value" numeric,
  "Max Value" numeric
)
SERVER "SkiplumXGE_Notion_server"  -- Try with underscores
OPTIONS (
  database_id '27a2fc6e265980dd911cef9a20616899'  -- Calculations database
);

-- 2. Feature Flags Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_features (
  id text,
  last_edited_time timestamp,
  "Feature Name" text,
  "Enabled" boolean,
  "Rollout %" numeric,
  "Description" text
)
SERVER "SkiplumXGE_Notion_server"  -- Try with underscores
OPTIONS (
  database_id '27a2fc6e26598041ab4dcf7c090035d2'  -- Features database
);

-- 3. Formulas Configuration
CREATE FOREIGN TABLE IF NOT EXISTS notion_formulas (
  id text,
  last_edited_time timestamp,
  "Name" text,
  "Formula" text,
  "Variables" text,
  "Description" text,
  "Category" text
)
SERVER "SkiplumXGE_Notion_server"  -- Try with underscores
OPTIONS (
  database_id '27a2fc6e26598071912ec979a9c18a7a'  -- Formulas database
);

-- Test the connections
SELECT 'Testing notion_calculations' as test, COUNT(*) as row_count FROM notion_calculations;
SELECT 'Testing notion_features' as test, COUNT(*) as row_count FROM notion_features;
SELECT 'Testing notion_formulas' as test, COUNT(*) as row_count FROM notion_formulas;

-- Grant permissions
GRANT SELECT ON notion_calculations TO authenticated;
GRANT SELECT ON notion_features TO authenticated;
GRANT SELECT ON notion_formulas TO authenticated;