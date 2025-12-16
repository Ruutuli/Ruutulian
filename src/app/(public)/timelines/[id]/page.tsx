import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineEvent } from '@/components/timeline/TimelineEvent';
import { Markdown } from '@/lib/utils/markdown';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();

  const { data: timeline } = await supabase
    .from('timelines')
    .select('name, description_markdown, world:worlds(name, slug)')
    .eq('id', params.id)
    .single();

  if (!timeline) {
    return {
      title: 'Timeline Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com';
  const url = `${baseUrl}/timelines/${params.id}`;
  const world = timeline.world as any;
  // Use description_markdown for description, clean up markdown syntax
  const descriptionText = timeline.description_markdown || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${timeline.name}${world ? ` - Timeline from ${world.name}` : ''} on Ruutulian`;

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
      title: `${timeline.name} | Ruutulian`,
      description,
      url,
      type: 'website',
      images: [
        {
          url: `${baseUrl}/icon.png`,
          width: 512,
          height: 512,
          alt: timeline.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${timeline.name} | Ruutulian`,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function TimelinePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: timeline } = await supabase
    .from('timelines')
    .select('*, world:worlds(*)')
    .eq('id', params.id)
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
          oc:ocs(id, name, slug)
        )
      )
    `)
    .eq('timeline_id', timeline.id)
    .order('position', { ascending: true });

  // Extract events from associations
  const events = associations
    ?.map((assoc: any) => assoc.event)
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
          <div className="prose max-w-none">
            <Markdown content={timeline.description_markdown} />
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
