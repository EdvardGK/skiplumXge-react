-- ============================================
-- ADD NVE ELECTRICITY PRICING TABLES
-- For existing Supabase database - no conflicts
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

-- NVE pricing function
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

-- Only create policies if they don't exist (use DO blocks to handle)
DO $$
BEGIN
    -- Try to create NVE pricing policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'electricity_prices_nve' AND policyname = 'electricity_prices_nve_public_read') THEN
        CREATE POLICY "electricity_prices_nve_public_read" ON electricity_prices_nve FOR SELECT USING (true);
    END IF;

    -- Try to create zones policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'electricity_price_zones' AND policyname = 'electricity_price_zones_public_read') THEN
        CREATE POLICY "electricity_price_zones_public_read" ON electricity_price_zones FOR SELECT USING (true);
    END IF;

    -- Try to create service write policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'electricity_prices_nve' AND policyname = 'electricity_prices_nve_service_write') THEN
        CREATE POLICY "electricity_prices_nve_service_write" ON electricity_prices_nve
            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Grant permissions for NVE tables
GRANT SELECT ON electricity_prices_nve TO anon;
GRANT SELECT ON electricity_price_zones TO anon;
GRANT EXECUTE ON FUNCTION get_latest_electricity_price(TEXT) TO anon;

-- Success message
SELECT 'NVE tables added successfully!' AS status,
       COUNT(*) AS nve_tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('electricity_prices_nve', 'electricity_price_zones');