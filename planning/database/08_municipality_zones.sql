-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 08_municipality_zones.sql
-- Purpose: Municipality to electricity price zone mapping
-- ============================================

-- ============================================
-- MUNICIPALITY PRICE ZONES TABLE
-- Maps Norwegian municipalities to electricity price zones
-- Data Source: Official Norwegian municipality register + Statnett zone boundaries
-- ============================================

CREATE TABLE IF NOT EXISTS municipality_price_zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kommune_number TEXT NOT NULL UNIQUE,
    kommune_name TEXT NOT NULL,
    price_zone TEXT NOT NULL CHECK (price_zone IN ('NO1', 'NO2', 'NO3', 'NO4', 'NO5')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Optional geographic info for future enhancements
    fylke_name TEXT,

    -- Data validation
    CONSTRAINT valid_kommune_number CHECK (length(kommune_number) >= 3 AND length(kommune_number) <= 4)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Primary lookup index for zone resolution
CREATE INDEX IF NOT EXISTS idx_municipality_zones_kommune
ON municipality_price_zones(kommune_number);

-- Index for zone-based queries
CREATE INDEX IF NOT EXISTS idx_municipality_zones_zone
ON municipality_price_zones(price_zone);

-- Index for name searches
CREATE INDEX IF NOT EXISTS idx_municipality_zones_name
ON municipality_price_zones USING gin(kommune_name gin_trgm_ops);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get price zone with fallback
CREATE OR REPLACE FUNCTION get_price_zone(p_kommune_number TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT price_zone FROM municipality_price_zones WHERE kommune_number = p_kommune_number),
        'NO1'  -- Default fallback to Eastern Norway
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get zone statistics
CREATE OR REPLACE FUNCTION get_zone_municipality_count()
RETURNS TABLE(zone TEXT, municipality_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT price_zone, COUNT(*) as municipality_count
    FROM municipality_price_zones
    GROUP BY price_zone
    ORDER BY price_zone;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on the table
ALTER TABLE municipality_price_zones ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous users
CREATE POLICY "Municipality zones are publicly readable" ON municipality_price_zones
    FOR SELECT TO public
    USING (true);

-- Only service role can insert/update
CREATE POLICY "Municipality zones service role only" ON municipality_price_zones
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- DATA IMPORT
-- Insert all 371 Norwegian municipalities with their zones
-- ============================================

INSERT INTO municipality_price_zones (kommune_number, kommune_name, price_zone, fylke_name) VALUES
-- Oslo
('301', 'Oslo', 'NO1', 'Oslo'),

-- Akershus (all NO1)
('3203', 'Asker', 'NO1', 'Akershus'),
('3226', 'Aurskog-Høland', 'NO1', 'Akershus'),
('3201', 'Bærum', 'NO1', 'Akershus'),
('3240', 'Eidsvoll', 'NO1', 'Akershus'),
('3220', 'Enebakk', 'NO1', 'Akershus'),
('3214', 'Frogn', 'NO1', 'Akershus'),
('3236', 'Gjerdrum', 'NO1', 'Akershus'),
('3242', 'Hurdal', 'NO1', 'Akershus'),
('3236', 'Jevnaker', 'NO1', 'Akershus'),
('3205', 'Lillestrøm', 'NO1', 'Akershus'),
('3236', 'Lunner', 'NO1', 'Akershus'),
('3222', 'Lørenskog', 'NO1', 'Akershus'),
('3238', 'Nannestad', 'NO1', 'Akershus'),
('3234', 'Nes', 'NO1', 'Akershus'),
('3212', 'Nesodden', 'NO1', 'Akershus'),
('3224', 'Nittedal', 'NO1', 'Akershus'),
('3207', 'Nordre Follo', 'NO1', 'Akershus'),
('3228', 'Rælingen', 'NO1', 'Akershus'),
('3209', 'Ullensaker', 'NO1', 'Akershus'),
('3216', 'Vestby', 'NO1', 'Akershus'),
('3218', 'Ås', 'NO1', 'Akershus'),

-- Buskerud (mixed zones)
('3301', 'Drammen', 'NO1', 'Buskerud'),
('3334', 'Flesberg', 'NO1', 'Buskerud'),
('3320', 'Flå', 'NO1', 'Buskerud'),
('3324', 'Gol', 'NO1', 'Buskerud'),
('3326', 'Hemsedal', 'NO5', 'Buskerud'),
('3330', 'Hol', 'NO5', 'Buskerud'),
('3310', 'Hole', 'NO1', 'Buskerud'),
('3303', 'Kongsberg', 'NO1', 'Buskerud'),
('3318', 'Krødsherad', 'NO1', 'Buskerud'),
('3312', 'Lier', 'NO1', 'Buskerud'),
('3316', 'Modum', 'NO1', 'Buskerud'),
('3322', 'Nesbyen', 'NO1', 'Buskerud'),
('3338', 'Nore og Uvdal', 'NO1', 'Buskerud'),
('3305', 'Ringerike', 'NO1', 'Buskerud'),
('3336', 'Rollag', 'NO1', 'Buskerud'),
('3332', 'Sigdal', 'NO1', 'Buskerud'),
('3314', 'Øvre Eiker', 'NO1', 'Buskerud'),
('3328', 'Ål', 'NO5', 'Buskerud'),

-- Innlandet (mixed zones)
('3428', 'Alvdal', 'NO1', 'Innlandet'),
('3431', 'Dovre', 'NO3', 'Innlandet'),
('3416', 'Eidskog', 'NO1', 'Innlandet'),
('3420', 'Elverum', 'NO1', 'Innlandet'),
('3425', 'Engerdal', 'NO1', 'Innlandet'),
('3450', 'Etnedal', 'NO1', 'Innlandet'),
('3429', 'Folldal', 'NO3', 'Innlandet'),
('3441', 'Gausdal', 'NO1', 'Innlandet'),
('3407', 'Gjøvik', 'NO1', 'Innlandet'),
('3446', 'Gran', 'NO1', 'Innlandet'),
('3417', 'Grue', 'NO1', 'Innlandet'),
('3403', 'Hamar', 'NO1', 'Innlandet'),
('3401', 'Kongsvinger', 'NO1', 'Innlandet'),
('3432', 'Lesja', 'NO3', 'Innlandet'),
('3405', 'Lillehammer', 'NO1', 'Innlandet'),
('3434', 'Lom', 'NO3', 'Innlandet'),
('3412', 'Løten', 'NO1', 'Innlandet'),
('3451', 'Nord-Aurdal', 'NO1', 'Innlandet'),
('3436', 'Nord-Fron', 'NO1', 'Innlandet'),
('3414', 'Nord-Odal', 'NO1', 'Innlandet'),
('3448', 'Nordre Land', 'NO1', 'Innlandet'),
('3430', 'Os', 'NO3', 'Innlandet'),
('3424', 'Rendalen', 'NO1', 'Innlandet'),
('3439', 'Ringebu', 'NO1', 'Innlandet'),
('3411', 'Ringsaker', 'NO1', 'Innlandet'),
('3437', 'Sel', 'NO1', 'Innlandet'),
('3433', 'Skjåk', 'NO3', 'Innlandet'),
('3413', 'Stange', 'NO1', 'Innlandet'),
('3423', 'Stor-Elvdal', 'NO1', 'Innlandet'),
('3447', 'Søndre Land', 'NO1', 'Innlandet'),
('3449', 'Sør-Aurdal', 'NO1', 'Innlandet'),
('3438', 'Sør-Fron', 'NO1', 'Innlandet'),
('3415', 'Sør-Odal', 'NO1', 'Innlandet'),
('3426', 'Tolga', 'NO3', 'Innlandet'),
('3421', 'Trysil', 'NO1', 'Innlandet'),
('3427', 'Tynset', 'NO3', 'Innlandet'),
('3454', 'Vang', 'NO5', 'Innlandet'),
('3452', 'Vestre Slidre', 'NO5', 'Innlandet'),
('3443', 'Vestre Toten', 'NO1', 'Innlandet'),
('3419', 'Våler', 'NO1', 'Innlandet'),
('3435', 'Vågå', 'NO3', 'Innlandet'),
('3442', 'Østre Toten', 'NO1', 'Innlandet'),
('3440', 'Øyer', 'NO1', 'Innlandet'),
('3453', 'Øystre Slidre', 'NO5', 'Innlandet'),
('3422', 'Åmot', 'NO1', 'Innlandet'),
('3418', 'Åsnes', 'NO1', 'Innlandet'),

-- Vestfold (all NO1)
('3911', 'Færder', 'NO1', 'Vestfold'),
('3903', 'Holmestrand', 'NO1', 'Vestfold'),
('3901', 'Horten', 'NO1', 'Vestfold'),
('3909', 'Larvik', 'NO1', 'Vestfold'),
('3907', 'Sandefjord', 'NO1', 'Vestfold'),
('3905', 'Tønsberg', 'NO1', 'Vestfold'),

-- Østfold (all NO1)
('3124', 'Aremark', 'NO1', 'Østfold'),
('3107', 'Fredrikstad', 'NO1', 'Østfold'),
('3101', 'Halden', 'NO1', 'Østfold'),
('3110', 'Hvaler', 'NO1', 'Østfold'),
('3118', 'Indre Østfold', 'NO1', 'Østfold'),
('3122', 'Marker', 'NO1', 'Østfold'),
('3103', 'Moss', 'NO1', 'Østfold'),
('3120', 'Rakkestad', 'NO1', 'Østfold'),
('3112', 'Råde', 'NO1', 'Østfold'),
('3105', 'Sarpsborg', 'NO1', 'Østfold'),
('3116', 'Skiptvet', 'NO1', 'Østfold'),
('3114', 'Våler', 'NO1', 'Østfold'),

-- Agder (all NO2)
('4203', 'Arendal', 'NO2', 'Agder'),
('4216', 'Birkenes', 'NO2', 'Agder'),
('4220', 'Bygland', 'NO2', 'Agder'),
('4222', 'Bykle', 'NO2', 'Agder'),
('4219', 'Evje og Hornnes', 'NO2', 'Agder'),
('4206', 'Farsund', 'NO2', 'Agder'),
('4207', 'Flekkefjord', 'NO2', 'Agder'),
('4214', 'Froland', 'NO2', 'Agder'),
('4211', 'Gjerstad', 'NO2', 'Agder'),
('4202', 'Grimstad', 'NO2', 'Agder'),
('4226', 'Hægebostad', 'NO2', 'Agder'),
('4218', 'Iveland', 'NO2', 'Agder'),
('4204', 'Kristiansand', 'NO2', 'Agder'),
('4227', 'Kvinesdal', 'NO2', 'Agder'),
('4215', 'Lillesand', 'NO2', 'Agder'),
('4205', 'Lindesnes', 'NO2', 'Agder'),
('4225', 'Lyngdal', 'NO2', 'Agder'),
('4201', 'Risør', 'NO2', 'Agder'),
('4228', 'Sirdal', 'NO2', 'Agder'),
('4213', 'Tvedestrand', 'NO2', 'Agder'),
('4221', 'Valle', 'NO2', 'Agder'),
('4212', 'Vegårshei', 'NO2', 'Agder'),
('4223', 'Vennesla', 'NO2', 'Agder'),
('4217', 'Åmli', 'NO2', 'Agder'),
('4224', 'Åseral', 'NO2', 'Agder'),

-- Rogaland (all NO2)
('1114', 'Bjerkreim', 'NO2', 'Rogaland'),
('1145', 'Bokn', 'NO2', 'Rogaland'),
('1101', 'Eigersund', 'NO2', 'Rogaland'),
('1122', 'Gjesdal', 'NO2', 'Rogaland'),
('1106', 'Haugesund', 'NO2', 'Rogaland'),
('1133', 'Hjelmeland', 'NO2', 'Rogaland'),
('1119', 'Hå', 'NO2', 'Rogaland'),
('1149', 'Karmøy', 'NO2', 'Rogaland'),
('1120', 'Klepp', 'NO2', 'Rogaland'),
('1144', 'Kvitsøy', 'NO2', 'Rogaland'),
('1112', 'Lund', 'NO2', 'Rogaland'),
('1127', 'Randaberg', 'NO2', 'Rogaland'),
('1108', 'Sandnes', 'NO2', 'Rogaland'),
('1135', 'Sauda', 'NO2', 'Rogaland'),
('1111', 'Sokndal', 'NO2', 'Rogaland'),
('1124', 'Sola', 'NO2', 'Rogaland'),
('1103', 'Stavanger', 'NO2', 'Rogaland'),
('1130', 'Strand', 'NO2', 'Rogaland'),
('1134', 'Suldal', 'NO2', 'Rogaland'),
('1121', 'Time', 'NO2', 'Rogaland'),
('1146', 'Tysvær', 'NO2', 'Rogaland'),
('1151', 'Utsira', 'NO2', 'Rogaland'),
('1160', 'Vindafjord', 'NO2', 'Rogaland'),

-- Telemark (mostly NO2, one NO1)
('4012', 'Bamble', 'NO2', 'Telemark'),
('4016', 'Drangedal', 'NO2', 'Telemark'),
('4032', 'Fyresdal', 'NO2', 'Telemark'),
('4024', 'Hjartdal', 'NO2', 'Telemark'),
('4014', 'Kragerø', 'NO2', 'Telemark'),
('4028', 'Kviteseid', 'NO2', 'Telemark'),
('4020', 'Midt-Telemark', 'NO2', 'Telemark'),
('4030', 'Nissedal', 'NO2', 'Telemark'),
('4018', 'Nome', 'NO2', 'Telemark'),
('4005', 'Notodden', 'NO2', 'Telemark'),
('4001', 'Porsgrunn', 'NO2', 'Telemark'),
('4022', 'Seljord', 'NO2', 'Telemark'),
('4010', 'Siljan', 'NO2', 'Telemark'),
('4003', 'Skien', 'NO2', 'Telemark'),
('4026', 'Tinn', 'NO1', 'Telemark'),
('4034', 'Tokke', 'NO2', 'Telemark'),
('4036', 'Vinje', 'NO2', 'Telemark'),

-- Vestland (mostly NO5, some NO2/NO3)
('4631', 'Alver', 'NO5', 'Vestland'),
('4645', 'Askvoll', 'NO5', 'Vestland'),
('4627', 'Askøy', 'NO5', 'Vestland'),
('4641', 'Aurland', 'NO5', 'Vestland'),
('4625', 'Austevoll', 'NO5', 'Vestland'),
('4632', 'Austrheim', 'NO5', 'Vestland'),
('4601', 'Bergen', 'NO5', 'Vestland'),
('4624', 'Bjørnafjorden', 'NO5', 'Vestland'),
('4648', 'Bremanger', 'NO3', 'Vestland'),
('4613', 'Bømlo', 'NO5', 'Vestland'),
('4619', 'Eidfjord', 'NO5', 'Vestland'),
('4611', 'Etne', 'NO2', 'Vestland'),
('4633', 'Fedje', 'NO5', 'Vestland'),
('4615', 'Fitjar', 'NO5', 'Vestland'),
('4646', 'Fjaler', 'NO5', 'Vestland'),
('4650', 'Gloppen', 'NO3', 'Vestland'),
('4636', 'Gulen', 'NO5', 'Vestland'),
('4637', 'Hyllestad', 'NO5', 'Vestland'),
('4638', 'Høyanger', 'NO5', 'Vestland'),
('4602', 'Kinn', 'NO3', 'Vestland'),
('4623', 'Kvam', 'NO5', 'Vestland'),
('4617', 'Kvinnherad', 'NO5', 'Vestland'),
('4644', 'Luster', 'NO5', 'Vestland'),
('4642', 'Lærdal', 'NO5', 'Vestland'),
('4634', 'Masfjorden', 'NO5', 'Vestland'),
('4630', 'Modalen', 'NO5', 'Vestland'),
('4629', 'Osterøy', 'NO5', 'Vestland'),
('4626', 'Samnanger', 'NO5', 'Vestland'),
('4640', 'Sogndal', 'NO5', 'Vestland'),
('4635', 'Solund', 'NO5', 'Vestland'),
('4649', 'Stad', 'NO3', 'Vestland'),
('4614', 'Stord', 'NO5', 'Vestland'),
('4651', 'Stryn', 'NO3', 'Vestland'),
('4647', 'Sunnfjord', 'NO5', 'Vestland'),
('4612', 'Sveio', 'NO2', 'Vestland'),
('4616', 'Tysnes', 'NO5', 'Vestland'),
('4618', 'Ullensvang', 'NO5', 'Vestland'),
('4620', 'Ulvik', 'NO5', 'Vestland'),
('4622', 'Vaksdal', 'NO5', 'Vestland'),
('4639', 'Vik', 'NO5', 'Vestland'),
('4621', 'Voss', 'NO5', 'Vestland'),
('4628', 'Øygarden', 'NO5', 'Vestland'),
('4643', 'Årdal', 'NO5', 'Vestland'),

-- Møre og Romsdal (all NO3)
('1547', 'Aukra', 'NO3', 'Møre og Romsdal'),
('1576', 'Aure', 'NO3', 'Møre og Romsdal'),
('1554', 'Averøy', 'NO3', 'Møre og Romsdal'),
('1578', 'Fjord', 'NO3', 'Møre og Romsdal'),
('1532', 'Giske', 'NO3', 'Møre og Romsdal'),
('1557', 'Gjemnes', 'NO3', 'Møre og Romsdal'),
('1580', 'Haram', 'NO3', 'Møre og Romsdal'),
('1517', 'Hareid', 'NO3', 'Møre og Romsdal'),
('1515', 'Herøy', 'NO3', 'Møre og Romsdal'),
('1579', 'Hustadvika', 'NO3', 'Møre og Romsdal'),
('1505', 'Kristiansund', 'NO3', 'Møre og Romsdal'),
('1506', 'Molde', 'NO3', 'Møre og Romsdal'),
('1539', 'Rauma', 'NO3', 'Møre og Romsdal'),
('1514', 'Sande', 'NO3', 'Møre og Romsdal'),
('1573', 'Smøla', 'NO3', 'Møre og Romsdal'),
('1525', 'Stranda', 'NO3', 'Møre og Romsdal'),
('1531', 'Sula', 'NO3', 'Møre og Romsdal'),
('1563', 'Sunndal', 'NO3', 'Møre og Romsdal'),
('1566', 'Surnadal', 'NO3', 'Møre og Romsdal'),
('1528', 'Sykkylven', 'NO3', 'Møre og Romsdal'),
('1560', 'Tingvoll', 'NO3', 'Møre og Romsdal'),
('1516', 'Ulstein', 'NO3', 'Møre og Romsdal'),
('1511', 'Vanylven', 'NO3', 'Møre og Romsdal'),
('1535', 'Vestnes', 'NO3', 'Møre og Romsdal'),
('1577', 'Volda', 'NO3', 'Møre og Romsdal'),
('1520', 'Ørsta', 'NO3', 'Møre og Romsdal'),
('1508', 'Ålesund', 'NO3', 'Møre og Romsdal'),

-- Trøndelag (mostly NO3, northern parts NO4)
('5049', 'Flatanger', 'NO3', 'Trøndelag'),
('5036', 'Frosta', 'NO3', 'Trøndelag'),
('5014', 'Frøya', 'NO3', 'Trøndelag'),
('5045', 'Grong', 'NO4', 'Trøndelag'),
('5055', 'Heim', 'NO3', 'Trøndelag'),
('5056', 'Hitra', 'NO3', 'Trøndelag'),
('5026', 'Holtålen', 'NO3', 'Trøndelag'),
('5046', 'Hoylandet', 'NO4', 'Trøndelag'),
('5053', 'Inderøy', 'NO3', 'Trøndelag'),
('5054', 'Indre Fosen', 'NO3', 'Trøndelag'),
('5052', 'Leka', 'NO4', 'Trøndelag'),
('5037', 'Levanger', 'NO3', 'Trøndelag'),
('5042', 'Lierne', 'NO4', 'Trøndelag'),
('5031', 'Malvik', 'NO3', 'Trøndelag'),
('5028', 'Melhus', 'NO3', 'Trøndelag'),
('5034', 'Meråker', 'NO3', 'Trøndelag'),
('5027', 'Midtre Gauldal', 'NO3', 'Trøndelag'),
('5007', 'Namsos', 'NO4', 'Trøndelag'),
('5044', 'Namsskogan', 'NO4', 'Trøndelag'),
('5060', 'Nærøysund', 'NO4', 'Trøndelag'),
('5021', 'Oppdal', 'NO3', 'Trøndelag'),
('5059', 'Orkland', 'NO3', 'Trøndelag'),
('5020', 'Osen', 'NO3', 'Trøndelag'),
('5047', 'Overhalla', 'NO4', 'Trøndelag'),
('5022', 'Rennebu', 'NO3', 'Trøndelag'),
('5061', 'Rindal', 'NO3', 'Trøndelag'),
('5025', 'Røros', 'NO3', 'Trøndelag'),
('5043', 'Røyrvik', 'NO4', 'Trøndelag'),
('5032', 'Selbu', 'NO3', 'Trøndelag'),
('5029', 'Skaun', 'NO3', 'Trøndelag'),
('5041', 'Snåsa - Snåase', 'NO4', 'Trøndelag'),
('5006', 'Steinkjer', 'NO3', 'Trøndelag'),
('5035', 'Stjørdal', 'NO3', 'Trøndelag'),
('5001', 'Trondheim', 'NO3', 'Trøndelag'),
('5033', 'Tydal', 'NO3', 'Trøndelag'),
('5038', 'Verdal', 'NO3', 'Trøndelag'),
('5057', 'Ørland', 'NO3', 'Trøndelag'),
('5058', 'Åfjord', 'NO3', 'Trøndelag'),

-- Nordland (all NO4)
('1820', 'Alstahaug', 'NO4', 'Nordland'),
('1871', 'Andøy', 'NO4', 'Nordland'),
('1839', 'Beiarn', 'NO4', 'Nordland'),
('1811', 'Bindal', 'NO4', 'Nordland'),
('1804', 'Bodø', 'NO4', 'Nordland'),
('1813', 'Brønnøy', 'NO4', 'Nordland'),
('1867', 'Bø', 'NO4', 'Nordland'),
('1827', 'Dønna', 'NO4', 'Nordland'),
('1853', 'Evenes', 'NO4', 'Nordland'),
('1841', 'Fauske', 'NO4', 'Nordland'),
('1859', 'Flakstad', 'NO4', 'Nordland'),
('1838', 'Gildeskål', 'NO4', 'Nordland'),
('1825', 'Grane', 'NO4', 'Nordland'),
('1866', 'Hadsel', 'NO4', 'Nordland'),
('1875', 'Hamarøy', 'NO4', 'Nordland'),
('1826', 'Hattfjelldal', 'NO4', 'Nordland'),
('1832', 'Hemnes', 'NO4', 'Nordland'),
('1818', 'Herøy', 'NO4', 'Nordland'),
('1822', 'Leirfjord', 'NO4', 'Nordland'),
('1834', 'Lurøy', 'NO4', 'Nordland'),
('1851', 'Lødingen', 'NO4', 'Nordland'),
('1837', 'Meløy', 'NO4', 'Nordland'),
('1874', 'Moskenes', 'NO4', 'Nordland'),
('1806', 'Narvik', 'NO4', 'Nordland'),
('1828', 'Nesna', 'NO4', 'Nordland'),
('1833', 'Rana', 'NO4', 'Nordland'),
('1835', 'Rødøy', 'NO4', 'Nordland'),
('1856', 'Røst', 'NO4', 'Nordland'),
('1840', 'Saltdal', 'NO4', 'Nordland'),
('1870', 'Sortland', 'NO4', 'Nordland'),
('1848', 'Steigen', 'NO4', 'Nordland'),
('1812', 'Sømna', 'NO4', 'Nordland'),
('1845', 'Sørfold', 'NO4', 'Nordland'),
('1836', 'Træna', 'NO4', 'Nordland'),
('1824', 'Vefsn', 'NO4', 'Nordland'),
('1815', 'Vega', 'NO4', 'Nordland'),
('1860', 'Vestvågøy', 'NO4', 'Nordland'),
('1816', 'Vevelstad', 'NO4', 'Nordland'),
('1865', 'Vågan', 'NO4', 'Nordland'),
('1857', 'Værøy', 'NO4', 'Nordland'),
('1868', 'Øksnes', 'NO4', 'Nordland'),

-- Troms (all NO4)
('5532', 'Balsfjord', 'NO4', 'Troms'),
('5520', 'Bardu', 'NO4', 'Troms'),
('5528', 'Dyrøy', 'NO4', 'Troms'),
('5516', 'Gratangen', 'NO4', 'Troms'),
('5503', 'Harstad', 'NO4', 'Troms'),
('5514', 'Ibestad', 'NO4', 'Troms'),
('5534', 'Karlsøy', 'NO4', 'Troms'),
('5510', 'Kvæfjord', 'NO4', 'Troms'),
('5540', 'Kåfjord - Gáivuotna - Kaivuono', 'NO4', 'Troms'),
('5518', 'Lavangen - Loabák', 'NO4', 'Troms'),
('5536', 'Lyngen', 'NO4', 'Troms'),
('5524', 'Målselv', 'NO4', 'Troms'),
('5522', 'Salangen', 'NO4', 'Troms'),
('5530', 'Senja', 'NO4', 'Troms'),
('5542', 'Skjervøy', 'NO4', 'Troms'),
('5538', 'Storfjord - Omasvuotna - Omasvuono', 'NO4', 'Troms'),
('5526', 'Sørreisa', 'NO4', 'Troms'),
('5512', 'Tjeldsund - Dielddanuorri', 'NO4', 'Troms'),
('5501', 'Tromsø', 'NO4', 'Troms'),

-- Finnmark (all NO4)
('5601', 'Alta', 'NO4', 'Finnmark'),
('5628', 'Berlevåg', 'NO4', 'Finnmark'),
('5626', 'Båtsfjord', 'NO4', 'Finnmark'),
('5624', 'Gamvik', 'NO4', 'Finnmark'),
('5603', 'Hammerfest', 'NO4', 'Finnmark'),
('5618', 'Hasvik', 'NO4', 'Finnmark'),
('5612', 'Karasjok - Kárášjohka', 'NO4', 'Finnmark'),
('5610', 'Kautokeino - Guovdageaidnu', 'NO4', 'Finnmark'),
('5622', 'Lebesby', 'NO4', 'Finnmark'),
('5616', 'Loppa', 'NO4', 'Finnmark'),
('5620', 'Måsøy', 'NO4', 'Finnmark'),
('5632', 'Nesseby - Unjárga', 'NO4', 'Finnmark'),
('5630', 'Nordkapp', 'NO4', 'Finnmark'),
('5614', 'Porsanger - Porsáŋgu - Porsanki', 'NO4', 'Finnmark'),
('5605', 'Sør-Varanger', 'NO4', 'Finnmark'),
('5634', 'Tana - Deatnu', 'NO4', 'Finnmark'),
('5607', 'Vadsø', 'NO4', 'Finnmark'),
('5636', 'Vardø', 'NO4', 'Finnmark')

ON CONFLICT (kommune_number) DO UPDATE SET
    kommune_name = EXCLUDED.kommune_name,
    price_zone = EXCLUDED.price_zone,
    fylke_name = EXCLUDED.fylke_name,
    updated_at = NOW();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify data was inserted correctly
SELECT
    'Total municipalities inserted' as description,
    COUNT(*) as count
FROM municipality_price_zones;

-- Check zone distribution
SELECT
    price_zone,
    COUNT(*) as municipality_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM municipality_price_zones), 1) as percentage
FROM municipality_price_zones
GROUP BY price_zone
ORDER BY price_zone;

-- Test the lookup function
SELECT
    'Test zone lookup for Oslo' as description,
    get_price_zone('301') as zone_result;

SELECT
    'Test zone lookup for Bergen' as description,
    get_price_zone('4601') as zone_result;

-- ============================================
-- COMMENTS AND NOTES
-- ============================================

COMMENT ON TABLE municipality_price_zones IS 'Maps Norwegian municipalities to electricity price zones (NO1-NO5) for regional pricing calculations';
COMMENT ON COLUMN municipality_price_zones.kommune_number IS 'Official Norwegian municipality number from Kartverket';
COMMENT ON COLUMN municipality_price_zones.price_zone IS 'Norwegian electricity price zone (NO1=Eastern, NO2=Southern, NO3=Central, NO4=Northern, NO5=Western)';
COMMENT ON FUNCTION get_price_zone(TEXT) IS 'Returns price zone for municipality number with NO1 fallback for unknown municipalities';