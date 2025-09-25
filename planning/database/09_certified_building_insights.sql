-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 09_certified_building_insights.sql
-- Purpose: Functions for certified building comparative intelligence
-- ============================================

-- ============================================
-- AGE BRACKET ANALYSIS FUNCTIONS
-- Using the form's brackets: Pre 1980, 1980-2010, Post 2010
-- ============================================

-- Get certified building statistics by age bracket
CREATE OR REPLACE FUNCTION get_certified_age_bracket_stats(
    target_year INTEGER,
    building_type TEXT DEFAULT NULL,
    postal_code TEXT DEFAULT NULL
)
RETURNS TABLE (
    bracket_name TEXT,
    national_certified_count INTEGER,
    national_avg_consumption FLOAT,
    national_avg_class TEXT,
    national_median_consumption FLOAT,
    local_certified_count INTEGER,
    local_avg_consumption FLOAT,
    local_avg_class TEXT,
    local_median_consumption FLOAT
) AS $$
BEGIN
    -- Determine age bracket for the target year
    WITH age_brackets AS (
        SELECT
            CASE
                WHEN construction_year < 1980 THEN 'Pre 1980'
                WHEN construction_year >= 1980 AND construction_year <= 2010 THEN '1980-2010'
                WHEN construction_year > 2010 THEN 'Post 2010'
                ELSE 'Unknown'
            END AS bracket,
            *
        FROM energy_certificates
        WHERE construction_year IS NOT NULL
            AND energy_consumption IS NOT NULL
            AND (building_type IS NULL OR building_category = building_type)
    ),
    target_bracket AS (
        SELECT
            CASE
                WHEN target_year < 1980 THEN 'Pre 1980'
                WHEN target_year >= 1980 AND target_year <= 2010 THEN '1980-2010'
                WHEN target_year > 2010 THEN 'Post 2010'
                ELSE 'Unknown'
            END AS bracket_name
    )
    SELECT
        tb.bracket_name,
        -- National statistics (all certified buildings in Norway for this bracket)
        COUNT(ab.*) FILTER (WHERE ab.bracket = tb.bracket_name)::INTEGER AS national_certified_count,
        AVG(ab.energy_consumption) FILTER (WHERE ab.bracket = tb.bracket_name)::FLOAT AS national_avg_consumption,
        MODE() WITHIN GROUP (ORDER BY ab.energy_class) FILTER (WHERE ab.bracket = tb.bracket_name) AS national_avg_class,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ab.energy_consumption) FILTER (WHERE ab.bracket = tb.bracket_name)::FLOAT AS national_median_consumption,
        -- Local statistics (certified buildings in the postal code area)
        COUNT(ab.*) FILTER (WHERE ab.bracket = tb.bracket_name AND ab.postal_code = postal_code)::INTEGER AS local_certified_count,
        AVG(ab.energy_consumption) FILTER (WHERE ab.bracket = tb.bracket_name AND ab.postal_code = postal_code)::FLOAT AS local_avg_consumption,
        MODE() WITHIN GROUP (ORDER BY ab.energy_class) FILTER (WHERE ab.bracket = tb.bracket_name AND ab.postal_code = postal_code) AS local_avg_class,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ab.energy_consumption) FILTER (WHERE ab.bracket = tb.bracket_name AND ab.postal_code = postal_code)::FLOAT AS local_median_consumption
    FROM target_bracket tb
    CROSS JOIN age_brackets ab
    GROUP BY tb.bracket_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- KOMMUNE CERTIFIED BUILDING STATISTICS
-- ============================================

