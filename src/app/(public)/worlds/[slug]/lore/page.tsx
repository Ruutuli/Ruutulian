import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoreList } from '@/components/lore/LoreList';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { WORLD_LORE_CARD_COLUMNS_PRIMARY } from '@/lib/supabase/world-public-queries';
import type { WorldLore } from '@/types/oc';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: world } = await supabase
    .from('worlds')
    .select('name, slug, summary')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!world) {
    return {
      title: 'World Not Found',
    };
  }

  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const url = `${baseUrl}/worlds/${resolvedParams.slug}/lore`;
  const iconUrl = convertGoogleDriveUrl(config.iconUrl || '/images/logo.png');
  const description = `Browse all lore entries for ${world.name} on ${config.websiteName}. Discover detailed world building, history, and background information.`;

  return {
    title: `${world.name} - Lore`,
    description,
    keywords: [
      world.name,
      'lore',
      'codex',
      'world building',
      'world lore',
      'background information',
      'OC wiki',
    ],
    openGraph: {
      title: `${world.name} - Lore | ${config.websiteName}`,
      description,
      url,
      type: 'website',
      images: [
        {
          url: iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`,
          width: 512,
          height: 512,
          alt: world.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${world.name} - Lore | ${config.websiteName}`,
      description,
      images: [iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function WorldLorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: world } = await supabase
    .from('worlds')
    .select('id, name, slug')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!world) {
    notFound();
  }

  const { data: loreEntries } = await supabase
    .from('world_lore')
    .select(WORLD_LORE_CARD_COLUMNS_PRIMARY as any)
    .eq('world_id', world.id)
    .order('lore_type', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title={`${world.name} - Lore`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Worlds', href: '/worlds' },
          { label: world.name, href: `/worlds/${world.slug}` },
          { label: 'Lore' },
        ]}
      />

      <section className="mt-8">
        <LoreList loreEntries={(loreEntries || []) as unknown as WorldLore[]} />
      </section>
    </div>
  );
}

