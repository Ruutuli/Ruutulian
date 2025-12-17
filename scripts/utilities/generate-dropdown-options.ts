import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

// Run with: npx tsx scripts/utilities/generate-dropdown-options.ts

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

async function generateDropdownOptions() {
  console.log('Generating dropdown options TypeScript file from database...');

  // Query all options from database (including hex_code for colors)
  const { data, error } = await supabase
    .from('dropdown_options')
    .select('field, option, hex_code')
    .order('field', { ascending: true })
    .order('option', { ascending: true });

  if (error) {
    console.error('Error fetching options from database:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.warn('No options found in database. Generating empty file.');
  }

  // Group options by field, and include hex codes
  const options: Record<string, string[]> = {};
  const hexCodes: Record<string, Record<string, string>> = {}; // field -> option -> hex_code

  if (data) {
    for (const row of data) {
      if (!options[row.field]) {
        options[row.field] = [];
      }
      options[row.field].push(row.option);
      
      // Store hex code if present
      if (row.hex_code) {
        if (!hexCodes[row.field]) {
          hexCodes[row.field] = {};
        }
        hexCodes[row.field][row.option] = row.hex_code;
      }
    }
  }

  // Sort options within each field
  Object.keys(options).forEach(field => {
    options[field].sort();
  });

  // Generate TypeScript file content
  // This file serves as a fallback when database is unavailable
  // The useDropdownOptions hook fetches from database first, then falls back to this file
  const fileContent = `// Auto-generated file - do not edit manually
// Generated from: dropdown_options table in database
// This file is a FALLBACK - the database is the primary source of truth
// The useDropdownOptions hook fetches from database first, then falls back to this file
// Run: npx tsx scripts/utilities/generate-dropdown-options.ts
// Last generated: ${new Date().toISOString()}

export const csvOptions: Record<string, string[]> = ${JSON.stringify(options, null, 2)};

// Hex codes for color options (field -> option -> hex_code)
export const colorHexCodes: Record<string, Record<string, string>> = ${JSON.stringify(hexCodes, null, 2)};

// Individual exports for convenience
${Object.entries(options).map(([key, values]) => 
  `export const ${key}Options: string[] = ${JSON.stringify(values)};`
).join('\n')}
`;

  // Write to file
  const outputPath = path.join(process.cwd(), 'src/lib/utils/csvOptionsData.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf-8');

  console.log(`Generated TypeScript file at: ${outputPath}`);
  console.log(`Extracted options for ${Object.keys(options).length} fields`);
  console.log(`Total options: ${data?.length || 0}`);
}

generateDropdownOptions()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Generation failed:', error);
    process.exit(1);
  });

