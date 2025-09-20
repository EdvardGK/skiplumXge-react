-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 07_nve_electricity_pricing.sql
-- Purpose: NVE electricity pricing data tables
-- ============================================

-- ============================================
-- NVE ELECTRICITY PRICING TABLE
-- Store weekly spot prices by Norwegian price zones
-- Data Source: NVE (Norwegian Water Resources and Energy Directorate)
-- URL: https://www.nve.no/energi/analyser-og-statistikk/kraftpriser-og-kraftsystemdata/
-- ============================================

CREATE TABLE IF NOT EXISTS electricity_prices_nve (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Time identifiers
    week TEXT NOT NULL,               -- "38-2025" format from NVE data
    year INTEGER NOT NULL,            -- Extracted year for easier querying
    week_number INTEGER NOT NULL,     -- Week number (1-53)

    -- Geographic identifier
    zone TEXT NOT NULL CHECK (zone IN ('NO1', 'NO2', 'NO3', 'NO4', 'NO5')),

    -- Pricing data
    spot_price_ore_kwh FLOAT NOT NULL,  -- Average spot price (øre/kWh)
    spot_price_kr_kwh FLOAT GENERATED ALWAYS AS (spot_price_ore_kwh / 100) STORED,

    -- Data source attribution
    data_source TEXT DEFAULT 'NVE',
    source_url TEXT DEFAULT 'https://www.nve.no/energi/analyser-og-statistikk/kraftpriser-og-kraftsystemdata/',

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure unique records per week/zone
    UNIQUE(week, zone)
);

-- ============================================
-- PRICE ZONE REFERENCE TABLE
-- Norwegian electricity price zones with descriptions
-- ============================================

CREATE TABLE IF NOT EXISTS electricity_price_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Zone identification
    zone_code TEXT NOT NULL UNIQUE CHECK (zone_code IN ('NO1', 'NO2', 'NO3', 'NO4', 'NO5')),
    zone_name_no TEXT NOT NULL,          -- Norwegian name
    zone_name_en TEXT NOT NULL,          -- English name

    -- Geographic description
    region_description_no TEXT NOT NULL,  -- Norwegian description
    region_description_en TEXT NOT NULL,  -- English description

    -- Major cities in zone
    major_cities TEXT[],                  -- Array of major cities

    -- Typical price characteristics
    price_level TEXT CHECK (price_level IN ('low', 'medium', 'high')),
    price_volatility TEXT CHECK (price_volatility IN ('low', 'medium', 'high')),

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- POPULATE PRICE ZONES REFERENCE DATA
-- ============================================

INSERT INTO electricity_price_zones (
    zone_code, zone_name_no, zone_name_en,
    region_description_no, region_description_en,
    major_cities, price_level, price_volatility
) VALUES
(
    'NO1', 'Sørøst-Norge', 'Southeast Norway',
    'Oslo og omegn, Østfold, Akershus, store deler av Oppland og Hedmark',
    'Oslo and surroundings, Østfold, Akershus, large parts of Oppland and Hedmark',
    ARRAY['Oslo', 'Drammen', 'Fredrikstad', 'Lillehammer'],
    'medium', 'medium'
),
(
    'NO2', 'Sørvest-Norge', 'Southwest Norway',
    'Agder-fylkene og store deler av Telemark, Buskerud og Rogaland',
    'Agder counties and large parts of Telemark, Buskerud and Rogaland',
    ARRAY['Kristiansand', 'Stavanger', 'Haugesund', 'Skien'],
    'high', 'high'
),
(
    'NO3', 'Midt-Norge', 'Mid-Norway',
    'Trøndelag og deler av Møre og Romsdal',
    'Trøndelag and parts of Møre og Romsdal',
    ARRAY['Trondheim', 'Molde', 'Kristiansund'],
    'low', 'medium'
),
(
    'NO4', 'Nord-Norge', 'North Norway',
    'Nordland, Troms og Finnmark',
    'Nordland, Troms and Finnmark',
    ARRAY['Bodø', 'Tromsø', 'Alta', 'Hammerfest'],
    'low', 'low'
),
(
    'NO5', 'Vest-Norge', 'West Norway',
    'Sogn og Fjordane, Hordaland og deler av Møre og Romsdal',
    'Sogn og Fjordane, Hordaland and parts of Møre og Romsdal',
    ARRAY['Bergen', 'Ålesund', 'Førde'],
    'medium', 'high'
)
ON CONFLICT (zone_code) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_zone
    ON electricity_prices_nve(zone);

CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_year
    ON electricity_prices_nve(year DESC);

CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_week
    ON electricity_prices_nve(week DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_zone_year
    ON electricity_prices_nve(zone, year DESC);

CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_zone_week
    ON electricity_prices_nve(zone, week DESC);

-- Index for recent pricing queries
CREATE INDEX IF NOT EXISTS idx_electricity_prices_nve_recent
    ON electricity_prices_nve(year DESC, week_number DESC, zone);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get latest price for a zone
CREATE OR REPLACE FUNCTION get_latest_electricity_price(zone_code TEXT)
RETURNS TABLE (
    zone TEXT,
    week TEXT,
    spot_price_ore_kwh FLOAT,
    spot_price_kr_kwh FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ep.zone,
        ep.week,
        ep.spot_price_ore_kwh,
        ep.spot_price_kr_kwh
    FROM electricity_prices_nve ep
    WHERE ep.zone = zone_code
    ORDER BY ep.year DESC, ep.week_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get price comparison across all zones for latest week
CREATE OR REPLACE FUNCTION get_latest_zone_comparison()
RETURNS TABLE (
    zone TEXT,
    zone_name_no TEXT,
    week TEXT,
    spot_price_ore_kwh FLOAT,
    price_vs_no1_percent FLOAT
) AS $$
DECLARE
    latest_week TEXT;
    no1_price FLOAT;
BEGIN
    -- Get the latest week
    SELECT ep.week INTO latest_week
    FROM electricity_prices_nve ep
    ORDER BY ep.year DESC, ep.week_number DESC
    LIMIT 1;

    -- Get NO1 price for comparison
    SELECT ep.spot_price_ore_kwh INTO no1_price
    FROM electricity_prices_nve ep
    WHERE ep.zone = 'NO1' AND ep.week = latest_week;

    RETURN QUERY
    SELECT
        ep.zone,
        epz.zone_name_no,
        ep.week,
        ep.spot_price_ore_kwh,
        ROUND(((ep.spot_price_ore_kwh / no1_price) - 1) * 100, 1) as price_vs_no1_percent
    FROM electricity_prices_nve ep
    JOIN electricity_price_zones epz ON ep.zone = epz.zone_code
    WHERE ep.week = latest_week
    ORDER BY ep.spot_price_ore_kwh DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get average prices by zone for a specific year
CREATE OR REPLACE FUNCTION get_yearly_average_prices(target_year INTEGER)
RETURNS TABLE (
    zone TEXT,
    zone_name_no TEXT,
    avg_spot_price_ore_kwh FLOAT,
    min_spot_price_ore_kwh FLOAT,
    max_spot_price_ore_kwh FLOAT,
    weeks_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ep.zone,
        epz.zone_name_no,
        ROUND(AVG(ep.spot_price_ore_kwh)::NUMERIC, 2)::FLOAT as avg_spot_price_ore_kwh,
        MIN(ep.spot_price_ore_kwh) as min_spot_price_ore_kwh,
        MAX(ep.spot_price_ore_kwh) as max_spot_price_ore_kwh,
        COUNT(*)::INTEGER as weeks_count
    FROM electricity_prices_nve ep
    JOIN electricity_price_zones epz ON ep.zone = epz.zone_code
    WHERE ep.year = target_year
    GROUP BY ep.zone, epz.zone_name_no
    ORDER BY avg_spot_price_ore_kwh DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_electricity_prices_nve_updated_at
    BEFORE UPDATE ON electricity_prices_nve
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE electricity_prices_nve ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_price_zones ENABLE ROW LEVEL SECURITY;

-- Public read access to pricing data
CREATE POLICY "electricity_prices_nve_public_read" ON electricity_prices_nve
    FOR SELECT USING (true);

CREATE POLICY "electricity_price_zones_public_read" ON electricity_price_zones
    FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "electricity_prices_nve_service_write" ON electricity_prices_nve
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant read access to anon users
GRANT SELECT ON electricity_prices_nve TO anon;
GRANT SELECT ON electricity_price_zones TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_latest_electricity_price(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_latest_zone_comparison() TO anon;
GRANT EXECUTE ON FUNCTION get_yearly_average_prices(INTEGER) TO anon;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE electricity_prices_nve IS 'Weekly spot electricity prices by Norwegian price zones from NVE';
COMMENT ON TABLE electricity_price_zones IS 'Reference data for Norwegian electricity price zones';

COMMENT ON COLUMN electricity_prices_nve.spot_price_ore_kwh IS 'Spot price in øre/kWh (Norwegian øre per kilowatt-hour)';
COMMENT ON COLUMN electricity_prices_nve.spot_price_kr_kwh IS 'Spot price in kr/kWh (calculated field)';
COMMENT ON COLUMN electricity_prices_nve.week IS 'Week identifier in format "38-2025" from NVE data';

-- ============================================
-- DATA VALIDATION
-- ============================================

-- Add constraint to ensure reasonable price ranges
ALTER TABLE electricity_prices_nve
ADD CONSTRAINT check_reasonable_price
CHECK (spot_price_ore_kwh >= 0 AND spot_price_ore_kwh <= 1000);

-- Add constraint for valid year range
ALTER TABLE electricity_prices_nve
ADD CONSTRAINT check_valid_year
CHECK (year >= 2020 AND year <= 2030);

-- Add constraint for valid week number
ALTER TABLE electricity_prices_nve
ADD CONSTRAINT check_valid_week_number
CHECK (week_number >= 1 AND week_number <= 53);