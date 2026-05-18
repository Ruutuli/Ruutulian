'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { GalleryImageTile } from '@/components/gallery/GalleryImageTile';
import { GalleryPagination } from '@/components/gallery/GalleryPagination';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { driveFileViewUrl } from '@/lib/gallery/constants';
import type { GalleryLayoutMode, GalleryPublicItem } from '@/components/gallery/gallery-public-types';

const LAYOUT_STORAGE_KEY = 'gallery-public-layout';

interface GalleryPublicClientProps {
  items: GalleryPublicItem[];
  page: number;
  perPage: number;
  total: number;
  tagFilter: string;
  characterSlug: string;
  activeCharacterName?: string;
}

function layoutGridClass(mode: GalleryLayoutMode): string {
  if (mode === 'masonry') {
    return 'columns-2 sm:columns-3 xl:columns-4 gap-4';
  }
  return 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';
}

export function GalleryPublicClient({
  items,
  page,
  perPage,
  total,
  tagFilter,
  characterSlug,
  activeCharacterName,
}: GalleryPublicClientProps) {
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
    setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  }, [items.length]);

  useEffect(() => {
    if (lightboxIndex === null) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (items.length > 1 && e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (items.length > 1 && e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxIndex, items.length, closeLightbox, goNext, goPrev]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const hasFilters = Boolean(tagFilter || characterSlug);

  const activeItem = lightboxIndex !== null ? items[lightboxIndex] : null;
  const lightboxSrc = activeItem
    ? convertGoogleDriveUrl(driveFileViewUrl(activeItem.fileId))
    : '';

  const lightbox = activeItem && (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.title || 'Artwork'}
      onClick={closeLightbox}
    >
      {items.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white z-10 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium tabular-nums">
          {lightboxIndex! + 1} / {items.length}
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
      {items.length > 1 && (
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
          <GoogleDriveImage
            src={lightboxSrc}
            alt={activeItem.title || 'Artwork'}
            className="max-w-full max-h-[min(72vh,900px)] w-auto h-auto object-contain mx-auto"
            priority
          />
        </div>
        <div className="w-full max-w-3xl text-center px-2">
          <h3 className="text-lg sm:text-xl font-semibold text-white">
            {activeItem.title?.trim() || 'Untitled'}
          </h3>
          {activeItem.tags.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">{activeItem.tags.join(' · ')}</p>
          )}
          {activeItem.characterNames.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {activeItem.characterNames.map((c) => (
                <Link
                  key={c.slug}
                  href={c.href}
                  className="text-xs px-2.5 py-1 rounded-full border border-purple-500/40 bg-purple-950/50 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400/60 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-400">
            {total === 0 ? (
              'No artwork'
            ) : (
              <>
                Showing <span className="text-gray-200 font-medium tabular-nums">{from}–{to}</span> of{' '}
                <span className="text-gray-200 font-medium tabular-nums">{total}</span>
              </>
            )}
          </p>
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Filtered by:</span>
              {tagFilter ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-200">
                  {tagFilter}
                </span>
              ) : null}
              {characterSlug ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-950/40 border border-pink-500/30 text-pink-200">
                  {activeCharacterName ?? characterSlug}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:inline">Layout</span>
          <GalleryLayoutToggle layout={layout} onLayoutChange={setLayoutPersisted} />
        </div>
      </div>

      <div className={layoutGridClass(layout)}>
        {items.map((item, index) => (
          <GalleryImageTile
            key={item.id}
            fileId={item.fileId}
            title={item.title}
            tags={item.tags}
            characterNames={item.characterNames}
            layout={layout}
            onOpen={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      <GalleryPagination
        page={page}
        perPage={perPage}
        total={total}
        tagFilter={tagFilter}
        characterSlug={characterSlug}
      />

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
