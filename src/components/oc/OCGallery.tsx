'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GalleryImageTile } from '@/components/gallery/GalleryImageTile';
import { NsfwImageCover } from '@/components/gallery/NsfwImageCover';
import type { GalleryLayoutMode } from '@/components/gallery/gallery-public-types';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { OCGalleryPagination } from '@/components/oc/OCGalleryPagination';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { driveFileViewUrl } from '@/lib/gallery/constants';

const LAYOUT_STORAGE_KEY = 'oc-gallery-layout';

export interface OCGalleryImage {
  id: string;
  fileId: string;
  url: string;
  title?: string;
  tags?: string[];
  isNsfw?: boolean;
}

interface OCGalleryProps {
  images: OCGalleryImage[];
  ocName: string;
  /** 1-based page when paginated */
  page?: number;
  perPage?: number;
  total?: number;
  ocSlug?: string;
}

function layoutGridClass(mode: GalleryLayoutMode): string {
  if (mode === 'masonry') {
    return 'columns-2 sm:columns-3 xl:columns-4 gap-4';
  }
  return 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';
}

function imageSrc(entry: OCGalleryImage): string {
  if (entry.fileId) {
    return convertGoogleDriveUrl(driveFileViewUrl(entry.fileId));
  }
  return convertGoogleDriveUrl(entry.url);
}

export function OCGallery({ images, ocName, page = 1, perPage, total, ocSlug }: OCGalleryProps) {
  const galleryTotal = total ?? images.length;
  const globalOffset = perPage ? (page - 1) * perPage : 0;
  const showPagination = Boolean(ocSlug && perPage && galleryTotal > (perPage ?? galleryTotal));
  const from = galleryTotal === 0 ? 0 : globalOffset + 1;
  const to = globalOffset + images.length;

  const [layout, setLayout] = useState<GalleryLayoutMode>('grid');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (stored === 'grid' || stored === 'masonry') setLayout(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLayoutPersisted = (mode: GalleryLayoutMode) => {
    setLayout(mode);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (lightboxIndex === null) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (images.length > 1 && e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (images.length > 1 && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxIndex, images.length, closeLightbox, goNext, goPrev]);

  if (!images || images.length === 0) {
    return null;
  }

  const activeItem = lightboxIndex !== null ? images[lightboxIndex] : null;
  const lightboxSrc = activeItem ? imageSrc(activeItem) : '';
  const displayTitle = activeItem?.title?.trim() || `${ocName} artwork`;

  const lightbox = activeItem && (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
      onClick={closeLightbox}
    >
      {(images.length > 1 || galleryTotal > 1) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white z-10 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium tabular-nums">
          {globalOffset + lightboxIndex! + 1} / {galleryTotal}
        </div>
      )}
      <button
        type="button"
        className="absolute top-4 right-4 text-white hover:text-gray-200 z-10 bg-black/60 backdrop-blur-sm rounded-full p-2.5 hover:bg-black/80 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          closeLightbox();
        }}
        aria-label="Close"
      >
        <i className="fas fa-times text-xl" aria-hidden />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white z-10 bg-black/60 backdrop-blur-sm rounded-full p-3 hover:bg-black/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous artwork"
          >
            <i className="fas fa-chevron-left text-xl" aria-hidden />
          </button>
          <button
            type="button"
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white z-10 bg-black/60 backdrop-blur-sm rounded-full p-3 hover:bg-black/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next artwork"
          >
            <i className="fas fa-chevron-right text-xl" aria-hidden />
          </button>
        </>
      )}
      <div
        className="relative max-w-[min(96vw,72rem)] max-h-[92vh] w-full flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex-1 min-h-0 flex items-center justify-center rounded-xl overflow-hidden bg-gray-950/80 border border-gray-800/80">
          <NsfwImageCover nsfw={Boolean(activeItem.isNsfw)} resetKey={activeItem.id} className="w-full flex items-center justify-center">
            <GoogleDriveImage
              src={lightboxSrc}
              alt={displayTitle}
              className="max-w-full max-h-[min(72vh,900px)] w-auto h-auto object-contain mx-auto"
              priority
            />
          </NsfwImageCover>
        </div>
        <div className="w-full max-w-3xl text-center px-2">
          <h3 className="text-lg sm:text-xl font-semibold text-white">{displayTitle}</h3>
          {(activeItem.tags?.length ?? 0) > 0 && (
            <p className="text-sm text-gray-400 mt-1">{activeItem.tags!.join(' · ')}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showPagination ? (
          <p className="text-sm text-gray-400">
            Showing <span className="text-gray-200 font-medium tabular-nums">{from}–{to}</span> of{' '}
            <span className="text-gray-200 font-medium tabular-nums">{galleryTotal}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            <span className="text-gray-200 font-medium tabular-nums">{galleryTotal}</span>{' '}
            {galleryTotal === 1 ? 'piece' : 'pieces'}
          </p>
        )}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:inline">Layout</span>
          <GalleryLayoutToggle layout={layout} onLayoutChange={setLayoutPersisted} />
        </div>
      </div>

      <div className={layoutGridClass(layout)}>
        {images.map((entry, index) => (
          <GalleryImageTile
            key={entry.id}
            fileId={entry.fileId || entry.id}
            imageSrc={entry.fileId ? undefined : imageSrc(entry)}
            title={entry.title?.trim() || `${ocName} artwork`}
            tags={entry.tags ?? []}
            isNsfw={Boolean(entry.isNsfw)}
            characterNames={[]}
            layout={layout}
            onOpen={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {showPagination && perPage && ocSlug ? (
        <OCGalleryPagination page={page} perPage={perPage} total={galleryTotal} ocSlug={ocSlug} />
      ) : null}

      {mounted && lightboxIndex !== null && typeof document !== 'undefined'
        ? createPortal(lightbox, document.body)
        : null}
    </div>
  );
}

function GalleryLayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: GalleryLayoutMode;
  onLayoutChange: (mode: GalleryLayoutMode) => void;
}) {
  const btn = (mode: GalleryLayoutMode, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => onLayoutChange(mode)}
      className={`p-2 rounded transition-colors ${
        layout === mode
          ? 'bg-purple-600 text-white shadow-sm'
          : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-600/60'
      }`}
      title={label}
      aria-label={label}
      aria-pressed={layout === mode}
    >
      <i className={`fas ${icon}`} aria-hidden />
    </button>
  );

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Gallery layout">
      {btn('grid', 'fa-th', 'Uniform grid')}
      {btn('masonry', 'fa-columns', 'Masonry gallery')}
    </div>
  );
}
