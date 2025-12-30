import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

// In-memory cache with TTL
interface CacheEntry {
  data: { options: Record<string, string[]>; hexCodes: Record<string, Record<string, string>> };
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cache: CacheEntry | null = null;

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  try {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Use admin client for reading to bypass RLS and ensure options are always available
    // This ensures dropdowns work even if RLS policies aren't configured correctly
    const supabase = createAdminClient();

    // Query all options from database - use range to get all rows
    // Supabase defaults to 1000 rows, so we need to explicitly request more
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    // Try to select with 'option' column first, fallback to 'value' if that fails
    let selectColumns = 'field, option, hex_code';
    let orderColumn = 'option';
    
    // First attempt: try with 'option' column
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('dropdown_options')
        .select(selectColumns)
        .order('field', { ascending: true })
        .order(orderColumn, { ascending: true })
        .range(from, from + pageSize - 1);
      
      // If error and we haven't tried fallback yet, try with 'value' column
      if (pageError && selectColumns.includes('option') && !selectColumns.includes('value')) {
        logger.warn('DropdownOptions', 'Column "option" not found, trying "value" instead', { error: pageError });
        selectColumns = 'field, value, hex_code';
        orderColumn = 'value';
        from = 0; // Reset pagination
        hasMore = true;
        continue;
      }
      
      if (pageError) {
        logger.error('DropdownOptions', 'Error fetching dropdown options', { error: pageError });
        cache = null; // Clear cache on error
        return NextResponse.json(
          { 
            error: 'Failed to fetch dropdown options', 
            details: pageError.message,
            hint: 'Check if the dropdown_options table exists and has the correct schema (field, option, hex_code columns)'
          },
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

    // Group options by field, and include hex codes for colors
    const options: Record<string, string[]> = {};
    const hexCodes: Record<string, Record<string, string>> = {}; // field -> option -> hex_code
    
    if (data && data.length > 0) {
      for (const row of data) {
        // Handle both 'option' and 'value' column names
        const optionValue = row.option || row.value;
        if (!optionValue) {
          logger.warn('DropdownOptions', 'Row missing option/value', { row });
          continue;
        }
        
        if (!row.field) {
          logger.warn('DropdownOptions', 'Row missing field', { row });
          continue;
        }
        
        if (!options[row.field]) {
          options[row.field] = [];
        }
        options[row.field].push(optionValue);
        
        // Store hex code if present
        if (row.hex_code) {
          if (!hexCodes[row.field]) {
            hexCodes[row.field] = {};
          }
          hexCodes[row.field][optionValue] = row.hex_code;
        }
      }
    } else {
      // Log if no data found and clear cache
      logger.warn('DropdownOptions', 'No dropdown options found in database - database may be empty');
      cache = null; // Clear cache if no data
    }

    // Combine race and species options into species field (for backward compatibility and combined dropdown)
    if (options['race'] || options['species']) {
      const raceOptions = options['race'] || [];
      const speciesOptions = options['species'] || [];
      
      // Combine options, removing duplicates
      const combinedOptions = Array.from(new Set([...raceOptions, ...speciesOptions]));
      
      // Sort combined options alphabetically
      combinedOptions.sort();
      
      // Set the combined options as the species field
      options['species'] = combinedOptions;
      
      // Merge hex codes from both fields (species takes precedence if duplicate option names)
      const raceHexCodes = hexCodes['race'] || {};
      const speciesHexCodes = hexCodes['species'] || {};
      hexCodes['species'] = { ...raceHexCodes, ...speciesHexCodes };
    }

    const responseData = { options, hexCodes };
    
    // Update cache
    cache = {
      data: responseData,
      timestamp: Date.now(),
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('DropdownOptions', 'Failed to fetch dropdown options', { error });
    cache = null; // Clear cache on error
    return NextResponse.json(
      { 
        error: 'Failed to fetch dropdown options',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check server logs for more details'
      },
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
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const { options, hexCodes } = body;

    if (!options || typeof options !== 'object') {
      logger.error('DropdownOptions', 'Invalid options data', { type: typeof options });
      return NextResponse.json(
        { error: 'Invalid options data' },
        { status: 400 }
      );
    }

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
      logger.error('DropdownOptions', 'Invalid field names', { invalidFields });
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
      logger.error('DropdownOptions', 'Failed to fetch current options', { error: fetchError });
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
        logger.warn('DropdownOptions', `Skipping ${field}: not an array`);
        return;
      }

      const currentValues = currentOptions[field] || new Set();
      const newSet = new Set(newValues);
      
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
          logger.error('DropdownOptions', `Failed to delete options for ${field}`, { error: deleteError });
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
              logger.error('DropdownOptions', `Failed to insert options for ${field}`, { error: insertError });
              errors.push(`Failed to insert options for ${field}: ${insertError.message}`);
              continue;
            }
          }
        }

        updatedFields.push(field);
      } catch (error) {
        logger.error('DropdownOptions', `Error updating ${field}`, { error });
        errors.push(`Failed to update ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      logger.error('DropdownOptions', 'Some fields failed to update', { updatedFields: updatedFields.length, failed: errors.length });
      return NextResponse.json(
        {
          error: 'Some fields failed to update',
          details: errors,
          updatedFields,
        },
        { status: 500 }
      );
    }

    logger.success('DropdownOptions', `Updated ${updatedFields.length} field(s)`, { fields: updatedFields });

    return NextResponse.json({ 
      success: true, 
      message: `Options saved successfully for ${updatedFields.length} field(s)`,
      updatedFields,
    });
  } catch (error) {
    logger.error('DropdownOptions', 'Fatal error saving options', { error });
    const errorMessage = error instanceof Error ? error.message : 'Failed to save dropdown options';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

