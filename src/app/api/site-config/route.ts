import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { NextResponse } from 'next/server';

// Public endpoint to get site configuration (no auth required)
// Database-only - no file fallback
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();

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
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    if (error || !data) {
      console.error('[GET /api/site-config] Error fetching site settings:', error);
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Failed to fetch site settings',
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Return database data with no-cache headers
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/site-config] Unexpected error:', error);
    return handleError(error, 'Failed to fetch site config');
  }
}

