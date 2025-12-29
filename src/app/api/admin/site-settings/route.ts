import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/config/site-config';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();

    // PGRST116 is "not found" - this is normal if no settings exist yet
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching site settings:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // If no data in database, return site-config.json as fallback using getSiteConfig
    if (!data) {
      const config = await getSiteConfig();
      return NextResponse.json({
        success: true,
        data: {
          website_name: config.websiteName || '',
          website_description: config.websiteDescription || '',
          icon_url: config.iconUrl || '',
          alt_icon_url: config.altIconUrl || null,
          author_name: config.authorName || '',
          short_name: config.shortName || '',
        },
      });
    }

    // Return database data
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Exception in GET site-settings:', error);
    return handleError(error, 'Failed to fetch site settings');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
    const {
      websiteName,
      websiteDescription,
      iconUrl,
      altIconUrl,
      authorName,
      shortName,
    } = body;

    // Get site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // Validate required fields
    if (
      !websiteName ||
      !websiteDescription ||
      !iconUrl ||
      !authorName ||
      !shortName
    ) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a row exists
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .single();

    let result;
    if (existing) {
      // Update existing row
      const { data, error } = await supabase
        .from('site_settings')
        .update({
          website_name: websiteName,
          website_description: websiteDescription,
          icon_url: iconUrl,
          alt_icon_url: altIconUrl || null,
          site_url: siteUrl,
          author_name: authorName,
          short_name: shortName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      result = data;
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from('site_settings')
        .insert({
          website_name: websiteName,
          website_description: websiteDescription,
          icon_url: iconUrl,
          alt_icon_url: altIconUrl || null,
          site_url: siteUrl,
          author_name: authorName,
          short_name: shortName,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      result = data;
    }

    // Sync current_projects description with website description
    try {
      const { data: existingProjects } = await supabase
        .from('current_projects')
        .select('id')
        .single();

      const projectsDescription = `Welcome to ${websiteName}! ${websiteDescription}`;

      if (existingProjects) {
        // Update existing current_projects description
        await supabase
          .from('current_projects')
          .update({
            description: projectsDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProjects.id);
      } else {
        // Create current_projects with synced description
        await supabase
          .from('current_projects')
          .insert({
            description: projectsDescription,
            project_items: [
              {
                title: 'World Building',
                description: 'Creating and expanding unique worlds and universes',
                icon: 'fas fa-globe',
                color: 'purple',
              },
              {
                title: 'Character Development',
                description: 'Developing rich characters with detailed backstories',
                icon: 'fas fa-users',
                color: 'pink',
              },
            ],
          });
      }
    } catch (projectsError) {
      // Log but don't fail the request if current_projects update fails
      console.warn('Failed to sync current_projects description:', projectsError);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleError(error, 'Failed to update site settings');
  }
}

