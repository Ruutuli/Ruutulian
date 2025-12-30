import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('world_id');

    // Fetch all public OCs
    let query = supabase
      .from('ocs')
      .select('id, name, slug, image_url, world_id, family, friends_allies, rivals_enemies, romantic, other_relationships')
      .eq('is_public', true);

    if (worldId) {
      query = query.eq('world_id', worldId);
    }

    const { data: ocs, error } = await query;

    if (error) {
      console.error('Error fetching OCs:', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    if (!ocs || ocs.length === 0) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    // Create nodes
    const nodes = ocs.map((oc, index) => ({
      id: oc.id,
      name: oc.name,
      group: index % 6, // For color coding
      image_url: oc.image_url,
      size: 5,
    }));

    // Create links from relationships
    const links: Array<{ source: string; target: string; relationship: string; type: string; value: number }> = [];
    const ocMap = new Map(ocs.map(oc => [oc.id, oc]));

    ocs.forEach((oc) => {
      const relationshipFields = [
        { field: oc.family, type: 'family', value: 3 },
        { field: oc.friends_allies, type: 'friend', value: 2 },
        { field: oc.rivals_enemies, type: 'rival', value: 2 },
        { field: oc.romantic, type: 'lovers', value: 4 },
        { field: oc.other_relationships, type: 'other', value: 1 },
      ];

      relationshipFields.forEach(({ field, type, value }) => {
        if (field) {
          try {
            const relationships = typeof field === 'string' ? JSON.parse(field) : field;
            if (Array.isArray(relationships)) {
              relationships.forEach((rel: any) => {
                if (rel.oc_id) {
                  // Check if target OC exists
                  if (ocMap.has(rel.oc_id)) {
                    links.push({
                      source: oc.id,
                      target: rel.oc_id,
                      relationship: rel.relationship || type,
                      type: rel.relationship_type || type,
                      value,
                    });
                  }
                }
              });
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      });
    });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Error in relationship graph API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

