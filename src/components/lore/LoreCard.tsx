'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { WorldLore } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
import { Markdown } from '@/lib/utils/markdown';

interface LoreCardProps {
  lore: WorldLore;
}

export function LoreCard({ lore }: LoreCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const themeStyles = applyWorldThemeStyles(lore.world);

  const handleClick = () => {
    setIsLoading(true);
  };

  return (
    <Link
      href={`/worlds/${lore.world?.slug}/lore/${lore.slug}`}
      prefetch={true}
      onClick={handleClick}
      className="relative block"
    >
      <div
        className="wiki-card wiki-card-hover character-card overflow-hidden relative"
        style={themeStyles}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-sm font-medium">Loading...</span>
            </div>
          </div>
        )}
        <div className="relative h-48 w-full overflow-hidden">
          {lore.banner_image_url ? (
            <Image
              src={lore.banner_image_url.includes('drive.google.com') 
                ? getProxyUrl(lore.banner_image_url)
                : convertGoogleDriveUrl(lore.banner_image_url)}
              alt={lore.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-top"
              unoptimized={lore.banner_image_url.includes('drive.google.com') || isGoogleSitesUrl(lore.banner_image_url) || isAnimatedImage(lore.banner_image_url)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-4xl">?</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-1 text-xs font-medium bg-purple-600/80 text-white rounded">
                {lore.lore_type}
              </span>
              {lore.story_alias && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-500/50 text-purple-200 rounded">
                  {lore.story_alias.name}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{lore.name}</h3>
            {lore.world && (
              <p className="text-sm text-white/80">{lore.world.name}</p>
            )}
          </div>
        </div>
        {lore.description && (
          <div className="p-4">
            <div className="text-sm text-gray-300 prose prose-sm prose-invert max-w-none line-clamp-3 [&>*]:line-clamp-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown content={lore.description} />
            </div>
          </div>
        )}
        {(lore.related_ocs && lore.related_ocs.length > 0) && (
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-400">
              {lore.related_ocs.length} related character{lore.related_ocs.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

