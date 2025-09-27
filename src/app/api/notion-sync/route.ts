import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase admin client with proper checks
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return null during build time when env vars might not be available
    return null;
  }

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Power Automate will POST to this endpoint
export async function POST(request: Request) {
  try {
    // Get Supabase client
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 503 });
    }
    // Verify the request is from Power Automate (optional security)
    const authHeader = request.headers.get('x-api-key');
    if (authHeader !== process.env.POWER_AUTOMATE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Notion data from Power Automate
    const body = await request.json();

    // Power Automate will send data in this format:
    // {
    //   "type": "calculations" | "features" | "formulas",
    //   "data": [...array of items from Notion...]
    // }

    const { type, data } = body;

    let result;

    switch (type) {
      case 'calculations':
        result = await syncCalculations(data, supabase);
        break;
      case 'features':
        result = await syncFeatures(data, supabase);
        break;
      case 'formulas':
        result = await syncFormulas(data, supabase);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      synced: result.count,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Sync calculations to Supabase
async function syncCalculations(notionData: any[], supabase: any) {
  const calculations = notionData.map(item => ({
    name: item.Name || item.properties?.Name?.title?.[0]?.plain_text,
    value: item.Value || item.properties?.Value?.number,
    unit: item.Unit || item.properties?.Unit?.rich_text?.[0]?.plain_text,
    category: item.Category || item.properties?.Category?.select?.name,
    description: item.Description || item.properties?.Description?.rich_text?.[0]?.plain_text,
    min_value: item['Min Value'] || item.properties?.['Min Value']?.number,
    max_value: item['Max Value'] || item.properties?.['Max Value']?.number,
  }));

  // Upsert to Supabase
  const { data, error } = await supabase
    .from('calculations')
    .upsert(
      calculations.filter(calc => calc.name), // Only sync items with names
      { onConflict: 'name' }
    );

  if (error) throw error;

  return { count: calculations.filter(calc => calc.name).length };
}

// Sync feature flags to Supabase
async function syncFeatures(notionData: any[], supabase: any) {
  const features = notionData.map(item => ({
    feature_name: item['Feature Name'] || item.properties?.['Feature Name']?.title?.[0]?.plain_text,
    enabled: item.Enabled ?? item.properties?.Enabled?.checkbox,
    rollout_percentage: item['Rollout %'] || item.properties?.['Rollout %']?.number || 0,
    description: item.Description || item.properties?.Description?.rich_text?.[0]?.plain_text,
  }));

  // Upsert to Supabase
  const { data, error } = await supabase
    .from('feature_flags')
    .upsert(
      features.filter(f => f.feature_name),
      { onConflict: 'feature_name' }
    );

  if (error) throw error;

  return { count: features.filter(f => f.feature_name).length };
}

// Sync formulas to Supabase
async function syncFormulas(notionData: any[], supabase: any) {
  const formulas = notionData.map(item => ({
    name: item.Name || item.properties?.Name?.title?.[0]?.plain_text,
    formula: item.Formula || item.properties?.Formula?.rich_text?.[0]?.plain_text,
    variables: (item.Variables || item.properties?.Variables?.rich_text?.[0]?.plain_text || '')
      .split(',')
      .map((v: string) => v.trim())
      .filter((v: string) => v),
    description: item.Description || item.properties?.Description?.rich_text?.[0]?.plain_text,
    category: item.Category || item.properties?.Category?.select?.name,
  }));

  // Upsert to Supabase
  const { data, error } = await supabase
    .from('formulas')
    .upsert(
      formulas.filter(f => f.name),
      { onConflict: 'name' }
    );

  if (error) throw error;

  return { count: formulas.filter(f => f.name).length };
}

// GET endpoint to check last sync status
export async function GET(request: Request) {
  try {
    // Return sync instructions for Power Automate
    return NextResponse.json({
      endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/notion-sync`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'Your-Power-Automate-Key'
      },
      body: {
        type: 'calculations | features | formulas',
        data: '[Array of Notion items]'
      },
      example: {
        type: 'calculations',
        data: [
          {
            Name: 'bra_adjustment',
            Value: 8,
            Unit: '%',
            Category: 'area',
            Description: 'BRA reduction',
            'Min Value': 0,
            'Max Value': 20
          }
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get info' },
      { status: 500 }
    );
  }
}