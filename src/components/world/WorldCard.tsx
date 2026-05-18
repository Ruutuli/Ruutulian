'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { World } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { ProxiedNextImage } from '@/components/oc/GoogleDriveImage';

interface WorldCardProps {
  world: World;
}

export function WorldCard({ world }: WorldCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const themeStyles = applyWorldThemeStyles(world);

  const handleClick = () => {
    setIsLoading(true);
  };

  return (
    <Link 
      href={`/worlds/${world.slug}`}
      prefetch={true}
      onClick={handleClick}
      className="relative block"
    >
      <div
        className="wiki-card wiki-card-hover character-card overflow-hidden relative h-full flex flex-col"
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
          <ProxiedNextImage
            src={world.header_image_url}
            alt={world.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
          />
        </div>
        <div className="p-4 md:p-6 flex flex-col flex-grow">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
              <ProxiedNextImage
                src={world.icon_url}
                alt={world.name}
                fill
                sizes="(max-width: 768px) 40px, 48px"
                className="object-contain rounded-lg"
              />
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-gray-100 truncate">{world.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            <span
              className="px-2.5 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium text-white"
              style={{ backgroundColor: world.primary_color }}
            >
              {world.series_type}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
