import { createClient } from '@/lib/supabase/server';
import { CharacterComparison } from '@/components/interactive/CharacterComparison';
import { PageHeader } from '@/components/layout/PageHeader';
import type { OC } from '@/types/oc';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Compare Characters',
    `Compare two characters side-by-side on ${config.websiteName}.`,
    '/ocs/compare'
  );
}

export const revalidate = 60;

export default async function CompareCharactersPage() {
  const supabase = await createClient();

  // Fetch all public OCs for selection
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
      <PageHeader title="Compare Characters" />
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 mb-4">
          Select two characters to compare their stats, personality, and other attributes side-by-side.
        </p>
      </div>
      <CharacterComparison
        oc1={null}
        oc2={null}
        availableOCs={ocs || []}
      />
    </div>
  );
}

