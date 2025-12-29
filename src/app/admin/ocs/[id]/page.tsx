import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { OCForm } from '@/components/admin/OCForm';
import type { RelationshipType } from '@/types/oc';

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();

  console.log('[generateMetadata - Admin] Request received for id/slug:', params.id);
  console.log('[generateMetadata - Admin] Is UUID:', isUUID(params.id));
  console.log('[generateMetadata - Admin] Creating Supabase client...');

  // Support both ID (UUID) and slug
  const query = isUUID(params.id)
    ? supabase.from('ocs').select('name').eq('id', params.id)
    : supabase.from('ocs').select('name').eq('slug', params.id);

  const { data: oc, error } = await query.single();

  if (error) {
    console.error('[generateMetadata - Admin] Supabase query error:', {
      id: params.id,
      isUUID: isUUID(params.id),
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!oc) {
    console.warn('[generateMetadata - Admin] Character not found:', {
      id: params.id,
      isUUID: isUUID(params.id),
      error: error?.message || 'No data returned',
    });
    return {
      title: 'Edit Character',
    };
  }

  console.log('[generateMetadata - Admin] Character found:', {
    id: params.id,
    name: oc.name,
  });

  return {
    title: `Edit ${oc.name}`,
  };
}

// Helper function to find reverse relationships
function findReverseRelationships(
  currentOCId: string,
  currentOCName: string,
  currentOCSlug: string,
  allOCs: Array<{ id: string; name: string; slug: string; family?: string | null; friends_allies?: string | null; rivals_enemies?: string | null; romantic?: string | null; other_relationships?: string | null }>
): {
  family: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  friends_allies: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  rivals_enemies: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  romantic: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
  other_relationships: Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>;
} {
  const reverseRelationships = {
    family: [] as Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
    friends_allies: [] as Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
    rivals_enemies: [] as Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
    romantic: [] as Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
    other_relationships: [] as Array<{ name: string; relationship?: string; description?: string; oc_id?: string; oc_slug?: string; relationship_type?: RelationshipType; image_url?: string }>,
  };

  const relationshipTypes = ['family', 'friends_allies', 'rivals_enemies', 'romantic', 'other_relationships'] as const;

  for (const otherOC of allOCs) {
    if (otherOC.id === currentOCId) continue; // Skip the current OC

    for (const relType of relationshipTypes) {
      const relationshipData = otherOC[relType];
      if (!relationshipData) continue;

      try {
        const parsed = JSON.parse(relationshipData);
        if (Array.isArray(parsed)) {
          // Check if this OC has the current OC in this relationship type
          // Match by oc_id, oc_slug, or name (case-insensitive for name)
          const hasCurrentOC = parsed.some((item: any) => 
            item?.oc_id === currentOCId || 
            item?.oc_slug === currentOCSlug ||
            (item?.name && currentOCName && item.name.toLowerCase().trim() === currentOCName.toLowerCase().trim())
          );

          if (hasCurrentOC) {
            // Find the relationship entry for the current OC
            // Match by oc_id, oc_slug, or name (case-insensitive for name)
            const relationshipEntry = parsed.find((item: any) => 
              item?.oc_id === currentOCId || 
              item?.oc_slug === currentOCSlug ||
              (item?.name && currentOCName && item.name.toLowerCase().trim() === currentOCName.toLowerCase().trim())
            );

            if (relationshipEntry) {
              // Add reverse relationship: the other OC should appear in current OC's relationships
              // Only fill in name and oc_id/oc_slug - leave relationship, description, and relationship_type blank
              // so the user can fill them in from their perspective
              reverseRelationships[relType].push({
                name: otherOC.name,
                relationship: undefined, // Leave blank for user to fill
                description: undefined, // Leave blank for user to fill
                oc_id: otherOC.id,
                oc_slug: otherOC.slug,
                relationship_type: undefined, // Leave blank for user to fill
                image_url: relationshipEntry.image_url || undefined,
              });
            }
          }
        }
      } catch {
        // Not JSON, skip
        continue;
      }
    }
  }

  return reverseRelationships;
}

export default async function EditOCPage({
  params,
}: {
  params: { id: string };
}) {
  const startTime = Date.now();
  const supabase = await createClient();

  console.log('[EditOCPage] Request received for id/slug:', params.id);
  console.log('[EditOCPage] Is UUID:', isUUID(params.id));
  console.log('[EditOCPage] Creating Supabase client...');

  // Support both ID (UUID) and slug
  // Try with foreign key hint first, fallback to inferred relationship if it fails
  let baseQuery = supabase
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
    `);

  let query = isUUID(params.id)
    ? baseQuery.eq('id', params.id)
    : baseQuery.eq('slug', params.id);

  let { data: oc, error: ocError } = await query.single();
  
  // If FK hint fails with PGRST200 error, retry without the hint
  if (ocError && ocError.code === 'PGRST200' && 
      ocError.message?.includes('story_aliases') &&
      ocError.details?.includes('fk_ocs_story_alias_id')) {
    console.log('[EditOCPage] FK hint failed, falling back to inferred relationship');
    
    baseQuery = supabase
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
      `);
    
    query = isUUID(params.id)
      ? baseQuery.eq('id', params.id)
      : baseQuery.eq('slug', params.id);
    
    const fallbackResult = await query.single();
    oc = fallbackResult.data;
    ocError = fallbackResult.error;
  }
  
  const ocQueryDuration = Date.now() - startTime;

  if (ocError) {
    console.error('[EditOCPage] Supabase OC query error:', {
      id: params.id,
      isUUID: isUUID(params.id),
      error: ocError.message,
      code: ocError.code,
      details: ocError.details,
      hint: ocError.hint,
      duration: `${ocQueryDuration}ms`,
    });
  }

  if (!oc) {
    console.error('[EditOCPage] Character not found - calling notFound():', {
      id: params.id,
      isUUID: isUUID(params.id),
      error: ocError?.message || 'No data returned',
      duration: `${ocQueryDuration}ms`,
    });
    notFound();
  }

  console.log('[EditOCPage] Character loaded successfully:', {
    id: params.id,
    name: oc.name,
    ocId: oc.id,
    slug: oc.slug,
    hasWorld: !!oc.world,
    hasStoryAlias: !!oc.story_alias,
    hasIdentity: !!oc.identity,
    duration: `${ocQueryDuration}ms`,
  });

  // Fetch all OCs to find reverse relationships
  const allOCsStartTime = Date.now();
  const { data: allOCs, error: allOCsError } = await supabase
    .from('ocs')
    .select('id, name, slug, family, friends_allies, rivals_enemies, romantic, other_relationships');

  if (allOCsError) {
    console.error('[EditOCPage] Error fetching all OCs for reverse relationships:', {
      error: allOCsError.message,
      code: allOCsError.code,
      details: allOCsError.details,
      duration: `${Date.now() - allOCsStartTime}ms`,
    });
  } else {
    console.log('[EditOCPage] All OCs fetched for reverse relationships:', {
      count: allOCs?.length || 0,
      duration: `${Date.now() - allOCsStartTime}ms`,
    });
  }

  // Find reverse relationships
  const reverseRelationships = allOCs 
    ? findReverseRelationships(oc.id, oc.name, oc.slug, allOCs)
    : {
        family: [],
        friends_allies: [],
        rivals_enemies: [],
        romantic: [],
        other_relationships: [],
      };

  // Debug: Log reverse relationships (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Reverse Relationships Debug ===');
    console.log('Current OC:', oc.name, '(ID:', oc.id, ', Slug:', oc.slug, ')');
    console.log('Total OCs checked:', allOCs?.length || 0);
    console.log('Reverse relationships found:', {
      family: reverseRelationships.family.length,
      friends_allies: reverseRelationships.friends_allies.length,
      rivals_enemies: reverseRelationships.rivals_enemies.length,
      romantic: reverseRelationships.romantic.length,
      other_relationships: reverseRelationships.other_relationships.length,
    });
    if (reverseRelationships.family.length > 0) {
      console.log('Family reverse relationships:', reverseRelationships.family);
    }
    console.log('===================================');
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-50 mb-3 sm:mb-4 md:mb-8">Edit Character</h1>
      <div className="bg-gray-800/40 rounded-xl shadow-xl p-3 sm:p-4 md:p-6 lg:p-8 border border-gray-600/50 backdrop-blur-sm">
        <OCForm oc={oc} reverseRelationships={reverseRelationships} />
      </div>
    </div>
  );
}
