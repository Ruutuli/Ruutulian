import { createAdminClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export interface SiteConfig {
  websiteName: string;
  websiteDescription: string;
  iconUrl: string;
  altIconUrl?: string;
  siteUrl: string;
  authorName: string;
  shortName: string;
}

interface SiteSettingsRow {
  id: string;
  website_name: string;
  website_description: string;
  icon_url: string;
  alt_icon_url?: string | null;
  site_url: string;
  author_name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
}

/** Default config when no site_settings row exists yet (e.g. before /admin/setup is completed) */
const DEFAULT_SITE_CONFIG: SiteConfig = {
  websiteName: 'OC Wiki',
  websiteDescription: 'A place to store and organize information on original characters, worlds, lore, and timelines.',
  iconUrl: '/icon.png',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  authorName: '',
  shortName: 'OC Wiki',
};

/**
 * Internal function to fetch site config from database
 * This is cached using React's cache() to deduplicate requests within the same render
 * Returns defaults when no row exists so the app can load and the user can complete /admin/setup
 */
const fetchSiteConfigFromDB = cache(async (): Promise<SiteConfig> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Site settings error: ${error.message}`);
  }

  if (!data) {
    return { ...DEFAULT_SITE_CONFIG, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_CONFIG.siteUrl };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || data.site_url || 'https://example.com';

  return {
    websiteName: data.website_name,
    websiteDescription: data.website_description,
    iconUrl: data.icon_url,
    altIconUrl: data.alt_icon_url || undefined,
    siteUrl,
    authorName: data.author_name,
    shortName: data.short_name,
  };
});

/**
 * Get site configuration from database only (no file fallback)
 * Throws error if no settings exist in database
 * 
 * Uses React cache() to deduplicate calls within the same request
 * and unstable_cache for cross-request caching (60 seconds)
 */
export const getSiteConfig = unstable_cache(
  fetchSiteConfigFromDB,
  ['site-config'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['site-config'],
  }
);

/**
 * Get icon URL for a given context (admin or public)
 * Returns altIconUrl for admin pages if available, otherwise iconUrl
 */
export function getIconForContext(config: SiteConfig, isAdmin: boolean = false): string {
  if (isAdmin && config.altIconUrl) {
    return config.altIconUrl;
  }
  return config.iconUrl;
}


