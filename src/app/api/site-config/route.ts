import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { logger } from '@/lib/logger';

// Cache the site config fetch for 60 seconds
const getCachedSiteConfig = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();
    return { data, error };
  },
  ['site-config-api'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['site-config'],
  }
);

// Public endpoint to get site configuration (no auth required)
// Database-only - no file fallback
export async function GET(request: Request) {
  try {
    const { data, error } = await getCachedSiteConfig();

    // PGRST116 is "not found" - return error if no settings exist
    if (error && error.code === 'PGRST116') {
      return NextResponse.json(
        {
          success: false,
          error: 'Site settings not configured. Please configure site settings in the admin panel.',
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    if (error || !data) {
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

    // Return database data with caching headers
    return NextResponse.json(
      {
        success: true,
        data: {
          websiteName: data.website_name,
          websiteDescription: data.website_description,
          iconUrl: data.icon_url,
          altIconUrl: data.alt_icon_url || undefined,
          siteUrl: data.site_url,
          authorName: data.author_name,
          shortName: data.short_name,
        },
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

