'use client';

import { NsfwGoogleDriveImage } from '@/components/oc/NsfwGoogleDriveImage';

interface OCInfoboxPortraitProps {
  src: string;
  alt: string;
  nsfw: boolean;
}

export function OCInfoboxPortrait({ src, alt, nsfw }: OCInfoboxPortraitProps) {
  return (
    <div className="relative w-full aspect-[4/5] mb-4 rounded-lg overflow-hidden" suppressHydrationWarning>
      <NsfwGoogleDriveImage
        src={src}
        alt={alt}
        nsfw={nsfw}
        coverClassName="absolute inset-0 w-full h-full"
        className="wiki-image w-full h-full object-contain"
        style={{ position: 'absolute', inset: 0, objectPosition: 'center 10%' }}
        priority
      />
    </div>
  );
}
