import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WorldTemplateManager } from '@/components/admin/WorldTemplateManager';

export default async function WorldTemplatesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: world } = await supabase
    .from('worlds')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!world) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Character Template Fields: {world.name}
          </h1>
          <p className="text-gray-400">
            Customize character template fields for this world
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <WorldTemplateManager world={world} />
      </div>
    </div>
  );
}
