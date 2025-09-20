-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: test_queries.sql
-- Purpose: Test queries to verify database setup
-- ============================================

-- ============================================
-- 1. VERIFY TABLES EXIST
-- ============================================

SELECT 'Tables Check' AS test_name;
SELECT table_name,
       CASE WHEN table_name IS NOT NULL THEN '✓ Created' ELSE '✗ Missing' END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'energy_certificates',
    'user_searches',
    'analysis_results',
    'conversion_events',
    'audit_log'
)
ORDER BY table_name;

-- ============================================
-- 2. VERIFY INDEXES
-- ============================================

SELECT 'Indexes Check' AS test_name;
SELECT COUNT(*) AS total_indexes,
       COUNT(*) FILTER (WHERE indexname LIKE 'idx_%') AS custom_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================
-- 3. VERIFY RLS POLICIES
-- ============================================

SELECT 'RLS Policies Check' AS test_name;
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. VERIFY FUNCTIONS
-- ============================================

SELECT 'Functions Check' AS test_name;
SELECT routine_name,
       CASE WHEN routine_name IS NOT NULL THEN '✓ Created' ELSE '✗ Missing' END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN (
    'search_addresses',
    'calculate_tek17_requirement',
    'calculate_investment_potential',
    'get_postal_statistics',
    'track_conversion'
)
ORDER BY routine_name;

-- ============================================
-- 5. VERIFY VIEWS
-- ============================================

SELECT 'Views Check' AS test_name;
SELECT table_name AS view_name,
       CASE WHEN table_name IS NOT NULL THEN '✓ Created' ELSE '✗ Missing' END AS status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 6. TEST ADDRESS SEARCH FUNCTION
-- ============================================

SELECT 'Address Search Test' AS test_name;
-- This will return empty if no data is loaded yet
SELECT * FROM search_addresses('Oslo', 5);

-- ============================================
-- 7. TEST TEK17 CALCULATION
-- ============================================

SELECT 'TEK17 Calculation Test' AS test_name;
SELECT
    building_type,
    calculate_tek17_requirement(building_type, 200) AS tek17_for_200m2
FROM (VALUES
    ('Småhus'),
    ('Leilighet'),
    ('Kontor'),
    ('Skolebygg')
) AS t(building_type);

-- ============================================
-- 8. TEST INVESTMENT CALCULATION
-- ============================================

SELECT 'Investment Calculation Test' AS test_name;
SELECT * FROM calculate_investment_potential(
    current_consumption := 180,  -- kWh/m²/year
    tek17_requirement := 115,     -- kWh/m²/year
    total_bra := 200,            -- m²
    electricity_price := 2.80     -- NOK/kWh
);

-- ============================================
-- 9. TEST DATA INSERT (Session Management)
-- ============================================

SELECT 'Data Insert Test' AS test_name;

-- Test creating a session
DO $$
DECLARE
    test_session_id TEXT;
    test_analysis_id UUID;
    test_conversion_id UUID;
BEGIN
    -- Get session ID
    test_session_id := get_or_create_session();

    -- Insert test search
    INSERT INTO user_searches (session_id, search_query, selected_address, postal_code)
    VALUES (test_session_id, 'Test Address', 'Testveien 1', '0001');

    -- Insert test analysis
    INSERT INTO analysis_results (
        session_id, address, building_type, total_bra, current_consumption
    ) VALUES (
        test_session_id, 'Testveien 1', 'Kontor', 200, 180
    ) RETURNING id INTO test_analysis_id;

    -- Insert test conversion
    test_conversion_id := track_conversion(
        test_session_id,
        'contact_form',
        'Testveien 1',
        '{"test": "data"}'::jsonb
    );

    RAISE NOTICE 'Test data inserted successfully';
    RAISE NOTICE 'Session ID: %', test_session_id;
    RAISE NOTICE 'Analysis ID: %', test_analysis_id;
    RAISE NOTICE 'Conversion ID: %', test_conversion_id;
END $$;

-- ============================================
-- 10. VERIFY TEST DATA
-- ============================================

SELECT 'Test Data Verification' AS test_name;

-- Check searches
SELECT COUNT(*) AS search_count FROM user_searches;

-- Check analyses
SELECT COUNT(*) AS analysis_count,
       AVG(investment_room_kr) AS avg_investment
FROM analysis_results;

-- Check conversions
SELECT COUNT(*) AS conversion_count FROM conversion_events;

-- ============================================
-- 11. TEST VIEWS WITH DATA
-- ============================================

SELECT 'Views Data Test' AS test_name;

-- Test recent analyses view
SELECT * FROM recent_analyses LIMIT 1;

-- Test daily funnel (will show test data)
SELECT * FROM daily_conversion_funnel
WHERE date = CURRENT_DATE;

-- ============================================
-- 12. CLEANUP TEST DATA (Optional)
-- ============================================

-- Uncomment to clean up test data
/*
DELETE FROM conversion_events WHERE address = 'Testveien 1';
DELETE FROM analysis_results WHERE address = 'Testveien 1';
DELETE FROM user_searches WHERE selected_address = 'Testveien 1';
*/

-- ============================================
-- 13. PERFORMANCE CHECK
-- ============================================

SELECT 'Performance Check' AS test_name;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 'Setup Summary' AS test_name;
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS indexes,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') AS functions,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS views,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS policies;