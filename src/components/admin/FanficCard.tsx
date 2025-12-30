'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FanficCardProps {
  fanfic: {
    id: string;
    title: string;
    slug: string;
    rating?: string | null;
    is_public: boolean;
    world_count?: number;
    character_count?: number;
    tag_count?: number;
    updated_at?: string;
  };
}

export function FanficCard({ fanfic }: FanficCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${fanfic.title}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/fanfics/${fanfic.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete fanfic');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete fanfic');
      setDeleting(false);
    }
  };

  const getRatingColor = (rating?: string | null) => {
    switch (rating) {
      case 'G': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'PG': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'PG-13': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'R': return 'bg-orange-900/50 text-orange-300 border-orange-700';
      case 'M': return 'bg-red-900/50 text-red-300 border-red-700';
      default: return 'bg-gray-800/50 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 overflow-hidden hover:border-purple-500/50 transition-colors">
      {/* Card Content */}
      <div className="p-4">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-100 line-clamp-2 flex-1">
              {fanfic.title}
            </h3>
            {fanfic.rating && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRatingColor(fanfic.rating)} flex-shrink-0`}>
                {fanfic.rating}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate mb-2">{fanfic.slug}</p>
          
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {fanfic.is_public ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/70 text-green-300 border border-green-700">
                  Public
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-800/70 text-gray-400 border border-gray-700">
                  Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {fanfic.world_count !== undefined && (
                <span>Worlds: <span className="text-gray-300">{fanfic.world_count}</span></span>
              )}
              {fanfic.character_count !== undefined && (
                <span>Characters: <span className="text-gray-300">{fanfic.character_count}</span></span>
              )}
              {fanfic.tag_count !== undefined && (
                <span>Tags: <span className="text-gray-300">{fanfic.tag_count}</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-600/50 flex gap-2">
          <Link
            href={`/admin/fanfics/${fanfic.id}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-center bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors"
          >
            Edit
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

