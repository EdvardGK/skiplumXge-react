-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 05_views.sql
-- Purpose: Views for common queries and reporting
-- ============================================

-- ============================================
-- ANALYTICS VIEWS
-- ============================================

-- Recent analyses with conversion status
CREATE OR REPLACE VIEW recent_analyses AS
SELECT
    ar.id,
    ar.session_id,
    ar.address,
    ar.building_type,
    ar.total_bra,
    ar.current_consumption,
    ar.tek17_requirement,
    ar.annual_waste_kr,
    ar.investment_room_kr,
    ar.created_at,
    ce.action_type AS latest_conversion,
    ce.timestamp AS conversion_time,
    ce.timestamp - ar.created_at AS time_to_conversion
FROM analysis_results ar
LEFT JOIN LATERAL (
    SELECT action_type, timestamp
    FROM conversion_events
    WHERE session_id = ar.session_id
    ORDER BY timestamp DESC
    LIMIT 1
) ce ON true
WHERE ar.created_at > NOW() - INTERVAL '30 days'
ORDER BY ar.created_at DESC;

-- Daily conversion funnel
CREATE OR REPLACE VIEW daily_conversion_funnel AS
SELECT
    DATE(us.timestamp) AS date,
    COUNT(DISTINCT us.session_id) AS searches,
    COUNT(DISTINCT ar.session_id) AS analyses,
    COUNT(DISTINCT ce.session_id) AS conversions,
    COUNT(DISTINCT ce_form.session_id) AS contact_forms,
    COUNT(DISTINCT ce_pdf.session_id) AS pdf_downloads,
    ROUND(
        COUNT(DISTINCT ce.session_id)::NUMERIC /
        NULLIF(COUNT(DISTINCT us.session_id), 0) * 100,
        2
    ) AS conversion_rate
FROM user_searches us
LEFT JOIN analysis_results ar
    ON us.session_id = ar.session_id
    AND ar.created_at::DATE = us.timestamp::DATE
LEFT JOIN conversion_events ce
    ON us.session_id = ce.session_id
    AND ce.timestamp::DATE = us.timestamp::DATE
LEFT JOIN conversion_events ce_form
    ON us.session_id = ce_form.session_id
    AND ce_form.action_type = 'contact_form'
    AND ce_form.timestamp::DATE = us.timestamp::DATE
LEFT JOIN conversion_events ce_pdf
    ON us.session_id = ce_pdf.session_id
    AND ce_pdf.action_type = 'pdf_download'
    AND ce_pdf.timestamp::DATE = us.timestamp::DATE
WHERE us.timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE(us.timestamp)
ORDER BY date DESC;

-- Weekly metrics summary
CREATE OR REPLACE VIEW weekly_metrics AS
SELECT
    DATE_TRUNC('week', us.timestamp) AS week,
    COUNT(DISTINCT us.session_id) AS unique_sessions,
    COUNT(us.id) AS total_searches,
    COUNT(DISTINCT ar.id) AS total_analyses,
    COUNT(DISTINCT ce.id) AS total_conversions,
    AVG(ar.annual_waste_kr) AS avg_annual_waste,
    AVG(ar.investment_room_kr) AS avg_investment_potential,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ar.investment_room_kr) AS median_investment
FROM user_searches us
LEFT JOIN analysis_results ar ON us.session_id = ar.session_id
LEFT JOIN conversion_events ce ON us.session_id = ce.session_id
WHERE us.timestamp > NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', us.timestamp)
ORDER BY week DESC;

-- ============================================
-- BUILDING STATISTICS VIEWS
-- ============================================

-- Building category statistics
CREATE OR REPLACE VIEW building_category_stats AS
SELECT
    building_category,
    COUNT(*) AS total_buildings,
    COUNT(DISTINCT postal_code) AS postal_codes_covered,
    AVG(energy_consumption) AS avg_consumption,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY energy_consumption) AS q1_consumption,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption) AS median_consumption,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY energy_consumption) AS q3_consumption,
    MIN(energy_consumption) AS best_consumption,
    MAX(energy_consumption) AS worst_consumption,
    AVG(construction_year) AS avg_construction_year,
    COUNT(*) FILTER (WHERE energy_class = 'A') AS class_a_count,
    COUNT(*) FILTER (WHERE energy_class = 'B') AS class_b_count,
    COUNT(*) FILTER (WHERE energy_class = 'C') AS class_c_count,
    COUNT(*) FILTER (WHERE energy_class = 'D') AS class_d_count,
    COUNT(*) FILTER (WHERE energy_class = 'E') AS class_e_count,
    COUNT(*) FILTER (WHERE energy_class = 'F') AS class_f_count,
    COUNT(*) FILTER (WHERE energy_class = 'G') AS class_g_count
FROM energy_certificates
WHERE energy_consumption IS NOT NULL
GROUP BY building_category
ORDER BY total_buildings DESC;

