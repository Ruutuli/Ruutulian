import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

// Run with: npx tsx scripts/utilities/import-dropdown-options-csv.ts <path-to-csv>
// Example: npx tsx scripts/utilities/import-dropdown-options-csv.ts "e:\Users\Ruu\Downloads\dropdown_options_rows.csv"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function importDropdownOptions(csvPath: string) {
  console.log(`Reading CSV file: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV (skip header row)
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} rows in CSV`);

  // Get existing options to avoid duplicates
  console.log('Fetching existing options from database...');
  const { data: existingData, error: fetchError } = await supabase
    .from('dropdown_options')
    .select('field, option');

  if (fetchError) {
    console.error('Error fetching existing options:', fetchError);
    process.exit(1);
  }

  const existingSet = new Set<string>();
  if (existingData) {
    for (const row of existingData) {
      existingSet.add(`${row.field}:${row.option}`);
    }
  }

  console.log(`Found ${existingSet.size} existing options in database`);

  // Prepare data for insertion (skip duplicates)
  const toInsert: Array<{
    field: string;
    option: string;
    hex_code: string | null;
    updated_at: string;
  }> = [];

  let skipped = 0;
  let added = 0;

  for (const record of records) {
    const field = record.field?.trim();
    const option = record.option?.trim();
    const hexCode = record.hex_code?.trim() || null;

    if (!field || !option) {
      skipped++;
      continue;
    }

    const key = `${field}:${option}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    toInsert.push({
      field,
      option,
      hex_code: hexCode || null,
      updated_at: new Date().toISOString(),
    });
    added++;
  }

  console.log(`\nPrepared ${toInsert.length} new options to insert`);
  console.log(`Skipped ${skipped} duplicates or invalid rows`);

  if (toInsert.length === 0) {
    console.log('No new options to import!');
    return;
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    console.log(`\nInserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} options)...`);

    const { error: insertError } = await supabase
      .from('dropdown_options')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch:`, insertError);
      errors++;
    } else {
      inserted += batch.length;
      console.log(`✓ Inserted ${batch.length} options`);
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`- Inserted: ${inserted} new options`);
  console.log(`- Skipped: ${skipped} duplicates/invalid`);
  if (errors > 0) {
    console.log(`- Errors: ${errors} batches failed`);
  }

  // Show field summary
  const fieldCounts: Record<string, number> = {};
  for (const item of toInsert) {
    fieldCounts[item.field] = (fieldCounts[item.field] || 0) + 1;
  }

  console.log('\nFields imported:');
  Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`  ${field}: ${count} options`);
    });
}

// Get CSV path from command line argument
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: npx tsx scripts/utilities/import-dropdown-options-csv.ts <path-to-csv>');
  console.error('Example: npx tsx scripts/utilities/import-dropdown-options-csv.ts "e:\\Users\\Ruu\\Downloads\\dropdown_options_rows.csv"');
  process.exit(1);
}

importDropdownOptions(csvPath)
  .then(() => {
    console.log('\nDone! Next step: Run npx tsx scripts/utilities/generate-dropdown-options.ts to update JSON backup');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });

