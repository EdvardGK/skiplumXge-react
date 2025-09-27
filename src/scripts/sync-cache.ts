#!/usr/bin/env node
/**
 * Sync Script for Cache Layer
 * Fetches data from Supabase and updates local cache JSON files
 * Run with: npm run cache:sync
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CACHE_DIR = path.join(process.cwd(), 'src', 'data', 'cache');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

/**
 * Calculate checksum for data integrity
 */
function calculateChecksum(data: any): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Write JSON file with pretty formatting
 */
async function writeJsonFile(filename: string, data: any): Promise<void> {
  const filepath = path.join(CACHE_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Written ${filename}`);
}

/**
 * Transform array data to keyed object
 */
function arrayToKeyedObject<T extends { id?: string; name?: string }>(
  array: T[],
  keyField: keyof T = 'name' as keyof T
): Record<string, T> {
  const result: Record<string, T> = {};
  array.forEach(item => {
    const key = item[keyField] as string;
    if (key) {
      result[key] = item;
    }
  });
  return result;
}

/**
 * Sync calculations table
 */
async function syncCalculations() {
  console.log('📊 Syncing calculations...');

  const { data, error } = await supabase
    .from('calculations')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching calculations:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'name');
  await writeJsonFile('calculations.json', keyed);
  return keyed;
}

/**
 * Sync content table
 */
async function syncContent() {
  console.log('📝 Syncing content...');

  const { data, error } = await supabase
    .from('content')
    .select('*')
    .order('key');

  if (error) {
    console.error('❌ Error fetching content:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'key');
  await writeJsonFile('content-no.json', keyed);
  return keyed;
}

/**
 * Sync TEK17 requirements
 */
async function syncTEK17Requirements() {
  console.log('🏗️ Syncing TEK17 requirements...');

  const { data, error } = await supabase
    .from('tek17_requirements')
    .select('*')
    .order('building_type');

  if (error) {
    console.error('❌ Error fetching TEK17 requirements:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'building_type');
  await writeJsonFile('tek17-requirements.json', keyed);
  return keyed;
}

/**
 * Sync formulas
 */
async function syncFormulas() {
  console.log('🧮 Syncing formulas...');

  const { data, error } = await supabase
    .from('formulas')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching formulas:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'name');
  await writeJsonFile('formulas.json', keyed);
  return keyed;
}

/**
 * Sync heat sources (if table exists)
 */
async function syncHeatSources() {
  console.log('🔥 Syncing heat sources...');

  // Check if heat_sources table exists
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'heat_sources')
    .single();

  if (!tables) {
    console.log('⚠️ Heat sources table not found, using defaults');
    // Return existing JSON data if table doesn't exist
    try {
      const existingData = await fs.readFile(
        path.join(CACHE_DIR, 'heat-sources.json'),
        'utf-8'
      );
      return JSON.parse(existingData);
    } catch {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('heat_sources')
    .select('*')
    .order('priority');

  if (error) {
    console.error('❌ Error fetching heat sources:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'name');
  await writeJsonFile('heat-sources.json', keyed);
  return keyed;
}

/**
 * Sync municipalities
 */
async function syncMunicipalities() {
  console.log('🗺️ Syncing municipalities...');

  const { data, error } = await supabase
    .from('municipality_price_zones')
    .select('*')
    .order('municipality_code');

  if (error) {
    console.error('❌ Error fetching municipalities:', error);
    return null;
  }

  // Transform to expected format
  const keyed: Record<string, any> = {};
  (data || []).forEach(muni => {
    keyed[muni.municipality_code] = {
      code: muni.municipality_code,
      name: muni.municipality_name,
      fylke: muni.fylke || '',
      price_zone: muni.price_zone,
      climate_zone: muni.climate_zone || null,
      heating_degree_days: muni.heating_degree_days || null
    };
  });

  await writeJsonFile('municipalities.json', keyed);
  return keyed;
}

/**
 * Sync feature flags
 */
async function syncFeatureFlags() {
  console.log('🚀 Syncing feature flags...');

  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('feature_name');

  if (error) {
    console.error('❌ Error fetching feature flags:', error);
    return null;
  }

  const keyed = arrayToKeyedObject(data || [], 'feature_name');
  await writeJsonFile('feature-flags.json', keyed);
  return keyed;
}

/**
 * Create cache manifest
 */
async function createManifest(syncResults: Record<string, any>) {
  console.log('📋 Creating manifest...');

  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    items: {
      calculations: Object.keys(syncResults.calculations || {}).length,
      content: Object.keys(syncResults.content || {}).length,
      tek17_requirements: Object.keys(syncResults.tek17Requirements || {}).length,
      formulas: Object.keys(syncResults.formulas || {}).length,
      heat_sources: Object.keys(syncResults.heatSources || {}).length,
      municipalities: Object.keys(syncResults.municipalities || {}).length,
      feature_flags: Object.keys(syncResults.featureFlags || {}).length
    },
    checksums: {
      calculations: calculateChecksum(syncResults.calculations),
      content: calculateChecksum(syncResults.content),
      tek17_requirements: calculateChecksum(syncResults.tek17Requirements),
      formulas: calculateChecksum(syncResults.formulas),
      heat_sources: calculateChecksum(syncResults.heatSources),
      municipalities: calculateChecksum(syncResults.municipalities),
      feature_flags: calculateChecksum(syncResults.featureFlags)
    },
    lastSyncTimestamp: new Date().toISOString(),
    syncStatus: 'success' as const,
    syncMetadata: {
      source: 'supabase',
      duration: 0,
      errors: [] as string[]
    }
  };

  await writeJsonFile('manifest.json', manifest);
  return manifest;
}

/**
 * Main sync function
 */
async function syncCache() {
  console.log('🔄 Starting cache sync from Supabase...');
  console.log(`📁 Cache directory: ${CACHE_DIR}`);

  const startTime = Date.now();

  try {
    // Ensure cache directory exists
    await fs.mkdir(CACHE_DIR, { recursive: true });

    // Sync all data sources
    const [
      calculations,
      content,
      tek17Requirements,
      formulas,
      heatSources,
      municipalities,
      featureFlags
    ] = await Promise.all([
      syncCalculations(),
      syncContent(),
      syncTEK17Requirements(),
      syncFormulas(),
      syncHeatSources(),
      syncMunicipalities(),
      syncFeatureFlags()
    ]);

    // Create manifest
    const manifest = await createManifest({
      calculations,
      content,
      tek17Requirements,
      formulas,
      heatSources,
      municipalities,
      featureFlags
    });

    // Update duration in manifest
    manifest.syncMetadata.duration = Date.now() - startTime;
    await writeJsonFile('manifest.json', manifest);

    console.log(`✨ Cache sync completed in ${manifest.syncMetadata.duration}ms`);
    console.log(`📦 Total items cached: ${Object.values(manifest.items).reduce((a, b) => a + b, 0)}`);

    return manifest;
  } catch (error) {
    console.error('❌ Cache sync failed:', error);

    // Write error manifest
    const errorManifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      items: {
        calculations: 0,
        content: 0,
        tek17_requirements: 0,
        formulas: 0,
        heat_sources: 0,
        municipalities: 0,
        feature_flags: 0
      },
      checksums: {},
      lastSyncTimestamp: new Date().toISOString(),
      syncStatus: 'failed' as const,
      syncMetadata: {
        source: 'supabase',
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    };

    await writeJsonFile('manifest.json', errorManifest);
    process.exit(1);
  }
}

// Run sync if called directly
if (require.main === module) {
  syncCache().catch(console.error);
}

export { syncCache };