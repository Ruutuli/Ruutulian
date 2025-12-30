import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, checkSlugUniquenessExcluding, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET(
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

    const { data, error } = await supabase
      .from('fanfics')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, world_id),
        characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
        relationships:fanfic_relationships(id, relationship_text, relationship_type),
        tags:fanfic_tags(tag:tags(id, name))
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('Fanfic not found', 404);
      }
      return errorResponse(error.message);
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error, 'Failed to fetch fanfic');
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

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    const body = await request.json();
    const {
      title,
      slug,
      summary,
      rating,
      alternative_titles,
      author,
      world_id,
      story_alias_id,
      external_link,
      is_public,
      characters,
      relationships,
      tag_ids,
    } = body;

    // Validate required fields
    const validationError = validateRequiredFields(body, ['title', 'slug', 'world_id']);
    if (validationError) {
      return validationError;
    }

    // Check if fanfic exists
    const { data: existingFanfic, error: checkError } = await supabase
      .from('fanfics')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingFanfic) {
      return errorResponse('Fanfic not found', 404);
    }

    // Check if slug is unique (excluding current record)
    const existingSlug = await checkSlugUniquenessExcluding(
      supabase,
      'fanfics',
      slug,
      null,
      null,
      id
    );
    if (existingSlug) {
      return errorResponse('A fanfic with this slug already exists');
    }

    // Update fanfic
    const { error: updateError } = await supabase
      .from('fanfics')
      .update({
        title,
        slug,
        summary: summary || null,
        rating: rating || null,
        alternative_titles: alternative_titles || null,
        author: author || null,
        world_id,
        story_alias_id: story_alias_id || null,
        external_link: external_link || null,
        is_public: is_public !== undefined ? is_public : false,
      })
      .eq('id', id);

    if (updateError) {
      return errorResponse(updateError.message || 'Failed to update fanfic');
    }

    // Update characters
    if (characters !== undefined) {
      // Delete existing links
      await supabase.from('fanfic_characters').delete().eq('fanfic_id', id);
      // Insert new links
      if (Array.isArray(characters) && characters.length > 0) {
        const characterLinks = characters
          .filter((item: { oc_id?: string | null; name?: string | null }) => 
            item.oc_id || (item.name && item.name.trim())
          )
          .map((item: { oc_id?: string | null; name?: string | null }) => ({
            fanfic_id: id,
            oc_id: item.oc_id || null,
            name: (!item.oc_id && item.name) ? item.name.trim() : null,
          }));
        
        if (characterLinks.length > 0) {
          await supabase.from('fanfic_characters').insert(characterLinks);
        }
      }
    }

    // Update relationships
    if (relationships !== undefined) {
      // Delete existing links
      await supabase.from('fanfic_relationships').delete().eq('fanfic_id', id);
      // Insert new links
      if (Array.isArray(relationships) && relationships.length > 0) {
        const relationshipLinks = relationships
          .filter((item: { relationship_text: string }) => item.relationship_text && item.relationship_text.trim())
          .map((item: { relationship_text: string; relationship_type?: string | null }) => ({
            fanfic_id: id,
            relationship_text: item.relationship_text.trim(),
            relationship_type: item.relationship_type || 'other',
          }));
        
        if (relationshipLinks.length > 0) {
          await supabase.from('fanfic_relationships').insert(relationshipLinks);
        }
      }
    }

    // Update tags
    if (tag_ids !== undefined) {
      // Delete existing links
      await supabase.from('fanfic_tags').delete().eq('fanfic_id', id);
      // Insert new links
      if (Array.isArray(tag_ids) && tag_ids.length > 0) {
        const tagLinks = tag_ids.map((tagId: string) => ({
          fanfic_id: id,
          tag_id: tagId,
        }));
        await supabase.from('fanfic_tags').insert(tagLinks);
      }
    }

    // Fetch the updated fanfic with all relations
    const { data: updatedFanfic, error: fetchError } = await supabase
      .from('fanfics')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, world_id),
        characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
        relationships:fanfic_relationships(id, relationship_text, relationship_type),
        tags:fanfic_tags(tag:tags(id, name))
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message || 'Failed to fetch updated fanfic');
    }

    return successResponse(updatedFanfic);
  } catch (error) {
    return handleError(error, 'Failed to update fanfic');
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

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { id } = await params;

    // Delete fanfic (cascade will delete junction table entries)
    const { error } = await supabase
      .from('fanfics')
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message || 'Failed to delete fanfic');
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete fanfic');
  }
}

