import { createClient } from '@/lib/supabase/server';
import { BirthdayCalendar } from '@/components/discovery/BirthdayCalendar';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Character Birthdays',
    `View character birthdays by month on ${config.websiteName}.`,
    '/calendar'
  );
}

export const revalidate = 60;

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: ocs, error } = await supabase
    .from('ocs')
    .select('id, name, slug, date_of_birth, image_url')
    .eq('is_public', true)
    .not('date_of_birth', 'is', null);

  if (error) {
    console.error('Error fetching OCs:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Character Birthdays" />
      <BirthdayCalendar ocs={ocs || []} />
    </div>
  );
}


