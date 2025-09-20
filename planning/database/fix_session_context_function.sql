-- Fix for missing set_session_context RPC function
-- This function is required for session management and RLS (Row Level Security)
--
-- Execute this script in Supabase SQL Editor to fix the session context functionality

-- Create the set_session_context RPC function
CREATE OR REPLACE FUNCTION public.set_session_context(session_id TEXT)
RETURNS void AS $$
BEGIN
    -- Set the session ID in the current session
    PERFORM set_config('app.session_id', session_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the get_session_context helper function
CREATE OR REPLACE FUNCTION public.get_session_context()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.session_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to API roles
GRANT EXECUTE ON FUNCTION public.set_session_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_context() TO anon, authenticated;

-- Verify the functions exist
SELECT
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL THEN '✓ Created' ELSE '✗ Missing' END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN ('set_session_context', 'get_session_context')
ORDER BY routine_name;