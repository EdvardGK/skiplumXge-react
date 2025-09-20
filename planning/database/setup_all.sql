-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: setup_all.sql
-- Purpose: Complete database setup in one script
-- ============================================

-- Run this script in Supabase SQL Editor to set up the entire database

-- ============================================
-- STEP 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- STEP 2: CLEAN SLATE (Optional - remove for production)
-- ============================================

-- Uncomment these lines to reset the database
-- DROP TABLE IF EXISTS conversion_events CASCADE;
-- DROP TABLE IF EXISTS analysis_results CASCADE;
-- DROP TABLE IF EXISTS user_searches CASCADE;
-- DROP TABLE IF EXISTS energy_certificates CASCADE;
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS mv_daily_stats CASCADE;

-- ============================================
-- STEP 3: TABLES (from 01_tables.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS energy_certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    knr INTEGER,
    gnr INTEGER,
    bnr INTEGER,
    snr INTEGER,
    fnr INTEGER,
    andelsnummer TEXT,
    building_number TEXT,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    unit_number TEXT,
    organization_number TEXT,
    building_category TEXT,
    construction_year INTEGER,
    energy_class TEXT,
    heating_class TEXT,
    issue_date TIMESTAMP,
    certificate_type TEXT,
    certificate_id TEXT UNIQUE,
    energy_consumption FLOAT,
    fossil_percentage FLOAT,
    material_type TEXT,
    has_energy_evaluation BOOLEAN,
    energy_evaluation_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    search_query TEXT NOT NULL,
    selected_address TEXT,
    postal_code TEXT,
    results_count INTEGER,
    search_source TEXT DEFAULT 'kartverket',
    timestamp TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    ip_hash TEXT
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    address TEXT NOT NULL,
    building_type TEXT NOT NULL,
    total_bra FLOAT NOT NULL,
    current_consumption FLOAT,
    tek17_requirement FLOAT,
    annual_consumption_kwh FLOAT,
    annual_cost_kr FLOAT,
    annual_waste_kr FLOAT,
    investment_room_kr FLOAT,
    heating_investment FLOAT,
    lighting_investment FLOAT,
    other_investment FLOAT,
    potential_savings_kr FLOAT,
    payback_years FLOAT,
    co2_reduction_kg FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'contact_form',
        'pdf_download',
        'callback_request',
        'email_signup',
        'consultation_booking'
    )),
    address TEXT,
    analysis_id UUID REFERENCES analysis_results(id),
    form_data JSONB,
    pdf_filename TEXT,
    callback_time TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id TEXT,
    row_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 4: INDEXES (from 02_indexes.sql)
-- ============================================

-- Energy certificates indexes
CREATE INDEX IF NOT EXISTS idx_energy_certificates_address ON energy_certificates(address);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_postal_code ON energy_certificates(postal_code);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_building_number ON energy_certificates(building_number);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_address_postal ON energy_certificates(address, postal_code);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_energy_class ON energy_certificates(energy_class);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_building_category ON energy_certificates(building_category);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_cadastre ON energy_certificates(knr, gnr, bnr, snr, fnr);
CREATE INDEX IF NOT EXISTS idx_energy_certificates_address_search ON energy_certificates USING gin(to_tsvector('norwegian', address));

-- User searches indexes
CREATE INDEX IF NOT EXISTS idx_user_searches_session_id ON user_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_timestamp ON user_searches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_searches_session_timeline ON user_searches(session_id, timestamp DESC);

-- Analysis results indexes
CREATE INDEX IF NOT EXISTS idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_results_investment ON analysis_results(investment_room_kr) WHERE investment_room_kr > 0;

-- Conversion events indexes
CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_action_type ON conversion_events(action_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp DESC);

-- ============================================
-- STEP 5: FUNCTIONS (from 04_functions.sql)
-- ============================================

-- Include all functions here (abbreviated for space - copy from 04_functions.sql)
\i 04_functions.sql

-- ============================================
-- STEP 6: VIEWS (from 05_views.sql)
-- ============================================

-- Include all views here (abbreviated for space - copy from 05_views.sql)
\i 05_views.sql

-- ============================================
-- STEP 7: TRIGGERS (from 06_triggers.sql)
-- ============================================

-- Include all triggers here (abbreviated for space - copy from 06_triggers.sql)
\i 06_triggers.sql

-- ============================================
-- STEP 8: ROW LEVEL SECURITY (from 03_rls_policies.sql)
-- ============================================

-- Enable RLS
ALTER TABLE energy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- Energy certificates policies
CREATE POLICY "energy_certificates_public_read" ON energy_certificates
    FOR SELECT USING (true);

CREATE POLICY "energy_certificates_service_write" ON energy_certificates
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- User searches policies
CREATE POLICY "user_searches_public_insert" ON user_searches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "user_searches_service_read" ON user_searches
    FOR SELECT USING (auth.role() = 'service_role');

-- Analysis results policies
CREATE POLICY "analysis_results_public_insert" ON analysis_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "analysis_results_session_read" ON analysis_results
    FOR SELECT USING (
        session_id = current_setting('app.session_id', true)
        OR auth.role() = 'service_role'
        OR created_at > NOW() - INTERVAL '24 hours'
    );

-- Conversion events policies
CREATE POLICY "conversion_events_public_insert" ON conversion_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "conversion_events_service_read" ON conversion_events
    FOR SELECT USING (auth.role() = 'service_role');

-- ============================================
-- STEP 9: PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON energy_certificates TO anon;
GRANT INSERT ON user_searches TO anon;
GRANT INSERT, SELECT ON analysis_results TO anon;
GRANT INSERT ON conversion_events TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- STEP 10: INITIAL DATA (Optional)
-- ============================================

-- Add test data or initial configuration here if needed

-- ============================================
-- VERIFICATION
-- ============================================

-- Run these queries to verify setup:
/*
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;

-- Check policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Database setup complete!' AS status,
       COUNT(*) AS tables_created
FROM information_schema.tables
WHERE table_schema = 'public';