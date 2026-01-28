'use client';

import { useState, useRef, useMemo, useEffect, memo } from 'react';
import { getProxyUrl } from '@/lib/utils/googleDriveImage';
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
  fallbackSrc = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png',
  priority = false,
}: GoogleDriveImageProps) {
  // Calculate proxy URL immediately, not in useEffect - memoize to prevent recalculation
  const imageUrl = useMemo(() => {
    if (src.includes('drive.google.com')) {
      return getProxyUrl(src);
    }
    return src;
  }, [src]);

  // Track the current image URL to prevent unnecessary state changes
  const currentImageUrlRef = useRef<string>(imageUrl);
  const [hasError, setHasError] = useState(false);
  const errorCountRef = useRef<number>(0);

  // Only update ref when imageUrl actually changes
  useEffect(() => {
    if (currentImageUrlRef.current !== imageUrl) {
      currentImageUrlRef.current = imageUrl;
      // Reset error state only when URL changes
      setHasError(false);
      errorCountRef.current = 0;
    }
  }, [imageUrl]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Prevent infinite error loops - only show error after first attempt
    errorCountRef.current += 1;
    const img = e.currentTarget;
    
    // Check if the response was the transparent PNG fallback (1x1 pixel)
    // This indicates the proxy returned an error fallback
    if (img.naturalWidth === 1 && img.naturalHeight === 1 && !hasError) {
      // This is the transparent PNG fallback from the proxy
      setHasError(true);
      logger.warn('Component', 'GoogleDriveImage: Google Drive image not accessible. File may need to be shared publicly.', {
        originalUrl: src,
        proxyUrl: imageUrl,
        fileId: src.includes('drive.google.com') ? src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] : null,
      });
    } else if (errorCountRef.current >= 2 && !hasError) {
      // After 2 attempts, show fallback
      setHasError(true);
      logger.error('Component', 'GoogleDriveImage: Failed to load image after multiple attempts.', {
        originalUrl: src,
        proxyUrl: imageUrl,
        attempts: errorCountRef.current,
      });
    }
  };

  const handleLoad = () => {
    // Successfully loaded - reset error state and count
    if (hasError) {
      setHasError(false);
    }
    errorCountRef.current = 0;
  };

  // Use the current image URL, or fallback if there's an error
  const displayUrl = hasError ? fallbackSrc : imageUrl;

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

// Memoize to prevent unnecessary re-renders when parent components update
export const GoogleDriveImage = memo(GoogleDriveImageComponent);













