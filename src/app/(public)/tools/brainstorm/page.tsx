import { BrainstormResources } from '@/components/creative/BrainstormResources';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { loadBrainstormOptions } from '@/lib/brainstorm/load-options';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'OC Brainstorming Resources',
    `Browse races, weapons, personality traits, tropes, and more for character inspiration on ${config.websiteName}.`,
    '/tools/brainstorm'
  );
}

export default function BrainstormResourcesPage() {
  const categories = loadBrainstormOptions();

  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="OC Brainstorming Resources" />
        <p className="text-gray-400 text-lg mt-4 max-w-3xl">
          Look up races, weapons, elements, personality traits, tropes, and more — a searchable
          reference for building original characters.
        </p>
      </div>
      <BrainstormResources categories={categories} />
    </div>
  );
}
