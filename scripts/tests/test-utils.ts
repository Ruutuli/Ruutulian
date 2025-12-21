/**
 * Test Utilities
 * 
 * Shared utilities for testing (create test data, cleanup, compare objects)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export function logTest(name: string, passed: boolean, error?: string, details?: any): TestResult {
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details && !passed) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
  return { name, passed, error, details };
}

export function compareObjects(obj1: any, obj2: any, ignoreKeys: string[] = []): {
  equal: boolean;
  differences: Array<{ key: string; value1: any; value2: any }>;
} {
  const differences: Array<{ key: string; value1: any; value2: any }> = [];
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  for (const key of allKeys) {
    if (ignoreKeys.includes(key)) continue;

    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    // Handle null/undefined normalization
    const normalizedVal1 = val1 === null || val1 === undefined || val1 === '' ? null : val1;
    const normalizedVal2 = val2 === null || val2 === undefined || val2 === '' ? null : val2;

    // Deep comparison for objects and arrays
    if (JSON.stringify(normalizedVal1) !== JSON.stringify(normalizedVal2)) {
      differences.push({
        key,
        value1: normalizedVal1,
        value2: normalizedVal2,
      });
    }
  }

  return {
    equal: differences.length === 0,
    differences,
  };
}

export async function createTestWorld(name: string = `Test World ${Date.now()}`) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const { data, error } = await supabase
    .from('worlds')
    .insert({
      name,
      slug,
      series_type: 'original',
      summary: 'Test world for testing',
      is_public: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cleanupTestData(ids: { worlds?: string[]; ocs?: string[]; timelines?: string[]; timeline_events?: string[]; world_lore?: string[] }) {
  const errors: string[] = [];

  if (ids.timeline_events) {
    for (const id of ids.timeline_events) {
      const { error } = await supabase.from('timeline_events').delete().eq('id', id);
      if (error) errors.push(`Failed to delete timeline_event ${id}: ${error.message}`);
    }
  }

  if (ids.world_lore) {
    for (const id of ids.world_lore) {
      const { error } = await supabase.from('world_lore').delete().eq('id', id);
      if (error) errors.push(`Failed to delete world_lore ${id}: ${error.message}`);
    }
  }

  if (ids.ocs) {
    for (const id of ids.ocs) {
      const { error } = await supabase.from('ocs').delete().eq('id', id);
      if (error) errors.push(`Failed to delete oc ${id}: ${error.message}`);
    }
  }

  if (ids.timelines) {
    for (const id of ids.timelines) {
      const { error } = await supabase.from('timelines').delete().eq('id', id);
      if (error) errors.push(`Failed to delete timeline ${id}: ${error.message}`);
    }
  }

  if (ids.worlds) {
    for (const id of ids.worlds) {
      const { error } = await supabase.from('worlds').delete().eq('id', id);
      if (error) errors.push(`Failed to delete world ${id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Cleanup errors:', errors);
  }
}

export function normalizeForComparison(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(normalizeForComparison);
  }

  const normalized: any = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip system fields
    if (['created_at', 'updated_at'].includes(key)) continue;
    
    // Normalize null/undefined/empty string
    if (value === null || value === undefined || value === '') {
      normalized[key] = null;
    } else if (typeof value === 'object') {
      normalized[key] = normalizeForComparison(value);
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}



















