import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineEvent } from '@/components/timeline/TimelineEvent';
import { Markdown } from '@/lib/utils/markdown';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { convertGoogleDriveUrl, getProxyUrl, isGoogleSitesUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
import type { World, TimelineEvent as TimelineEventType, StoryAlias } from '@/types/oc';
import { generateDetailPageMetadata } from '@/lib/seo/page-metadata';

// Type for timeline world response
interface TimelineWorldResponse {
  name: string;
  slug: string;
  is_public?: boolean;
}

// Type for timeline event association response
interface TimelineEventAssociation {
  position: number;
  event: TimelineEventType | null;
}

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: timeline } = await supabase
    .from('timelines')
    .select('name, description_markdown, world:worlds(name, slug)')
    .eq('id', resolvedParams.id)
    .single();

  if (!timeline) {
    return {
      title: 'Timeline Not Found',
    };
  }

  const config = await getSiteConfig();
  // Handle array case from Supabase relation query
  const world = Array.isArray(timeline.world) 
    ? (timeline.world[0] as TimelineWorldResponse | undefined) || null
    : (timeline.world as TimelineWorldResponse | null);
  
  // Use description_markdown for description, clean up markdown syntax
  const descriptionText = timeline.description_markdown || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${timeline.name}${world ? ` - Timeline from ${world.name}` : ''} on ${config.websiteName}`;

  return generateDetailPageMetadata({
    title: timeline.name,
    description,
    path: `/timelines/${resolvedParams.id}`,
    keywords: [
      timeline.name,
      'timeline',
      'events',
      'chronology',
      world?.name || '',
      'OC wiki',
    ],
    entityName: timeline.name,
    entityType: 'website',
    imageUrl: null,
    imageAlt: timeline.name,
  });
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: timeline } = await supabase
    .from('timelines')
    .select('*, world:worlds(*)')
    .eq('id', resolvedParams.id)
    .single();

  if (!timeline) {
    notFound();
  }

  // Check if world is public
  if (timeline.world && !timeline.world.is_public) {
    notFound();
  }

  // Load events via junction table
  // Fetch story_aliases separately to avoid ambiguous relationship errors
  let { data: associations, error: eventsError } = await supabase
    .from('timeline_event_timelines')
    .select(`
      position,
      event:timeline_events(
        *,
        world:worlds(id, name, slug),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        )
      )
    `)
    .eq('timeline_id', timeline.id)
    .order('position', { ascending: true });

  // Fetch story_aliases separately for events that need them
  if (associations && !eventsError) {
      // Flatten events (handle both single objects and arrays from Supabase)
      const events = associations
        .map(a => a.event)
        .flatMap(e => {
          if (Array.isArray(e)) {
            return e.filter((ev): ev is TimelineEventType => ev !== null);
          }
          return e !== null ? [e] : [];
        })
        .filter((e): e is TimelineEventType => 
          e !== null &&
          typeof e === 'object' &&
          'id' in e &&
          typeof e.id === 'string' &&
          'story_alias_id' in e &&
          e.story_alias_id !== null &&
          e.story_alias_id !== undefined
        );
      
      if (events.length > 0) {
        const eventIdsWithStoryAlias = events.map(e => ({ id: e.id, story_alias_id: e.story_alias_id }));
        const storyAliasIds = [...new Set(eventIdsWithStoryAlias.map(e => e.story_alias_id))];
        const { data: storyAliases } = await supabase
          .from('story_aliases')
          .select('id, name, slug, description')
          .in('id', storyAliasIds);
        
        if (storyAliases) {
          const storyAliasMap = new Map(storyAliases.map(sa => [sa.id, sa]));
          associations.forEach(assoc => {
            // Handle both array and single object cases
            const event = Array.isArray(assoc.event) ? assoc.event[0] : assoc.event;
            if (event?.story_alias_id) {
              const storyAlias = storyAliasMap.get(event.story_alias_id);
              if (storyAlias && event) {
                // Update the event in the association
                // Cast storyAlias to StoryAlias since we have the required fields for display
                const fullStoryAlias = storyAlias as Partial<StoryAlias> as StoryAlias;
                if (Array.isArray(assoc.event)) {
                  if (assoc.event[0]) {
                    (assoc.event[0] as TimelineEventType).story_alias = fullStoryAlias;
                  }
                } else if (assoc.event) {
                  (assoc.event as TimelineEventType).story_alias = fullStoryAlias;
                }
              }
            }
          });
        }
      }
  }

  // Extract events from associations and sanitize date_data
  const events = (associations as TimelineEventAssociation[] | null)
    ?.map((assoc) => {
      const event = assoc.event;
      if (!event?.id) return null;
      
      // Sanitize date_data if it's invalid
      if (event.date_data && typeof event.date_data === 'string') {
        try {
          // Try to parse if it's a JSON string
          event.date_data = JSON.parse(event.date_data);
        } catch {
          // If parsing fails, set to null and use date_text instead
          event.date_data = null;
        }
      }
      
      return event as TimelineEventType;
    })
    .filter((e): e is TimelineEventType => e !== null && e.id !== undefined) || [];

  return (
    <div>
      <PageHeader
        title={timeline.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          timeline.world
            ? { label: timeline.world.name, href: `/worlds/${timeline.world.slug}` }
            : { label: 'Timeline' },
          { label: timeline.name },
        ]}
      />

      {/* Enhanced header section */}
      <div className="wiki-card p-6 md:p-8 mb-8">
        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-700/50">
          {timeline.world && (
            <Link
              href={`/worlds/${timeline.world.slug}`}
              className="inline-flex items-center gap-3 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/30 transition-colors group"
            >
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-purple-500/30 bg-gray-800/80 flex-shrink-0">
                {timeline.world.icon_url ? (
                  <Image
                    src={timeline.world.icon_url.includes('drive.google.com') ? getProxyUrl(timeline.world.icon_url) : convertGoogleDriveUrl(timeline.world.icon_url)}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                    unoptimized={timeline.world.icon_url?.includes('drive.google.com') || isGoogleSitesUrl(timeline.world.icon_url) || isAnimatedImage(timeline.world.icon_url)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-purple-400">
                    <i className="fas fa-globe text-sm" aria-hidden="true" />
                  </div>
                )}
              </div>
              <span className="font-medium">{timeline.world.name}</span>
              <i className="fas fa-arrow-right text-xs opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" aria-hidden="true"></i>
            </Link>
          )}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/30 text-gray-300 rounded-lg border border-gray-600/30">
            <i className="fas fa-calendar-alt text-sm text-purple-400" aria-hidden="true"></i>
            <span className="font-medium">{events.length} {events.length === 1 ? 'Event' : 'Events'}</span>
          </div>
          {timeline.updated_at && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/30 text-gray-400 rounded-lg border border-gray-600/30">
              <i className="fas fa-clock text-sm" aria-hidden="true"></i>
              <span className="text-sm">Updated {formatLastUpdated(timeline.updated_at)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {timeline.description_markdown && (
          <div className="prose max-w-none">
            <Markdown content={timeline.description_markdown} />
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full"></div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-100">
                <i className="fas fa-history mr-2 text-purple-400" aria-hidden="true"></i>
                Timeline Events
              </h2>
            </div>
            {events.length > 0 && (
              <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-sm font-medium border border-purple-500/30">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </span>
            )}
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        </div>
        
        {events && events.length > 0 ? (
          <div className="relative">
            {/* Continuous timeline line - spans full height, centered on dot columns */}
            {/* Mobile: w-12 = 3rem, center = 1.5rem, line width = 0.25rem (w-1), so left = 1.5rem - 0.125rem = 1.375rem */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)] z-10 md:hidden"
              style={{
                left: '1.375rem', // Center of w-12 column (1.5rem) minus half line width (0.125rem)
              }}
            />
            {/* Desktop: w-16 = 4rem, center = 2rem, line width = 0.25rem, so left = 2rem - 0.125rem = 1.875rem */}
            <div 
              className="hidden md:block absolute top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-400 to-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)] z-10"
              style={{
                left: '1.875rem', // Center of w-16 column (2rem) minus half line width (0.125rem)
              }}
            />
            {events.map((event, index) => (
              <TimelineEvent 
                key={event.id} 
                event={event} 
                isLast={index === events.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="wiki-card p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <i className="fas fa-calendar-times text-4xl text-gray-600" aria-hidden="true"></i>
              <p className="text-gray-400 text-lg">No events in this timeline yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
