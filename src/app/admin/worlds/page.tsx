import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { WorldsList } from '@/components/admin/WorldsList';

export const metadata: Metadata = {
  title: 'Worlds',
};

export default async function AdminWorldsPage() {
  const supabase = await createClient();

  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name, slug, series_type, is_public, header_image_url, icon_url, updated_at, story_aliases(id)')
    .order('name', { ascending: true });

  // Transform the data to include story count
  const worldsWithStoryCount = worlds?.map((world) => ({
    id: world.id,
    name: world.name,
    slug: world.slug,
    series_type: world.series_type,
    is_public: world.is_public,
    header_image_url: world.header_image_url,
    icon_url: world.icon_url,
    updated_at: world.updated_at,
    story_count: Array.isArray(world.story_aliases) ? world.story_aliases.length : 0,
  })) || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Worlds</h1>
        <Link
          href="/admin/worlds/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors text-sm sm:text-base w-fit"
        >
          Create World
        </Link>
      </div>

      <WorldsList worlds={worldsWithStoryCount} />
    </div>
  );
}
