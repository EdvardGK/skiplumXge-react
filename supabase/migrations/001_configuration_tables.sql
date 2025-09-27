-- Configuration Tables for Skiplum Energy Analysis
-- These tables store all configurable values, formulas, and content

-- 1. Calculations table for numeric configurations
CREATE TABLE IF NOT EXISTS calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  value DECIMAL NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  description TEXT,
  min_value DECIMAL,
  max_value DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Content table for UI strings and templates
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  norwegian_text TEXT NOT NULL,
  english_text TEXT,
  category TEXT NOT NULL,
  context TEXT, -- Where it's used in the app
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Feature flags for controlling app features
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Formulas table for configurable calculation logic
CREATE TABLE IF NOT EXISTS formulas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  formula TEXT NOT NULL, -- e.g., "bra * (1 - bra_adjustment/100)"
  variables TEXT[], -- List of variable names used
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEK17 requirements by building type
CREATE TABLE IF NOT EXISTS tek17_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_type TEXT NOT NULL UNIQUE,
  max_energy_kwh_m2 DECIMAL NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'TEK17 § 14-2',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_calculations_category ON calculations(category);
CREATE INDEX idx_calculations_name ON calculations(name);
CREATE INDEX idx_content_category ON content(category);
CREATE INDEX idx_content_key ON content(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX idx_formulas_category ON formulas(category);

-- Enable Row Level Security
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tek17_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies for read access (anyone can read)
CREATE POLICY "Enable read access for all" ON calculations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON content FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON formulas FOR SELECT USING (true);
CREATE POLICY "Enable read access for all" ON tek17_requirements FOR SELECT USING (true);

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calculations_updated_at
  BEFORE UPDATE ON calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_formulas_updated_at
  BEFORE UPDATE ON formulas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tek17_requirements_updated_at
  BEFORE UPDATE ON tek17_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();