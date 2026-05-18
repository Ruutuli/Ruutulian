'use client';

import { useState, useRef, useMemo, useEffect, memo, useCallback } from 'react';
import Image, { type ImageProps } from 'next/image';
import {
  resolveImageSrc,
  IMAGE_PLACEHOLDER_URL,
  shouldUseUnoptimizedImage,
} from '@/lib/utils/googleDriveImage';
import { logger } from '@/lib/logger';

interface GoogleDriveImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
  /** Hero/above-fold images: use priority. Default false = fetchpriority low to reduce decode pressure. */
  priority?: boolean;
}

function GoogleDriveImageComponent({
  src,
  alt,
  className = '',
  style,
  fallbackSrc = IMAGE_PLACEHOLDER_URL,
  priority = false,
}: GoogleDriveImageProps) {
  const imageUrl = useMemo(() => resolveImageSrc(src), [src]);

  const currentImageUrlRef = useRef<string>(imageUrl);
  const [displayUrl, setDisplayUrl] = useState(imageUrl);
  const errorCountRef = useRef<number>(0);

  useEffect(() => {
    if (currentImageUrlRef.current !== imageUrl) {
      currentImageUrlRef.current = imageUrl;
      setDisplayUrl(imageUrl);
      errorCountRef.current = 0;
    }
  }, [imageUrl]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    errorCountRef.current += 1;
    const img = e.currentTarget;

    if (img.naturalWidth === 1 && img.naturalHeight === 1) {
      setDisplayUrl(fallbackSrc);
      logger.warn('Component', 'GoogleDriveImage: proxy returned fallback (file may not be public)', {
        originalUrl: src,
        proxyUrl: imageUrl,
      });
      return;
    }

    if (errorCountRef.current >= 1) {
      setDisplayUrl(fallbackSrc);
      logger.warn('Component', 'GoogleDriveImage: failed to load, using placeholder', {
        originalUrl: src,
        proxyUrl: imageUrl,
        attempts: errorCountRef.current,
      });
    }
  };

  const handleLoad = () => {
    errorCountRef.current = 0;
  };

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'low'}
    />
  );
}

export const GoogleDriveImage = memo(GoogleDriveImageComponent);

type ProxiedNextImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src: string | null | undefined;
  fallbackSrc?: string;
};

/** next/image wrapper: Google URLs via proxy, onError → placeholder (never green corrupt frames). */
export function ProxiedNextImage({
  src,
  fallbackSrc = IMAGE_PLACEHOLDER_URL,
  unoptimized,
  ...props
}: ProxiedNextImageProps) {
  const resolved = useMemo(() => resolveImageSrc(src), [src]);
  const [displaySrc, setDisplaySrc] = useState(resolved);

  useEffect(() => {
    setDisplaySrc(resolved);
  }, [resolved]);

  const handleError = useCallback(() => {
    setDisplaySrc(fallbackSrc);
  }, [fallbackSrc]);

  return (
    <Image
      {...props}
      src={displaySrc}
      unoptimized={unoptimized ?? shouldUseUnoptimizedImage(displaySrc)}
      onError={handleError}
    />
  );
}
