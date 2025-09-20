-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 04_functions.sql
-- Purpose: Utility functions for data operations
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent; -- For Norwegian character handling

-- ============================================
-- ADDRESS SEARCH FUNCTIONS
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

-- Search by postal code
CREATE OR REPLACE FUNCTION search_by_postal_code(
    postal TEXT,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    address TEXT,
    city TEXT,
    building_number TEXT,
    building_category TEXT,
    energy_class TEXT,
    energy_consumption FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.address,
        ec.city,
        ec.building_number,
        ec.building_category,
        ec.energy_class,
        ec.energy_consumption
    FROM energy_certificates ec
    WHERE ec.postal_code = postal
    ORDER BY ec.address
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STATISTICS FUNCTIONS
-- ============================================

-- Get energy statistics for a postal code area
CREATE OR REPLACE FUNCTION get_postal_statistics(postal TEXT)
RETURNS TABLE (
    total_buildings INTEGER,
    avg_consumption FLOAT,
    median_consumption FLOAT,
    best_consumption FLOAT,
    worst_consumption FLOAT,
    energy_class_a_count INTEGER,
    energy_class_b_count INTEGER,
    energy_class_c_count INTEGER,
    energy_class_d_count INTEGER,
    energy_class_e_count INTEGER,
    energy_class_f_count INTEGER,
    energy_class_g_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            energy_consumption,
            energy_class
        FROM energy_certificates
        WHERE postal_code = postal
        AND energy_consumption IS NOT NULL
    )
    SELECT
        COUNT(*)::INTEGER AS total_buildings,
        AVG(energy_consumption)::FLOAT AS avg_consumption,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS median_consumption,
        MIN(energy_consumption)::FLOAT AS best_consumption,
        MAX(energy_consumption)::FLOAT AS worst_consumption,
        COUNT(*) FILTER (WHERE energy_class = 'A')::INTEGER AS energy_class_a_count,
        COUNT(*) FILTER (WHERE energy_class = 'B')::INTEGER AS energy_class_b_count,
        COUNT(*) FILTER (WHERE energy_class = 'C')::INTEGER AS energy_class_c_count,
        COUNT(*) FILTER (WHERE energy_class = 'D')::INTEGER AS energy_class_d_count,
        COUNT(*) FILTER (WHERE energy_class = 'E')::INTEGER AS energy_class_e_count,
        COUNT(*) FILTER (WHERE energy_class = 'F')::INTEGER AS energy_class_f_count,
        COUNT(*) FILTER (WHERE energy_class = 'G')::INTEGER AS energy_class_g_count
    FROM stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get comparison statistics for a building type
CREATE OR REPLACE FUNCTION get_building_type_statistics(
    building_type TEXT,
    postal TEXT DEFAULT NULL
)
RETURNS TABLE (
    percentile_10 FLOAT,
    percentile_25 FLOAT,
    percentile_50 FLOAT,
    percentile_75 FLOAT,
    percentile_90 FLOAT,
    average FLOAT,
    sample_size INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS percentile_10,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS percentile_25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS percentile_50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS percentile_75,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT AS percentile_90,
        AVG(energy_consumption)::FLOAT AS average,
        COUNT(*)::INTEGER AS sample_size
    FROM energy_certificates
    WHERE building_category = building_type
    AND energy_consumption IS NOT NULL
    AND (postal IS NULL OR postal_code = postal);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ANALYSIS FUNCTIONS
-- ============================================

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
    electricity_price FLOAT DEFAULT 2.80  -- NOK per kWh (2024 average)
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

    -- Calculate investment room (7x multiplier - NPV at 6% discount)
    investment_kr := waste_kr * 7;

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

-- ============================================
-- SESSION MANAGEMENT FUNCTIONS
-- ============================================

-- Create or get session
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

-- ============================================
-- CONVERSION TRACKING FUNCTIONS
-- ============================================

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

-- Get conversion funnel metrics
CREATE OR REPLACE FUNCTION get_conversion_metrics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_searches BIGINT,
    total_analyses BIGINT,
    total_conversions BIGINT,
    conversion_rate NUMERIC,
    avg_time_to_conversion INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    WITH funnel AS (
        SELECT
            COUNT(DISTINCT us.session_id) AS searches,
            COUNT(DISTINCT ar.session_id) AS analyses,
            COUNT(DISTINCT ce.session_id) AS conversions,
            MIN(us.timestamp) AS first_search,
            MAX(ce.timestamp) AS conversion_time
        FROM user_searches us
        LEFT JOIN analysis_results ar ON us.session_id = ar.session_id
        LEFT JOIN conversion_events ce ON us.session_id = ce.session_id
        WHERE us.timestamp > NOW() - (days_back || ' days')::INTERVAL
        GROUP BY us.session_id
    )
    SELECT
        SUM(searches) AS total_searches,
        SUM(analyses) AS total_analyses,
        SUM(conversions) AS total_conversions,
        ROUND(SUM(conversions)::NUMERIC / NULLIF(SUM(searches), 0) * 100, 2) AS conversion_rate,
        AVG(conversion_time - first_search) FILTER (WHERE conversion_time IS NOT NULL) AS avg_time_to_conversion
    FROM funnel;
END;
$$ LANGUAGE plpgsql STABLE;