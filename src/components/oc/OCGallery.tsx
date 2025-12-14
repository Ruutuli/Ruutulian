'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { convertGoogleDriveUrl, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface OCGalleryProps {
  images: string[];
  ocName: string;
}

export function OCGallery({ images, ocName }: OCGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
      setImageLoading(true);
      setImageError(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  const goToNextImage = useCallback(() => {
    if (images.length > 1) {
      setSelectedImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        setSelectedImage(images[nextIndex]);
        setCurrentUrlIndex(0);
        setImageLoading(true);
        setImageError(false);
        return nextIndex;
      });
    }
  }, [images]);

  const goToPreviousImage = useCallback(() => {
    if (images.length > 1) {
      setSelectedImageIndex((prevIndex) => {
        const prev = (prevIndex - 1 + images.length) % images.length;
        setSelectedImage(images[prev]);
        setCurrentUrlIndex(0);
        setImageLoading(true);
        setImageError(false);
        return prev;
      });
    }
  }, [images]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
      }
    };
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (selectedImage && images.length > 1) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNextImage();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPreviousImage();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleArrowKeys);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleArrowKeys);
    };
  }, [selectedImage, images.length, goToNextImage, goToPreviousImage]);

  if (!images || images.length === 0) {
    return null;
  }

  // Helper to extract file ID from Google Drive URL
  const getGoogleDriveFileId = (url: string): string | null => {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Get multiple URL formats to try as fallbacks
  const getImageUrls = (url: string): string[] => {
    const converted = convertGoogleDriveUrl(url);
    const fileId = getGoogleDriveFileId(url);
    
    const urls = [converted];
    
    // Add thumbnail format as fallback (often more reliable)
    if (fileId) {
      urls.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`);
      urls.push(`https://drive.google.com/thumbnail?id=${fileId}`);
    }
    
    return urls;
  };

  const imageUrls = selectedImage ? getImageUrls(selectedImage) : [];
  const currentImageUrl = imageUrls[currentUrlIndex] || '';

  useEffect(() => {
    if (selectedImage) {
      setCurrentUrlIndex(0);
    }
  }, [selectedImage]);

  const handleImageError = () => {
    if (currentUrlIndex < imageUrls.length - 1) {
      // Try next URL format
      setCurrentUrlIndex(currentUrlIndex + 1);
      setImageLoading(true);
    } else {
      // All URLs failed
      setImageLoading(false);
      setImageError(true);
      console.error('Failed to load image. Tried URLs:', imageUrls);
      console.error('Original URL:', selectedImage);
    }
  };

  const modalContent = selectedImage && (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
      onClick={() => setSelectedImage(null)}
    >
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white z-10 bg-black/50 rounded-full px-4 py-2 text-sm">
          {selectedImageIndex + 1} / {images.length}
        </div>
      )}
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2 hover:bg-black/70"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedImage(null);
        }}
        aria-label="Close image"
      >
        <i className="fas fa-times text-2xl"></i>
      </button>
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-3 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousImage();
            }}
            aria-label="Previous image"
          >
            <i className="fas fa-chevron-left text-2xl"></i>
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-3 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              goToNextImage();
            }}
            aria-label="Next image"
          >
            <i className="fas fa-chevron-right text-2xl"></i>
          </button>
        </>
      )}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        {imageError ? (
          <div className="text-white text-center p-8 max-w-md">
            <i className="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-400"></i>
            <p className="text-lg mb-2">Failed to load image</p>
            <p className="text-sm text-gray-400 mb-4">Please check if the image URL is valid</p>
            {selectedImage && (
              <details className="text-left text-xs text-gray-500 mt-4">
                <summary className="cursor-pointer mb-2">Debug Info</summary>
                <div className="bg-black/50 p-3 rounded break-all">
                  <p className="mb-1"><strong>Original:</strong> {selectedImage}</p>
                  <p className="mb-1"><strong>Converted:</strong> {imageUrls[0]}</p>
                  <p><strong>Tried:</strong> {imageUrls.join(', ')}</p>
                </div>
              </details>
            )}
          </div>
        ) : (
          <img
            key={currentUrlIndex}
            src={currentImageUrl}
            alt={`${ocName} - Full size`}
            className="object-contain max-w-full max-h-full rounded-lg cursor-pointer"
            onLoad={() => setImageLoading(false)}
            onError={handleImageError}
            onClick={(e) => {
              e.stopPropagation();
              if (images.length > 1) {
                goToNextImage();
              }
            }}
            style={{ display: imageLoading ? 'none' : 'block' }}
            title={images.length > 1 ? "Click to view next image" : undefined}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((imageUrl, index) => (
          <button
            key={index}
            onClick={() => {
              setSelectedImage(imageUrl);
              setSelectedImageIndex(index);
            }}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 group"
          >
            {imageUrl.includes('drive.google.com') ? (
              <GoogleDriveImage
                src={imageUrl}
                alt={`${ocName} - Image ${index + 1}`}
                className="object-cover w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : (
              <Image
                src={convertGoogleDriveUrl(imageUrl)}
                alt={`${ocName} - Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized={isGoogleSitesUrl(imageUrl)}
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* Lightbox Modal - Rendered as portal to escape container constraints */}
      {mounted && modalContent && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
