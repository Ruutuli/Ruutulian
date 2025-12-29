import { createAdminClient } from '@/lib/supabase/server';
import siteConfigFile from '../../../site-config.json';

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
 * Get site configuration from database, falling back to config file
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();

    // If database has settings, use them
    // Site URL always comes from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfigFile.siteUrl || 'https://example.com';
    
    if (data && !error) {
      return {
        websiteName: data.website_name || siteConfigFile.websiteName,
        websiteDescription: data.website_description || siteConfigFile.websiteDescription,
        iconUrl: data.icon_url || siteConfigFile.iconUrl,
        altIconUrl: data.alt_icon_url || undefined,
        siteUrl: siteUrl,
        authorName: data.author_name || siteConfigFile.authorName,
        shortName: data.short_name || siteConfigFile.shortName,
      };
    }
  } catch (error) {
    // If table doesn't exist or other error, fall back to file
    console.warn('Could not fetch site settings from database, using config file:', error);
  }

  // Fall back to config file
  // Site URL always comes from environment variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfigFile.siteUrl || 'https://example.com';
  return {
    ...siteConfigFile,
    siteUrl: siteUrl,
  } as SiteConfig;
}


