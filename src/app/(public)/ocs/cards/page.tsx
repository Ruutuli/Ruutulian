import { createClient } from '@/lib/supabase/server';
import { CharacterCard } from '@/components/discovery/CharacterCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Character Cards',
    `View all characters in trading card format on ${config.websiteName}.`,
    '/ocs/cards'
  );
}

export const revalidate = 60;

export default async function CharacterCardsPage() {
  const supabase = await createClient();

  const { data: ocs, error } = await supabase
    .from('ocs')
    .select('*, world:worlds(id, name, slug, primary_color, accent_color)')
    .eq('is_public', true)
    .order('name');

  if (error) {
    console.error('Error fetching OCs:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Character Cards" />
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 mb-4">
          Browse all characters in trading card format with key stats and information.
        </p>
      </div>
      {ocs && ocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ocs.map((oc) => (
            <CharacterCard key={oc.id} oc={oc} />
          ))}
        </div>
      ) : (
        <div className="wiki-card p-6 text-center text-gray-400">
          <p>No characters found.</p>
        </div>
      )}
    </div>
  );
}

