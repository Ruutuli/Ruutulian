'use client';

import { useRef } from 'react';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { driveFileViewUrl } from '@/lib/gallery/constants';

interface GalleryImageTileProps {
  fileId: string;
  title: string;
  tags: string[];
  characterNames: { name: string; slug: string; href: string }[];
}

export function GalleryImageTile({ fileId, title, tags, characterNames }: GalleryImageTileProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const src = convertGoogleDriveUrl(driveFileViewUrl(fileId));

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group relative block w-full text-left rounded-lg overflow-hidden border border-gray-700/80 bg-gray-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <div className="aspect-square relative bg-gray-950">
          <GoogleDriveImage
            src={src}
            alt={title || 'Artwork'}
            className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
          />
        </div>
        {title ? (
          <div className="p-2 text-xs text-gray-300 truncate border-t border-gray-800">{title}</div>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        className="max-w-[min(96vw,56rem)] w-full rounded-xl border border-gray-700 bg-gray-900 text-gray-100 p-0 backdrop:bg-black/70"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="max-h-[90vh] overflow-auto p-4">
          <div className="flex justify-between items-start gap-2 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">{title || 'Artwork'}</h3>
              {tags.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">{tags.join(' · ')}</p>
              )}
              {characterNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {characterNames.map((c) => (
                    <a
                      key={c.slug}
                      href={c.href}
                      className="text-xs text-purple-300 hover:text-pink-300 underline"
                    >
                      {c.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <form method="dialog">
              <button
                type="submit"
                className="px-3 py-1 text-sm rounded bg-gray-800 border border-gray-600 hover:bg-gray-700"
              >
                Close
              </button>
            </form>
          </div>
          <div className="rounded-lg overflow-hidden bg-gray-950 border border-gray-800">
            <GoogleDriveImage
              src={src}
              alt={title || 'Artwork'}
              className="w-full h-auto max-h-[75vh] object-contain mx-auto"
              priority={false}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
