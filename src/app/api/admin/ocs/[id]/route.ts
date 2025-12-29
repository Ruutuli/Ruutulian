import { createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      return errorResponse('OC ID is required');
    }

    const body = await request.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ['name', 'slug']);
    if (validationError) {
      logger.error('OC', 'Validation error', { ocId: id, validationError });
      return validationError;
    }

    // Normalize world_id: convert empty string to null
    if (body.world_id === '' || body.world_id === null) {
      body.world_id = null;
    }

    // Normalize story_alias_id: convert empty string to null
    if (body.story_alias_id === '' || body.story_alias_id === null) {
      body.story_alias_id = null;
    }

    // Validate story_alias_id if provided (and not null/empty) and world_id is set
    if (body.story_alias_id && body.world_id) {
      const { data: storyAlias, error: aliasError } = await supabase
        .from('story_aliases')
        .select('id, world_id')
        .eq('id', body.story_alias_id)
        .single();

      if (aliasError || !storyAlias) {
        return errorResponse('Invalid story_alias_id provided');
      }

      if (storyAlias.world_id !== body.world_id) {
        return errorResponse('Story alias must belong to the same world as the OC');
      }
    }

    // Remove any fields that shouldn't be updated (like nested relationships)
    const {
      world,
      story_alias,
      identity,
      ...updateData
    } = body;

    // First, verify the OC exists
    const { data: existingOC, error: checkError } = await supabase
      .from('ocs')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingOC) {
      logger.error('OC', 'OC not found or access denied', checkError);
      return errorResponse('OC not found', 404);
    }

    // Perform the update and check affected rows
    const { data: updateResult, error: updateError } = await supabase
      .from('ocs')
      .update(updateData)
      .eq('id', id)
      .select('id');

    if (updateError) {
      logger.error('OC', 'Update error', { 
        error: updateError,
        ocId: id,
        updateDataKeys: Object.keys(updateData)
      });
      return errorResponse(updateError.message || 'Failed to update OC');
    }

    // Check if any rows were actually updated
    if (!updateResult || updateResult.length === 0) {
      logger.error('OC', 'No rows were updated', { 
        ocId: id,
        updateResult,
        updateDataKeys: Object.keys(updateData)
      });
      return errorResponse('No rows were updated. The OC may not exist or the data may be invalid.');
    }

    // Verify the update by fetching the updated row immediately
    const { data: verifyData, error: verifyError } = await supabase
      .from('ocs')
      .select('*')
      .eq('id', id)
      .single();

    if (verifyError) {
      logger.error('OC', 'Verify error after update', { 
        error: verifyError,
        ocId: id
      });
      return errorResponse('Failed to verify update: ' + verifyError.message);
    }

    if (!verifyData) {
      logger.error('OC', 'OC not found after update', { ocId: id });
      return errorResponse('OC not found after update', 404);
    }

    // Fetch the updated OC with relationships
    // Try with foreign key hint first, fallback to inferred relationship if it fails
    let { data, error: selectError } = await supabase
      .from('ocs')
      .select(`
        *,
        world:worlds(*),
        story_alias:story_aliases!fk_ocs_story_alias_id(id, name, slug, description),
        identity:oc_identities(
          *,
          versions:ocs(
            id,
            name,
            slug,
            world_id,
            world:worlds(id, name, slug)
          )
        )
      `)
      .eq('id', id)
      .single();

    // If FK hint fails with PGRST200 error, retry without the hint
    if (selectError && selectError.code === 'PGRST200' && 
        selectError.message?.includes('story_aliases') &&
        selectError.details?.includes('fk_ocs_story_alias_id')) {
      logger.info('OC', 'FK hint failed, falling back to inferred relationship');
      
      const fallbackResult = await supabase
        .from('ocs')
        .select(`
          *,
          world:worlds(*),
          story_alias:story_aliases(id, name, slug, description),
          identity:oc_identities(
            *,
            versions:ocs(
              id,
              name,
              slug,
              world_id,
              world:worlds(id, name, slug)
            )
          )
        `)
        .eq('id', id)
        .single();
      
      data = fallbackResult.data;
      selectError = fallbackResult.error;
    }

    if (selectError) {
      logger.error('OC', 'Select error', selectError);
      // Return the basic data we verified
      return successResponse(verifyData);
    }

    if (!data) {
      // Fallback to verified data
      return successResponse(verifyData);
    }

    return successResponse(data);
  } catch (error) {
    logger.error('OC', 'Unexpected error in PUT handler', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return handleError(error, 'Failed to update OC');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      return errorResponse('OC ID is required');
    }

    // Delete OC (cascade will handle related tables)
    const { error } = await supabase
      .from('ocs')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('OC', 'Delete error', error);
      return errorResponse(error.message || 'Failed to delete OC');
    }

    logger.success('OC', `Deleted OC ${id}`);
    return successResponse({ success: true });
  } catch (error) {
    logger.error('OC', 'Unexpected error in DELETE handler', error);
    return handleError(error, 'Failed to delete OC');
  }
}
