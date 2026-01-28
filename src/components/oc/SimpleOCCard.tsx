'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { OC } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface SimpleOCCardProps {
  oc: OC;
}

export function SimpleOCCard({ oc }: SimpleOCCardProps) {
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
        <div className="relative h-48 w-full overflow-hidden bg-gray-900 flex-shrink-0">
          {oc.image_url ? (
            oc.image_url.includes('drive.google.com') ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <GoogleDriveImage
                  src={oc.image_url}
                  alt={oc.name}
                  className="object-contain w-full h-full"
                  style={{ position: 'absolute', inset: 0 }}
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={convertGoogleDriveUrl(oc.image_url)}
                  alt={oc.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain"
                  unoptimized={isGoogleSitesUrl(oc.image_url) || isAnimatedImage(oc.image_url)}
                />
              </div>
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-2xl">?</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
        </div>
        <div className="p-4 flex items-center justify-center flex-grow">
          <h3 className="text-lg font-bold text-gray-100 text-center">{oc.name}</h3>
        </div>
      </div>
    </Link>
  );
}

