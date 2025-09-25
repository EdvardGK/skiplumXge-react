-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 10_precalculated_analytics.sql
-- Purpose: Pre-calculated analytics tables and materialized views for performance
-- ============================================

-- ============================================
-- PRE-CALCULATED STATISTICS TABLES
-- These are populated by overnight batch jobs
-- ============================================

-- Municipality statistics cache (updated nightly)
CREATE TABLE IF NOT EXISTS municipality_stats_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    postal_code TEXT NOT NULL,
    kommune_name TEXT NOT NULL,
    price_zone TEXT NOT NULL,

    -- Building counts
    total_certified_buildings INTEGER NOT NULL DEFAULT 0,
    buildings_by_type JSONB NOT NULL DEFAULT '{}',

    -- Energy class distribution (percentages)
    class_a_percentage FLOAT DEFAULT 0,
    class_b_percentage FLOAT DEFAULT 0,
    class_c_percentage FLOAT DEFAULT 0,
    class_d_percentage FLOAT DEFAULT 0,
    class_e_percentage FLOAT DEFAULT 0,
    class_f_percentage FLOAT DEFAULT 0,
    class_g_percentage FLOAT DEFAULT 0,
    avg_energy_class TEXT,

    -- Consumption statistics
    avg_consumption FLOAT,
    median_consumption FLOAT,
    percentile_10_consumption FLOAT,
    percentile_90_consumption FLOAT,

    -- Age bracket breakdowns
    pre_1980_count INTEGER DEFAULT 0,
    pre_1980_avg_consumption FLOAT,
    period_1980_2010_count INTEGER DEFAULT 0,
    period_1980_2010_avg_consumption FLOAT,
    post_2010_count INTEGER DEFAULT 0,
    post_2010_avg_consumption FLOAT,

    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,

    -- Unique constraint on postal code
    CONSTRAINT unique_postal_stats UNIQUE (postal_code)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_municipality_stats_postal ON municipality_stats_cache(postal_code);
CREATE INDEX IF NOT EXISTS idx_municipality_stats_zone ON municipality_stats_cache(price_zone);
CREATE INDEX IF NOT EXISTS idx_municipality_stats_kommune ON municipality_stats_cache(kommune_name);

-- ============================================
-- ZONE AGGREGATE STATISTICS (updated nightly)
-- ============================================

CREATE TABLE IF NOT EXISTS zone_stats_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    price_zone TEXT NOT NULL,

    -- Overall statistics
    total_certified_buildings INTEGER NOT NULL DEFAULT 0,
    avg_energy_class TEXT,
    avg_consumption FLOAT,
    median_consumption FLOAT,

    -- Performance rankings
    best_kommune_name TEXT,
    best_kommune_consumption FLOAT,
    worst_kommune_name TEXT,
    worst_kommune_consumption FLOAT,

    -- Age bracket performance
    pre_1980_avg_consumption FLOAT,
    period_1980_2010_avg_consumption FLOAT,
    post_2010_avg_consumption FLOAT,

    -- Building type performance (top 5)
    building_type_stats JSONB DEFAULT '{}',

    -- Climate adjusted values (if available)
    avg_heating_degree_days INTEGER,
    climate_adjusted_consumption FLOAT,

    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,

    -- Unique constraint
    CONSTRAINT unique_zone_stats UNIQUE (price_zone)
);

CREATE INDEX IF NOT EXISTS idx_zone_stats_zone ON zone_stats_cache(price_zone);

-- ============================================
-- NATIONAL BENCHMARKS (updated weekly)
-- ============================================

