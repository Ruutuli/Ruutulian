'use client';

import Link from 'next/link';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { NsfwImageCover } from '@/components/gallery/NsfwImageCover';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { driveFileViewUrl } from '@/lib/gallery/constants';
import type { GalleryLayoutMode } from '@/components/gallery/gallery-public-types';

interface GalleryImageTileProps {
  fileId: string;
  title: string;
  tags: string[];
  isNsfw: boolean;
  characterNames: { name: string; slug: string; href: string }[];
  layout: GalleryLayoutMode;
  onOpen: () => void;
}

export function GalleryImageTile({
  fileId,
  title,
  tags,
  isNsfw,
  characterNames,
  layout,
  onOpen,
}: GalleryImageTileProps) {
  const src = convertGoogleDriveUrl(driveFileViewUrl(fileId));
  const displayTitle = title?.trim() || 'Untitled';
  const isMasonry = layout === 'masonry';

  return (
    <article
      className={
        isMasonry
          ? 'break-inside-avoid mb-4'
          : undefined
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className={`group relative block w-full text-left overflow-hidden border border-gray-700/60 bg-gray-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-950/30 ${
          isMasonry ? 'rounded-xl' : 'rounded-xl aspect-square'
        }`}
      >
        <div
          className={
            isMasonry
              ? 'relative bg-gray-950 min-h-[8rem]'
              : 'absolute inset-0 bg-gray-950'
          }
        >
          <NsfwImageCover nsfw={isNsfw} resetKey={fileId} className="w-full h-full">
            <GoogleDriveImage
              src={src}
              alt={displayTitle}
              className={
                isMasonry
                  ? 'w-full h-auto object-contain'
                  : 'w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]'
              }
            />
          </NsfwImageCover>
        </div>
        {isNsfw ? (
          <span className="absolute top-2 left-2 z-[5] text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-950/90 text-red-200 border border-red-700/50 pointer-events-none">
            NSFW
          </span>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 transition-all duration-300 pointer-events-none">
          <p className="text-sm font-medium text-white truncate drop-shadow-sm">{displayTitle}</p>
          {characterNames.length > 0 && (
            <p className="text-xs text-purple-200/90 mt-0.5 truncate">
              {characterNames.map((c) => c.name).join(' · ')}
            </p>
          )}
          {tags.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-1 truncate">{tags.slice(0, 3).join(' · ')}</p>
          )}
        </div>
        <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity rounded-full bg-black/50 backdrop-blur-sm p-1.5 text-white/90 pointer-events-none">
          <i className="fas fa-expand text-xs" aria-hidden />
        </span>
      </button>
      {!isMasonry && characterNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-0.5">
          {characterNames.slice(0, 2).map((c) => (
            <Link
              key={c.slug}
              href={c.href}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] px-2 py-0.5 rounded-full border border-gray-700/80 text-gray-400 hover:text-purple-200 hover:border-purple-500/40 transition-colors"
            >
              {c.name}
            </Link>
          ))}
          {characterNames.length > 2 && (
            <span className="text-[11px] text-gray-500 self-center">+{characterNames.length - 2}</span>
          )}
        </div>
      )}
    </article>
  );
}
