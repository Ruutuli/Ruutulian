import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST endpoint to add a single option to a dropdown field
 * Used by forms to auto-create options when users enter custom values
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ field: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { field } = await params;
    const body = await request.json();
    const { option, hex_code } = body;

    if (!option || typeof option !== 'string' || !option.trim()) {
      return NextResponse.json(
        { error: 'Option value is required' },
        { status: 400 }
      );
    }

    const trimmedOption = option.trim();

    const supabase = createAdminClient();

    // Check if option already exists (case-insensitive)
    const { data: existing, error: checkError } = await supabase
      .from('dropdown_options')
      .select('id, option')
      .eq('field', field)
      .ilike('option', trimmedOption)
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      logger.error('DropdownOptions', 'Error checking existing option', { error: checkError });
      return NextResponse.json(
        { error: 'Failed to check existing option' },
        { status: 500 }
      );
    }

    // If option already exists, return success (idempotent)
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Option already exists',
        option: existing.option,
        created: false,
      });
    }

    // Insert new option
    const insertData: {
      field: string;
      option: string;
      hex_code?: string | null;
      updated_at: string;
    } = {
      field,
      option: trimmedOption,
      hex_code: hex_code && typeof hex_code === 'string' ? hex_code : null,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('dropdown_options')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      logger.error('DropdownOptions', 'Error inserting option', { error: insertError });
      return NextResponse.json(
        { error: 'Failed to create option' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Option created successfully',
      option: inserted.option,
      created: true,
    });
  } catch (error) {
    logger.error('DropdownOptions', 'Fatal error creating option', { error });
    const errorMessage = error instanceof Error ? error.message : 'Failed to create option';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

