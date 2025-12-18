'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WorldLore } from '@/types/oc';
import { Markdown } from '@/lib/utils/markdown';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { getWorldLoreFieldDefinitions, getFieldValue } from '@/lib/fields/worldFields';
import { TagList } from '@/components/wiki/TagList';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl } from '@/lib/utils/googleDriveImage';

interface LoreDetailProps {
  lore: WorldLore;
}

export function LoreDetail({ lore }: LoreDetailProps) {
  const themeStyles = applyWorldThemeStyles(lore.world);
  const fieldDefinitions = getWorldLoreFieldDefinitions(lore);

  return (
    <div className="space-y-6">
      {/* Banner Image */}
      {lore.banner_image_url && (
        <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg">
          <Image
            src={lore.banner_image_url.includes('drive.google.com')
              ? getProxyUrl(lore.banner_image_url)
              : convertGoogleDriveUrl(lore.banner_image_url)}
            alt={`${lore.name} banner`}
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized={lore.banner_image_url.includes('drive.google.com') || isGoogleSitesUrl(lore.banner_image_url)}
          />
        </div>
      )}

      {/* Header */}
      <div className="wiki-card p-6" style={themeStyles}>
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-sm font-medium bg-purple-600/80 text-white rounded">
            {lore.lore_type}
          </span>
          {lore.world && (
            <Link
              href={`/worlds/${lore.world.slug}`}
              className="text-sm text-white/80 hover:text-white underline"
            >
              {lore.world.name}
            </Link>
          )}
        </div>
        <h1 className="text-4xl font-bold text-white">{lore.name}</h1>
      </div>

      {/* Description (Markdown) */}
      {lore.description && (
        <div className="wiki-card p-6">
          <div className="prose prose-invert max-w-none">
            <Markdown content={lore.description} />
          </div>
        </div>
      )}

      {/* Full Description (Markdown) */}
      {lore.description_markdown && (
        <div className="wiki-card p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Details</h2>
          <div className="prose prose-invert max-w-none">
            <Markdown content={lore.description_markdown} />
          </div>
        </div>
      )}

      {/* Related Characters */}
      {lore.related_ocs && lore.related_ocs.length > 0 && (
        <div className="wiki-card p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Related Characters</h2>
          <div className="space-y-2">
            {lore.related_ocs.map((rel) => (
              <div key={rel.id} className="flex items-center gap-2">
                {rel.oc && (
                  <Link
                    href={`/ocs/${rel.oc.slug}`}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {rel.oc.name}
                  </Link>
                )}
                {rel.role && (
                  <span className="text-sm text-gray-400">— {rel.role}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Timeline Events */}
      {lore.related_events && lore.related_events.length > 0 && (
        <div className="wiki-card p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Related Timeline Events</h2>
          <div className="space-y-2">
            {lore.related_events.map((rel) => (
              <div key={rel.id}>
                {rel.event && (
                  <Link
                    href={`/timelines/${rel.event.id}`}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {rel.event.title}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modular Fields */}
      {fieldDefinitions.length > 0 && lore.modular_fields && (
        <div className="wiki-card p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Additional Information</h2>
          <dl className="space-y-4">
            {fieldDefinitions.map((fieldDef) => {
              const value = getFieldValue(fieldDef, lore.modular_fields);
              if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
                return null;
              }

              if (fieldDef.type === 'array' && Array.isArray(value)) {
                return (
                  <div key={fieldDef.key} className="border-b border-gray-700/60 pb-4 last:border-b-0">
                    <dt className="font-semibold text-gray-200 mb-2 text-sm">{fieldDef.label}</dt>
                    <dd>
                      <TagList tags={value} />
                    </dd>
                  </div>
                );
              }

              return (
                <div key={fieldDef.key} className="border-b border-gray-700/60 pb-4 last:border-b-0">
                  <dt className="font-semibold text-gray-200 mb-1 text-sm">{fieldDef.label}</dt>
                  <dd className="text-gray-300">
                    {fieldDef.type === 'number' ? value : String(value)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}

