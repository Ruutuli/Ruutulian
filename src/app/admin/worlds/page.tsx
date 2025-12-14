import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Worlds',
};

export default async function AdminWorldsPage() {
  const supabase = await createClient();

  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name, slug, series_type, is_public, story_aliases(id)')
    .order('name', { ascending: true });

  // Transform the data to include story count
  const worldsWithStoryCount = worlds?.map((world) => ({
    id: world.id,
    name: world.name,
    slug: world.slug,
    series_type: world.series_type,
    is_public: world.is_public,
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

      {worldsWithStoryCount && worldsWithStoryCount.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-gray-700/90 rounded-lg shadow-lg overflow-hidden border border-gray-600/70">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-600/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Public
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Stories
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700/50 divide-y divide-gray-600/50">
                {worldsWithStoryCount.map((world) => (
                  <tr key={world.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-100">{world.name}</div>
                      <div className="text-sm text-gray-400">{world.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
                        {world.series_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {world.is_public ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{world.story_count}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/worlds/${world.id}`}
                        className="text-purple-400 hover:text-purple-300 mr-4"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {worldsWithStoryCount.map((world) => (
              <div
                key={world.id}
                className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-gray-100 mb-1">{world.name}</div>
                    <div className="text-sm text-gray-400 truncate">{world.slug}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
                    {world.series_type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Public:</span>
                    {world.is_public ? (
                      <span className="text-green-400 text-sm">Yes</span>
                    ) : (
                      <span className="text-gray-500 text-sm">No</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Stories:</span>
                    <span className="text-sm text-gray-300">{world.story_count}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-600/50">
                  <Link
                    href={`/admin/worlds/${world.id}`}
                    className="inline-block text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
          <p className="text-gray-400 mb-4">No worlds yet.</p>
          <Link
            href="/admin/worlds/new"
            className="text-purple-400 hover:text-purple-300"
          >
            Create your first world →
          </Link>
        </div>
      )}
    </div>
  );
}
