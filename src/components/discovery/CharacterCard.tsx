'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { OC } from '@/types/oc';
import { convertGoogleDriveUrl, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';

interface CharacterCardProps {
  oc: OC;
  className?: string;
}

export function CharacterCard({ oc, className = '' }: CharacterCardProps) {
  const themeStyles = applyWorldThemeStyles(oc.world);

  return (
    <Link
      href={`/ocs/${oc.slug}`}
      className={`block transform transition-all hover:scale-105 hover:shadow-xl ${className}`}
    >
      <div
        className="wiki-card overflow-hidden relative border-2 border-gray-600 hover:border-purple-500 transition-colors"
        style={themeStyles}
      >
        {/* Card Image */}
        <div className="relative w-full aspect-[3/4] bg-gray-900 overflow-hidden">
          {oc.image_url ? (
            oc.image_url.includes('drive.google.com') ? (
              <GoogleDriveImage
                src={oc.image_url}
                alt={oc.name}
                className="object-cover w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : (
              <Image
                src={convertGoogleDriveUrl(oc.image_url)}
                alt={oc.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                unoptimized={isGoogleSitesUrl(oc.image_url)}
              />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-4xl">?</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Card Content */}
        <div className="p-4 bg-gray-800">
          <h3 className="text-xl font-bold text-gray-100 mb-2 truncate">{oc.name}</h3>
          
          {/* Key Stats */}
          <div className="space-y-2 mb-3">
            {oc.world && (
              <div className="flex items-center gap-2 text-sm">
                <i className="fas fa-globe text-purple-400 w-4"></i>
                <span className="text-gray-300 truncate">{oc.world.name}</span>
              </div>
            )}
            {oc.age && (
              <div className="flex items-center gap-2 text-sm">
                <i className="fas fa-birthday-cake text-pink-400 w-4"></i>
                <span className="text-gray-300">Age {oc.age}</span>
              </div>
            )}
            {oc.status && (
              <div className="flex items-center gap-2 text-sm">
                <i className={`fas ${
                  oc.status === 'alive' ? 'fa-heart text-green-400' :
                  oc.status === 'deceased' ? 'fa-skull text-red-400' :
                  'fa-question-circle text-yellow-400'
                } w-4`}></i>
                <span className="text-gray-300 capitalize">{oc.status}</span>
              </div>
            )}
            {oc.species && (
              <div className="flex items-center gap-2 text-sm">
                <i className="fas fa-dragon text-teal-400 w-4"></i>
                <span className="text-gray-300 truncate">{oc.species}</span>
              </div>
            )}
          </div>

          {/* D&D Stats Preview */}
          {(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution) && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400 mb-1">D&D Stats</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {oc.stat_strength && (
                  <div className="text-center">
                    <div className="text-gray-400">STR</div>
                    <div className="text-purple-400 font-semibold">{oc.stat_strength}</div>
                  </div>
                )}
                {oc.stat_dexterity && (
                  <div className="text-center">
                    <div className="text-gray-400">DEX</div>
                    <div className="text-purple-400 font-semibold">{oc.stat_dexterity}</div>
                  </div>
                )}
                {oc.stat_constitution && (
                  <div className="text-center">
                    <div className="text-gray-400">CON</div>
                    <div className="text-purple-400 font-semibold">{oc.stat_constitution}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Button */}
          <div className="mt-4 pt-3 border-t border-gray-600">
            <div className="text-center text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium">
              View Details →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}


