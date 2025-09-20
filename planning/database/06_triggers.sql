-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 06_triggers.sql
-- Purpose: Database triggers for automation
-- ============================================

-- ============================================
-- TIMESTAMP UPDATE TRIGGER
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to energy_certificates table
DROP TRIGGER IF EXISTS update_energy_certificates_updated_at ON energy_certificates;
CREATE TRIGGER update_energy_certificates_updated_at
    BEFORE UPDATE ON energy_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATA NORMALIZATION TRIGGERS
-- ============================================

-- Normalize address data on insert/update
CREATE OR REPLACE FUNCTION normalize_address_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Trim whitespace
    NEW.address := TRIM(NEW.address);
    NEW.postal_code := TRIM(NEW.postal_code);
    NEW.city := TRIM(NEW.city);

    -- Ensure postal code is 4 digits
    IF LENGTH(NEW.postal_code) != 4 THEN
        RAISE EXCEPTION 'Postal code must be 4 digits: %', NEW.postal_code;
    END IF;

    -- Capitalize city name properly (Norwegian style)
    NEW.city := INITCAP(NEW.city);

    -- Normalize energy class to uppercase
    IF NEW.energy_class IS NOT NULL THEN
        NEW.energy_class := UPPER(NEW.energy_class);
    END IF;

    -- Normalize heating class
    IF NEW.heating_class IS NOT NULL THEN
        NEW.heating_class := INITCAP(NEW.heating_class);
    END IF;

    -- Validate energy consumption range
    IF NEW.energy_consumption IS NOT NULL THEN
        IF NEW.energy_consumption < 0 OR NEW.energy_consumption > 1000 THEN
            RAISE WARNING 'Unusual energy consumption value: %', NEW.energy_consumption;
        END IF;
    END IF;

    -- Validate fossil percentage (0-1 range)
    IF NEW.fossil_percentage IS NOT NULL THEN
        IF NEW.fossil_percentage < 0 OR NEW.fossil_percentage > 1 THEN
            -- Try to fix common error (percentage as 0-100 instead of 0-1)
            IF NEW.fossil_percentage <= 100 THEN
                NEW.fossil_percentage := NEW.fossil_percentage / 100;
            ELSE
                RAISE EXCEPTION 'Invalid fossil percentage: %', NEW.fossil_percentage;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply normalization trigger
DROP TRIGGER IF EXISTS normalize_energy_certificates ON energy_certificates;
CREATE TRIGGER normalize_energy_certificates
    BEFORE INSERT OR UPDATE ON energy_certificates
    FOR EACH ROW
    EXECUTE FUNCTION normalize_address_data();

-- ============================================
-- SEARCH TRACKING TRIGGERS
-- ============================================

