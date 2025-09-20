-- Fix for missing get_price_zone RPC function
-- This function is required for address search to work with Norwegian price zones
--
-- Error: POST 404 /rest/v1/rpc/get_price_zone
--
-- Execute this script in Supabase SQL Editor to fix the address search functionality

-- Create the get_price_zone RPC function
CREATE OR REPLACE FUNCTION public.get_price_zone(p_kommune_number text)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Look up the price zone for the given municipality number
  RETURN (
    SELECT price_zone
    FROM public.municipality_price_zones
    WHERE kommune_number = p_kommune_number
    LIMIT 1
  );
END;
$$;

-- Grant execute permissions to API roles
GRANT EXECUTE ON FUNCTION public.get_price_zone(text) TO anon, authenticated;

-- Test the function (uncomment to test)
-- SELECT public.get_price_zone('301'); -- Should return 'NO1' for Oslo

-- Verify the function exists
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_name = 'get_price_zone';