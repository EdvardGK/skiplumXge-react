-- Safe Supabase Schema Update Script
-- This script checks existing schema and only creates/modifies what's needed
-- Safe to run multiple times (idempotent)

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
DO $$
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            company_name TEXT,
            phone TEXT,
            role TEXT CHECK (role IN ('user', 'admin', 'analyst')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Public profiles are viewable by everyone"
            ON public.profiles FOR SELECT
            USING (true);

        CREATE POLICY "Users can insert their own profile"
            ON public.profiles FOR INSERT
            WITH CHECK (auth.uid() = id);

        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE
            USING (auth.uid() = id);
    ELSE
        -- Add missing columns if table exists
        ALTER TABLE public.profiles
            ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'admin', 'analyst'));
    END IF;
END $$;

-- ============================================
-- 2. PROPERTIES TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'properties') THEN
        CREATE TABLE public.properties (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

            -- Address data from Kartverket
            address_text TEXT NOT NULL,
            street_name TEXT,
            house_number TEXT,
            postal_code TEXT,
            city TEXT,
            municipality TEXT,
            county TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            matrikkel_number TEXT,

            -- Building data
            building_type TEXT NOT NULL,
            building_year INTEGER,
            total_bra DECIMAL(10, 2) NOT NULL,
            floors INTEGER,
            units INTEGER DEFAULT 1,

            -- Energy data
            energy_grade TEXT,
            current_heating_system TEXT,
            annual_energy_consumption DECIMAL(10, 2),

            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create indexes
        CREATE INDEX idx_properties_user_id ON public.properties(user_id);
        CREATE INDEX idx_properties_address ON public.properties(address_text);
        CREATE INDEX idx_properties_matrikkel ON public.properties(matrikkel_number);

        -- Enable RLS
        ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view own properties"
            ON public.properties FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own properties"
            ON public.properties FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own properties"
            ON public.properties FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own properties"
            ON public.properties FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 3. ENERGY ANALYSES TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'energy_analyses') THEN
        CREATE TABLE public.energy_analyses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,

            -- TEK17 Compliance
            tek17_requirement DECIMAL(10, 2),
            current_consumption DECIMAL(10, 2),
            is_compliant BOOLEAN,
            compliance_margin DECIMAL(10, 2),

            -- Energy waste calculation
            energy_waste_kwh DECIMAL(10, 2),
            energy_waste_nok DECIMAL(10, 2),
            electricity_price DECIMAL(6, 2),

            -- Investment analysis
            total_investment_potential DECIMAL(12, 2),
            investment_multiplier DECIMAL(4, 2) DEFAULT 7.0,

            -- System-specific recommendations
            heating_investment DECIMAL(12, 2),
            heating_percentage DECIMAL(5, 2) DEFAULT 70.0,
            heating_recommendations JSONB,

            lighting_investment DECIMAL(12, 2),
            lighting_percentage DECIMAL(5, 2) DEFAULT 15.0,
            lighting_recommendations JSONB,

            other_investment DECIMAL(12, 2),
            other_percentage DECIMAL(5, 2) DEFAULT 15.0,
            other_recommendations JSONB,

            -- ROI Calculations
            estimated_annual_savings DECIMAL(12, 2),
            payback_period_years DECIMAL(5, 2),
            ten_year_roi DECIMAL(12, 2),

            -- Metadata
            analysis_version TEXT DEFAULT '1.0',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create indexes
        CREATE INDEX idx_analyses_property ON public.energy_analyses(property_id);
        CREATE INDEX idx_analyses_created ON public.energy_analyses(created_at DESC);

        -- Enable RLS
        ALTER TABLE public.energy_analyses ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view analyses for own properties"
            ON public.energy_analyses FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.properties
                    WHERE properties.id = energy_analyses.property_id
                    AND properties.user_id = auth.uid()
                )
            );

        CREATE POLICY "Users can create analyses for own properties"
            ON public.energy_analyses FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.properties
                    WHERE properties.id = property_id
                    AND properties.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- ============================================
-- 4. REPORTS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'reports') THEN
        CREATE TABLE public.reports (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            analysis_id UUID REFERENCES public.energy_analyses(id) ON DELETE CASCADE NOT NULL,

            report_type TEXT NOT NULL CHECK (report_type IN ('summary', 'detailed', 'investment', 'compliance')),
            file_url TEXT,
            file_size INTEGER,

            metadata JSONB,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create indexes
        CREATE INDEX idx_reports_analysis ON public.reports(analysis_id);
        CREATE INDEX idx_reports_type ON public.reports(report_type);

        -- Enable RLS
        ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view reports for own analyses"
            ON public.reports FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.energy_analyses ea
                    JOIN public.properties p ON ea.property_id = p.id
                    WHERE ea.id = reports.analysis_id
                    AND p.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- ============================================
-- 5. LEADS TABLE (for conversion tracking)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'leads') THEN
        CREATE TABLE public.leads (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

            -- Contact info
            email TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            company_name TEXT,

            -- Lead source
            source TEXT CHECK (source IN ('landing', 'dashboard', 'report', 'direct')),
            campaign TEXT,

            -- Lead data
            property_address TEXT,
            building_type TEXT,
            total_bra DECIMAL(10, 2),
            investment_potential DECIMAL(12, 2),

            -- Status tracking
            status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
            assigned_to TEXT,
            notes TEXT,

            -- Timestamps
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            contacted_at TIMESTAMP WITH TIME ZONE,
            converted_at TIMESTAMP WITH TIME ZONE
        );

        -- Create indexes
        CREATE INDEX idx_leads_status ON public.leads(status);
        CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
        CREATE INDEX idx_leads_email ON public.leads(email);

        -- Enable RLS
        ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

        -- Only admins can view leads
        CREATE POLICY "Admins can view all leads"
            ON public.leads FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================
