import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Notion API configuration
const NOTION_API_VERSION = '2022-06-28';

// Get Supabase admin client (lazy initialization)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
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

// Get Notion configuration
function getNotionConfig() {
  return {
    apiKey: process.env.NOTION_API_KEY || '',
    databases: {
      calculations: process.env.NOTION_CALCULATIONS_DB_ID || '',
      tek17: process.env.NOTION_TEK17_DB_ID || '',
      features: process.env.NOTION_FEATURES_DB_ID || '',
      formulas: process.env.NOTION_FORMULAS_DB_ID || '',
    }
  };
}

// Fetch data from Notion database
async function fetchNotionDatabase(databaseId: string, apiKey: string) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

// Parse Notion page properties
function parseNotionProperties(properties: any) {
  const parsed: any = {};

  for (const [key, value] of Object.entries(properties)) {
    const prop = value as any;

    switch (prop.type) {
      case 'title':
        parsed[key] = prop.title[0]?.plain_text || '';
        break;
      case 'number':
        parsed[key] = prop.number;
        break;
      case 'checkbox':
        parsed[key] = prop.checkbox;
        break;
      case 'select':
        parsed[key] = prop.select?.name || '';
        break;
      case 'rich_text':
        parsed[key] = prop.rich_text[0]?.plain_text || '';
        break;
      case 'multi_select':
        parsed[key] = prop.multi_select.map((s: any) => s.name);
        break;
      default:
        parsed[key] = null;
    }
  }

  return parsed;
}

// Sync calculations from Notion
async function syncCalculations(supabaseAdmin: any, notionConfig: any) {
  const pages = await fetchNotionDatabase(notionConfig.databases.calculations, notionConfig.apiKey);
  const calculations = [];

  for (const page of pages) {
    const props = parseNotionProperties(page.properties);
    calculations.push({
      name: props.name,
      value: props.value,
      unit: props.unit,
      category: props.category,
      description: props.description,
      min_value: props.min_value,
      max_value: props.max_value,
    });
  }

  // Import to Supabase
  const { data, error } = await supabaseAdmin
    .rpc('import_notion_config', {
      config_type: 'calculation',
      config_items: calculations,
    });

  if (error) throw error;
  return data;
}

// Sync TEK17 requirements from Notion
async function syncTEK17(supabaseAdmin: any, notionConfig: any) {
  const pages = await fetchNotionDatabase(notionConfig.databases.tek17, notionConfig.apiKey);
  const tek17Items = [];

  for (const page of pages) {
    const props = parseNotionProperties(page.properties);
    tek17Items.push({
      building_type: props.building_type,
      max_energy_kwh_m2: props.max_energy_kwh_m2,
      description: props.description,
    });
  }

  // Import to Supabase
  const { data, error } = await supabaseAdmin
    .rpc('import_notion_config', {
      config_type: 'tek17',
      config_items: tek17Items,
    });

  if (error) throw error;
  return data;
}

// Sync feature flags from Notion
async function syncFeatures(supabaseAdmin: any, notionConfig: any) {
  const pages = await fetchNotionDatabase(notionConfig.databases.features, notionConfig.apiKey);
  const features = [];

  for (const page of pages) {
    const props = parseNotionProperties(page.properties);
    features.push({
      feature_name: props.feature_name,
      enabled: props.enabled,
      rollout_percentage: props.rollout_percentage || 0,
      description: props.description,
    });
  }

  // Import to Supabase
  const { data, error } = await supabaseAdmin
    .rpc('import_notion_config', {
      config_type: 'feature',
      config_items: features,
    });

  if (error) throw error;
  return data;
}

// Sync formulas from Notion
async function syncFormulas(supabaseAdmin: any, notionConfig: any) {
  const pages = await fetchNotionDatabase(notionConfig.databases.formulas, notionConfig.apiKey);
  const formulas = [];

  for (const page of pages) {
    const props = parseNotionProperties(page.properties);

    // Parse variables (could be comma-separated string or array)
    let variables = props.variables;
    if (typeof variables === 'string') {
      variables = variables.split(',').map((v: string) => v.trim());
    }

    formulas.push({
      name: props.name,
      formula: props.formula,
      variables: variables || [],
      description: props.description,
      category: props.category,
    });
  }

  // Import to Supabase
  const { data, error } = await supabaseAdmin
    .rpc('import_notion_config', {
      config_type: 'formula',
      config_items: formulas,
    });

  if (error) throw error;
  return data;
}

// Main sync handler
export async function POST(request: Request) {
  try {
    // Get configuration
    const supabaseAdmin = getSupabaseAdmin();
    const notionConfig = getNotionConfig();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 503 });
    }

    if (!notionConfig.apiKey) {
      return NextResponse.json({ error: 'Notion configuration missing' }, { status: 503 });
    }

    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const results = {
      calculations: null as any,
      tek17: null as any,
      features: null as any,
      formulas: null as any,
    };

    // Sync all configuration types
    try {
      results.calculations = await syncCalculations(supabaseAdmin, notionConfig);
    } catch (error) {
      console.error('Failed to sync calculations:', error);
      results.calculations = { error: String(error) };
    }

    try {
      results.tek17 = await syncTEK17(supabaseAdmin, notionConfig);
    } catch (error) {
      console.error('Failed to sync TEK17:', error);
      results.tek17 = { error: String(error) };
    }

    try {
      results.features = await syncFeatures(supabaseAdmin, notionConfig);
    } catch (error) {
      console.error('Failed to sync features:', error);
      results.features = { error: String(error) };
    }

    try {
      results.formulas = await syncFormulas(supabaseAdmin, notionConfig);
    } catch (error) {
      console.error('Failed to sync formulas:', error);
      results.formulas = { error: String(error) };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET handler to check sync status
export async function GET() {
  try {
    // Get Supabase admin client
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 503 });
    }

    // Get last sync log from Supabase
    const { data, error } = await supabaseAdmin
      .from('notion_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      last_syncs: data,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get sync status', details: String(error) },
      { status: 500 }
    );
  }
}