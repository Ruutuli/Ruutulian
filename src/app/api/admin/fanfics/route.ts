import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validateRequiredFields, checkSlugUniqueness, errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    // Extract filter parameters
    const worldId = searchParams.get('world_id');
    const storyAliasId = searchParams.get('story_alias_id');

    // Build query with joined data
    let query = supabase
      .from('fanfics')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, world_id),
        characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
        relationships:fanfic_relationships(id, relationship_text, relationship_type),
        tags:fanfic_tags(tag:tags(id, name))
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (worldId) {
      query = query.eq('world_id', worldId);
    }
    if (storyAliasId) {
      query = query.eq('story_alias_id', storyAliasId);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data || []);
  } catch (error) {
    return handleError(error, 'Failed to fetch fanfics');
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient();

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

    // Check if slug is unique
    const existingFanfic = await checkSlugUniqueness(supabase, 'fanfics', slug);
    if (existingFanfic) {
      return errorResponse('A fanfic with this slug already exists');
    }

    // Insert fanfic
    const { data: fanfic, error: insertError } = await supabase
      .from('fanfics')
      .insert({
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
      .select()
      .single();

    if (insertError) {
      return errorResponse(insertError.message);
    }

    // Handle characters (with custom names support)
    if (characters && Array.isArray(characters) && characters.length > 0) {
      const characterLinks = characters
        .filter((item: { oc_id?: string | null; name?: string | null }) => 
          item.oc_id || (item.name && item.name.trim())
        )
        .map((item: { oc_id?: string | null; name?: string | null }) => ({
          fanfic_id: fanfic.id,
          oc_id: item.oc_id || null,
          name: (!item.oc_id && item.name) ? item.name.trim() : null,
        }));
      
      if (characterLinks.length > 0) {
        const { error: charactersError } = await supabase
          .from('fanfic_characters')
          .insert(characterLinks);
        if (charactersError) {
          // Clean up fanfic if junction insert fails
          await supabase.from('fanfics').delete().eq('id', fanfic.id);
          return errorResponse(`Failed to link characters: ${charactersError.message}`);
        }
      }
    }

    // Handle relationships
    if (relationships && Array.isArray(relationships) && relationships.length > 0) {
      const relationshipLinks = relationships
        .filter((item: { relationship_text: string }) => item.relationship_text && item.relationship_text.trim())
        .map((item: { relationship_text: string; relationship_type?: string | null }) => ({
          fanfic_id: fanfic.id,
          relationship_text: item.relationship_text.trim(),
          relationship_type: item.relationship_type || 'other',
        }));
      
      if (relationshipLinks.length > 0) {
        const { error: relationshipsError } = await supabase
          .from('fanfic_relationships')
          .insert(relationshipLinks);
        if (relationshipsError) {
          // Clean up fanfic if junction insert fails
          await supabase.from('fanfics').delete().eq('id', fanfic.id);
          return errorResponse(`Failed to link relationships: ${relationshipsError.message}`);
        }
      }
    }

    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      const tagLinks = tag_ids.map((tagId: string) => ({
        fanfic_id: fanfic.id,
        tag_id: tagId,
      }));
      const { error: tagsError } = await supabase
        .from('fanfic_tags')
        .insert(tagLinks);
      if (tagsError) {
        // Clean up fanfic if junction insert fails
        await supabase.from('fanfics').delete().eq('id', fanfic.id);
        return errorResponse(`Failed to link tags: ${tagsError.message}`);
      }
    }

    // Fetch the complete fanfic with all relations
    const { data: completeFanfic, error: fetchError } = await supabase
      .from('fanfics')
      .select(`
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, world_id),
        characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
        relationships:fanfic_relationships(id, relationship_text, relationship_type),
        tags:fanfic_tags(tag:tags(id, name))
      `)
      .eq('id', fanfic.id)
      .single();

    if (fetchError) {
      return errorResponse(fetchError.message);
    }

    return successResponse(completeFanfic);
  } catch (error) {
    return handleError(error, 'Failed to create fanfic');
  }
}

