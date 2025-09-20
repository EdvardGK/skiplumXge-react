-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 03_rls_policies.sql
-- Purpose: Row Level Security policies for data protection
-- ============================================

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE energy_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ENERGY CERTIFICATES POLICIES
-- Public read-only access to certificate data
-- ============================================

-- Anyone can read energy certificate data (public information)
CREATE POLICY "energy_certificates_public_read"
    ON energy_certificates
    FOR SELECT
    USING (true);

-- Only service role can insert/update/delete (for data import)
CREATE POLICY "energy_certificates_service_write"
    ON energy_certificates
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- USER SEARCHES POLICIES
-- Anonymous write, restricted read
-- ============================================

-- Anyone can insert search records (anonymous tracking)
CREATE POLICY "user_searches_public_insert"
    ON user_searches
    FOR INSERT
    WITH CHECK (true);

-- Only service role can read search data (for analytics)
CREATE POLICY "user_searches_service_read"
    ON user_searches
    FOR SELECT
    USING (auth.role() = 'service_role');

-- ============================================
-- ANALYSIS RESULTS POLICIES
-- Session-based access control
-- ============================================

-- Anyone can create analysis results
CREATE POLICY "analysis_results_public_insert"
    ON analysis_results
    FOR INSERT
    WITH CHECK (true);

-- Users can read their own results (by session_id)
-- Note: In production, implement proper session validation
CREATE POLICY "analysis_results_session_read"
    ON analysis_results
    FOR SELECT
    USING (
        -- Allow if session_id matches (passed via RLS context)
        session_id = current_setting('app.session_id', true)
        OR
        -- Allow service role full access
        auth.role() = 'service_role'
        OR
        -- Allow recent results (for demo/testing)
        created_at > NOW() - INTERVAL '24 hours'
    );

-- Service role can update/delete
CREATE POLICY "analysis_results_service_manage"
    ON analysis_results
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "analysis_results_service_delete"
    ON analysis_results
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ============================================
-- CONVERSION EVENTS POLICIES
-- Write-only for users, full access for service
-- ============================================

-- Anyone can record conversion events
CREATE POLICY "conversion_events_public_insert"
    ON conversion_events
    FOR INSERT
    WITH CHECK (true);

-- Only service role can read conversion data (business metrics)
CREATE POLICY "conversion_events_service_read"
    ON conversion_events
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Service role can manage conversions
CREATE POLICY "conversion_events_service_manage"
    ON conversion_events
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "conversion_events_service_delete"
    ON conversion_events
    FOR DELETE
    USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to set session context for RLS
CREATE OR REPLACE FUNCTION set_session_context(session_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.session_id', session_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current session context
CREATE OR REPLACE FUNCTION get_session_context()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.session_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant appropriate permissions to anon role
GRANT SELECT ON energy_certificates TO anon;
GRANT INSERT ON user_searches TO anon;
GRANT INSERT ON analysis_results TO anon;
GRANT SELECT ON analysis_results TO anon;  -- Limited by RLS
GRANT INSERT ON conversion_events TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_context() TO anon;

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. Energy certificates are public data (read-only)
-- 2. User searches are write-only for privacy
-- 3. Analysis results use session-based access
-- 4. Conversion events are write-only for users
-- 5. Service role has full access for admin/analytics
--
-- In production:
-- - Implement proper session management
-- - Add rate limiting policies
-- - Consider adding authenticated user policies
-- - Add data retention policies for GDPR compliance