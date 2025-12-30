import { createClient } from '@/lib/supabase/server';
import { InteractiveTimeline } from '@/components/timeline/InteractiveTimeline';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Interactive Timeline',
    `Interactive timeline visualization for ${config.websiteName}.`,
    '/timelines/visual'
  );
}

export const revalidate = 60;

export default async function InteractiveTimelinePage() {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('timeline_events')
    .select('*')
    .not('year', 'is', null)
    .order('year', { ascending: true });

  if (error) {
    console.error('Error fetching timeline events:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Interactive Timeline" />
      <InteractiveTimeline events={events || []} />
    </div>
  );
}

