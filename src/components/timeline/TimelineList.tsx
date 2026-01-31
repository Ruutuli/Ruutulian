'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Timeline, World } from '@/types/oc';
import * as googleDrive from '@/lib/utils/googleDriveImage';

export interface TimelineWithCount extends Timeline {
  event_count?: number;
}

interface TimelineListProps {
  timelines: TimelineWithCount[];
}

function getWorldIconSrc(world: Timeline['world']) {
  if (!world?.icon_url) return null;
  return world.icon_url.includes('drive.google.com')
    ? googleDrive.getProxyUrl(world.icon_url)
    : googleDrive.convertGoogleDriveUrl(world.icon_url);
}

function getWorldPrimaryColor(world: Timeline['world']): string {
  const worldObj = world as World | undefined;
  return worldObj?.primary_color || '#9333ea'; // Default purple
}

export function TimelineList({ timelines }: TimelineListProps) {
  if (!timelines || timelines.length === 0) {
    return (
      <div className="wiki-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-calendar-times text-4xl text-gray-600" aria-hidden="true"></i>
          <p className="text-gray-400 text-lg">No timelines available.</p>
        </div>
      </div>
    );
  }

  // Find top 3 timelines by event count for featured badges
  const sortedByEvents = [...timelines].sort((a, b) => (b.event_count ?? 0) - (a.event_count ?? 0));
  const top3Ids = new Set(sortedByEvents.slice(0, 3).map(t => t.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">
          {timelines.length} timeline{timelines.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {timelines.map((timeline) => {
        const world = timeline.world as World | undefined;
        const worldSlug = world?.slug;
        const worldIconSrc = getWorldIconSrc(timeline.world);
        const eventCount = (timeline as TimelineWithCount).event_count ?? 0;
        const href = worldSlug ? `/worlds/${worldSlug}/timelines/${timeline.id}` : `/timelines/${timeline.id}`;
        const primaryColor = getWorldPrimaryColor(timeline.world);
        const isFeatured = eventCount >= 10 || top3Ids.has(timeline.id);

        return (
          <Link
            key={timeline.id}
            href={href}
            prefetch={true}
            className="group block"
          >
            <div 
              className="wiki-card wiki-card-hover p-5 md:p-6 flex gap-4 items-start relative border-l-4 transition-all"
              style={{
                borderLeftColor: primaryColor,
              }}
              onMouseEnter={(e) => {
                const color = primaryColor;
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                e.currentTarget.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              {/* World logo on the card */}
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-gray-600/50 bg-gray-700/50 flex-shrink-0">
                {worldIconSrc ? (
                  <Image
                    src={worldIconSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 80px, 96px"
                    className="object-cover"
                    unoptimized={
                      !!(
                        world?.icon_url &&
                        (world.icon_url.includes('drive.google.com') ||
                          googleDrive.isGoogleSitesUrl(world.icon_url) ||
                          googleDrive.isAnimatedImage(world.icon_url))
                      )
                    }
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <i className="fas fa-globe text-2xl md:text-3xl" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-100 flex-1">
                    {timeline.name}
                  </h3>
                  {isFeatured && (
                    <span 
                      className="px-2 py-0.5 text-xs font-semibold rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mb-2">
                  {world?.name && (
                    worldSlug ? (
                      <Link
                        href={`/worlds/${worldSlug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="transition-colors"
                        style={{ 
                          '--hover-color': primaryColor 
                        } as React.CSSProperties & { '--hover-color': string }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = primaryColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '';
                        }}
                      >
                        {world.name}
                      </Link>
                    ) : (
                      <span>{world.name}</span>
                    )
                  )}
                  <span 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                    style={{ 
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor 
                    }}
                  >
                    <i className="fas fa-calendar-alt text-xs" aria-hidden="true" />
                    {eventCount} {eventCount === 1 ? 'event' : 'events'}
                  </span>
                </div>
                {timeline.description_markdown && (
                  <p className="text-gray-400 line-clamp-2 text-sm">
                    {timeline.description_markdown.replace(/[#*]/g, '').trim()}
                  </p>
                )}
              </div>

              <div 
                className="flex-shrink-0 self-center text-gray-500 transition-colors group-hover:text-opacity-100"
                style={{ 
                  color: 'rgb(156 163 175)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = primaryColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgb(156 163 175)';
                }}
              >
                <i className="fas fa-chevron-right text-sm group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
