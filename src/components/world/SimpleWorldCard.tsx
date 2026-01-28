'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { World } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';

interface SimpleWorldCardProps {
  world: World;
}

export function SimpleWorldCard({ world }: SimpleWorldCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const themeStyles = applyWorldThemeStyles(world);

  const handleClick = () => {
    setIsLoading(true);
  };

  const imageUrl = world.header_image_url?.includes('drive.google.com')
    ? getProxyUrl(world.header_image_url)
    : (convertGoogleDriveUrl(world.header_image_url) || 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png');

  return (
    <Link 
      href={`/worlds/${world.slug}`}
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
          <Image
            src={imageUrl}
            alt={world.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized={world.header_image_url?.includes('drive.google.com') || isGoogleSitesUrl(world.header_image_url) || isAnimatedImage(world.header_image_url)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
        <div className="p-4 flex items-center justify-center flex-grow">
          <h3 className="text-lg font-bold text-gray-100 text-center">{world.name}</h3>
        </div>
      </div>
    </Link>
  );
}

