import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FanficsList } from '@/components/admin/FanficsList';

export const metadata: Metadata = {
  title: 'Fanfics',
};

export default async function AdminFanficsPage() {
  const supabase = await createClient();

  const { data: fanfics } = await supabase
    .from('fanfics')
    .select(`
      id,
      title,
      slug,
      rating,
      is_public,
      updated_at,
      characters:fanfic_characters(id),
      tags:fanfic_tags(id)
    `)
    .order('updated_at', { ascending: false });

  // Transform the data to include counts
  const fanficsWithCounts = fanfics?.map((fanfic) => ({
    id: fanfic.id,
    title: fanfic.title,
    slug: fanfic.slug,
    rating: fanfic.rating,
    is_public: fanfic.is_public,
    updated_at: fanfic.updated_at,
    world_count: 1, // Each fanfic has one world
    character_count: Array.isArray(fanfic.characters) ? fanfic.characters.length : 0,
    tag_count: Array.isArray(fanfic.tags) ? fanfic.tags.length : 0,
  })) || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Fanfics</h1>
        <Link
          href="/admin/fanfics/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors text-sm sm:text-base w-fit"
        >
          Create Fanfic
        </Link>
      </div>

      <FanficsList fanfics={fanficsWithCounts} />
    </div>
  );
}

