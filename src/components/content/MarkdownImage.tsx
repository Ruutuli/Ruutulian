'use client';

import { useState, useCallback } from 'react';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface MarkdownImageProps {
  src: string;
  alt: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const [failed, setFailed] = useState(false);

  const handleAllFailed = useCallback(() => {
    setFailed(true);
  }, []);

  return (
    <span className="not-prose block my-4 clear-both">
      <GoogleDriveImage
        src={src}
        alt={alt}
        className="max-w-full max-h-[min(70vh,720px)] w-auto h-auto rounded-lg border border-gray-700/50"
        onAllFailed={handleAllFailed}
      />
      {failed && (
        <p className="mt-2 text-sm text-gray-500">
          Image could not be loaded.{' '}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
          >
            Open image URL
          </a>
        </p>
      )}
    </span>
  );
}
