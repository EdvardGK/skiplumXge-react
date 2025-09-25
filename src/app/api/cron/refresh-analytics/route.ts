import { NextRequest } from 'next/server';
import { createSecureResponse, createSecureErrorResponse } from '@/lib/security';
import { supabaseClient } from '@/lib/supabase';

// This endpoint should be called by a cron job (Vercel Cron or external service)
// It refreshes all pre-calculated analytics for fast API responses

export const maxDuration = 60; // Allow up to 60 seconds for this operation

export async function GET(request: NextRequest) {
  try {
    // Verify this is being called by Vercel Cron (in production)
    const authHeader = request.headers.get('authorization');

    if (process.env.NODE_ENV === 'production') {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return createSecureErrorResponse('Unauthorized', 401);
      }
    }

    console.log('Starting analytics cache refresh at:', new Date().toISOString());

    const startTime = Date.now();
    const results = {
      municipality_stats: false,
      zone_stats: false,
      national_benchmarks: false,
      materialized_views: false,
      total_time: 0
    };

    try {
      // Refresh municipality statistics cache
      console.log('Refreshing municipality statistics...');
      const { error: muniError } = await supabaseClient
        .rpc('refresh_municipality_stats');

      if (muniError) {
        console.error('Failed to refresh municipality stats:', muniError);
      } else {
        results.municipality_stats = true;
        console.log('Municipality statistics refreshed successfully');
      }

      // Refresh zone statistics cache
      console.log('Refreshing zone statistics...');
      const { error: zoneError } = await supabaseClient
        .rpc('refresh_zone_stats');

      if (zoneError) {
        console.error('Failed to refresh zone stats:', zoneError);
      } else {
        results.zone_stats = true;
        console.log('Zone statistics refreshed successfully');
      }

      // Refresh national benchmarks
      console.log('Refreshing national benchmarks...');
      const { error: benchmarkError } = await supabaseClient
        .rpc('refresh_national_benchmarks');

      if (benchmarkError) {
        console.error('Failed to refresh national benchmarks:', benchmarkError);
      } else {
        results.national_benchmarks = true;
        console.log('National benchmarks refreshed successfully');
      }

      // Refresh all materialized views
      console.log('Refreshing materialized views...');
      const { error: viewError } = await supabaseClient
        .rpc('refresh_all_analytics_cache');

      if (viewError) {
        console.error('Failed to refresh materialized views:', viewError);
      } else {
        results.materialized_views = true;
        console.log('Materialized views refreshed successfully');
      }

    } catch (error) {
      console.error('Error during analytics refresh:', error);
    }

    results.total_time = Date.now() - startTime;

    // Log to monitoring (you might want to send this to a monitoring service)
    console.log('Analytics refresh completed:', {
      ...results,
      timestamp: new Date().toISOString(),
      duration_ms: results.total_time
    });

    // Store refresh status in database for monitoring
    try {
      await supabaseClient
        .from('analytics_refresh_log')
        .insert({
          refresh_type: 'nightly_full',
          success: Object.values(results).filter(v => v === true).length >= 3,
          details: results,
          duration_ms: results.total_time
        });
    } catch (logError) {
      console.error('Failed to log refresh status:', logError);
    }

    return createSecureResponse({
      success: true,
      message: 'Analytics cache refresh completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics refresh API error:', error);
    return createSecureErrorResponse('Failed to refresh analytics cache', 500);
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}