CREATE TABLE IF NOT EXISTS national_benchmarks_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    benchmark_type TEXT NOT NULL, -- 'age_bracket', 'building_type', 'combined'
    benchmark_key TEXT NOT NULL, -- e.g., 'Pre 1980', 'Kontor', 'Pre 1980_Kontor'

    -- Statistics
    total_buildings INTEGER NOT NULL DEFAULT 0,
    avg_consumption FLOAT,
    median_consumption FLOAT,
    percentile_25_consumption FLOAT,
    percentile_75_consumption FLOAT,
    best_in_class_consumption FLOAT, -- 10th percentile

    -- Energy class distribution
    typical_energy_class TEXT,
    class_distribution JSONB DEFAULT '{}',

    -- Geographic distribution
    zone_breakdown JSONB DEFAULT '{}', -- consumption by zone
    top_performing_municipalities JSONB DEFAULT '[]', -- array of top 5

    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,

    -- Unique constraint
    CONSTRAINT unique_benchmark UNIQUE (benchmark_type, benchmark_key)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON national_benchmarks_cache(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_benchmarks_key ON national_benchmarks_cache(benchmark_key);

-- ============================================
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- ============================================

-- Age bracket by zone matrix (refreshed nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_age_bracket_zone_matrix AS
WITH zone_age_stats AS (
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
        building_category,
        COUNT(*) AS building_count,
        AVG(energy_consumption) AS avg_consumption,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption) AS median_consumption,
        MODE() WITHIN GROUP (ORDER BY energy_class) AS typical_class
    FROM energy_certificates
    WHERE construction_year IS NOT NULL
        AND energy_consumption IS NOT NULL
    GROUP BY price_zone, age_bracket, building_category
)
SELECT * FROM zone_age_stats
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_zone_age_matrix
ON mv_age_bracket_zone_matrix(price_zone, age_bracket, building_category);

-- Top performers by category (refreshed weekly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_performers AS
WITH ranked_buildings AS (
    SELECT
        ec.*,
        ROW_NUMBER() OVER (
            PARTITION BY building_category,
            CASE
                WHEN construction_year < 1980 THEN 'Pre 1980'
                WHEN construction_year >= 1980 AND construction_year <= 2010 THEN '1980-2010'
                WHEN construction_year > 2010 THEN 'Post 2010'
            END
            ORDER BY energy_consumption ASC
        ) AS rank
    FROM energy_certificates ec
    WHERE energy_consumption IS NOT NULL
        AND energy_class IN ('A', 'B')
)
SELECT * FROM ranked_buildings WHERE rank <= 100
WITH DATA;

CREATE INDEX IF NOT EXISTS idx_mv_top_performers
ON mv_top_performers(building_category, construction_year);

-- ============================================
-- BATCH CALCULATION FUNCTIONS
-- ============================================

-- Function to refresh all municipality statistics
CREATE OR REPLACE FUNCTION refresh_municipality_stats()
RETURNS void AS $$
BEGIN
    -- Clear existing cache
    TRUNCATE municipality_stats_cache;

    -- Insert fresh calculations
    INSERT INTO municipality_stats_cache (
        postal_code,
        kommune_name,
        price_zone,
        total_certified_buildings,
        buildings_by_type,
        class_a_percentage,
        class_b_percentage,
        class_c_percentage,
        class_d_percentage,
        class_e_percentage,
        class_f_percentage,
        class_g_percentage,
        avg_energy_class,
        avg_consumption,
        median_consumption,
        percentile_10_consumption,
        percentile_90_consumption,
        pre_1980_count,
        pre_1980_avg_consumption,
        period_1980_2010_count,
        period_1980_2010_avg_consumption,
        post_2010_count,
        post_2010_avg_consumption
    )
    SELECT
        postal_code,
        MAX(city) AS kommune_name,
        CASE
            WHEN LEFT(postal_code, 1) IN ('0', '1', '2', '3') THEN 'NO1'
            WHEN LEFT(postal_code, 1) = '4' THEN 'NO2'
            WHEN LEFT(postal_code, 1) = '5' THEN 'NO5'
            WHEN LEFT(postal_code, 1) IN ('6', '7') THEN 'NO3'
            WHEN LEFT(postal_code, 1) IN ('8', '9') THEN 'NO4'
            ELSE 'NO1'
        END AS price_zone,
        COUNT(*)::INTEGER,
        jsonb_object_agg(
            COALESCE(building_category, 'Other'),
            COUNT(*)
        ) FILTER (WHERE building_category IS NOT NULL),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'A')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'B')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'C')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'D')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'E')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'F')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        ROUND((COUNT(*) FILTER (WHERE energy_class = 'G')::FLOAT / COUNT(*) * 100)::NUMERIC, 1),
        MODE() WITHIN GROUP (ORDER BY energy_class),
        AVG(energy_consumption)::FLOAT,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY energy_consumption)::FLOAT,
        COUNT(*) FILTER (WHERE construction_year < 1980)::INTEGER,
        AVG(energy_consumption) FILTER (WHERE construction_year < 1980)::FLOAT,
        COUNT(*) FILTER (WHERE construction_year >= 1980 AND construction_year <= 2010)::INTEGER,
        AVG(energy_consumption) FILTER (WHERE construction_year >= 1980 AND construction_year <= 2010)::FLOAT,
        COUNT(*) FILTER (WHERE construction_year > 2010)::INTEGER,
        AVG(energy_consumption) FILTER (WHERE construction_year > 2010)::FLOAT
    FROM energy_certificates
    WHERE postal_code IS NOT NULL
    GROUP BY postal_code;

    -- Log the refresh
    RAISE NOTICE 'Municipality stats refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh zone statistics
