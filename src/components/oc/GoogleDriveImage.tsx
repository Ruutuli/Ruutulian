'use client';

import { useState, useEffect, useMemo } from 'react';
import { getGoogleDriveFileId, getProxyUrl } from '@/lib/utils/googleDriveImage';

interface GoogleDriveImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
}

export function GoogleDriveImage({ 
  src, 
  alt, 
  className = '', 
  style,
  fallbackSrc = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png'
}: GoogleDriveImageProps) {
  // Calculate proxy URL immediately, not in useEffect
  const imageUrl = useMemo(() => {
    if (src.includes('drive.google.com')) {
      return getProxyUrl(src);
    }
    return src;
  }, [src]);

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset state when src changes
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoading(false);
    // Log both the original URL and the proxy URL for debugging
    console.error('Failed to load image. Original URL:', src);
    console.error('Proxy URL attempted:', imageUrl);
    
    // If the proxy failed, we might need to try a different approach
    // For now, just show the fallback
  };

  const handleLoad = () => {
    setHasError(false);
    setIsLoading(false);
  };

  return (
    <img
      src={hasError ? fallbackSrc : imageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}













