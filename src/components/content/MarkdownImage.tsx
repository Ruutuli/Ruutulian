'use client';

import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface MarkdownImageProps {
  src: string;
  alt: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  return (
    <span className="not-prose block my-4 clear-both">
      <GoogleDriveImage
        src={src}
        alt={alt}
        className="max-w-full max-h-[min(70vh,720px)] w-auto h-auto rounded-lg border border-gray-700/50"
      />
    </span>
  );
}
