import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSiteConfig } from '@/lib/config/site-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoreDetail } from '@/components/lore/LoreDetail';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; loreSlug: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: lore } = await supabase
    .from('world_lore')
    .select('name, slug, description, description_markdown, banner_image_url, lore_type, world:worlds(name, slug)')
    .eq('slug', resolvedParams.loreSlug)
    .eq('world.is_public', true)
    .single();

  if (!lore || !lore.world) {
    return {
      title: 'Lore Entry Not Found',
    };
  }

  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const url = `${baseUrl}/worlds/${(lore.world as any).slug}/lore/${resolvedParams.loreSlug}`;
  const world = lore.world as any;
  const iconUrl = convertGoogleDriveUrl(config.iconUrl || '/icon.png');
  
  // Use description_markdown first, then description, then fallback
  const descriptionText = lore.description_markdown || lore.description || '';
  const description = descriptionText
    ? descriptionText.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (descriptionText.length > 155 ? '...' : '')
    : `${lore.name} - ${lore.lore_type} lore entry from ${world.name} on ${config.websiteName}`;

  return {
    title: `${lore.name} | ${world.name}`,
    description,
    keywords: [
      lore.name,
      lore.lore_type,
      'lore',
      'codex',
      world.name,
      'world building',
      'OC wiki',
    ].filter(Boolean),
    openGraph: {
      title: `${lore.name} | ${world.name} - ${config.websiteName}`,
      description,
      url,
      type: 'article',
      images: lore.banner_image_url
        ? [
            {
              url: lore.banner_image_url,
              alt: lore.name,
              width: 1200,
              height: 630,
            },
          ]
        : [
            {
              url: iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`,
              width: 512,
              height: 512,
              alt: lore.name,
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${lore.name} | ${world.name} - ${config.websiteName}`,
      description,
      images: lore.banner_image_url ? [lore.banner_image_url] : [iconUrl.startsWith('http') ? iconUrl : `${baseUrl}${iconUrl}`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function LoreEntryPage({
  params,
}: {
  params: Promise<{ slug: string; loreSlug: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const loreSlug = resolvedParams.loreSlug;

  // Query by lore slug and join with world
  const { data: lore } = await supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds!inner(id, name, slug, is_public)
    `)
    .eq('slug', loreSlug)
    .eq('world.is_public', true)
    .single();

  if (!lore || !lore.world) {
    notFound();
  }

  // Now fetch the full lore entry with relationships
  const { data: fullLore } = await supabase
    .from('world_lore')
    .select(`
      *,
      world:worlds(id, name, slug, is_public),
      related_ocs:world_lore_ocs(
        *,
        oc:ocs(id, name, slug)
      ),
      related_events:world_lore_timeline_events(
        *,
        event:timeline_events(id, title)
      )
    `)
    .eq('id', lore.id)
    .single();

  if (!fullLore || !fullLore.world) {
    notFound();
  }

  const world = fullLore.world;

  return (
    <div>
      <PageHeader
        title={lore.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Worlds', href: '/worlds' },
          { label: world.name, href: `/worlds/${world.slug}` },
          { label: 'Lore', href: `/worlds/${world.slug}/lore` },
          { label: lore.name },
        ]}
      />

      <section className="mt-8">
        <LoreDetail lore={fullLore} />
      </section>
    </div>
  );
}

