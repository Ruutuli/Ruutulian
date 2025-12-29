import siteConfigFile from '../../../site-config.json';
import type { SiteConfig } from './site-config';

/**
 * Get site configuration synchronously (for client components)
 * This will only return the file-based config
 */
export function getSiteConfigSync(): SiteConfig {
  return siteConfigFile as SiteConfig;
}

export type { SiteConfig };

