import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { fetchTemplates } from '@/lib/templates/ocTemplates.server';
import type { TemplateField, TemplateDefinition } from '@/lib/templates/ocTemplates';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Use admin client for admin operations to bypass RLS
    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      return errorResponse('World ID is required');
    }

    const { data, error } = await supabase
      .from('worlds')
      .select(`
        *,
        story_aliases:story_aliases(
          id,
          name,
          slug,
          description,
          created_at,
          updated_at
        ),
        races:world_races(
          id,
          world_id,
          story_alias_id,
          name,
          info,
          picture_url,
          lifespan_development,
          appearance_dress,
          position,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('World not found', 404);
      }
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch world');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for admin operations to bypass RLS
    const supabase = createAdminClient();
    const { id } = await params;

    if (!id) {
      logger.error('World', 'Missing world ID');
      return errorResponse('World ID is required');
    }

    const body = await request.json();

    // Check if this is a partial update (only template fields or world fields)
    const isPartialUpdate = Object.keys(body).length === 1 && 
      (body.oc_templates !== undefined || body.world_fields !== undefined);
    
    // Validate required fields only for full updates
    if (!isPartialUpdate) {
      const validationError = validateRequiredFields(body, ['name', 'slug', 'series_type', 'summary']);
      if (validationError) {
        logger.error('World', 'Validation failed', validationError);
        return validationError;
      }
    }

    // First, verify the world exists
    const { data: existingWorld, error: checkError } = await supabase
      .from('worlds')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingWorld) {
      logger.error('World', 'World check error', checkError);
      return errorResponse('World not found', 404);
    }

    // Get the current state before update for comparison
    const { data: beforeUpdate, error: beforeError } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', id)
      .single();
    
    if (beforeError) {
      logger.error('World', 'Error fetching before update', beforeError);
    }

    // Fetch templates from database
    const templates = await fetchTemplates();

    // Helper function to get effective template fields
    const getEffectiveTemplateFields = (
      templateType: string,
      customizations?: Record<string, { fields: TemplateField[] }>
    ): TemplateField[] => {
      const base = templates[templateType] || templates.none || { name: 'None', fields: [] };
      const custom = customizations?.[templateType];
      
      if (custom && custom.fields.length > 0) {
        return custom.fields;
      }
      return base.fields;
    };

    // If template fields are being updated, sync OC extra_fields
    if (body.oc_templates !== undefined && beforeUpdate) {
      const oldCustomizations = (beforeUpdate.oc_templates as Record<string, { fields: TemplateField[] }>) || {};
      const newCustomizations = body.oc_templates as Record<string, { fields: TemplateField[] }> || {};

      // Get all template types that might have changed
      const allTemplateTypes = new Set([
        ...Object.keys(oldCustomizations),
        ...Object.keys(newCustomizations),
        ...Object.keys(templates),
      ]);

      for (const templateType of allTemplateTypes) {
        const oldFields = getEffectiveTemplateFields(templateType, oldCustomizations);
        const newFields = getEffectiveTemplateFields(templateType, newCustomizations);

        // Check if fields changed
        const oldFieldKeys = new Set(oldFields.map(f => f.key));
        const newFieldKeys = new Set(newFields.map(f => f.key));

        const removedFields = Array.from(oldFieldKeys).filter(key => !newFieldKeys.has(key));
        const addedFields = newFields.filter(f => !oldFieldKeys.has(f.key));

        if (removedFields.length > 0 || addedFields.length > 0) {
        }

        // Always sync OCs to ensure their extra_fields match the new template, even if no changes detected
        // This handles cases where OCs might have stale fields
        if (removedFields.length > 0 || addedFields.length > 0 || newCustomizations[templateType]) {
          // Find all OCs in this world with this template_type
          const { data: ocs, error: ocsError } = await supabase
            .from('ocs')
            .select('id, extra_fields')
            .eq('world_id', id)
            .eq('template_type', templateType);

          if (ocsError) {
            logger.error('World', `Error fetching OCs for template ${templateType}`, ocsError);
          } else if (ocs && ocs.length > 0) {

            // Update each OC's extra_fields
            for (const oc of ocs) {
              const currentExtraFields = (oc.extra_fields as Record<string, any>) || {};
              const updatedExtraFields = { ...currentExtraFields };
              let hasChanges = false;

              // Remove fields that are no longer in the template
              for (const removedKey of removedFields) {
                if (removedKey in updatedExtraFields) {
                  delete updatedExtraFields[removedKey];
                  hasChanges = true;
                }
              }

              // Also remove any fields that exist in OC but not in new template (cleanup stale fields)
              const ocFieldKeys = Object.keys(updatedExtraFields);
              const validFieldKeys = new Set(newFields.map(f => f.key));
              for (const ocFieldKey of ocFieldKeys) {
                if (!validFieldKeys.has(ocFieldKey)) {
                  delete updatedExtraFields[ocFieldKey];
                  hasChanges = true;
                }
              }

              // Add new fields with default values based on type
              for (const addedField of addedFields) {
                if (!(addedField.key in updatedExtraFields)) {
                  // Set default value based on field type
                  if (addedField.type === 'array') {
                    updatedExtraFields[addedField.key] = [];
                  } else if (addedField.type === 'number') {
                    updatedExtraFields[addedField.key] = null;
                  } else {
                    updatedExtraFields[addedField.key] = '';
                  }
                  hasChanges = true;
                }
              }

              // Update the OC's extra_fields only if there are changes
              if (hasChanges) {
                const { error: updateOcError } = await supabase
                  .from('ocs')
                  .update({ extra_fields: updatedExtraFields })
                  .eq('id', oc.id);

                if (updateOcError) {
                  logger.error('World', `Error updating OC ${oc.id}`, updateOcError);
                }
              }
            }
          }
        }
      }
    }

    // Clean the body - remove undefined values but keep null values
    // Supabase will ignore undefined but will set null values
    // Also remove modular_fields as it doesn't exist in the worlds table
    const cleanedBody = Object.fromEntries(
      Object.entries(body).filter(([key, value]) => 
        value !== undefined && key !== 'modular_fields'
      )
    );
    
    // Perform the update
    
    // Explicitly select all columns to avoid RLS issues
    const { data: updateData, error: updateError } = await supabase
      .from('worlds')
      .update(cleanedBody)
      .eq('id', id)
      .select('id, name, slug, series_type, summary, description_markdown, primary_color, accent_color, header_image_url, icon_url, is_public, genre, setting, lore, the_world_society, culture, politics, technology, environment, races_species, power_systems, religion, government, important_factions, notable_figures, languages, trade_economy, travel_transport, themes, inspirations, current_era_status, notes, canon_status, timeline_era, power_source, central_conflicts, world_rules_limitations, oc_integration_notes, oc_templates, world_fields, created_at, updated_at');

    if (updateError) {
      logger.error('World', 'Update error', updateError);
      return errorResponse(updateError.message || 'Failed to update world');
    }

    logger.success('World', `Update executed successfully for world ${id}`);

    // If update returned empty array (RLS issue), fetch separately
    let updatedWorld = updateData?.[0];
    
    if (!updatedWorld) {
      const { data: fetchedWorld, error: fetchError } = await supabase
        .from('worlds')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        logger.error('World', 'Fetch error after update', fetchError);
        // If update succeeded but fetch failed due to RLS, try to return the original data
        if (fetchError.code === 'PGRST116') {
          logger.warn('World', 'Fetch failed due to RLS, but update likely succeeded');
          return successResponse({ 
            ...cleanedBody,
            id,
            message: 'Update completed (verification failed, but update likely succeeded)'
          });
        }
        return errorResponse(fetchError.message || 'Failed to fetch updated world');
      }
      
      updatedWorld = fetchedWorld;
    }

    if (!updatedWorld) {
      logger.warn('World', 'Updated world is null, but update likely succeeded');
      // Update likely succeeded but we can't verify - return what we tried to update
      return successResponse({ 
        ...cleanedBody,
        id,
        message: 'Update completed (verification failed, but update likely succeeded)'
      });
    }

    return successResponse(updatedWorld);
  } catch (error) {
    logger.error('World', 'Unexpected error', error);
    return handleError(error, 'Failed to update world');
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
      return errorResponse('World ID is required');
    }

    // Delete world (cascade will handle related tables)
    const { error } = await supabase
      .from('worlds')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('World', 'Delete error', error);
      return errorResponse(error.message || 'Failed to delete world');
    }

    logger.success('World', `World ${id} deleted successfully`);
    return successResponse({ success: true });
  } catch (error) {
    logger.error('World', 'Unexpected error in DELETE handler', error);
    return handleError(error, 'Failed to delete world');
  }
}
