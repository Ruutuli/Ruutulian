import { createClient } from '@/lib/supabase/server';
import { CharacterCard } from '@/components/discovery/CharacterCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { logger } from '@/lib/logger';
import { attachImageNsfwFlags } from '@/lib/gallery/nsfw-lookup';
import { OC_CARD_COMPARE_SELECT } from '@/lib/supabase/oc-public-queries';

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
    .select(OC_CARD_COMPARE_SELECT)
    .eq('is_public', true)
    .order('name');

  if (error) {
    logger.error('Page', 'ocs/cards: Error fetching OCs', error);
  }

  const displayOcs = ocs && ocs.length > 0 ? await attachImageNsfwFlags(supabase, ocs) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Character Cards" />
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 mb-4">
          Browse all characters in trading card format with key stats and information.
        </p>
      </div>
      {displayOcs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayOcs.map((oc) => (
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



