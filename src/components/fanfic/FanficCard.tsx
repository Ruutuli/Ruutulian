'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Fanfic } from '@/types/oc';
import { getRatingColorClasses } from '@/lib/utils/fanficRating';

interface FanficCardProps {
  fanfic: Fanfic;
}

export function FanficCard({ fanfic }: FanficCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
  };

  return (
    <Link
      href={`/fanfics/${fanfic.slug}`}
      prefetch={true}
      onClick={handleClick}
      className="relative block group"
    >
      <div className="wiki-card overflow-hidden relative bg-gray-800/95 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-200">
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}
        {/* Fanfic Image */}
        {fanfic.image_url && (
          <div className="w-full h-[100px] overflow-hidden">
            <img
              src={fanfic.image_url}
              alt={fanfic.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}
        <div className="p-6 space-y-4">
          {/* Title and Rating */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-100 leading-tight line-clamp-2 flex-1 group-hover:text-purple-300 transition-colors">
                {fanfic.title}
              </h3>
              {fanfic.rating && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded border flex-shrink-0 ${getRatingColorClasses(fanfic.rating)}`}>
                  {fanfic.rating}
                </span>
              )}
            </div>
            
            {/* Author */}
            {fanfic.author && (
              <p className="text-sm text-gray-400">
                by <span className="text-gray-300">{fanfic.author}</span>
              </p>
            )}
          </div>

          {/* Alternative Titles */}
          {fanfic.alternative_titles && fanfic.alternative_titles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 italic line-clamp-1">
                {fanfic.alternative_titles.join(', ')}
              </p>
            </div>
          )}

          {/* Summary */}
          {fanfic.summary && (
            <div>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">
                {fanfic.summary}
              </p>
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-3 pt-2 border-t border-gray-700/50">
            {/* World/Fandom */}
            {fanfic.world && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Fandom:</span>
                <div className="mt-1">
                  <span className="inline-block px-2.5 py-1 text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-600/30 rounded">
                    {fanfic.world.name}
                  </span>
                </div>
              </div>
            )}

            {/* Characters */}
            {fanfic.characters && fanfic.characters.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Characters:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {fanfic.characters.slice(0, 4).map((char, idx) => (
                    <span key={idx} className="text-xs text-gray-300">
                      {char.oc?.name || char.name}
                      {idx < Math.min(fanfic.characters.length, 4) - 1 ? ',' : ''}
                    </span>
                  ))}
                  {fanfic.characters.length > 4 && (
                    <span className="text-xs text-gray-500">
                      +{fanfic.characters.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tags - Limited display */}
            {fanfic.tags && fanfic.tags.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Tags:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {fanfic.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-block px-2 py-0.5 text-xs text-gray-400 bg-gray-700/50 border border-gray-600/50 rounded"
                    >
                      {tag.name}
                    </span>
                  ))}
                  {fanfic.tags.length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{fanfic.tags.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

