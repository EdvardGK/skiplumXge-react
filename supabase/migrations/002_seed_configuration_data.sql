-- Seed Configuration Data for Skiplum Energy Analysis
-- All hardcoded values from the application

-- Insert calculation values
INSERT INTO calculations (name, value, unit, category, description, min_value, max_value) VALUES
  -- BRA Adjustments
  ('bra_adjustment', 8, '%', 'area', 'Reduction from BRA to heated BRA', 0, 20),

  -- Investment calculations
  ('investment_multiplier', 7, 'x', 'investment', 'Annual waste multiplied by this for investment room', 5, 10),
  ('heating_investment_percentage', 70, '%', 'investment', 'Percentage of investment for heating', 50, 80),
  ('lighting_investment_percentage', 15, '%', 'investment', 'Percentage of investment for lighting', 10, 25),
  ('other_investment_percentage', 15, '%', 'investment', 'Percentage of investment for other', 10, 25),

  -- Energy prices and factors
  ('base_electricity_price', 2.80, 'kr/kWh', 'energy', 'Base electricity price 2024', 1.00, 5.00),
  ('grid_rent', 0.50, 'kr/kWh', 'energy', 'Grid rental cost', 0.30, 1.00),

  -- Analysis thresholds
  ('good_tek17_threshold', 90, '%', 'analysis', 'Below this % of TEK17 is good', 80, 95),
  ('warning_tek17_threshold', 110, '%', 'analysis', 'Above this % of TEK17 is warning', 100, 120),

  -- Conversion factors
  ('kwh_to_co2', 0.185, 'kg/kWh', 'conversion', 'CO2 emissions per kWh', 0.1, 0.3),

  -- Default values for missing data
  ('default_floors', 2, 'floors', 'defaults', 'Default number of floors if not specified', 1, 10),
  ('default_build_year', 1990, 'year', 'defaults', 'Default build year if not specified', 1900, 2024),

  -- Performance metrics
  ('target_conversion_rate', 35, '%', 'metrics', 'Target conversion rate for landing page', 30, 50),
  ('analysis_time_minutes', 2, 'minutes', 'metrics', 'Average time for analysis', 1, 5)
ON CONFLICT (name) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Insert TEK17 requirements
INSERT INTO tek17_requirements (building_type, max_energy_kwh_m2, description) VALUES
  ('Småhus', 100, 'Eneboliger og rekkehus'),
  ('Leilighetsblokk', 95, 'Boligblokker'),
  ('Barnehage', 135, 'Barnehager'),
  ('Kontorbygning', 115, 'Kontorer og administrasjonsbygg'),
  ('Skolebygg', 110, 'Grunnskoler og videregående skoler'),
  ('Universitet', 125, 'Høyskoler og universiteter'),
  ('Sykehus', 225, 'Sykehus og helseinstitusjoner'),
  ('Sykehjem', 195, 'Sykehjem og omsorgsboliger'),
  ('Hotellbygg', 170, 'Hoteller og overnattingssteder'),
  ('Idrettsbygg', 145, 'Idrettshaller'),
  ('Forretningsbygg', 180, 'Butikker og kjøpesentre'),
  ('Kulturbygg', 130, 'Kulturbygg og forsamlingslokaler'),
  ('Lett industri/verksted', 140, 'Verksteder og lett industri')
ON CONFLICT (building_type) DO UPDATE SET
  max_energy_kwh_m2 = EXCLUDED.max_energy_kwh_m2,
  updated_at = NOW();

-- Insert feature flags
INSERT INTO feature_flags (feature_name, enabled, rollout_percentage, description) VALUES
  ('pdf_export', false, 0, 'PDF report generation - currently broken'),
  ('excel_export', false, 0, 'Excel export functionality'),
  ('email_capture', true, 100, 'Email lead capture modal'),
  ('share_functionality', false, 0, 'Share analysis results'),
  ('map_visualization', true, 100, 'Show building footprint on map'),
  ('investment_breakdown', true, 100, 'Show detailed investment recommendations'),
  ('climate_data', false, 0, 'Integration with Frost API for climate data'),
  ('consultation_booking', false, 0, 'Book consultation directly from app'),
  ('multi_building_support', true, 100, 'Support for properties with multiple buildings'),
  ('demo_mode', false, 0, 'Show demo data for testing')
