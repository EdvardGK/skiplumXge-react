-- ============================================
-- ANALYTICS REFRESH LOG TABLE
-- File: 11_analytics_refresh_log.sql
-- Purpose: Track analytics refresh operations for monitoring
-- ============================================

-- Create table to log analytics refresh operations
CREATE TABLE IF NOT EXISTS analytics_refresh_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    refresh_type TEXT NOT NULL, -- 'nightly_full', 'manual', 'partial'
    success BOOLEAN NOT NULL DEFAULT false,
    details JSONB, -- Detailed results of each refresh operation
    duration_ms INTEGER, -- Total duration in milliseconds
    error_message TEXT, -- Error message if refresh failed
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index for querying recent refreshes
    INDEX idx_refresh_log_created_at (created_at DESC)
);

-- Keep only recent logs (e.g., last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_refresh_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_refresh_log
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON analytics_refresh_log TO authenticated;
GRANT INSERT ON analytics_refresh_log TO service_role, authenticated;

-- Add comment
COMMENT ON TABLE analytics_refresh_log IS 'Logs for analytics cache refresh operations - used for monitoring and debugging';