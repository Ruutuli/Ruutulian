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
    console.log(`[${requestId}] Regenerating TypeScript file from database...`);
    
    // Query all options from database
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('field, option')
      .order('field', { ascending: true })
      .order('option', { ascending: true });

    if (error) {
      console.error(`[${requestId}] Error fetching options for regeneration:`, error);
      return false;
    }

    // Group options by field
    const options: Record<string, string[]> = {};
    if (data) {
      for (const row of data) {
        if (!options[row.field]) {
          options[row.field] = [];
        }
        options[row.field].push(row.option);
      }
    }

    // Sort options within each field
    Object.keys(options).forEach(field => {
      options[field].sort();
    });

    // Generate TypeScript file content
    const fileContent = `// Auto-generated file - do not edit manually
// Generated from: dropdown_options table in database
// Run: npx tsx scripts/utilities/generate-dropdown-options.ts
// Last generated: ${new Date().toISOString()}

export const csvOptions: Record<string, string[]> = ${JSON.stringify(options, null, 2)};

// Individual exports for convenience
${Object.entries(options).map(([key, values]) => 
  `export const ${key}Options: string[] = ${JSON.stringify(values)};`
).join('\n')}
`;

    // Write to file
    const outputPath = path.join(process.cwd(), 'src/lib/utils/csvOptionsData.ts');
    fs.writeFileSync(outputPath, fileContent, 'utf-8');

    console.log(`[${requestId}] ✓ TypeScript file regenerated: ${Object.keys(options).length} fields, ${data?.length || 0} total options`);
    return true;
  } catch (error) {
    console.error(`[${requestId}] ✗ Error regenerating TypeScript file:`, error);
    return false;
  }
}

