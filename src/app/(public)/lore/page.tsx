import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoreList } from '@/components/lore/LoreList';

export const metadata: Metadata = {
  title: 'Lore',
  description: 'Browse all lore entries and codex information on Ruutulian. Discover detailed world building, history, and background information.',
  keywords: ['lore', 'codex', 'world building', 'world lore', 'background information', 'OC wiki'],
  openGraph: {
    title: 'Lore | Ruutulian',
    description: 'Browse all lore entries and codex information on Ruutulian. Discover detailed world building, history, and background information.',
    url: '/lore',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com'}/icon.png`,
        width: 512,
        height: 512,
        alt: 'Ruutulian Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lore | Ruutulian',
    description: 'Browse all lore entries and codex information.',
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://ruutulian.com'}/icon.png`],
  },
  alternates: {
    canonical: '/lore',
  },
};

export default async function LorePage() {
  const supabase = await createClient();

  const { data: loreEntries } = await supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds!inner(id, name, slug, is_public),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title)
      )
    `)
    .eq('world.is_public', true)
    .order('lore_type', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="Lore"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Lore' },
        ]}
      />

      <section className="mt-8">
        <LoreList loreEntries={loreEntries || []} />
      </section>
    </div>
  );
}








