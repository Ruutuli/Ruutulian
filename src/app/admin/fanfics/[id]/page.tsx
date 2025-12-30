import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FanficForm } from '@/components/admin/FanficForm';
import type { Fanfic } from '@/types/oc';

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Support both ID (UUID) and slug
  const query = isUUID(resolvedParams.id)
    ? supabase.from('fanfics').select('title').eq('id', resolvedParams.id)
    : supabase.from('fanfics').select('title').eq('slug', resolvedParams.id);

  const { data: fanfic, error } = await query.single();

  if (error || !fanfic) {
    return {
      title: 'Edit Fanfic',
    };
  }

  return {
    title: `Edit ${fanfic.title}`,
  };
}

export default async function AdminFanficDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // Support both ID (UUID) and slug
  const query = isUUID(resolvedParams.id)
    ? supabase
        .from('fanfics')
        .select(`
          *,
          world:worlds(id, name, slug),
          story_alias:story_aliases(id, name, slug, world_id),
          characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
          relationships:fanfic_relationships(id, relationship_text, relationship_type),
          tags:fanfic_tags(tag:tags(id, name))
        `)
        .eq('id', resolvedParams.id)
    : supabase
        .from('fanfics')
        .select(`
          *,
          world:worlds(id, name, slug),
          story_alias:story_aliases(id, name, slug, world_id),
          characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
          relationships:fanfic_relationships(id, relationship_text, relationship_type),
          tags:fanfic_tags(tag:tags(id, name))
        `)
        .eq('slug', resolvedParams.id);

  const { data: fanficData, error } = await query.single();

  if (error || !fanficData) {
    notFound();
  }

  // Transform the data to match our Fanfic type
  const fanfic: Fanfic = {
    ...fanficData,
    characters: Array.isArray(fanficData.characters)
      ? fanficData.characters.map((fc: any) => ({
          id: fc.id,
          fanfic_id: fanficData.id,
          oc_id: fc.oc_id || null,
          name: fc.name || null,
          created_at: '',
          oc: fc.oc || undefined,
        }))
      : [],
    relationships: Array.isArray(fanficData.relationships)
      ? fanficData.relationships.map((fr: any) => ({
          id: fr.id,
          fanfic_id: fanficData.id,
          relationship_text: fr.relationship_text,
          relationship_type: fr.relationship_type || null,
          created_at: '',
        }))
      : [],
    tags: Array.isArray(fanficData.tags)
      ? fanficData.tags
          .map((ft: any) => ft.tag)
          .filter((t: any) => t !== null && t !== undefined)
      : [],
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-50 mb-8">Edit Fanfic</h1>
      <div className="bg-gray-800/40 rounded-xl shadow-xl p-8 border border-gray-600/50 backdrop-blur-sm">
        <FanficForm fanfic={fanfic} />
      </div>
    </div>
  );
}