-- Get certified building statistics by municipality
CREATE OR REPLACE FUNCTION get_kommune_certified_stats(
    p_postal_code TEXT
)
RETURNS TABLE (
    kommune_name TEXT,
    total_certified_buildings INTEGER,
    avg_energy_class TEXT,
    class_a_percentage FLOAT,
    class_b_percentage FLOAT,
    class_c_percentage FLOAT,
    class_d_percentage FLOAT,
    class_e_percentage FLOAT,
    class_f_percentage FLOAT,
    class_g_percentage FLOAT,
    building_type_breakdown JSONB,
    price_zone TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH kommune_data AS (
        SELECT
            ec.city AS kommune,
            COUNT(*)::INTEGER AS total_buildings,
            MODE() WITHIN GROUP (ORDER BY energy_class) AS avg_class,
            COUNT(*) FILTER (WHERE energy_class = 'A') * 100.0 / COUNT(*) AS class_a_pct,
            COUNT(*) FILTER (WHERE energy_class = 'B') * 100.0 / COUNT(*) AS class_b_pct,
            COUNT(*) FILTER (WHERE energy_class = 'C') * 100.0 / COUNT(*) AS class_c_pct,
            COUNT(*) FILTER (WHERE energy_class = 'D') * 100.0 / COUNT(*) AS class_d_pct,
            COUNT(*) FILTER (WHERE energy_class = 'E') * 100.0 / COUNT(*) AS class_e_pct,
            COUNT(*) FILTER (WHERE energy_class = 'F') * 100.0 / COUNT(*) AS class_f_pct,
            COUNT(*) FILTER (WHERE energy_class = 'G') * 100.0 / COUNT(*) AS class_g_pct,
            jsonb_object_agg(
                COALESCE(building_category, 'Other'),
                COUNT(*)
            ) AS type_breakdown
        FROM energy_certificates ec
        WHERE postal_code = p_postal_code
        GROUP BY ec.city
    )
    SELECT
        kd.kommune,
        kd.total_buildings,
        kd.avg_class,
        ROUND(kd.class_a_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_b_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_c_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_d_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_e_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_f_pct::NUMERIC, 1)::FLOAT,
        ROUND(kd.class_g_pct::NUMERIC, 1)::FLOAT,
        kd.type_breakdown,
        -- Get price zone from the postal code (simplified - you may need a proper mapping)
        CASE
            WHEN LEFT(p_postal_code, 1) IN ('0', '1', '2', '3') THEN 'NO1'
            WHEN LEFT(p_postal_code, 1) = '4' THEN 'NO2'
            WHEN LEFT(p_postal_code, 1) = '5' THEN 'NO5'
            WHEN LEFT(p_postal_code, 1) IN ('6', '7') THEN 'NO3'
            WHEN LEFT(p_postal_code, 1) IN ('8', '9') THEN 'NO4'
            ELSE 'NO1'
        END AS price_zone
    FROM kommune_data kd;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ELECTRICITY ZONE CERTIFIED BUILDING INSIGHTS
-- ============================================

-- Get certified building insights by electricity price zone
CREATE OR REPLACE FUNCTION get_zone_certified_insights(
    p_zone TEXT
)
RETURNS TABLE (
    zone TEXT,
    total_certified_buildings INTEGER,
    avg_energy_class TEXT,
    avg_consumption FLOAT,
    median_consumption FLOAT,
    best_performing_kommune TEXT,
    worst_performing_kommune TEXT,
    performance_vs_no1 FLOAT  -- Percentage difference vs NO1 baseline
) AS $$
BEGIN
    RETURN QUERY
    WITH zone_mapping AS (
        -- Map postal codes to zones
        SELECT
            postal_code,
            city,
            CASE
                WHEN LEFT(postal_code, 1) IN ('0', '1', '2', '3') THEN 'NO1'
                WHEN LEFT(postal_code, 1) = '4' THEN 'NO2'
                WHEN LEFT(postal_code, 1) = '5' THEN 'NO5'
                WHEN LEFT(postal_code, 1) IN ('6', '7') THEN 'NO3'
                WHEN LEFT(postal_code, 1) IN ('8', '9') THEN 'NO4'
                ELSE 'NO1'
            END AS price_zone
        FROM energy_certificates
    ),
    zone_stats AS (
        SELECT
            zm.price_zone,
            COUNT(ec.*)::INTEGER AS total_buildings,
            MODE() WITHIN GROUP (ORDER BY ec.energy_class) AS avg_class,
            AVG(ec.energy_consumption)::FLOAT AS avg_consumption,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ec.energy_consumption)::FLOAT AS median_consumption
        FROM zone_mapping zm
        JOIN energy_certificates ec ON zm.postal_code = ec.postal_code
        WHERE zm.price_zone = p_zone
            AND ec.energy_consumption IS NOT NULL
        GROUP BY zm.price_zone
    ),
    kommune_performance AS (
        SELECT
            zm.city AS kommune,
            AVG(ec.energy_consumption) AS avg_consumption
        FROM zone_mapping zm
        JOIN energy_certificates ec ON zm.postal_code = ec.postal_code
        WHERE zm.price_zone = p_zone
            AND ec.energy_consumption IS NOT NULL
        GROUP BY zm.city
    ),
    no1_baseline AS (
        SELECT AVG(energy_consumption) AS baseline_consumption
        FROM energy_certificates
        WHERE LEFT(postal_code, 1) IN ('0', '1', '2', '3')
            AND energy_consumption IS NOT NULL
    )
    SELECT
        p_zone AS zone,
        zs.total_buildings,
        zs.avg_class,
        zs.avg_consumption,
        zs.median_consumption,
        (SELECT kommune FROM kommune_performance ORDER BY avg_consumption ASC LIMIT 1) AS best_performing_kommune,
        (SELECT kommune FROM kommune_performance ORDER BY avg_consumption DESC LIMIT 1) AS worst_performing_kommune,
        ROUND(((zs.avg_consumption - nb.baseline_consumption) / nb.baseline_consumption * 100)::NUMERIC, 1)::FLOAT AS performance_vs_no1
    FROM zone_stats zs
    CROSS JOIN no1_baseline nb;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMPARATIVE ANALYSIS WITH ALL BRACKETS
