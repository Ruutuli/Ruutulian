'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface WorldCardProps {
  world: {
    id: string;
    name: string;
    slug: string;
    series_type: string;
    is_public: boolean;
    story_count: number;
    header_image_url?: string | null;
    icon_url?: string | null;
    updated_at?: string;
  };
}

export function WorldCard({ world }: WorldCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${world.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/worlds/${world.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete world');
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete world');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-gray-700/90 rounded-lg shadow-lg border border-gray-600/70 overflow-hidden hover:border-purple-500/50 transition-colors">
      {/* Header Image */}
      <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
        {world.header_image_url ? (
          world.header_image_url.includes('drive.google.com') ? (
            <GoogleDriveImage
              src={world.header_image_url}
              alt={world.name}
              className="w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <Image
              src={convertGoogleDriveUrl(world.header_image_url)}
              alt={world.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              unoptimized={isGoogleSitesUrl(world.header_image_url) || isAnimatedImage(world.header_image_url)}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl text-gray-600">🌍</div>
          </div>
        )}
        <div className="absolute top-2 right-2">
          {world.is_public ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/70 text-green-300 border border-green-700">
              Public
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-800/70 text-gray-400 border border-gray-700">
              Private
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            {world.icon_url && (
              <div className="relative w-8 h-8 flex-shrink-0">
                {world.icon_url.includes('drive.google.com') ? (
                  <GoogleDriveImage
                    src={world.icon_url}
                    alt={world.name}
                    className="w-full h-full rounded"
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <Image
                    src={convertGoogleDriveUrl(world.icon_url)}
                    alt={world.name}
                    fill
                    sizes="32px"
                    className="object-contain rounded"
                    unoptimized={isGoogleSitesUrl(world.icon_url) || isAnimatedImage(world.icon_url)}
                  />
                )}
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-100 line-clamp-1 flex-1">
              {world.name}
            </h3>
          </div>
          <p className="text-xs text-gray-400 truncate mb-2">{world.slug}</p>
          
          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Type:</span>
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
                {world.series_type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Stories:</span>
              <span className="text-gray-300">{world.story_count}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-gray-600/50 flex gap-2">
          <Link
            href={`/admin/worlds/${world.id}`}
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

