-- ============================================
-- SUPABASE ENERGY ANALYSIS DATABASE
-- File: 02_indexes.sql
-- Purpose: Performance indexes for fast queries
-- ============================================

-- ============================================
-- ENERGY CERTIFICATES INDEXES
-- Optimize for address searches and lookups
-- ============================================

-- Primary search indexes
CREATE INDEX idx_energy_certificates_address
    ON energy_certificates(address);

CREATE INDEX idx_energy_certificates_postal_code
    ON energy_certificates(postal_code);

CREATE INDEX idx_energy_certificates_building_number
    ON energy_certificates(building_number);

-- Composite index for address + postal code searches
CREATE INDEX idx_energy_certificates_address_postal
    ON energy_certificates(address, postal_code);

-- Category and classification indexes
CREATE INDEX idx_energy_certificates_energy_class
    ON energy_certificates(energy_class);

CREATE INDEX idx_energy_certificates_building_category
    ON energy_certificates(building_category);

-- Norwegian cadastre indexes (for property lookups)
CREATE INDEX idx_energy_certificates_cadastre
    ON energy_certificates(knr, gnr, bnr, snr, fnr);

-- Full text search for Norwegian addresses
CREATE INDEX idx_energy_certificates_address_search
    ON energy_certificates
    USING gin(to_tsvector('norwegian', address));

-- Performance index for energy data queries
CREATE INDEX idx_energy_certificates_energy_data
    ON energy_certificates(energy_consumption, energy_class)
    WHERE energy_consumption IS NOT NULL;

-- ============================================
-- USER SEARCHES INDEXES
-- Optimize for session tracking and analytics
-- ============================================

CREATE INDEX idx_user_searches_session_id
    ON user_searches(session_id);

CREATE INDEX idx_user_searches_timestamp
    ON user_searches(timestamp DESC);

-- Composite index for session timeline
CREATE INDEX idx_user_searches_session_timeline
    ON user_searches(session_id, timestamp DESC);

-- Index for analytics queries
CREATE INDEX idx_user_searches_daily
    ON user_searches(DATE(timestamp));

-- ============================================
-- ANALYSIS RESULTS INDEXES
-- Optimize for result retrieval and reporting
-- ============================================

CREATE INDEX idx_analysis_results_session_id
    ON analysis_results(session_id);

CREATE INDEX idx_analysis_results_created_at
    ON analysis_results(created_at DESC);

-- Composite index for session results
CREATE INDEX idx_analysis_results_session_time
    ON analysis_results(session_id, created_at DESC);

-- Index for investment queries
CREATE INDEX idx_analysis_results_investment
    ON analysis_results(investment_room_kr)
    WHERE investment_room_kr > 0;

-- Index for high-value opportunities
CREATE INDEX idx_analysis_results_high_waste
    ON analysis_results(annual_waste_kr DESC)
    WHERE annual_waste_kr > 10000;

-- ============================================
-- CONVERSION EVENTS INDEXES
-- Optimize for conversion tracking and funnel analysis
-- ============================================

CREATE INDEX idx_conversion_events_session_id
    ON conversion_events(session_id);

CREATE INDEX idx_conversion_events_action_type
    ON conversion_events(action_type);

CREATE INDEX idx_conversion_events_timestamp
    ON conversion_events(timestamp DESC);

-- Composite index for conversion funnel
CREATE INDEX idx_conversion_events_session_action
    ON conversion_events(session_id, action_type, timestamp);

-- Marketing campaign tracking
CREATE INDEX idx_conversion_events_utm
    ON conversion_events(utm_source, utm_medium, utm_campaign)
    WHERE utm_source IS NOT NULL;

-- Analysis link index
CREATE INDEX idx_conversion_events_analysis_id
    ON conversion_events(analysis_id)
    WHERE analysis_id IS NOT NULL;

-- ============================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- Optimize specific query patterns
-- ============================================

-- Index for buildings with energy certificates
CREATE INDEX idx_energy_certificates_has_data
    ON energy_certificates(postal_code, energy_class)
    WHERE energy_consumption IS NOT NULL
    AND energy_class IS NOT NULL;

-- Index for recent searches (last 7 days)
CREATE INDEX idx_user_searches_recent
    ON user_searches(session_id, timestamp)
    WHERE timestamp > NOW() - INTERVAL '7 days';

-- Index for completed analyses
CREATE INDEX idx_analysis_results_complete
    ON analysis_results(session_id, created_at)
    WHERE annual_waste_kr IS NOT NULL
    AND investment_room_kr IS NOT NULL;

-- Index for successful conversions
CREATE INDEX idx_conversion_events_success
    ON conversion_events(session_id, timestamp)
    WHERE action_type IN ('contact_form', 'consultation_booking');

-- ============================================
-- PERFORMANCE NOTES
-- ============================================
-- These indexes are designed for:
-- 1. Fast address lookups (< 50ms)
-- 2. Efficient session tracking
-- 3. Quick conversion funnel analysis
-- 4. Norwegian text search support
-- 5. High-value opportunity identification

-- Monitor with: SELECT * FROM pg_stat_user_indexes;
-- Analyze with: EXPLAIN ANALYZE <query>;