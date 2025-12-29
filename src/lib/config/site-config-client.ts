import type { SiteConfig } from './site-config';

/**
 * Get site configuration synchronously (for client components)
 * Returns default values - should be replaced by API fetch in components
 * @deprecated Use API fetch instead. This is only for initial render fallback.
 */
export function getSiteConfigSync(): SiteConfig {
  // Return minimal defaults - components should fetch from API
  return {
    websiteName: 'Ruutulian',
    websiteDescription: 'A place to store and organize information on original characters, worlds, lore, and timelines.',
    iconUrl: '/icon.png',
    altIconUrl: undefined,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
    authorName: '',
    shortName: 'Ruutulian',
  };
}

export type { SiteConfig };