-- 6. AUDIT LOG TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'audit_log') THEN
        CREATE TABLE public.audit_log (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES public.profiles(id),

            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id UUID,

            old_data JSONB,
            new_data JSONB,

            ip_address INET,
            user_agent TEXT,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create indexes
        CREATE INDEX idx_audit_user ON public.audit_log(user_id);
        CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
        CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
    END IF;
END $$;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
    -- Profiles table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Properties table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_properties_updated_at') THEN
        CREATE TRIGGER update_properties_updated_at
            BEFORE UPDATE ON public.properties
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Energy analyses table
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_analyses_updated_at') THEN
        CREATE TRIGGER update_analyses_updated_at
            BEFORE UPDATE ON public.energy_analyses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 8. CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- ============================================
-- 9. STORAGE BUCKETS
-- ============================================
DO $$
BEGIN
    -- Create reports bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'reports',
        'reports',
        false,
        52428800, -- 50MB
        ARRAY['application/pdf']::text[]
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create property-images bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'property-images',
        'property-images',
        true,
        10485760, -- 10MB
        ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies
-- Check if policies exist before creating
DO $$
BEGIN
    -- Drop existing policies if they exist (to recreate with correct permissions)
    DROP POLICY IF EXISTS "Users can upload own reports" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view own reports" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own reports" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload property images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;

    -- Reports bucket policies (authenticated users only)
    CREATE POLICY "Users can upload own reports" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'reports'
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );

    CREATE POLICY "Users can view own reports" ON storage.objects
        FOR SELECT TO authenticated
        USING (
            bucket_id = 'reports'
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );

    CREATE POLICY "Users can delete own reports" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = 'reports'
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );

    -- Property images bucket policies (public read, authenticated write)
    CREATE POLICY "Anyone can upload property images" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'property-images');

    CREATE POLICY "Anyone can view property images" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'property-images');

EXCEPTION
    WHEN duplicate_object THEN
        -- Policies already exist, that's fine
        NULL;
END $$;

-- ============================================
-- 10. USEFUL VIEWS
-- ============================================

-- View for dashboard data
CREATE OR REPLACE VIEW public.dashboard_summary AS
SELECT
    p.user_id,
    COUNT(DISTINCT p.id) as total_properties,
    COUNT(DISTINCT ea.id) as total_analyses,
    SUM(p.total_bra) as total_area_m2,
    AVG(ea.energy_waste_nok) as avg_waste_nok,
    SUM(ea.total_investment_potential) as total_investment_potential,
    AVG(ea.payback_period_years) as avg_payback_years
FROM public.properties p
LEFT JOIN public.energy_analyses ea ON p.id = ea.property_id
GROUP BY p.user_id;

-- Grant access to views
GRANT SELECT ON public.dashboard_summary TO authenticated;

-- ============================================
-- 11. SAMPLE DATA (Optional - commented out)
-- ============================================
/*
-- Uncomment to insert sample data for testing

-- Sample building types with TEK17 requirements
INSERT INTO public.reference_data (category, key, value, metadata)
VALUES
    ('tek17', 'kontor', '115', '{"unit": "kWh/m²", "description": "Kontorbygg"}'),
    ('tek17', 'sykehus', '225', '{"unit": "kWh/m²", "description": "Sykehus"}'),
    ('tek17', 'hotell', '170', '{"unit": "kWh/m²", "description": "Hotellbygg"}'),
    ('tek17', 'barnehage', '140', '{"unit": "kWh/m²", "description": "Barnehage"}'),
    ('tek17', 'universitet', '125', '{"unit": "kWh/m²", "description": "Universitets- og høyskolebygg"}')
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- 12. VERIFICATION QUERIES
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Schema update completed successfully!';
    RAISE NOTICE 'Tables created/verified:';
    RAISE NOTICE '  - profiles';
    RAISE NOTICE '  - properties';
    RAISE NOTICE '  - energy_analyses';
    RAISE NOTICE '  - reports';
    RAISE NOTICE '  - leads';
    RAISE NOTICE '  - audit_log';
    RAISE NOTICE 'Storage buckets created/verified:';
    RAISE NOTICE '  - reports';
    RAISE NOTICE '  - property-images';
END $$;

-- Final check: List all tables
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;