-- Postal code coverage
CREATE OR REPLACE VIEW postal_code_coverage AS
SELECT
    postal_code,
    city,
    COUNT(*) AS buildings_with_certificates,
    COUNT(DISTINCT building_category) AS building_types,
    AVG(energy_consumption) AS avg_consumption,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption) AS median_consumption,
    MODE() WITHIN GROUP (ORDER BY energy_class) AS most_common_class,
    AVG(construction_year) AS avg_construction_year,
    COUNT(*) FILTER (WHERE energy_consumption > 200) AS high_consumption_count,
    COUNT(*) FILTER (WHERE energy_consumption <= 100) AS low_consumption_count
FROM energy_certificates
WHERE energy_consumption IS NOT NULL
GROUP BY postal_code, city
HAVING COUNT(*) >= 5  -- Only show postal codes with meaningful data
ORDER BY buildings_with_certificates DESC;

-- Energy class distribution
CREATE OR REPLACE VIEW energy_class_distribution AS
SELECT
    energy_class,
    COUNT(*) AS total_buildings,
    ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 2) AS percentage,
    AVG(energy_consumption) AS avg_consumption,
    AVG(construction_year) AS avg_construction_year,
    MODE() WITHIN GROUP (ORDER BY building_category) AS most_common_category,
    AVG(fossil_percentage) AS avg_fossil_percentage
FROM energy_certificates
WHERE energy_class IS NOT NULL
GROUP BY energy_class
ORDER BY energy_class;

-- ============================================
-- HIGH-VALUE OPPORTUNITY VIEWS
-- ============================================

-- High waste properties (top opportunities)
CREATE OR REPLACE VIEW high_waste_opportunities AS
SELECT
    ar.address,
    ar.building_type,
    ar.total_bra,
    ar.current_consumption,
    ar.tek17_requirement,
    ar.annual_waste_kr,
    ar.investment_room_kr,
    ar.created_at,
    ar.session_id,
    CASE
        WHEN ce.session_id IS NOT NULL THEN 'Converted'
        ELSE 'Not Converted'
    END AS conversion_status
FROM analysis_results ar
LEFT JOIN conversion_events ce ON ar.session_id = ce.session_id
WHERE ar.annual_waste_kr > 50000  -- High waste threshold
ORDER BY ar.annual_waste_kr DESC
LIMIT 100;

-- Best performing buildings by category
CREATE OR REPLACE VIEW best_performers AS
SELECT DISTINCT ON (building_category)
    building_category,
    address,
    postal_code,
    city,
    energy_consumption,
    energy_class,
    construction_year,
    certificate_id
FROM energy_certificates
WHERE energy_consumption IS NOT NULL
    AND energy_class IN ('A', 'B')
ORDER BY building_category, energy_consumption ASC;

-- ============================================
-- SEARCH ANALYTICS VIEWS
-- ============================================

-- Popular search locations
CREATE OR REPLACE VIEW popular_search_locations AS
SELECT
    postal_code,
    COUNT(DISTINCT session_id) AS unique_searches,
    COUNT(*) AS total_searches,
    COUNT(DISTINCT selected_address) AS unique_addresses_selected,
    MAX(timestamp) AS last_searched
FROM user_searches
WHERE postal_code IS NOT NULL
GROUP BY postal_code
HAVING COUNT(*) >= 3
ORDER BY unique_searches DESC
LIMIT 100;

-- Search to conversion pathway
CREATE OR REPLACE VIEW search_conversion_pathway AS
SELECT
    us.session_id,
    MIN(us.timestamp) AS first_search,
    COUNT(DISTINCT us.id) AS search_count,
    COUNT(DISTINCT ar.id) AS analysis_count,
    MAX(ar.investment_room_kr) AS max_investment_identified,
    STRING_AGG(DISTINCT ce.action_type, ', ' ORDER BY ce.action_type) AS conversion_types,
    MAX(ce.timestamp) AS conversion_time,
    MAX(ce.timestamp) - MIN(us.timestamp) AS total_journey_time
FROM user_searches us
LEFT JOIN analysis_results ar ON us.session_id = ar.session_id
LEFT JOIN conversion_events ce ON us.session_id = ce.session_id
WHERE us.timestamp > NOW() - INTERVAL '30 days'
GROUP BY us.session_id
HAVING COUNT(DISTINCT ce.id) > 0  -- Only converted sessions
ORDER BY total_journey_time;

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- Cache expensive aggregations (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_stats AS
SELECT
    DATE(timestamp) AS date,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(*) AS total_searches,
    COUNT(DISTINCT postal_code) AS unique_postal_codes
FROM user_searches
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY DATE(timestamp)
WITH DATA;

-- Create index on materialized view
CREATE INDEX idx_mv_daily_stats_date ON mv_daily_stats(date DESC);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
END;
$$ LANGUAGE plpgsql;