-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: setup_all_inline.sql
-- Purpose: Complete database setup with all code inline
-- ============================================

-- Run this script in Supabase SQL Editor to set up the entire database

-- ============================================
-- STEP 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- STEP 2: CREATE TABLES (using IF NOT EXISTS for safety)
-- ============================================

-- ============================================
-- STEP 3: TABLES
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

-- ============================================
-- STEP 4: INDEXES
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
-- STEP 5: UTILITY FUNCTIONS
-- ============================================

-- Main address search with fuzzy matching (Norwegian-optimized)
CREATE OR REPLACE FUNCTION search_addresses(
    query_text TEXT,
    limit_count INTEGER DEFAULT 10,
    min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    address TEXT,
    postal_code TEXT,
    city TEXT,
    building_number TEXT,
    energy_class TEXT,
    energy_consumption FLOAT,
    certificate_id TEXT,
    similarity_score REAL
) AS $$
BEGIN
    -- Normalize query for Norwegian addresses
    query_text := LOWER(unaccent(TRIM(query_text)));

    RETURN QUERY
    SELECT
        ec.address,
        ec.postal_code,
        ec.city,
        ec.building_number,
        ec.energy_class,
        ec.energy_consumption,
        ec.certificate_id,
        similarity(LOWER(unaccent(ec.address)), query_text) AS similarity_score
    FROM energy_certificates ec
    WHERE
        -- Use trigram similarity for fuzzy matching
        LOWER(unaccent(ec.address)) % query_text
        AND similarity(LOWER(unaccent(ec.address)), query_text) >= min_similarity
    ORDER BY similarity_score DESC, ec.address
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate TEK17 requirement based on building type
CREATE OR REPLACE FUNCTION calculate_tek17_requirement(
    building_type TEXT,
    total_bra FLOAT
)
RETURNS FLOAT AS $$
DECLARE
    base_requirement FLOAT;
BEGIN
    -- TEK17 § 14-2 requirements (kWh/m²/year)
    CASE building_type
        WHEN 'Småhus' THEN
            base_requirement := 100.0 + (1600.0 / total_bra);
        WHEN 'Leilighet' THEN
            base_requirement := 95.0;
        WHEN 'Barnehage' THEN
            base_requirement := 135.0;
        WHEN 'Kontorbygning', 'Kontor' THEN
            base_requirement := 115.0;
        WHEN 'Skolebygg' THEN
            base_requirement := 110.0;
        WHEN 'Universitet/høyskole' THEN
            base_requirement := 125.0;
        WHEN 'Sykehus' THEN
            base_requirement := 225.0;
        WHEN 'Sykehjem' THEN
            base_requirement := 195.0;
        WHEN 'Hotell' THEN
            base_requirement := 170.0;
        WHEN 'Idrettsbygg' THEN
            base_requirement := 145.0;
        WHEN 'Forretningsbygg' THEN
            base_requirement := 180.0;
        WHEN 'Kulturbygning' THEN
            base_requirement := 130.0;
        WHEN 'Lett industri/verksted' THEN
            base_requirement := 140.0;
        ELSE
            base_requirement := 115.0; -- Default to office building
    END CASE;

    RETURN base_requirement;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate investment potential
CREATE OR REPLACE FUNCTION calculate_investment_potential(
    current_consumption FLOAT,
    tek17_requirement FLOAT,
    total_bra FLOAT,
    electricity_price FLOAT DEFAULT 2.80
)
RETURNS TABLE (
    annual_consumption_kwh FLOAT,
    annual_cost_kr FLOAT,
    annual_waste_kr FLOAT,
    investment_room_kr FLOAT,
    heating_investment_kr FLOAT,
    lighting_investment_kr FLOAT,
    other_investment_kr FLOAT,
    payback_years FLOAT
) AS $$
DECLARE
    consumption_kwh FLOAT;
    cost_kr FLOAT;
    waste_kr FLOAT;
    investment_kr FLOAT;
BEGIN
    -- Calculate annual consumption
    consumption_kwh := current_consumption * total_bra;

    -- Calculate annual cost
    cost_kr := consumption_kwh * electricity_price;

    -- Calculate waste (only if above TEK17)
    IF current_consumption > tek17_requirement THEN
        waste_kr := (current_consumption - tek17_requirement) * total_bra * electricity_price;
    ELSE
        waste_kr := 0;
    END IF;

    -- Calculate investment room (7.36x multiplier - NPV at 6% discount rate for 10 years)
    investment_kr := waste_kr * 7.36;

    RETURN QUERY
    SELECT
        consumption_kwh,
        cost_kr,
        waste_kr,
        investment_kr,
        investment_kr * 0.70 AS heating_investment_kr,  -- SINTEF: 70% heating
        investment_kr * 0.15 AS lighting_investment_kr, -- SINTEF: 15% lighting
        investment_kr * 0.15 AS other_investment_kr,    -- SINTEF: 15% other
        CASE
            WHEN waste_kr > 0 THEN (investment_kr / waste_kr)::FLOAT
            ELSE NULL
        END AS payback_years;
