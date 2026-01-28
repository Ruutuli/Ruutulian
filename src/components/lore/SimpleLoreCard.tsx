'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { WorldLore } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';

interface SimpleLoreCardProps {
  lore: WorldLore;
}

export function SimpleLoreCard({ lore }: SimpleLoreCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const themeStyles = applyWorldThemeStyles(lore.world);

  const handleClick = () => {
    setIsLoading(true);
  };

  const imageUrl = lore.banner_image_url?.includes('drive.google.com')
    ? getProxyUrl(lore.banner_image_url)
    : convertGoogleDriveUrl(lore.banner_image_url);

  return (
    <Link
      href={`/worlds/${lore.world?.slug}/lore/${lore.slug}`}
      prefetch={true}
      onClick={handleClick}
      className="relative block"
    >
      <div
        className="wiki-card wiki-card-hover overflow-hidden relative h-full flex flex-col"
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
        <div className="relative h-48 w-full overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={lore.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-top"
              unoptimized={lore.banner_image_url?.includes('drive.google.com') || isGoogleSitesUrl(lore.banner_image_url) || isAnimatedImage(lore.banner_image_url)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-4xl">?</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="p-4 flex items-center justify-center flex-grow">
          <h3 className="text-lg font-bold text-gray-100 text-center">{lore.name}</h3>
        </div>
      </div>
    </Link>
  );
}

