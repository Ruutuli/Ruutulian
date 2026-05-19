'use client';

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import Image, { type ImageProps } from 'next/image';
import {
  resolveImageSrc,
  IMAGE_PLACEHOLDER_URL,
  shouldUseUnoptimizedImage,
  getBrowserImageFallbackUrls,
  isTinyPlaceholderImage,
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

function buildLoadAttempts(src: string, primary: string): string[] {
  const attempts = [primary];
  const seen = new Set(attempts);
  for (const url of getBrowserImageFallbackUrls(src)) {
    if (!seen.has(url)) {
      seen.add(url);
      attempts.push(url);
    }
  }
  return attempts;
}

function GoogleDriveImageComponent({
  src,
  alt,
  className = '',
  style,
  fallbackSrc = IMAGE_PLACEHOLDER_URL,
  priority = false,
}: GoogleDriveImageProps) {
  const primaryUrl = useMemo(() => resolveImageSrc(src), [src]);
  const loadAttempts = useMemo(() => buildLoadAttempts(src, primaryUrl), [src, primaryUrl]);

  const [attemptIndex, setAttemptIndex] = useState(0);
  const loadAttemptsRef = useRef(loadAttempts);

  useEffect(() => {
    loadAttemptsRef.current = loadAttempts;
    setAttemptIndex(0);
  }, [loadAttempts]);

  const displayUrl =
    attemptIndex < loadAttempts.length ? loadAttempts[attemptIndex]! : fallbackSrc;

  const tryNextUrl = useCallback(
    (reason: 'proxy-fallback' | 'load-error') => {
      setAttemptIndex((current) => {
        const attempts = loadAttemptsRef.current;
        const next = current + 1;
        if (next < attempts.length) {
          logger.warn('Component', 'GoogleDriveImage: trying alternate image URL', {
            originalUrl: src,
            reason,
            from: attempts[current],
            to: attempts[next],
          });
          return next;
        }
        logger.warn('Component', 'GoogleDriveImage: all URLs failed, using placeholder', {
          originalUrl: src,
          reason,
          attempts: attempts.length,
        });
        return attempts.length;
      });
    },
    [src]
  );

  const handleError = () => {
    tryNextUrl('load-error');
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (isTinyPlaceholderImage(img.naturalWidth, img.naturalHeight)) {
      tryNextUrl('proxy-fallback');
    }
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

type ProxiedNextImageProps = Omit<ImageProps, 'src' | 'onError' | 'onLoad'> & {
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
  const primaryUrl = useMemo(() => resolveImageSrc(src), [src]);
  const loadAttempts = useMemo(
    () => (src ? buildLoadAttempts(src, primaryUrl) : [primaryUrl]),
    [src, primaryUrl]
  );

  const [attemptIndex, setAttemptIndex] = useState(0);
  const loadAttemptsRef = useRef(loadAttempts);

  useEffect(() => {
    loadAttemptsRef.current = loadAttempts;
    setAttemptIndex(0);
  }, [loadAttempts]);

  const displaySrc =
    attemptIndex < loadAttempts.length ? loadAttempts[attemptIndex]! : fallbackSrc;

  const tryNextUrl = useCallback(() => {
    setAttemptIndex((current) => {
      const attempts = loadAttemptsRef.current;
      return current + 1 < attempts.length ? current + 1 : attempts.length;
    });
  }, []);

  const handleError = useCallback(() => {
    tryNextUrl();
  }, [tryNextUrl]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const img = e.currentTarget;
      if (isTinyPlaceholderImage(img.naturalWidth, img.naturalHeight)) {
        tryNextUrl();
      }
    },
    [tryNextUrl]
  );

  return (
    <Image
      {...props}
      src={displaySrc}
      unoptimized={unoptimized ?? shouldUseUnoptimizedImage(displaySrc)}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
