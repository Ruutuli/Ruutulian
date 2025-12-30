'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Fanfic } from '@/types/oc';

interface FanficCardProps {
  fanfic: Fanfic;
}

export function FanficCard({ fanfic }: FanficCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
  };

  const getRatingColor = (rating?: string | null) => {
    switch (rating) {
      case 'G': return 'bg-green-900/70 text-green-200 border-green-700';
      case 'PG': return 'bg-blue-900/70 text-blue-200 border-blue-700';
      case 'PG-13': return 'bg-yellow-900/70 text-yellow-200 border-yellow-700';
      case 'R': return 'bg-orange-900/70 text-orange-200 border-orange-700';
      case 'M': return 'bg-red-900/70 text-red-200 border-red-700';
      default: return 'bg-gray-800/70 text-gray-300 border-gray-700';
    }
  };

  return (
    <Link
      href={`/fanfics/${fanfic.slug}`}
      prefetch={true}
      onClick={handleClick}
      className="relative block"
    >
      <div className="wiki-card wiki-card-hover overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-100 line-clamp-2 flex-1">
              {fanfic.title}
            </h3>
            {fanfic.rating && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border flex-shrink-0 ${getRatingColor(fanfic.rating)}`}>
                {fanfic.rating}
              </span>
            )}
          </div>
          {fanfic.alternative_titles && fanfic.alternative_titles.length > 0 && (
            <div className="mb-2">
              <p className="text-sm text-gray-400 italic">
                Also known as: {fanfic.alternative_titles.join(', ')}
              </p>
            </div>
          )}
          {fanfic.summary && (
            <div className="mb-3">
              <p className="text-sm text-gray-300 line-clamp-3">
                {fanfic.summary}
              </p>
            </div>
          )}
          {fanfic.world && (
            <div className="mb-2">
              <span className="px-2 py-1 text-xs bg-purple-600/80 text-white rounded">
                {fanfic.world.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {fanfic.characters && fanfic.characters.length > 0 && (
              <span>{fanfic.characters.length} character{fanfic.characters.length !== 1 ? 's' : ''}</span>
            )}
            {fanfic.tags && fanfic.tags.length > 0 && (
              <span>{fanfic.tags.length} tag{fanfic.tags.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

