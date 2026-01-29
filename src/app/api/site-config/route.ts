import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';

const DEFAULT_SITE_CONFIG = {
  websiteName: 'OC Wiki',
  websiteDescription: 'A place to store and organize information on original characters, worlds, lore, and timelines.',
  iconUrl: '/icon.png',
  altIconUrl: undefined as string | undefined,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  authorName: '',
  shortName: 'OC Wiki',
};

// Cache the site config fetch for 60 seconds
const getCachedSiteConfig = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .maybeSingle();
    return { data, error };
  },
  ['site-config-api'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['site-config'],
  }
);

// Public endpoint to get site configuration (no auth required)
// Returns defaults when no row exists so the app can load before /admin/setup is completed
export async function GET(request: Request) {
  try {
    const { data, error } = await getCachedSiteConfig();

    if (error) {
      logger.error('API', 'Error fetching site settings', error);
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Failed to fetch site settings',
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const config = data
      ? {
          websiteName: data.website_name,
          websiteDescription: data.website_description,
          iconUrl: data.icon_url,
          altIconUrl: data.alt_icon_url ?? undefined,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || data.site_url || 'https://example.com',
          authorName: data.author_name,
          shortName: data.short_name,
        }
      : { ...DEFAULT_SITE_CONFIG, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_CONFIG.siteUrl };

    return NextResponse.json(
      {
        success: true,
        data: config,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    logger.error('API', 'Unexpected error in site-config', error);
    return handleError(error, 'Failed to fetch site config');
  }
}

