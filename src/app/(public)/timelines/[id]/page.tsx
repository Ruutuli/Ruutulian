import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineEvent } from '@/components/timeline/TimelineEvent';
import { Markdown } from '@/lib/utils/markdown';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

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
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const url = `${baseUrl}/timelines/${resolvedParams.id}`;
  const world = timeline.world as any;
  const iconUrl = convertGoogleDriveUrl(config.iconUrl || '/images/logo.png');
  // Use description_markdown for description, clean up markdown syntax
  const descriptionText = timeline.description_markdown || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${timeline.name}${world ? ` - Timeline from ${world.name}` : ''} on ${config.websiteName}`;

  return {
    title: timeline.name,
    description,
    keywords: [
      timeline.name,
      'timeline',
      'events',
      'chronology',
      world?.name || '',
      'OC wiki',
    ].filter(Boolean),
    openGraph: {
      title: `${timeline.name} | ${config.websiteName}`,
      description,
      url,
      type: 'website',
      images: [
        {
          url: iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`,
          width: 512,
          height: 512,
          alt: timeline.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${timeline.name} | ${config.websiteName}`,
      description,
      images: [iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`],
    },
    alternates: {
      canonical: url,
    },
  };
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
  const { data: associations } = await supabase
    .from('timeline_event_timelines')
    .select(`
      position,
      event:timeline_events(
        *,
        world:worlds(id, name, slug),
        story_alias:story_aliases(id, name, slug, description),
        characters:timeline_event_characters(
          *,
          oc:ocs(id, name, slug, date_of_birth)
        )
      )
    `)
    .eq('timeline_id', timeline.id)
    .order('position', { ascending: true });

  // Extract events from associations and sanitize date_data
  const events = associations
    ?.map((assoc: any) => {
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
      
      return event;
    })
    .filter((e: any) => e?.id) || [];

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

      <div className="wiki-card p-6 md:p-8 mb-8">
        {timeline.description_markdown && (
          <div className="prose max-w-none mb-4">
            <Markdown content={timeline.description_markdown} />
          </div>
        )}
        {timeline.updated_at && (
          <div className="text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700/60">
            <i className="fas fa-clock mr-1.5" aria-hidden="true"></i>
            Last updated: {formatLastUpdated(timeline.updated_at)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Events</h2>
        {events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <TimelineEvent key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="wiki-card p-6 text-center text-gray-500">
            No events in this timeline yet.
          </div>
        )}
      </div>
    </div>
  );
}