END;
$$ LANGUAGE plpgsql STABLE;

-- Session management
CREATE OR REPLACE FUNCTION get_or_create_session(
    session_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    new_session_id TEXT;
BEGIN
    IF session_id IS NULL OR session_id = '' THEN
        -- Generate new session ID
        new_session_id := 'sess_' || gen_random_uuid()::TEXT;
    ELSE
        new_session_id := session_id;
    END IF;

    -- Set session context for RLS
    PERFORM set_config('app.session_id', new_session_id, false);

    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION set_session_context(session_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.session_id', session_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_session_context()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.session_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track conversion event
CREATE OR REPLACE FUNCTION track_conversion(
    p_session_id TEXT,
    p_action_type TEXT,
    p_address TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO conversion_events (
        session_id,
        action_type,
        address,
        metadata
    ) VALUES (
        p_session_id,
        p_action_type,
        p_address,
        p_metadata
    ) RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- STEP 6: TRIGGERS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to energy_certificates table
DROP TRIGGER IF EXISTS update_energy_certificates_updated_at ON energy_certificates;
CREATE TRIGGER update_energy_certificates_updated_at
    BEFORE UPDATE ON energy_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Validate and calculate analysis results
CREATE OR REPLACE FUNCTION validate_analysis_results()
RETURNS TRIGGER AS $$
DECLARE
    electricity_price CONSTANT FLOAT := 2.80;  -- NOK per kWh
BEGIN
    -- Ensure required fields
    IF NEW.total_bra IS NULL OR NEW.total_bra <= 0 THEN
        RAISE EXCEPTION 'Invalid total BRA: %', NEW.total_bra;
    END IF;

    -- Calculate TEK17 requirement if not provided
    IF NEW.tek17_requirement IS NULL THEN
        NEW.tek17_requirement := calculate_tek17_requirement(NEW.building_type, NEW.total_bra);
    END IF;

    -- Calculate consumption metrics
    IF NEW.current_consumption IS NOT NULL THEN
        -- Annual consumption in kWh
        NEW.annual_consumption_kwh := NEW.current_consumption * NEW.total_bra;

        -- Annual cost in NOK
        NEW.annual_cost_kr := NEW.annual_consumption_kwh * electricity_price;

        -- Calculate waste if above TEK17
        IF NEW.current_consumption > NEW.tek17_requirement THEN
            NEW.annual_waste_kr := (NEW.current_consumption - NEW.tek17_requirement) *
                                   NEW.total_bra * electricity_price;
        ELSE
            NEW.annual_waste_kr := 0;
        END IF;

        -- Investment room (7.36x multiplier - NPV at 6% discount rate for 10 years)
        NEW.investment_room_kr := NEW.annual_waste_kr * 7.36;

        -- SINTEF breakdown (70/15/15)
        NEW.heating_investment := NEW.investment_room_kr * 0.70;
        NEW.lighting_investment := NEW.investment_room_kr * 0.15;
        NEW.other_investment := NEW.investment_room_kr * 0.15;

        -- Calculate potential savings
        NEW.potential_savings_kr := NEW.annual_waste_kr * 0.7;  -- Assume 70% achievable

        -- Simple payback calculation
        IF NEW.annual_waste_kr > 0 THEN
            NEW.payback_years := NEW.investment_room_kr / NEW.annual_waste_kr;
        END IF;

        -- Estimate CO2 reduction (Norwegian grid: ~16g CO2/kWh)
        IF NEW.annual_waste_kr > 0 THEN
            NEW.co2_reduction_kg := (NEW.annual_waste_kr / electricity_price) * 0.016;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply analysis validation trigger
DROP TRIGGER IF EXISTS validate_analysis ON analysis_results;
CREATE TRIGGER validate_analysis
    BEFORE INSERT OR UPDATE ON analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION validate_analysis_results();

-- ============================================
-- STEP 7: ROW LEVEL SECURITY
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
-- STEP 8: PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON energy_certificates TO anon;
GRANT INSERT ON user_searches TO anon;
GRANT INSERT, SELECT ON analysis_results TO anon;
GRANT INSERT ON conversion_events TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_context() TO anon;
GRANT EXECUTE ON FUNCTION search_addresses(TEXT, INTEGER, FLOAT) TO anon;
GRANT EXECUTE ON FUNCTION calculate_tek17_requirement(TEXT, FLOAT) TO anon;
GRANT EXECUTE ON FUNCTION calculate_investment_potential(FLOAT, FLOAT, FLOAT, FLOAT) TO anon;
GRANT EXECUTE ON FUNCTION track_conversion(TEXT, TEXT, TEXT, JSONB) TO anon;

-- ============================================
-- STEP 9: NVE ELECTRICITY PRICING TABLES
-- ============================================

-- NVE Electricity pricing table
CREATE TABLE IF NOT EXISTS electricity_prices_nve (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week TEXT NOT NULL,
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    zone TEXT NOT NULL CHECK (zone IN ('NO1', 'NO2', 'NO3', 'NO4', 'NO5')),
    spot_price_ore_kwh FLOAT NOT NULL,
    spot_price_kr_kwh FLOAT GENERATED ALWAYS AS (spot_price_ore_kwh / 100) STORED,
    data_source TEXT DEFAULT 'NVE',
    source_url TEXT DEFAULT 'https://www.nve.no/energi/analyser-og-statistikk/kraftpriser-og-kraftsystemdata/',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(week, zone)
);

-- Price zones reference table
CREATE TABLE IF NOT EXISTS electricity_price_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    zone_code TEXT NOT NULL UNIQUE CHECK (zone_code IN ('NO1', 'NO2', 'NO3', 'NO4', 'NO5')),
    zone_name_no TEXT NOT NULL,
    zone_name_en TEXT NOT NULL,
    region_description_no TEXT NOT NULL,
    region_description_en TEXT NOT NULL,
    major_cities TEXT[],
    price_level TEXT CHECK (price_level IN ('low', 'medium', 'high')),
    price_volatility TEXT CHECK (price_volatility IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Populate price zones
INSERT INTO electricity_price_zones (
    zone_code, zone_name_no, zone_name_en,
    region_description_no, region_description_en,
    major_cities, price_level, price_volatility
) VALUES
('NO1', 'Sørøst-Norge', 'Southeast Norway', 'Oslo og omegn, Østfold, Akershus', 'Oslo and surroundings, Østfold, Akershus', ARRAY['Oslo', 'Drammen', 'Fredrikstad'], 'medium', 'medium'),
('NO2', 'Sørvest-Norge', 'Southwest Norway', 'Agder-fylkene og deler av Rogaland', 'Agder counties and parts of Rogaland', ARRAY['Kristiansand', 'Stavanger'], 'high', 'high'),
('NO3', 'Midt-Norge', 'Mid-Norway', 'Trøndelag og deler av Møre og Romsdal', 'Trøndelag and parts of Møre og Romsdal', ARRAY['Trondheim', 'Molde'], 'low', 'medium'),
('NO4', 'Nord-Norge', 'North Norway', 'Nordland, Troms og Finnmark', 'Nordland, Troms and Finnmark', ARRAY['Bodø', 'Tromsø', 'Alta'], 'low', 'low'),
('NO5', 'Vest-Norge', 'West Norway', 'Hordaland og deler av Møre og Romsdal', 'Hordaland and parts of Møre og Romsdal', ARRAY['Bergen', 'Ålesund'], 'medium', 'high')
ON CONFLICT (zone_code) DO NOTHING;

-- Indexes for NVE pricing
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_zone ON electricity_prices_nve(zone);
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_year ON electricity_prices_nve(year DESC);
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_zone_year ON electricity_prices_nve(zone, year DESC);

-- NVE pricing functions
CREATE OR REPLACE FUNCTION get_latest_electricity_price(zone_code TEXT)
RETURNS TABLE (
    zone TEXT,
    week TEXT,
    spot_price_ore_kwh FLOAT,
    spot_price_kr_kwh FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ep.zone, ep.week, ep.spot_price_ore_kwh, ep.spot_price_kr_kwh
    FROM electricity_prices_nve ep
    WHERE ep.zone = zone_code
    ORDER BY ep.year DESC, ep.week_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS for NVE tables
ALTER TABLE electricity_prices_nve ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_price_zones ENABLE ROW LEVEL SECURITY;

-- Public read policies for NVE data
CREATE POLICY "electricity_prices_nve_public_read" ON electricity_prices_nve FOR SELECT USING (true);
CREATE POLICY "electricity_price_zones_public_read" ON electricity_price_zones FOR SELECT USING (true);

-- Service write policies for NVE data
CREATE POLICY "electricity_prices_nve_service_write" ON electricity_prices_nve
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant permissions for NVE tables
GRANT SELECT ON electricity_prices_nve TO anon;
GRANT SELECT ON electricity_price_zones TO anon;
GRANT EXECUTE ON FUNCTION get_latest_electricity_price(TEXT) TO anon;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Database setup complete!' AS status,
       COUNT(*) AS tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('energy_certificates', 'user_searches', 'analysis_results', 'conversion_events', 'electricity_prices_nve', 'electricity_price_zones');