-- ============================================

-- Get comprehensive age bracket comparison (all three brackets at once)
CREATE OR REPLACE FUNCTION get_all_age_brackets_comparison(
    building_type TEXT DEFAULT NULL,
    postal_code TEXT DEFAULT NULL
)
RETURNS TABLE (
    bracket_name TEXT,
    national_certified_count INTEGER,
    national_avg_consumption FLOAT,
    national_avg_class TEXT,
    local_certified_count INTEGER,
    local_avg_consumption FLOAT,
    local_avg_class TEXT,
    consumption_trend TEXT  -- 'improving', 'stable', 'declining'
) AS $$
BEGIN
    RETURN QUERY
    WITH age_brackets AS (
        SELECT
            CASE
                WHEN construction_year < 1980 THEN 'Pre 1980'
                WHEN construction_year >= 1980 AND construction_year <= 2010 THEN '1980-2010'
                WHEN construction_year > 2010 THEN 'Post 2010'
            END AS bracket,
            *
        FROM energy_certificates
        WHERE construction_year IS NOT NULL
            AND energy_consumption IS NOT NULL
            AND (building_type IS NULL OR building_category = building_type)
    )
    SELECT
        ab.bracket AS bracket_name,
        -- National statistics
        COUNT(ab.*)::INTEGER AS national_certified_count,
        AVG(ab.energy_consumption)::FLOAT AS national_avg_consumption,
        MODE() WITHIN GROUP (ORDER BY ab.energy_class) AS national_avg_class,
        -- Local statistics
        COUNT(ab.*) FILTER (WHERE ab.postal_code = postal_code)::INTEGER AS local_certified_count,
        AVG(ab.energy_consumption) FILTER (WHERE ab.postal_code = postal_code)::FLOAT AS local_avg_consumption,
        MODE() WITHIN GROUP (ORDER BY ab.energy_class) FILTER (WHERE ab.postal_code = postal_code) AS local_avg_class,
        -- Consumption trend
        CASE
            WHEN ab.bracket = 'Post 2010' THEN 'improving'
            WHEN ab.bracket = '1980-2010' THEN 'stable'
            WHEN ab.bracket = 'Pre 1980' THEN 'declining'
        END AS consumption_trend
    FROM age_brackets ab
    GROUP BY ab.bracket
    ORDER BY
        CASE ab.bracket
            WHEN 'Pre 1980' THEN 1
            WHEN '1980-2010' THEN 2
            WHEN 'Post 2010' THEN 3
        END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SUCCESS STORIES AND BEST PERFORMERS
