'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { OC } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { TagsDisplay } from '@/components/content/TagsInput';

interface OCCardProps {
  oc: OC;
}

export function OCCard({ oc }: OCCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const themeStyles = applyWorldThemeStyles(oc.world);

  const handleClick = () => {
    setIsLoading(true);
  };

  return (
    <Link 
      href={`/ocs/${oc.slug}`}
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
        <div className="relative w-full overflow-hidden bg-gray-900">
          {oc.image_url ? (
            oc.image_url.includes('drive.google.com') ? (
              <div className="relative w-full aspect-square flex items-center justify-center">
                <GoogleDriveImage
                  src={oc.image_url}
                  alt={oc.name}
                  className="object-contain w-full h-full"
                  style={{ position: 'absolute', inset: 0 }}
                />
              </div>
            ) : (
              <div className="relative w-full aspect-square">
                <Image
                  src={convertGoogleDriveUrl(oc.image_url)}
                  alt={oc.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-contain"
                  unoptimized={isGoogleSitesUrl(oc.image_url)}
                />
              </div>
            )
          ) : (
            <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-2xl">?</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2 pointer-events-none">
            <h3 className="text-sm md:text-base font-bold text-white mb-0.5 truncate">{oc.name}</h3>
            {oc.world && (
              <p className="text-[10px] md:text-xs text-white/80 truncate">{oc.world.name}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
