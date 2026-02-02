'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TimelineCardProps {
  timeline: {
    id: string;
    name: string;
    world: { name: string } | null;
    event_count?: number;
    updated_at?: string;
  };
}

export function TimelineCard({ timeline }: TimelineCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${timeline.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/timelines/${timeline.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete timeline');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete timeline');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 overflow-hidden hover:border-blue-500/50 transition-colors">
      {/* Header */}
      <div className="relative h-24 bg-gradient-to-br from-blue-900/50 to-blue-800/30 overflow-hidden flex items-center justify-center">
        <div className="text-4xl text-blue-400/50">📅</div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-100 mb-2 line-clamp-2">
            {timeline.name}
          </h3>
          
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">World:</span>
              <span className="text-gray-300 truncate">
                {timeline.world ? timeline.world.name : '—'}
              </span>
            </div>
            {timeline.event_count !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Events:</span>
                <span className="text-gray-300">{timeline.event_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-600/50 flex gap-2">
          <Link
            href={`/admin/timelines/${timeline.id}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-center bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Edit
          </Link>
          <Link
            href={`/admin/timelines/${timeline.id}/events`}
            className="px-3 py-2 text-sm font-medium text-center bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors"
          >
            Events
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

