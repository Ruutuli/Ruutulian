'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface WorldLoreCardProps {
  lore: {
    id: string;
    name: string;
    slug: string;
    lore_type: string;
    world?: { name: string } | null;
    banner_image_url?: string | null;
    related_ocs?: Array<any>;
    related_events?: Array<any>;
    updated_at?: string;
  };
}

export function WorldLoreCard({ lore }: WorldLoreCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${lore.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/world-lore/${lore.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete lore entry');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete lore entry');
      setDeleting(false);
    }
  };

  const ocCount = lore.related_ocs?.length || 0;
  const eventCount = lore.related_events?.length || 0;

  return (
    <div className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 overflow-hidden hover:border-purple-500/50 transition-colors">
      {/* Banner Image */}
      <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        {lore.banner_image_url ? (
          lore.banner_image_url.includes('drive.google.com') ? (
            <GoogleDriveImage
              src={lore.banner_image_url}
              alt={lore.name}
              className="w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <Image
              src={convertGoogleDriveUrl(lore.banner_image_url)}
              alt={lore.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              unoptimized={isGoogleSitesUrl(lore.banner_image_url) || isAnimatedImage(lore.banner_image_url)}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl text-gray-600">📖</div>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/70 text-purple-300 border border-purple-700">
            {lore.lore_type}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-100 mb-1 line-clamp-2">
            {lore.name}
          </h3>
          <p className="text-xs text-gray-400 truncate mb-2">{lore.slug}</p>
          
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">World:</span>
              <span className="text-gray-300 truncate">
                {lore.world ? lore.world.name : '—'}
              </span>
            </div>
            {(ocCount > 0 || eventCount > 0) && (
              <div className="flex items-center gap-3">
                {ocCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">Characters:</span>
                    <span className="text-gray-300">{ocCount}</span>
                  </div>
                )}
                {eventCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">Events:</span>
                    <span className="text-gray-300">{eventCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-600/50 flex gap-2">
          <Link
            href={`/admin/world-lore/${lore.id}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-center bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