ON CONFLICT (feature_name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percentage = EXCLUDED.rollout_percentage,
  updated_at = NOW();

-- Insert formulas
INSERT INTO formulas (name, formula, variables, description, category) VALUES
  ('heated_bra', 'bra * (1 - bra_adjustment/100)', ARRAY['bra', 'bra_adjustment'], 'Calculate heated BRA from total BRA', 'area'),
  ('annual_energy', 'heated_bra * energy_per_m2', ARRAY['heated_bra', 'energy_per_m2'], 'Total annual energy consumption', 'energy'),
  ('annual_cost', 'annual_energy * total_price_per_kwh', ARRAY['annual_energy', 'total_price_per_kwh'], 'Total annual energy cost', 'cost'),
  ('tek17_percentage', '(actual_energy / tek17_requirement) * 100', ARRAY['actual_energy', 'tek17_requirement'], 'Percentage of TEK17 requirement', 'compliance'),
  ('annual_waste', 'annual_energy - (heated_bra * tek17_requirement)', ARRAY['annual_energy', 'heated_bra', 'tek17_requirement'], 'Energy waste above TEK17', 'waste'),
  ('waste_cost', 'annual_waste * total_price_per_kwh', ARRAY['annual_waste', 'total_price_per_kwh'], 'Cost of energy waste', 'cost'),
  ('investment_room', 'waste_cost * investment_multiplier', ARRAY['waste_cost', 'investment_multiplier'], 'Conservative investment room', 'investment'),
  ('heating_investment', 'investment_room * (heating_investment_percentage/100)', ARRAY['investment_room', 'heating_investment_percentage'], 'Investment for heating improvements', 'investment'),
  ('lighting_investment', 'investment_room * (lighting_investment_percentage/100)', ARRAY['investment_room', 'lighting_investment_percentage'], 'Investment for lighting improvements', 'investment'),
  ('other_investment', 'investment_room * (other_investment_percentage/100)', ARRAY['investment_room', 'other_investment_percentage'], 'Investment for other improvements', 'investment')
ON CONFLICT (name) DO UPDATE SET
  formula = EXCLUDED.formula,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert key UI content (Norwegian)
INSERT INTO content (key, norwegian_text, english_text, category, context) VALUES
  -- Landing page
  ('landing.title', 'Spar tusenvis på energikostnadene', 'Save thousands on energy costs', 'landing', 'Main headline'),
  ('landing.subtitle', 'Oppdag besparingsmuligheter og TEK17-etterlevelse på minutter', 'Discover savings and TEK17 compliance in minutes', 'landing', 'Subtitle'),
  ('landing.cta.primary', 'Start analyse', 'Start analysis', 'landing', 'Primary CTA button'),
  ('landing.search.placeholder', 'F.eks. ''Karl Johans gate 1, Oslo'' eller ''Storgata 10, Bergen''', 'E.g. ''Karl Johans gate 1, Oslo''', 'landing', 'Search field placeholder'),
  ('landing.search.title', 'Start din energianalyse', 'Start your energy analysis', 'landing', 'Search section title'),

  -- Dashboard
  ('dashboard.title', 'Energianalyse', 'Energy Analysis', 'dashboard', 'Page title'),
  ('dashboard.investment.title', 'Investeringsrom', 'Investment Room', 'dashboard', 'Investment card title'),
  ('dashboard.waste.title', 'Årlig sløsing', 'Annual Waste', 'dashboard', 'Waste card title'),
  ('dashboard.tek17.title', 'TEK17 Status', 'TEK17 Status', 'dashboard', 'Compliance card title'),
  ('dashboard.energy.title', 'Energikarakter', 'Energy Grade', 'dashboard', 'Energy grade card'),

  -- Building form
  ('form.title', 'Bygningsinformasjon', 'Building Information', 'form', 'Form title'),
  ('form.bra.label', 'Bruttoareal (BRA) m²', 'Gross Floor Area (BRA) m²', 'form', 'BRA input label'),
  ('form.type.label', 'Bygningstype', 'Building Type', 'form', 'Building type select'),
  ('form.year.label', 'Byggeår', 'Build Year', 'form', 'Build year input'),
  ('form.floors.label', 'Antall etasjer', 'Number of Floors', 'form', 'Floors input'),
  ('form.submit', 'Analyser bygning', 'Analyze Building', 'form', 'Submit button'),

  -- Report
  ('report.generate', 'Last ned rapport', 'Download Report', 'report', 'Download button'),
  ('report.title', 'Energianalyse rapport', 'Energy Analysis Report', 'report', 'Report title'),

  -- Errors
  ('error.search', 'Kunne ikke søke etter adresser', 'Could not search for addresses', 'error', 'Search error'),
  ('error.building', 'Kunne ikke hente bygningsdata', 'Could not fetch building data', 'error', 'Building data error'),
  ('error.calculation', 'Kunne ikke beregne energianalyse', 'Could not calculate energy analysis', 'error', 'Calculation error'),

  -- Success messages
  ('success.email', 'E-post sendt! Vi kontakter deg snart.', 'Email sent! We will contact you soon.', 'success', 'Email success'),
  ('success.report', 'Rapport generert', 'Report generated', 'success', 'Report success')
ON CONFLICT (key) DO UPDATE SET
  norwegian_text = EXCLUDED.norwegian_text,
  english_text = EXCLUDED.english_text,
  updated_at = NOW();