-- Auto-track search results
CREATE OR REPLACE FUNCTION track_search_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Set results count if not provided
    IF NEW.results_count IS NULL THEN
        NEW.results_count := 0;
    END IF;

    -- Normalize search query
    NEW.search_query := TRIM(NEW.search_query);

    -- Extract postal code from selected address if not provided
    IF NEW.postal_code IS NULL AND NEW.selected_address IS NOT NULL THEN
        -- Try to extract 4-digit postal code from address
        NEW.postal_code := (
            SELECT (regexp_matches(NEW.selected_address, '\m\d{4}\M'))[1]
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply search tracking trigger
DROP TRIGGER IF EXISTS track_user_search ON user_searches;
CREATE TRIGGER track_user_search
    BEFORE INSERT ON user_searches
    FOR EACH ROW
    EXECUTE FUNCTION track_search_result();

-- ============================================
-- ANALYSIS VALIDATION TRIGGERS
-- ============================================

-- Validate and calculate analysis results
CREATE OR REPLACE FUNCTION validate_analysis_results()
RETURNS TRIGGER AS $$
DECLARE
    electricity_price CONSTANT FLOAT := 2.80;  -- NOK per kWh
BEGIN
    -- Ensure required fields
    IF NEW.total_bra IS NULL OR NEW.total_bra <= 0 THEN
        RAISE EXCEPTION 'Invalid total BRA: %', NEW.total_bra;
    END IF;

    -- Calculate TEK17 requirement if not provided
    IF NEW.tek17_requirement IS NULL THEN
        NEW.tek17_requirement := calculate_tek17_requirement(NEW.building_type, NEW.total_bra);
    END IF;

    -- Calculate consumption metrics
    IF NEW.current_consumption IS NOT NULL THEN
        -- Annual consumption in kWh
        NEW.annual_consumption_kwh := NEW.current_consumption * NEW.total_bra;

        -- Annual cost in NOK
        NEW.annual_cost_kr := NEW.annual_consumption_kwh * electricity_price;

        -- Calculate waste if above TEK17
        IF NEW.current_consumption > NEW.tek17_requirement THEN
            NEW.annual_waste_kr := (NEW.current_consumption - NEW.tek17_requirement) *
                                   NEW.total_bra * electricity_price;
        ELSE
            NEW.annual_waste_kr := 0;
        END IF;

        -- Investment room (7x multiplier)
        NEW.investment_room_kr := NEW.annual_waste_kr * 7;

        -- SINTEF breakdown (70/15/15)
        NEW.heating_investment := NEW.investment_room_kr * 0.70;
        NEW.lighting_investment := NEW.investment_room_kr * 0.15;
        NEW.other_investment := NEW.investment_room_kr * 0.15;

        -- Calculate potential savings
        NEW.potential_savings_kr := NEW.annual_waste_kr * 0.7;  -- Assume 70% achievable

        -- Simple payback calculation
        IF NEW.annual_waste_kr > 0 THEN
            NEW.payback_years := NEW.investment_room_kr / NEW.annual_waste_kr;
        END IF;

        -- Estimate CO2 reduction (Norwegian grid: ~16g CO2/kWh)
        IF NEW.annual_waste_kr > 0 THEN
            NEW.co2_reduction_kg := (NEW.annual_waste_kr / electricity_price) * 0.016;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply analysis validation trigger
DROP TRIGGER IF EXISTS validate_analysis ON analysis_results;
CREATE TRIGGER validate_analysis
    BEFORE INSERT OR UPDATE ON analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION validate_analysis_results();

-- ============================================
-- CONVERSION TRACKING TRIGGERS
-- ============================================

-- Enhanced conversion tracking
CREATE OR REPLACE FUNCTION enhance_conversion_tracking()
RETURNS TRIGGER AS $$
DECLARE
    latest_analysis_id UUID;
BEGIN
    -- Link to latest analysis if not provided
    IF NEW.analysis_id IS NULL THEN
        SELECT id INTO latest_analysis_id
        FROM analysis_results
        WHERE session_id = NEW.session_id
        ORDER BY created_at DESC
        LIMIT 1;

        NEW.analysis_id := latest_analysis_id;
    END IF;

    -- Set address from analysis if not provided
    IF NEW.address IS NULL AND NEW.analysis_id IS NOT NULL THEN
        SELECT address INTO NEW.address
        FROM analysis_results
        WHERE id = NEW.analysis_id;
    END IF;

    -- Parse UTM parameters from metadata if present
    IF NEW.metadata ? 'utm_params' THEN
        NEW.utm_source := NEW.metadata->>'utm_source';
        NEW.utm_medium := NEW.metadata->>'utm_medium';
        NEW.utm_campaign := NEW.metadata->>'utm_campaign';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply conversion tracking trigger
DROP TRIGGER IF EXISTS enhance_conversion ON conversion_events;
CREATE TRIGGER enhance_conversion
    BEFORE INSERT ON conversion_events
    FOR EACH ROW
    EXECUTE FUNCTION enhance_conversion_tracking();

-- ============================================
-- AUDIT TRIGGERS (Optional)
-- ============================================

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id TEXT,
    row_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables (optional - enable as needed)
-- CREATE TRIGGER audit_energy_certificates
--     AFTER INSERT OR UPDATE OR DELETE ON energy_certificates
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CREATE TRIGGER audit_analysis_results
--     AFTER INSERT OR UPDATE OR DELETE ON analysis_results
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- CREATE TRIGGER audit_conversion_events
--     AFTER INSERT OR UPDATE OR DELETE ON conversion_events
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();