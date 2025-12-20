import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Regenerates the csvOptionsData.ts file from the database
 * This ensures form components have the latest options
 */
async function regenerateTypeScriptFile(supabase: any, requestId: string) {
  try {
    // Query all options from database (including hex_code for colors)
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('field, option, hex_code')
      .order('field', { ascending: true })
      .order('option', { ascending: true });

    if (error) {
      console.error(`[${requestId}] Regeneration fetch error:`, error);
      return false;
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

    return true;
  } catch (error) {
    console.error(`[${requestId}] Regeneration error:`, error);
    return false;
  }
}

export async function GET() {
  try {
    // Use regular client for reading - RLS allows public read access
    // This ensures options are always available even if auth fails
    const supabase = await createClient();

    // Query all options from database - use range to get all rows
    // Supabase defaults to 1000 rows, so we need to explicitly request more
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('dropdown_options')
        .select('field, option, hex_code')
        .order('field', { ascending: true })
        .order('option', { ascending: true })
        .range(from, from + pageSize - 1);
      
      if (pageError) {
        console.error('[API] Error fetching dropdown options:', pageError);
        return NextResponse.json(
          { error: 'Failed to fetch dropdown options' },
          { status: 500 }
        );
      }
      
      if (pageData && pageData.length > 0) {
        allData = [...allData, ...pageData];
        from += pageSize;
        hasMore = pageData.length === pageSize; // If we got a full page, there might be more
      } else {
        hasMore = false;
      }
    }
    
    const data = allData;
    
    console.log(`[API] Fetched ${data.length} total rows from database`);

    // Group options by field, and include hex codes for colors
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
    
    console.log(`[API] Returning ${Object.keys(options).length} fields with options`);

    return NextResponse.json({ options, hexCodes });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dropdown options' },
      { status: 500 }
    );
  }
}

/**
 * @deprecated This endpoint is deprecated. Options are now auto-created when users enter custom values in forms.
 * The standalone dropdown options admin page has been removed.
 * Use POST /api/admin/dropdown-options/[field] to create individual options instead.
 */