CREATE OR REPLACE FUNCTION refresh_zone_stats()
RETURNS void AS $$
BEGIN
    -- Clear existing cache
    TRUNCATE zone_stats_cache;

    -- Calculate zone statistics
    WITH zone_data AS (
        SELECT
            CASE
                WHEN LEFT(postal_code, 1) IN ('0', '1', '2', '3') THEN 'NO1'
                WHEN LEFT(postal_code, 1) = '4' THEN 'NO2'
                WHEN LEFT(postal_code, 1) = '5' THEN 'NO5'
                WHEN LEFT(postal_code, 1) IN ('6', '7') THEN 'NO3'
                WHEN LEFT(postal_code, 1) IN ('8', '9') THEN 'NO4'
                ELSE 'NO1'
            END AS price_zone,
            *
        FROM energy_certificates
        WHERE energy_consumption IS NOT NULL
    ),
    kommune_performance AS (
        SELECT
            price_zone,
            city AS kommune,
            AVG(energy_consumption) AS avg_consumption
        FROM zone_data
        GROUP BY price_zone, city
    )
    INSERT INTO zone_stats_cache (
        price_zone,
        total_certified_buildings,
        avg_energy_class,
        avg_consumption,
        median_consumption,
        best_kommune_name,
        best_kommune_consumption,
        worst_kommune_name,
        worst_kommune_consumption,
        pre_1980_avg_consumption,
        period_1980_2010_avg_consumption,
        post_2010_avg_consumption,
        building_type_stats
    )
    SELECT
        zd.price_zone,
        COUNT(zd.*)::INTEGER,
        MODE() WITHIN GROUP (ORDER BY zd.energy_class),
        AVG(zd.energy_consumption)::FLOAT,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY zd.energy_consumption)::FLOAT,
        (SELECT kommune FROM kommune_performance kp WHERE kp.price_zone = zd.price_zone ORDER BY avg_consumption ASC LIMIT 1),
        (SELECT avg_consumption FROM kommune_performance kp WHERE kp.price_zone = zd.price_zone ORDER BY avg_consumption ASC LIMIT 1),
        (SELECT kommune FROM kommune_performance kp WHERE kp.price_zone = zd.price_zone ORDER BY avg_consumption DESC LIMIT 1),
        (SELECT avg_consumption FROM kommune_performance kp WHERE kp.price_zone = zd.price_zone ORDER BY avg_consumption DESC LIMIT 1),
        AVG(zd.energy_consumption) FILTER (WHERE zd.construction_year < 1980)::FLOAT,
        AVG(zd.energy_consumption) FILTER (WHERE zd.construction_year >= 1980 AND zd.construction_year <= 2010)::FLOAT,
        AVG(zd.energy_consumption) FILTER (WHERE zd.construction_year > 2010)::FLOAT,
        (
            SELECT jsonb_object_agg(building_category, avg_consumption)
            FROM (
                SELECT building_category, AVG(energy_consumption) AS avg_consumption
                FROM zone_data zd2
                WHERE zd2.price_zone = zd.price_zone
                    AND building_category IS NOT NULL
                GROUP BY building_category
                ORDER BY avg_consumption ASC
                LIMIT 5
            ) top_types
        )
    FROM zone_data zd
    GROUP BY zd.price_zone;

    RAISE NOTICE 'Zone stats refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh national benchmarks
CREATE OR REPLACE FUNCTION refresh_national_benchmarks()
RETURNS void AS $$
BEGIN
    -- Clear existing cache
    TRUNCATE national_benchmarks_cache;

    -- Insert age bracket benchmarks
    INSERT INTO national_benchmarks_cache (
        benchmark_type,
        benchmark_key,
        total_buildings,
        avg_consumption,
        median_consumption,
        percentile_25_consumption,
        percentile_75_consumption,
        best_in_class_consumption,
        typical_energy_class,
        class_distribution
    )
    SELECT
        'age_bracket',
        age_bracket,
        COUNT(*),
        AVG(energy_consumption),
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY energy_consumption),
        MODE() WITHIN GROUP (ORDER BY energy_class),
        jsonb_object_agg(energy_class, class_count)
    FROM (
        SELECT
            CASE
                WHEN construction_year < 1980 THEN 'Pre 1980'
                WHEN construction_year >= 1980 AND construction_year <= 2010 THEN '1980-2010'
                WHEN construction_year > 2010 THEN 'Post 2010'
            END AS age_bracket,
            energy_consumption,
            energy_class
        FROM energy_certificates
        WHERE construction_year IS NOT NULL
            AND energy_consumption IS NOT NULL
    ) age_data
    JOIN LATERAL (
        SELECT energy_class, COUNT(*) AS class_count
        FROM energy_certificates ec2
        WHERE CASE
                WHEN ec2.construction_year < 1980 THEN 'Pre 1980'
                WHEN ec2.construction_year >= 1980 AND ec2.construction_year <= 2010 THEN '1980-2010'
                WHEN ec2.construction_year > 2010 THEN 'Post 2010'
              END = age_data.age_bracket
        GROUP BY energy_class
    ) class_counts ON true
    GROUP BY age_bracket;

    -- Insert building type benchmarks
    INSERT INTO national_benchmarks_cache (
        benchmark_type,
        benchmark_key,
        total_buildings,
        avg_consumption,
        median_consumption,
        percentile_25_consumption,
        percentile_75_consumption,
        best_in_class_consumption,
        typical_energy_class
    )
    SELECT
        'building_type',
        building_category,
        COUNT(*),
        AVG(energy_consumption),
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY energy_consumption),
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY energy_consumption),
        MODE() WITHIN GROUP (ORDER BY energy_class)
    FROM energy_certificates
    WHERE building_category IS NOT NULL
        AND energy_consumption IS NOT NULL
    GROUP BY building_category;

    RAISE NOTICE 'National benchmarks refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MASTER REFRESH FUNCTION (run nightly)
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_analytics_cache()
RETURNS void AS $$
BEGIN
    -- Refresh in order of dependencies
    PERFORM refresh_municipality_stats();
    PERFORM refresh_zone_stats();
    PERFORM refresh_national_benchmarks();

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_age_bracket_zone_matrix;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_performers;

    -- Log completion
    RAISE NOTICE 'All analytics caches refreshed successfully at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FAST QUERY FUNCTIONS (use cache tables)
-- ============================================

-- Get municipality stats from cache (instant response)
CREATE OR REPLACE FUNCTION get_cached_municipality_stats(p_postal_code TEXT)
RETURNS TABLE (
    kommune_name TEXT,
    total_certified_buildings INTEGER,
    avg_energy_class TEXT,
    class_distribution JSONB,
    age_bracket_performance JSONB,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        msc.kommune_name,
        msc.total_certified_buildings,
        msc.avg_energy_class,
        jsonb_build_object(
            'A', msc.class_a_percentage,
            'B', msc.class_b_percentage,
            'C', msc.class_c_percentage,
            'D', msc.class_d_percentage,
            'E', msc.class_e_percentage,
            'F', msc.class_f_percentage,
            'G', msc.class_g_percentage
        ) AS class_distribution,
        jsonb_build_object(
            'Pre 1980', jsonb_build_object(
                'count', msc.pre_1980_count,
                'avg_consumption', msc.pre_1980_avg_consumption
            ),
            '1980-2010', jsonb_build_object(
                'count', msc.period_1980_2010_count,
                'avg_consumption', msc.period_1980_2010_avg_consumption
            ),
            'Post 2010', jsonb_build_object(
                'count', msc.post_2010_count,
                'avg_consumption', msc.post_2010_avg_consumption
            )
        ) AS age_bracket_performance,
        msc.last_updated
    FROM municipality_stats_cache msc
    WHERE msc.postal_code = p_postal_code;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get zone comparison from cache (instant response)
CREATE OR REPLACE FUNCTION get_cached_zone_comparison(p_zone TEXT)
RETURNS TABLE (
    zone TEXT,
    total_buildings INTEGER,
    avg_consumption FLOAT,
    best_kommune TEXT,
    worst_kommune TEXT,
    age_bracket_comparison JSONB,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        zsc.price_zone,
        zsc.total_certified_buildings,
        zsc.avg_consumption,
        zsc.best_kommune_name,
        zsc.worst_kommune_name,
        jsonb_build_object(
            'Pre 1980', zsc.pre_1980_avg_consumption,
            '1980-2010', zsc.period_1980_2010_avg_consumption,
            'Post 2010', zsc.post_2010_avg_consumption
        ),
        zsc.last_updated
    FROM zone_stats_cache zsc
    WHERE zsc.price_zone = p_zone;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PERMISSIONS
-- ============================================

GRANT SELECT ON municipality_stats_cache TO authenticated, anon;
GRANT SELECT ON zone_stats_cache TO authenticated, anon;
GRANT SELECT ON national_benchmarks_cache TO authenticated, anon;
GRANT SELECT ON mv_age_bracket_zone_matrix TO authenticated, anon;
GRANT SELECT ON mv_top_performers TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_cached_municipality_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_cached_zone_comparison TO authenticated, anon;

-- Only service role can refresh caches
GRANT EXECUTE ON FUNCTION refresh_all_analytics_cache TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE municipality_stats_cache IS 'Pre-calculated municipality statistics updated nightly for instant API responses';
COMMENT ON TABLE zone_stats_cache IS 'Pre-calculated electricity zone statistics updated nightly';
COMMENT ON TABLE national_benchmarks_cache IS 'National benchmarks by age bracket and building type updated weekly';
COMMENT ON FUNCTION refresh_all_analytics_cache IS 'Master function to refresh all analytics caches - run nightly at 2 AM';
COMMENT ON FUNCTION get_cached_municipality_stats IS 'Get pre-calculated municipality stats for instant response times';