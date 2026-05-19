'use client';

import type { ComponentProps } from 'react';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { NsfwImageCover } from '@/components/gallery/NsfwImageCover';

type NsfwGoogleDriveImageProps = ComponentProps<typeof GoogleDriveImage> & {
  nsfw?: boolean;
  resetKey?: string | number;
  coverClassName?: string;
};

export function NsfwGoogleDriveImage({
  nsfw = false,
  resetKey,
  coverClassName,
  className,
  ...imageProps
}: NsfwGoogleDriveImageProps) {
  return (
    <NsfwImageCover nsfw={nsfw} resetKey={resetKey} className={coverClassName ?? className}>
      <GoogleDriveImage className={className} {...imageProps} />
    </NsfwImageCover>
  );
}
