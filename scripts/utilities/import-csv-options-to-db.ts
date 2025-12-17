import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

// Run with: npx tsx scripts/utilities/import-csv-options-to-db.ts "Ruu's OC List 2025 - [INFO] (2).csv"

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

// Map CSV column names to database field names
const fieldMapping: Record<string, string> = {
  'PRONOUNS': 'pronouns',
  'ROMANTIC ORIENTATION': 'romantic',
  'SEXUAL ORIENTATION ': 'sexual', // Note: has trailing space in CSV
  'SEXUAL ORIENTATION': 'sexual', // Also handle without trailing space
  'GENDER IDENTITY ': 'gender_identity', // Note: has trailing space
  'GENDER IDENTITY': 'gender_identity',
  'JUNG': 'mbti',
  'MORAL': 'moral',
  'RELATIONSHIP STRUCTURE': 'relationship_type',
  'SEX': 'sex',
  'ACCENT ': 'accent', // Note: has trailing space
  'ACCENT': 'accent',
  'NATIONALITY': 'nationality',
  'RACE / ETHNICITY': 'ethnicity_race',
  'SPECIES': 'species',
  'POS PERSONALITY': 'positive_traits',
  'NUE PERSONALITY': 'neutral_traits',
  'NEG PERSONALITY': 'negative_traits',
  'SKIN TONE': 'skin_tone',
  'OCCUPATION': 'occupation',
};

async function importCsvOptions(csvPath: string) {
  console.log(`Reading CSV file: ${csvPath}`);
  
  const fullPath = path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`CSV file not found: ${fullPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(fullPath, 'utf-8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} rows in CSV`);

  // Get existing options to avoid duplicates (case-insensitive check)
  console.log('Fetching existing options from database...');
  const { data: existingData, error: fetchError } = await supabase
    .from('dropdown_options')
    .select('field, option');

  if (fetchError) {
    console.error('Error fetching existing options:', fetchError);
    process.exit(1);
  }

  // Use case-insensitive matching for duplicates
  const existingSet = new Set<string>();
  if (existingData) {
    for (const row of existingData) {
      const key = `${row.field.toLowerCase()}:${row.option.toLowerCase()}`;
      existingSet.add(key);
    }
  }

  console.log(`Found ${existingSet.size} existing options in database`);

  // Extract unique values from each column
  const fieldOptions: Record<string, Set<string>> = {};

  for (const record of records) {
    for (const [csvColumn, dbField] of Object.entries(fieldMapping)) {
      const value = record[csvColumn]?.trim();
      
      if (!value || value === '') {
        continue;
      }

      // Handle special cases
      if (dbField === 'positive_traits' || dbField === 'neutral_traits' || dbField === 'negative_traits') {
        // These might be comma-separated, split them
        const values = (value as string).split(',').map((v: string) => v.trim()).filter((v: string) => v);
        for (const val of values) {
          if (!fieldOptions[dbField]) {
            fieldOptions[dbField] = new Set();
          }
          fieldOptions[dbField].add(val);
        }
      } else {
        if (!fieldOptions[dbField]) {
          fieldOptions[dbField] = new Set();
        }
        fieldOptions[dbField].add(value);
      }
    }
  }

  // Prepare data for insertion
  const toInsert: Array<{
    field: string;
    option: string;
    hex_code: string | null;
    updated_at: string;
  }> = [];

  let skipped = 0;
  let added = 0;

  for (const [field, options] of Object.entries(fieldOptions)) {
    for (const option of options) {
      // Check for duplicates (case-insensitive)
      const key = `${field.toLowerCase()}:${option.toLowerCase()}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      toInsert.push({
        field,
        option,
        hex_code: null, // No hex codes from this CSV
        updated_at: new Date().toISOString(),
      });
      added++;
      // Add to set to avoid duplicates within the same import
      existingSet.add(key);
    }
  }

  console.log(`\nPrepared ${toInsert.length} new options to insert`);
  console.log(`Skipped ${skipped} duplicates`);

  // Show summary by field
  const fieldCounts: Record<string, number> = {};
  for (const item of toInsert) {
    fieldCounts[item.field] = (fieldCounts[item.field] || 0) + 1;
  }

  console.log('\nOptions to import by field:');
  Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`  ${field}: ${count} options`);
    });

  if (toInsert.length === 0) {
    console.log('\nNo new options to import!');
    return;
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    console.log(`\nInserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} options)...`);

    // Use upsert with ON CONFLICT DO NOTHING to handle duplicates gracefully
    const { error: insertError } = await supabase
      .from('dropdown_options')
      .upsert(batch, {
        onConflict: 'field,option',
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.error(`Error inserting batch:`, insertError);
      // Try inserting one by one to identify problematic entries
      console.log('Attempting individual inserts to identify problematic entries...');
      for (const item of batch) {
        const { error: singleError } = await supabase
          .from('dropdown_options')
          .upsert([item], {
            onConflict: 'field,option',
            ignoreDuplicates: true,
          });
        if (singleError) {
          console.error(`  Failed to insert ${item.field}: ${item.option} - ${singleError.message}`);
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      console.log(`✓ Inserted ${batch.length} options`);
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`- Inserted: ${inserted} new options`);
  console.log(`- Skipped: ${skipped} duplicates`);
  if (errors > 0) {
    console.log(`- Errors: ${errors} batches failed`);
  }
}

// Get CSV path from command line argument
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: npx tsx scripts/utilities/import-csv-options-to-db.ts <csv-file>');
  console.error(`Example: npx tsx scripts/utilities/import-csv-options-to-db.ts "Ruu's OC List 2025 - [INFO] (2).csv"`);
  process.exit(1);
}

importCsvOptions(csvPath)
  .then(() => {
    console.log('\nDone! Next step: Run npx tsx scripts/utilities/generate-dropdown-options.ts to update JSON backup');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });

