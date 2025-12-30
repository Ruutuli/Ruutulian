import { CharacterGenerator } from '@/components/creative/CharacterGenerator';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Character Generator',
    `Generate random character concepts for inspiration on ${config.websiteName}.`,
    '/tools/generator'
  );
}

export default function CharacterGeneratorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Character Generator" />
      <CharacterGenerator />
    </div>
  );
}

