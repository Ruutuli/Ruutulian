import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FanficChaptersManager } from '@/components/admin/FanficChaptersManager';
import Link from 'next/link';

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default async function FanficChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createAdminClient();
  const resolvedParams = await params;

  // Support both ID (UUID) and slug
  const query = isUUID(resolvedParams.id)
    ? supabase.from('fanfics').select('id, title, slug').eq('id', resolvedParams.id)
    : supabase.from('fanfics').select('id, title, slug').eq('slug', resolvedParams.id);

  const { data: fanfic, error } = await query.single();

  if (error || !fanfic) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/fanfics"
          className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
        >
          ← Back to Fanfics
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">
              Manage Chapters: {fanfic.title}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Add, edit, and organize chapters for this fanfic
            </p>
          </div>
          <Link
            href={`/admin/fanfics/${fanfic.id}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors"
          >
            Edit Fanfic
          </Link>
        </div>
      </div>
      
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <FanficChaptersManager fanficId={fanfic.id} />
      </div>
    </div>
  );
}


