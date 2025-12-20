/**
 * OC Save Integrity Test
 * 
 * Tests OC create/edit flows to verify all fields save correctly
 * 
 * Run with: npx tsx scripts/tests/test-oc-save-integrity.ts
 */

import { supabase, logTest, compareObjects, createTestWorld, cleanupTestData, normalizeForComparison, TestResult } from './test-utils';

interface TestData {
  worldId: string;
  ocId?: string;
  identityId?: string;
}

async function testOCCreate(): Promise<TestResult> {
  console.log('\n📝 Testing OC Create Flow...\n');

  let testWorld: any = null;
  let testOC: any = null;
  let testIdentity: any = null;

  try {
    // Create test world
    testWorld = await createTestWorld();
    console.log(`✓ Created test world: ${testWorld.id}`);

    // Create test identity
    const { data: identity, error: identityError } = await supabase
      .from('oc_identities')
      .insert({ name: 'Test OC Identity' })
      .select()
      .single();

    if (identityError) throw identityError;
    testIdentity = identity;
    console.log(`✓ Created test identity: ${testIdentity.id}`);

    // Prepare OC data with all fields
    const ocData = {
      name: 'Test OC',
      slug: `test-oc-${Date.now()}`,
      world_id: testWorld.id,
      series_type: 'original',
      template_type: 'original',
      identity_id: testIdentity.id,
      age: 25,
      pronouns: 'they/them',
      gender_identity: 'non-binary',
      status: 'alive',
      image_url: 'https://example.com/image.jpg',
      icon_url: 'https://example.com/icon.jpg',
      tags: ['tag1', 'tag2'],
      short_bio: 'Test bio',
      full_bio_markdown: '# Test Bio\n\nThis is a test.',
      extra_fields: { test_field: 'test_value' },
      modular_fields: { custom_field: 'custom_value' },
      is_public: false,
      first_name: 'Test',
      last_name: 'OC',
      alias: 'Testy',
      date_of_birth: '1998-01-01',
      occupation: 'Tester',
      gender: 'non-binary',
      sex: 'other',
      romantic: 'panromantic',
      sexual: 'pansexual',
      relationship_type: 'single',
      nationality: 'Test',
      ethnicity_race: 'Test',
      species: 'Human',
      height: '5\'10"',
      weight: '150 lbs',
      eye_color: 'Brown',
      hair_color: 'Black',
      skin_tone: 'Medium',
      build: 'Average',
      notes: 'Test notes',
      hometown: 'Test City',
      current_home: 'Test Home',
      languages: ['English', 'Test'],
      maternal_parent: 'Test Mom',
      paternal_parent: 'Test Dad',
      ship: 'Test Ship',
      relationships: 'Test relationships',
      star_sign: 'Capricorn',
      likes: 'Testing',
      dislikes: 'Bugs',
      voice_actor: 'Test VA',
      seiyuu: 'Test Seiyuu',
      theme_song: 'Test Song',
      personality: 'Test personality',
      positive_traits: 'Kind, helpful',
      neutral_traits: 'Quiet',
      negative_traits: 'Stubborn',
      mbti: 'INTJ',
      history: 'Test history',
      trivia: 'Test trivia',
    };

    // Create OC via API simulation (direct DB insert for testing)
    const { data: createdOC, error: createError } = await supabase
      .from('ocs')
      .insert(ocData)
      .select()
      .single();

    if (createError) throw createError;
    testOC = createdOC;
    console.log(`✓ Created OC: ${testOC.id}`);

    // Reload from database
    const { data: reloadedOC, error: reloadError } = await supabase
      .from('ocs')
      .select('*')
      .eq('id', testOC.id)
      .single();

    if (reloadError) throw reloadError;

    // Compare
    const normalizedOriginal = normalizeForComparison(ocData);
    const normalizedReloaded = normalizeForComparison(reloadedOC);
    const comparison = compareObjects(normalizedOriginal, normalizedReloaded, ['id', 'created_at', 'updated_at']);

    if (comparison.equal) {
      return logTest('OC Create - All fields saved correctly', true);
    } else {
      return logTest('OC Create - Field mismatch detected', false, undefined, {
        differences: comparison.differences,
      });
    }
  } catch (error: any) {
    return logTest('OC Create - Error', false, error.message);
  } finally {
    // Cleanup
    if (testOC) {
      await cleanupTestData({ ocs: [testOC.id] });
    }
    if (testIdentity) {
      await supabase.from('oc_identities').delete().eq('id', testIdentity.id);
    }
    if (testWorld) {
      await cleanupTestData({ worlds: [testWorld.id] });
    }
  }
}

async function testOCEdit(): Promise<TestResult> {
  console.log('\n✏️  Testing OC Edit Flow...\n');

  let testWorld: any = null;
  let testOC: any = null;

  try {
    // Create test world and OC
    testWorld = await createTestWorld();
    const { data: identity } = await supabase
      .from('oc_identities')
      .insert({ name: 'Test Identity' })
      .select()
      .single();

    const { data: oc } = await supabase
      .from('ocs')
      .insert({
        name: 'Original OC',
        slug: `original-oc-${Date.now()}`,
        world_id: testWorld.id,
        template_type: 'original',
        identity_id: identity.id,
        status: 'alive',
        is_public: false,
      })
      .select()
      .single();

    testOC = oc;

    // Prepare update data
    const updateData = {
      name: 'Updated OC',
      age: 30,
      pronouns: 'she/her',
      tags: ['updated', 'tags'],
      short_bio: 'Updated bio',
      extra_fields: { updated: true },
      modular_fields: { updated_field: 'updated_value' },
      first_name: 'Updated',
      last_name: 'Name',
    };

    // Update OC
    const { data: updatedOC, error: updateError } = await supabase
      .from('ocs')
      .update(updateData)
      .eq('id', testOC.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Reload and verify
    const { data: reloadedOC, error: reloadError } = await supabase
      .from('ocs')
      .select('*')
      .eq('id', testOC.id)
      .single();

    if (reloadError) throw reloadError;

    // Verify updated fields
    const allMatch = Object.entries(updateData).every(([key, value]) => {
      const reloadedValue = reloadedOC[key];
      if (typeof value === 'object') {
        return JSON.stringify(reloadedValue) === JSON.stringify(value);
      }
      return reloadedValue === value;
    });

    if (allMatch) {
      return logTest('OC Edit - All fields updated correctly', true);
    } else {
      return logTest('OC Edit - Some fields not updated', false, undefined, {
        updateData,
        reloadedData: reloadedOC,
      });
    }
  } catch (error: any) {
    return logTest('OC Edit - Error', false, error.message);
  } finally {
    if (testOC) {
      await cleanupTestData({ ocs: [testOC.id] });
    }
    if (testWorld) {
      await cleanupTestData({ worlds: [testWorld.id] });
    }
  }
}

async function main() {
  console.log('🧪 OC Save Integrity Tests\n');
  console.log('='.repeat(50));

  const results: TestResult[] = [];

  results.push(await testOCCreate());
  results.push(await testOCEdit());

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   - ${r.name}`);
        if (r.error) console.log(`     Error: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
















