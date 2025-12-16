'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Timeline {
  id: string;
  name: string;
  world: { name: string } | null;
}

interface TimelinesListProps {
  timelines: Timeline[];
}

export function TimelinesList({ timelines }: TimelinesListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone and will completely remove this timeline from the database.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/timelines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete timeline');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete timeline');
    } finally {
      setDeletingId(null);
    }
  };

  if (!timelines || timelines.length === 0) {
    return (
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-12 text-center border border-gray-600/70">
        <p className="text-gray-400 mb-4">No timelines yet.</p>
        <Link
          href="/admin/timelines/new"
          className="text-blue-400 hover:text-blue-300"
        >
          Create your first timeline →
        </Link>
      </div>
    );
  }

  return (
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
                World
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-700/50 divide-y divide-gray-600/50">
            {timelines.map((timeline) => (
              <tr key={timeline.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-100">{timeline.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {timeline.world ? (timeline.world as any).name : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/timelines/${timeline.id}`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/timelines/${timeline.id}/events`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    Events
                  </Link>
                  <button
                    onClick={() => handleDelete(timeline.id, timeline.name)}
                    disabled={deletingId === timeline.id}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === timeline.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {timelines.map((timeline) => (
          <div
            key={timeline.id}
            className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 p-4"
          >
            <div className="mb-3">
              <div className="text-base font-medium text-gray-100 mb-2">{timeline.name}</div>
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">World: </span>
                {timeline.world ? (timeline.world as any).name : '—'}
              </div>
            </div>
            <div className="pt-3 border-t border-gray-600/50 flex gap-4">
              <Link
                href={`/admin/timelines/${timeline.id}`}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Edit →
              </Link>
              <Link
                href={`/admin/timelines/${timeline.id}/events`}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Events →
              </Link>
              <button
                onClick={() => handleDelete(timeline.id, timeline.name)}
                disabled={deletingId === timeline.id}
                className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === timeline.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

