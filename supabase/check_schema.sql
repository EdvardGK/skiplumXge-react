-- Supabase Schema Check Script
-- Run this first to see what currently exists in your database

-- ============================================
-- 1. CHECK EXISTING TABLES
-- ============================================
SELECT
    'EXISTING TABLES' as check_type,
    table_name,
    CASE
        WHEN table_name IN ('profiles', 'properties', 'energy_analyses', 'reports', 'leads', 'audit_log')
        THEN '✓ Expected'
        ELSE '? Additional'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. CHECK COLUMNS FOR KEY TABLES
-- ============================================
-- Check profiles table structure
SELECT
    'PROFILES COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check properties table structure
SELECT
    'PROPERTIES COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'properties'
ORDER BY ordinal_position;

-- Check energy_analyses table structure
SELECT
    'ENERGY_ANALYSES COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'energy_analyses'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK RLS POLICIES
-- ============================================
SELECT
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 4. CHECK INDEXES
-- ============================================
SELECT
    'INDEXES' as check_type,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'properties', 'energy_analyses', 'reports', 'leads', 'audit_log')
ORDER BY tablename, indexname;

-- ============================================
-- 5. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT
    'FOREIGN KEYS' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 6. CHECK TRIGGERS
-- ============================================
SELECT
    'TRIGGERS' as check_type,
    trigger_name,
    event_object_table as table_name,
    event_manipulation as trigger_event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 7. CHECK STORAGE BUCKETS
-- ============================================
SELECT
    'STORAGE BUCKETS' as check_type,
    id as bucket_id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- ============================================
-- 8. CHECK ROW COUNTS
-- ============================================
SELECT
    'ROW COUNTS' as check_type,
    schemaname,
    tablename,
    n_live_tup as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================
-- 9. CHECK RLS STATUS
-- ============================================
SELECT
    'RLS STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'properties', 'energy_analyses', 'reports', 'leads', 'audit_log')
ORDER BY tablename;

-- ============================================
-- 10. CHECK FUNCTIONS
-- ============================================
SELECT
    'FUNCTIONS' as check_type,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;