export async function PUT(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const user = await checkAuth();
    if (!user) {
      console.error(`[${requestId}] Unauthorized`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { options, hexCodes } = body;

    if (!options || typeof options !== 'object') {
      console.error(`[${requestId}] Invalid options data - type:`, typeof options, 'value:', options);
      return NextResponse.json(
        { error: 'Invalid options data' },
        { status: 400 }
      );
    }

    const fieldsCount = Object.keys(options).length;
    const totalOptions = Object.values(options).reduce((sum: number, opts: any) => sum + (Array.isArray(opts) ? opts.length : 0), 0);
    console.log(`[${requestId}] PUT: ${fieldsCount} fields, ${totalOptions} options`);

    const supabase = createAdminClient();

    // Validate field names (basic validation)
    const validFields = [
      'pronouns', 'gender_identity', 'romantic', 'sexual', 'relationship_type',
      'sex', 'accent', 'nationality', 'ethnicity_race', 'species',
      'eye_color', 'hair_color', 'skin_tone', 'occupation',
      'mbti', 'moral', 'positive_traits', 'neutral_traits', 'negative_traits', 'gender'
    ];

    const invalidFields = Object.keys(options).filter(field => !validFields.includes(field));
    if (invalidFields.length > 0) {
      console.error(`[${requestId}] Invalid fields: ${invalidFields.join(', ')}`);
      return NextResponse.json(
        { error: `Invalid field names: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Get current options from database for comparison (including hex codes)
    const { data: currentData, error: fetchError } = await supabase
      .from('dropdown_options')
      .select('field, option, hex_code');

    if (fetchError) {
      console.error(`[${requestId}] Error fetching current options:`, fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current options' },
        { status: 500 }
      );
    }

    // Group current options by field, and track hex codes
    const currentOptions: Record<string, Set<string>> = {};
    const currentHexCodes: Record<string, Record<string, string>> = {}; // field -> option -> hex_code
    if (currentData) {
      for (const row of currentData) {
        if (!currentOptions[row.field]) {
          currentOptions[row.field] = new Set();
        }
        currentOptions[row.field].add(row.option);
        
        // Track hex codes
        if (row.hex_code) {
          if (!currentHexCodes[row.field]) {
            currentHexCodes[row.field] = {};
          }
          currentHexCodes[row.field][row.option] = row.hex_code;
        }
      }
    }

    // Find fields that have changed
    const fieldsToUpdate: Record<string, string[]> = {};
    
    Object.entries(options).forEach(([field, newValues]) => {
      if (!Array.isArray(newValues)) {
        console.warn(`[${requestId}] Skipping ${field}: not an array`);
        return;
      }

      const currentValues = currentOptions[field] || new Set();
      const newSet = new Set(newValues);
      
      // Find items that are in new but not in current (case-insensitive)
      const newItems: string[] = [];
      const currentValuesLower = new Set(Array.from(currentValues).map(v => v.trim().toLowerCase()));
      
      for (const val of newValues) {
        const trimmed = val.trim();
        const normalized = trimmed.toLowerCase();
        if (!currentValuesLower.has(normalized)) {
          newItems.push(trimmed);
        }
      }
      
      // Find items that are in current but not in new (case-insensitive)
      const removedItems: string[] = [];
      const newValuesLower = new Set(newValues.map(v => v.trim().toLowerCase()));
      
      for (const val of currentValues) {
        const trimmed = val.trim();
        const normalized = trimmed.toLowerCase();
        if (!newValuesLower.has(normalized)) {
          removedItems.push(trimmed);
        }
      }
      
      // Check if arrays are different (exact match, case-sensitive)
      const exactNewItems = newValues.filter(val => !currentValues.has(val.trim()));
      const exactRemovedItems = Array.from(currentValues).filter(val => !newSet.has(val.trim()));
      
      // Check if hex codes changed for existing options
      const hexCodesChanged = newValues.some(val => {
        const trimmed = val.trim();
        const newHex = hexCodes?.[field]?.[trimmed] || null;
        const currentHex = currentHexCodes[field]?.[trimmed] || null;
        return newHex !== currentHex;
      });
      
      const isDifferent = 
        currentValues.size !== newSet.size ||
        exactNewItems.length > 0 ||
        exactRemovedItems.length > 0 ||
        hexCodesChanged;

      if (isDifferent) {
        const changes = [];
        if (exactNewItems.length > 0) changes.push(`+${exactNewItems.length}`);
        if (exactRemovedItems.length > 0) changes.push(`-${exactRemovedItems.length}`);
        if (hexCodesChanged) changes.push('hex');
        console.log(`[${requestId}] ${field}: ${currentValues.size} → ${newSet.size} (${changes.join(', ')})`);
        fieldsToUpdate[field] = newValues;
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        updatedFields: [],
      });
    }

    console.log(`[${requestId}] Updating ${Object.keys(fieldsToUpdate).length} fields:`, Object.keys(fieldsToUpdate));
    // Update each field: delete old options, insert new ones
    const updatedFields: string[] = [];
    const errors: string[] = [];

    for (const [field, newOptions] of Object.entries(fieldsToUpdate)) {
      try {
        // Delete existing options for this field
        const { error: deleteError } = await supabase
          .from('dropdown_options')
          .delete()
          .eq('field', field);

        if (deleteError) {
          console.error(`[${requestId}] Delete ${field} failed:`, deleteError.message);
          errors.push(`Failed to delete options for ${field}: ${deleteError.message}`);
          continue;
        }

        // Insert new options
        if (newOptions.length > 0) {
          const insertData = newOptions.map(option => {
            const trimmedOption = option.trim();
            const hexCode = hexCodes?.[field]?.[trimmedOption] || null;
            return {
              field,
              option: trimmedOption,
              hex_code: hexCode,
              updated_at: new Date().toISOString(),
            };
          }).filter(item => item.option.length > 0);
          
          if (insertData.length > 0) {
            const { error: insertError } = await supabase
              .from('dropdown_options')
              .insert(insertData)
              .select();

            if (insertError) {
              console.error(`[${requestId}] Failed to insert ${field}:`, insertError.message);
              errors.push(`Failed to insert options for ${field}: ${insertError.message}`);
              continue;
            }
          }
        }

        updatedFields.push(field);
      } catch (error) {
        console.error(`[${requestId}] Error updating ${field}:`, error instanceof Error ? error.message : error);
        errors.push(`Failed to update ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      console.error(`[${requestId}] ${updatedFields.length} updated, ${errors.length} failed`);
      return NextResponse.json(
        {
          error: 'Some fields failed to update',
          details: errors,
          updatedFields,
        },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] ✓ Updated ${updatedFields.length} fields`);
    
    // Regenerate TypeScript file so form components have the latest options
    // Do this asynchronously so it doesn't block the response
    regenerateTypeScriptFile(supabase, requestId).catch(err => {
      console.warn(`[${requestId}] TypeScript regeneration failed:`, err);
    });

    return NextResponse.json({ 
      success: true, 
      message: `Options saved successfully for ${updatedFields.length} field(s)`,
      updatedFields,
    });
  } catch (error) {
    console.error(`[${requestId}] Fatal error:`, error instanceof Error ? error.message : error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save dropdown options';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