-- ============================================

-- Get best performing certified buildings in an area
CREATE OR REPLACE FUNCTION get_certified_success_stories(
    p_postal_code TEXT,
    p_building_type TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    address TEXT,
    building_category TEXT,
    construction_year INTEGER,
    energy_class TEXT,
    energy_consumption FLOAT,
    improvement_potential TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.address,
        ec.building_category,
        ec.construction_year,
        ec.energy_class,
        ec.energy_consumption,
        CASE
            WHEN ec.energy_class IN ('A', 'B') THEN 'Beste praksis eksempel'
            WHEN ec.energy_class = 'C' THEN 'God standard'
            WHEN ec.energy_class IN ('D', 'E') THEN 'Oppgraderingspotensial'
            ELSE 'Stort forbedringspotensial'
        END AS improvement_potential
    FROM energy_certificates ec
    WHERE ec.postal_code = p_postal_code
        AND (p_building_type IS NULL OR ec.building_category = p_building_type)
        AND ec.energy_class IN ('A', 'B', 'C')
    ORDER BY ec.energy_consumption ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- UTILITY VIEWS FOR QUICK ACCESS
-- ============================================

-- View: Age bracket summary across all zones
CREATE OR REPLACE VIEW v_age_bracket_zone_summary AS
SELECT
    CASE
        WHEN LEFT(postal_code, 1) IN ('0', '1', '2', '3') THEN 'NO1'
        WHEN LEFT(postal_code, 1) = '4' THEN 'NO2'
        WHEN LEFT(postal_code, 1) = '5' THEN 'NO5'
        WHEN LEFT(postal_code, 1) IN ('6', '7') THEN 'NO3'
        WHEN LEFT(postal_code, 1) IN ('8', '9') THEN 'NO4'
        ELSE 'NO1'
    END AS price_zone,
    CASE
        WHEN construction_year < 1980 THEN 'Pre 1980'
        WHEN construction_year >= 1980 AND construction_year <= 2010 THEN '1980-2010'
        WHEN construction_year > 2010 THEN 'Post 2010'
    END AS age_bracket,
    COUNT(*) AS certified_count,
    AVG(energy_consumption) AS avg_consumption,
    MODE() WITHIN GROUP (ORDER BY energy_class) AS typical_class
FROM energy_certificates
WHERE construction_year IS NOT NULL
    AND energy_consumption IS NOT NULL
GROUP BY price_zone, age_bracket
ORDER BY price_zone, age_bracket;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant execute permissions on functions to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_certified_age_bracket_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_kommune_certified_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_zone_certified_insights TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_all_age_brackets_comparison TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_certified_success_stories TO authenticated, anon;

-- Grant select on view
GRANT SELECT ON v_age_bracket_zone_summary TO authenticated, anon;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_certified_age_bracket_stats IS 'Get certified building statistics for age brackets (Pre 1980, 1980-2010, Post 2010) with national and local comparisons';
COMMENT ON FUNCTION get_kommune_certified_stats IS 'Get municipality-level statistics for certified buildings including energy class distribution';
COMMENT ON FUNCTION get_zone_certified_insights IS 'Get electricity zone performance insights for certified buildings';
COMMENT ON FUNCTION get_all_age_brackets_comparison IS 'Compare all three age brackets simultaneously for certified buildings';
COMMENT ON FUNCTION get_certified_success_stories IS 'Find best performing certified buildings in an area as success examples';
COMMENT ON VIEW v_age_bracket_zone_summary IS 'Quick summary of certified buildings by age bracket and electricity zone';