export async function GET() {
  try {
    // Use regular client for reading - RLS allows public read access
    // This ensures options are always available even if auth fails
    const supabase = await createClient();

    // Query all options from database
    const { data, error } = await supabase
      .from('dropdown_options')
      .select('field, option')
      .order('field', { ascending: true })
      .order('option', { ascending: true });

    if (error) {
      console.error('Error fetching dropdown options from database:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dropdown options' },
        { status: 500 }
      );
    }

    // Debug: Also query positive_traits specifically to verify it exists
    const { data: positiveTraitsData, error: positiveTraitsError } = await supabase
      .from('dropdown_options')
      .select('field, option')
      .eq('field', 'positive_traits')
      .order('option', { ascending: true });
    
    console.log('[API] Direct query for positive_traits:', {
      found: positiveTraitsData?.length || 0,
      error: positiveTraitsError,
      sample: positiveTraitsData?.slice(0, 3),
    });

    // Group options by field
    const options: Record<string, string[]> = {};
    
    if (data) {
      // Debug: log all unique fields
      const uniqueFields = new Set(data.map((row: any) => row.field));
      console.log('[API] Unique fields in database response:', Array.from(uniqueFields).sort());
      console.log('[API] Total rows:', data.length);
      
      // Check specifically for positive_traits
      const positiveTraitsRows = data.filter((row: any) => row.field === 'positive_traits');
      console.log('[API] positive_traits rows found:', positiveTraitsRows.length);
      if (positiveTraitsRows.length > 0) {
        console.log('[API] Sample positive_traits:', positiveTraitsRows.slice(0, 5));
      }
      
      for (const row of data) {
        if (!options[row.field]) {
          options[row.field] = [];
        }
        options[row.field].push(row.option);
      }
    }

    // Debug: log what we're returning
    console.log('[API] Returning options for fields:', Object.keys(options).sort());
    console.log('[API] positive_traits in response?', 'positive_traits' in options);
    if ('positive_traits' in options) {
      console.log('[API] positive_traits count:', options['positive_traits'].length);
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dropdown options' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${requestId}] PUT /api/admin/dropdown-options - Starting request`);
  
  try {
    console.log(`[${requestId}] Checking authentication...`);
    const user = await checkAuth();
    if (!user) {
      console.error(`[${requestId}] Authentication failed - no user`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[${requestId}] Authentication successful - user:`, user.id);

    console.log(`[${requestId}] Parsing request body...`);
    const body = await request.json();
    console.log(`[${requestId}] Request body keys:`, Object.keys(body));
    console.log(`[${requestId}] Request body has options:`, !!body.options);
    
    const { options } = body;

    if (!options || typeof options !== 'object') {
      console.error(`[${requestId}] Invalid options data - type:`, typeof options, 'value:', options);
      return NextResponse.json(
        { error: 'Invalid options data' },
        { status: 400 }
      );
    }

    const fieldsCount = Object.keys(options).length;
    const totalOptions = Object.values(options).reduce((sum: number, opts: any) => sum + (Array.isArray(opts) ? opts.length : 0), 0);
    console.log(`[${requestId}] Received ${fieldsCount} fields with ${totalOptions} total options`);
    console.log(`[${requestId}] Fields:`, Object.keys(options));

    const supabase = createAdminClient();
    console.log(`[${requestId}] Supabase admin client created`);

    // Validate field names (basic validation)
    const validFields = [
      'pronouns', 'gender_identity', 'romantic', 'sexual', 'relationship_type',
      'sex', 'accent', 'nationality', 'ethnicity_race', 'species',
      'eye_color', 'hair_color', 'skin_tone', 'occupation',
      'mbti', 'moral', 'positive_traits', 'neutral_traits', 'negative_traits', 'gender'
    ];

    const invalidFields = Object.keys(options).filter(field => !validFields.includes(field));
    if (invalidFields.length > 0) {
      console.error(`[${requestId}] Invalid field names:`, invalidFields);
      console.error(`[${requestId}] Valid fields are:`, validFields);
      return NextResponse.json(
        { error: `Invalid field names: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] All field names are valid`);

    // Get current options from database for comparison
    console.log(`[${requestId}] Fetching current options from database...`);
    const { data: currentData, error: fetchError } = await supabase
      .from('dropdown_options')
      .select('field, option');

    if (fetchError) {
      console.error(`[${requestId}] Error fetching current options:`, fetchError);
      console.error(`[${requestId}] Error details:`, JSON.stringify(fetchError, null, 2));
      return NextResponse.json(
        { error: 'Failed to fetch current options' },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] Fetched ${currentData?.length || 0} current options from database`);

    // Group current options by field
    console.log(`[${requestId}] Grouping current options by field...`);
    const currentOptions: Record<string, Set<string>> = {};
    if (currentData) {
      for (const row of currentData) {
        if (!currentOptions[row.field]) {
          currentOptions[row.field] = new Set();
        }
        currentOptions[row.field].add(row.option);
      }
    }
    const currentFieldsCount = Object.keys(currentOptions).length;
    console.log(`[${requestId}] Current options grouped into ${currentFieldsCount} fields`);

    // Find fields that have changed
    console.log(`[${requestId}] Comparing new options with current options...`);
    const fieldsToUpdate: Record<string, string[]> = {};
    
    Object.entries(options).forEach(([field, newValues]) => {
      if (!Array.isArray(newValues)) {
        console.warn(`[${requestId}] Skipping field ${field}: not an array, type is ${typeof newValues}`);
        return;
      }

      const currentValues = currentOptions[field] || new Set();
      const newSet = new Set(newValues);
      
      console.log(`[${requestId}] Field ${field}: current=${currentValues.size} options, new=${newSet.size} options`);
      
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
      
      const isDifferent = 
        currentValues.size !== newSet.size ||
        exactNewItems.length > 0 ||
        exactRemovedItems.length > 0;

      console.log(`[${requestId}] Field ${field} comparison details:`);
      console.log(`[${requestId}]   - Exact new items (case-sensitive):`, exactNewItems);
      console.log(`[${requestId}]   - Exact removed items (case-sensitive):`, exactRemovedItems);
      console.log(`[${requestId}]   - Case-insensitive new items:`, newItems);
      console.log(`[${requestId}]   - Case-insensitive removed items:`, removedItems);
      
      if (isDifferent) {
        console.log(`[${requestId}] Field ${field} HAS CHANGES - will be updated`);
        if (exactNewItems.length > 0) {
          console.log(`[${requestId}]   ✓ Adding ${exactNewItems.length} new item(s):`, exactNewItems);
        }
        if (exactRemovedItems.length > 0) {
          console.log(`[${requestId}]   ✗ Removing ${exactRemovedItems.length} item(s):`, exactRemovedItems);
        }
        if (currentValues.size !== newSet.size) {
          console.log(`[${requestId}]   Size change: ${currentValues.size} → ${newSet.size}`);
        }
        fieldsToUpdate[field] = newValues;
      } else {
        console.log(`[${requestId}] Field ${field} has NO CHANGES - skipping`);
        // Log a sample for debugging
        if (newValues.length > 0 && field === 'negative_traits') {
          console.log(`[${requestId}]   DEBUG: First 10 new values:`, newValues.slice(0, 10));
          console.log(`[${requestId}]   DEBUG: Last 10 new values:`, newValues.slice(-10));
          console.log(`[${requestId}]   DEBUG: Contains "STUBBORN":`, newValues.includes('STUBBORN'));
          console.log(`[${requestId}]   DEBUG: Contains "stubborn":`, newValues.includes('stubborn'));
          console.log(`[${requestId}]   DEBUG: Current set has "STUBBORN":`, currentValues.has('STUBBORN'));
          console.log(`[${requestId}]   DEBUG: Current set has "stubborn":`, currentValues.has('stubborn'));
        }
      }
    });

    if (Object.keys(fieldsToUpdate).length === 0) {
      console.log(`[${requestId}] No fields need updating - returning early`);
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        updatedFields: [],
      });
    }

    console.log(`[${requestId}] Updating ${Object.keys(fieldsToUpdate).length} fields:`, Object.keys(fieldsToUpdate));
    Object.entries(fieldsToUpdate).forEach(([field, values]) => {
      console.log(`[${requestId}]   - ${field}: ${values.length} options`);
    });

    // Update each field: delete old options, insert new ones
    const updatedFields: string[] = [];
    const errors: string[] = [];

    for (const [field, newOptions] of Object.entries(fieldsToUpdate)) {
      console.log(`[${requestId}] Processing field: ${field} with ${newOptions.length} options`);
      try {
        // Delete existing options for this field
        console.log(`[${requestId}]   Deleting existing options for field ${field}...`);
        const { data: deleteData, error: deleteError, count: deleteCount } = await supabase
          .from('dropdown_options')
          .delete()
          .eq('field', field)
          .select();

        if (deleteError) {
          console.error(`[${requestId}]   Error deleting options for field ${field}:`, deleteError);
          console.error(`[${requestId}]   Delete error details:`, JSON.stringify(deleteError, null, 2));
          errors.push(`Failed to delete options for ${field}: ${deleteError.message}`);
          continue;
        }
        console.log(`[${requestId}]   Deleted ${deleteData?.length || 0} existing options for field ${field}`);

        // Insert new options
        if (newOptions.length > 0) {
          console.log(`[${requestId}]   Preparing ${newOptions.length} options for insertion...`);
          const insertData = newOptions.map(option => ({
            field,
            option: option.trim(),
            updated_at: new Date().toISOString(),
          })).filter(item => item.option.length > 0); // Filter out empty options

          console.log(`[${requestId}]   After filtering empty options: ${insertData.length} options to insert`);
          
          if (insertData.length > 0) {
            console.log(`[${requestId}]   Inserting options into database...`);
            console.log(`[${requestId}]   Insert data sample (first 3):`, insertData.slice(0, 3));
            
            const { data: insertResult, error: insertError } = await supabase
              .from('dropdown_options')
              .insert(insertData)
              .select();

            if (insertError) {
              console.error(`[${requestId}]   Error inserting options for field ${field}:`, insertError);
              console.error(`[${requestId}]   Insert error details:`, JSON.stringify(insertError, null, 2));
              console.error(`[${requestId}]   Insert error code:`, insertError.code);
              console.error(`[${requestId}]   Insert error hint:`, insertError.hint);
              console.error(`[${requestId}]   Insert error details:`, insertError.details);
              errors.push(`Failed to insert options for ${field}: ${insertError.message}`);
              continue;
            }
            console.log(`[${requestId}]   Successfully inserted ${insertResult?.length || 0} options for field ${field}`);
          } else {
            console.log(`[${requestId}]   No valid options to insert for field ${field} (all were empty)`);
          }
        } else {
          console.log(`[${requestId}]   No new options to insert for field ${field} (array is empty)`);
        }

        updatedFields.push(field);
        console.log(`[${requestId}]   ✓ Successfully updated field ${field} with ${newOptions.length} options`);
      } catch (error) {
        console.error(`[${requestId}]   ✗ Error updating field ${field}:`, error);
        if (error instanceof Error) {
          console.error(`[${requestId}]   Error name:`, error.name);
          console.error(`[${requestId}]   Error message:`, error.message);
          console.error(`[${requestId}]   Error stack:`, error.stack);
        }
        errors.push(`Failed to update ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[${requestId}] Update operation completed`);
    console.log(`[${requestId}] Updated fields: ${updatedFields.length}`);
    console.log(`[${requestId}] Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.error(`[${requestId}] Some fields failed to update:`, errors);
      return NextResponse.json(
        {
          error: 'Some fields failed to update',
          details: errors,
          updatedFields,
        },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] ✓ All fields updated successfully`);
    
    // Regenerate TypeScript file so form components have the latest options
    // Do this asynchronously so it doesn't block the response
    regenerateTypeScriptFile(supabase, requestId).then(success => {
      if (success) {
        console.log(`[${requestId}] ✓ TypeScript file regeneration completed`);
      } else {
        console.warn(`[${requestId}] ⚠ TypeScript file regeneration failed, but database update succeeded`);
      }
    }).catch(err => {
      console.error(`[${requestId}] ⚠ TypeScript file regeneration error:`, err);
    });

    return NextResponse.json({ 
      success: true, 
      message: `Options saved successfully for ${updatedFields.length} field(s)`,
      updatedFields,
    });
  } catch (error) {
    console.error(`[${requestId}] ✗ Fatal error saving dropdown options:`, error);
    if (error instanceof Error) {
      console.error(`[${requestId}] Error name:`, error.name);
      console.error(`[${requestId}] Error message:`, error.message);
      console.error(`[${requestId}] Error stack:`, error.stack);
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to save dropdown options';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
