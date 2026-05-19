'use client';

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react';
import Image, { type ImageProps } from 'next/image';
import {
  buildImageLoadAttempts,
  IMAGE_PLACEHOLDER_URL,
  shouldUseUnoptimizedImage,
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
  /** Called when every URL (including placeholder) failed to load. */
  onAllFailed?: () => void;
}

function isProxyImageUrl(url: string): boolean {
  return url.includes('/api/images/proxy');
}

function GoogleDriveImageComponent({
  src,
  alt,
  className = '',
  style,
  fallbackSrc = IMAGE_PLACEHOLDER_URL,
  priority = false,
  onAllFailed,
}: GoogleDriveImageProps) {
  const loadAttempts = useMemo(() => buildImageLoadAttempts(src), [src]);

  const [attemptIndex, setAttemptIndex] = useState(0);
  const loadAttemptsRef = useRef(loadAttempts);
  const onAllFailedRef = useRef(onAllFailed);

  useEffect(() => {
    onAllFailedRef.current = onAllFailed;
  }, [onAllFailed]);

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

        if (next === attempts.length) {
          logger.warn('Component', 'GoogleDriveImage: all URLs failed, using placeholder', {
            originalUrl: src,
            reason,
            attempts: attempts.length,
          });
          return next;
        }

        onAllFailedRef.current?.();
        return next;
      });
    },
    [src]
  );

  const handleError = () => {
    const attempts = loadAttemptsRef.current;
    if (attemptIndex >= attempts.length) {
      onAllFailedRef.current?.();
      return;
    }
    tryNextUrl('load-error');
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const attempts = loadAttemptsRef.current;
    if (attemptIndex >= attempts.length) return;

    const img = e.currentTarget;
    const currentUrl = attempts[attemptIndex] ?? displayUrl;

    if (
      isTinyPlaceholderImage(img.naturalWidth, img.naturalHeight) &&
      isProxyImageUrl(currentUrl)
    ) {
      tryNextUrl('proxy-fallback');
    }
  };

  if (loadAttempts.length === 0) {
    return null;
  }

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

/** next/image wrapper: tries direct URLs before proxy; onError → inline placeholder. */
export function ProxiedNextImage({
  src,
  fallbackSrc = IMAGE_PLACEHOLDER_URL,
  unoptimized,
  ...props
}: ProxiedNextImageProps) {
  const loadAttempts = useMemo(() => (src ? buildImageLoadAttempts(src) : []), [src]);

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
      const next = current + 1;
      return next <= attempts.length ? next : current;
    });
  }, []);

  const handleError = useCallback(() => {
    tryNextUrl();
  }, [tryNextUrl]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const attempts = loadAttemptsRef.current;
      if (attemptIndex >= attempts.length) return;

      const img = e.currentTarget;
      const currentUrl = attempts[attemptIndex] ?? '';
      if (
        isTinyPlaceholderImage(img.naturalWidth, img.naturalHeight) &&
        isProxyImageUrl(currentUrl)
      ) {
        tryNextUrl();
      }
    },
    [tryNextUrl, attemptIndex]
  );

  if (!displaySrc) return null;

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
