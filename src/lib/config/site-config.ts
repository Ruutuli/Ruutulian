import { createAdminClient } from '@/lib/supabase/server';

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

/**
 * Get site configuration from database only (no file fallback)
 * Throws error if no settings exist in database
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Site settings not found in database. Please configure site settings in the admin panel. Error: ${error?.message || 'No data'}`);
  }

  // Site URL always comes from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || data.site_url || 'https://example.com';
  
  return {
    websiteName: data.website_name,
    websiteDescription: data.website_description,
    iconUrl: data.icon_url,
    altIconUrl: data.alt_icon_url || undefined,
    siteUrl: siteUrl,
    authorName: data.author_name,
    shortName: data.short_name,
  };
}


