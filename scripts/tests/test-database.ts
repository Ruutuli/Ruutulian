/**
 * Database Connection and Operations Test Script
 * 
 * This script tests:
 * - Supabase connection
 * - Reading from all tables
 * - Writing/updating/deleting operations
 * - Row Level Security (RLS) policies
 * - Relationships and joins
 * 
 * Run with: npx tsx scripts/tests/test-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details && !passed) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
  results.push({ name, passed, error, details });
}

async function testConnection() {
  console.log('\n🔌 Testing Supabase Connection...\n');
  
  try {
    const { data, error } = await anonClient.from('worlds').select('count').limit(0);
    if (error) throw error;
    logTest('Connection to Supabase', true);
  } catch (error: any) {
    logTest('Connection to Supabase', false, error.message);
  }
}

async function testReadOperations() {
  console.log('\n📖 Testing Read Operations...\n');
  
  // Test reading worlds
  try {
    const { data, error } = await anonClient
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .limit(5);
    
    if (error) throw error;
    logTest('Read public worlds', true, undefined, { count: data?.length || 0 });
  } catch (error: any) {
    logTest('Read public worlds', false, error.message);
  }
  
  // Test reading OCs
  try {
    const { data, error } = await anonClient
      .from('ocs')
      .select('*, world:worlds(*)')
      .eq('is_public', true)
      .limit(5);
    
    if (error) throw error;
    logTest('Read public OCs with world join', true, undefined, { count: data?.length || 0 });
  } catch (error: any) {
    logTest('Read public OCs with world join', false, error.message);
  }
  
  // Test reading timelines
  try {
    const { data, error } = await anonClient
      .from('timelines')
      .select('*, world:worlds(*)')
      .limit(5);
    
    if (error) throw error;
    logTest('Read timelines with world join', true, undefined, { count: data?.length || 0 });
  } catch (error: any) {
    logTest('Read timelines with world join', false, error.message);
  }
  
  // Test reading timeline events
  try {
    const { data, error } = await anonClient
      .from('timeline_events')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    logTest('Read timeline events', true, undefined, { count: data?.length || 0 });
  } catch (error: any) {
    logTest('Read timeline events', false, error.message);
  }
  
  // Test reading oc_identities (if table exists)
  try {
    const { data, error } = await anonClient
      .from('oc_identities')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    logTest('Read OC identities', true, undefined, { count: data?.length || 0 });
  } catch (error: any) {
    logTest('Read OC identities', false, error.message);
  }
}

async function testWriteOperations() {
  console.log('\n✍️  Testing Write Operations...\n');
  
  if (!serviceClient) {
    logTest('Write operations (requires service role key)', false, 'SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }
  
  // Test creating a test world
  const testWorldSlug = `test-world-${Date.now()}`;
  try {
    const { data, error } = await serviceClient
      .from('worlds')
      .insert({
        name: 'Test World',
        slug: testWorldSlug,
        series_type: 'original',
        summary: 'This is a test world for database testing',
        is_public: false, // Make it private so it doesn't show in public views
      })
      .select()
      .single();
    
    if (error) throw error;
    logTest('Create world', true, undefined, { id: data.id });
    
    // Test updating the world
    const { data: updatedData, error: updateError } = await serviceClient
      .from('worlds')
      .update({ summary: 'Updated test summary' })
      .eq('id', data.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    logTest('Update world', true);
    
    // Test creating a test OC
    const testOCSlug = `test-oc-${Date.now()}`;
    const { data: ocData, error: ocError } = await serviceClient
      .from('ocs')
      .insert({
        name: 'Test OC',
        slug: testOCSlug,
        world_id: data.id,
        template_type: 'original',
        status: 'alive',
        is_public: false,
      })
      .select()
      .single();
    
    if (ocError) throw ocError;
    logTest('Create OC', true, undefined, { id: ocData.id });
    
    // Test updating the OC
    const { data: updatedOC, error: updateOCError } = await serviceClient
      .from('ocs')
      .update({ name: 'Updated Test OC' })
      .eq('id', ocData.id)
      .select()
      .single();
    
    if (updateOCError) throw updateOCError;
    logTest('Update OC', true);
    
    // Cleanup: Delete test data
    await serviceClient.from('ocs').delete().eq('id', ocData.id);
    await serviceClient.from('worlds').delete().eq('id', data.id);
    logTest('Delete test data (cleanup)', true);
    
  } catch (error: any) {
    logTest('Write operations', false, error.message);
    
    // Try to cleanup on error
    try {
      await serviceClient?.from('ocs').delete().like('slug', 'test-%');
      await serviceClient?.from('worlds').delete().like('slug', 'test-%');
    } catch {}
  }
}

async function testRLSPolicies() {
  console.log('\n🔒 Testing Row Level Security (RLS)...\n');
  
  // Test that anonymous users can read public data
  try {
    const { data, error } = await anonClient
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .limit(1);
    
    if (error) throw error;
    logTest('Anonymous can read public worlds', true);
  } catch (error: any) {
    logTest('Anonymous can read public worlds', false, error.message);
  }
  
  // Test that anonymous users cannot read private data
  try {
    const { data, error } = await anonClient
      .from('worlds')
      .select('*')
      .eq('is_public', false)
      .limit(1);
    
    // This should either return empty array or error
    if (error && error.code === 'PGRST301') {
      logTest('Anonymous cannot read private worlds (RLS working)', true);
    } else if (data && data.length === 0) {
      logTest('Anonymous cannot read private worlds (RLS working)', true);
    } else {
      logTest('Anonymous cannot read private worlds (RLS working)', false, 'RLS may not be properly configured');
    }
  } catch (error: any) {
    if (error.code === 'PGRST301') {
      logTest('Anonymous cannot read private worlds (RLS working)', true);
    } else {
      logTest('Anonymous cannot read private worlds (RLS working)', false, error.message);
    }
  }
  
  // Test that anonymous users cannot write
  try {
    const { error } = await anonClient
      .from('worlds')
      .insert({
        name: 'Unauthorized Test',
        slug: `unauthorized-${Date.now()}`,
        series_type: 'original',
        summary: 'This should fail',
      });
    
    if (error && (error.code === '42501' || error.code === 'PGRST301')) {
      logTest('Anonymous cannot write (RLS working)', true);
    } else {
      logTest('Anonymous cannot write (RLS working)', false, 'RLS may allow anonymous writes');
    }
  } catch (error: any) {
    if (error.code === '42501' || error.code === 'PGRST301') {
      logTest('Anonymous cannot write (RLS working)', true);
    } else {
      logTest('Anonymous cannot write (RLS working)', false, error.message);
    }
  }
}

async function testRelationships() {
  console.log('\n🔗 Testing Relationships...\n');
  
  // Test OC -> World relationship
  try {
    const { data, error } = await anonClient
      .from('ocs')
      .select('*, world:worlds(*)')
      .eq('is_public', true)
      .limit(1)
      .single();
    
    if (error) throw error;
    
    if (data && data.world) {
      logTest('OC to World relationship', true);
    } else {
      logTest('OC to World relationship', false, 'World data not returned in join');
    }
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      logTest('OC to World relationship', false, 'No public OCs found to test relationship');
    } else {
      logTest('OC to World relationship', false, error.message);
    }
  }
  
  // Test Timeline -> World relationship
  try {
    const { data, error } = await anonClient
      .from('timelines')
      .select('*, world:worlds(*)')
      .limit(1)
      .single();
    
    if (error) throw error;
    
    if (data && data.world) {
      logTest('Timeline to World relationship', true);
    } else {
      logTest('Timeline to World relationship', false, 'World data not returned in join');
    }
  } catch (error: any) {
    if (error.code === 'PGRST116') {
      logTest('Timeline to World relationship', false, 'No timelines found to test relationship');
    } else {
      logTest('Timeline to World relationship', false, error.message);
    }
  }
}

async function testConstraints() {
  console.log('\n⚙️  Testing Database Constraints...\n');
  
  if (!serviceClient) {
    logTest('Constraint tests (requires service role key)', false, 'SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }
  
  // Test unique slug constraint
  try {
    // First, get an existing world
    const { data: existingWorld } = await serviceClient
      .from('worlds')
      .select('slug')
      .limit(1)
      .single();
    
    if (existingWorld) {
      const { error } = await serviceClient
        .from('worlds')
        .insert({
          name: 'Duplicate Slug Test',
          slug: existingWorld.slug, // Try to use existing slug
          series_type: 'original',
          summary: 'This should fail',
        });
      
      if (error && error.code === '23505') {
        logTest('Unique slug constraint', true);
      } else {
        logTest('Unique slug constraint', false, 'Unique constraint may not be working');
      }
    } else {
      logTest('Unique slug constraint', false, 'No existing worlds to test against');
    }
  } catch (error: any) {
    logTest('Unique slug constraint', false, error.message);
  }
  
  // Test foreign key constraint (OC requires valid world_id)
  try {
    const { error } = await serviceClient
      .from('ocs')
      .insert({
        name: 'Invalid FK Test',
        slug: `invalid-fk-${Date.now()}`,
        world_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        template_type: 'original',
        status: 'alive',
      });
    
    if (error && (error.code === '23503' || error.message.includes('foreign key'))) {
      logTest('Foreign key constraint (world_id)', true);
    } else {
      logTest('Foreign key constraint (world_id)', false, 'Foreign key constraint may not be working');
    }
  } catch (error: any) {
    if (error.code === '23503') {
      logTest('Foreign key constraint (world_id)', true);
    } else {
      logTest('Foreign key constraint (world_id)', false, error.message);
    }
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Testing Environment Variables...\n');
  
  logTest('NEXT_PUBLIC_SUPABASE_URL is set', !!SUPABASE_URL);
  logTest('NEXT_PUBLIC_SUPABASE_ANON_KEY is set', !!SUPABASE_ANON_KEY);
  logTest('SUPABASE_SERVICE_ROLE_KEY is set', !!SUPABASE_SERVICE_KEY);
  
  if (SUPABASE_URL) {
    const isValidUrl = SUPABASE_URL.startsWith('https://') && SUPABASE_URL.includes('.supabase.co');
    logTest('SUPABASE_URL format is valid', isValidUrl);
  }
  
  if (SUPABASE_ANON_KEY) {
    const isValidKey = SUPABASE_ANON_KEY.startsWith('eyJ');
    logTest('ANON_KEY format is valid (JWT)', isValidKey);
  }
}

async function runAllTests() {
  console.log('🧪 Database Connection and Operations Test\n');
  console.log('='.repeat(50));
  
  await testEnvironmentVariables();
  await testConnection();
  await testReadOperations();
  await testWriteOperations();
  await testRLSPolicies();
  await testRelationships();
  await testConstraints();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.name}`);
        if (r.error) console.log(`     Error: ${r.error}`);
      });
    console.log('\n⚠️  Please review the failed tests and check your Supabase settings.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Your database setup looks good.\n');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
















