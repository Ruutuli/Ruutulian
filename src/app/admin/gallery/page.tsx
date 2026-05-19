import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/require-auth';
import { createAdminClient } from '@/lib/supabase/server';
import { GalleryAdminClient } from '@/components/admin/GalleryAdminClient';

export const metadata: Metadata = {
  title: 'Gallery',
};

export const dynamic = 'force-dynamic';

export default async function AdminGalleryPage() {
  await requireAuth();
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('ocs')
    .select('id, name, slug, image_url, world:worlds(name)')
    .order('name');

  const ocs = (rows ?? []).map((row) => {
    const world = row.world;
    const worldRow = Array.isArray(world) ? world[0] : world;
    const series =
      worldRow && typeof worldRow === 'object' && 'name' in worldRow && worldRow.name
        ? String(worldRow.name).trim() || null
        : null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      image_url: row.image_url,
      series,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-100">Gallery</h1>
        <p className="text-gray-400 mt-2">
          Sync art from Google Drive, then publish pieces and add tags or linked characters.
        </p>
      </div>
      <GalleryAdminClient ocs={ocs ?? []} />
    </div>
  );
}
