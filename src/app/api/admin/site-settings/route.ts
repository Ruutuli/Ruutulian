import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();

    // PGRST116 is "not found" - this is normal if no settings exist yet
    if (error && error.code !== 'PGRST116') {
      console.error('[GET /api/admin/site-settings] Error fetching site settings:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // If no data in database, return empty/null values (no file fallback)
    if (!data) {
      return NextResponse.json({
        success: true,
        data: null, // Return null to indicate no settings exist
      });
    }

    // Return database data
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/admin/site-settings] Request failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to fetch site settings');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    
    if (!user) {
      console.warn('[PUT /api/admin/site-settings] Unauthorized request');
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

    // Normalize altIconUrl: convert empty strings, null, or undefined to null
    const normalizedAltIconUrl = altIconUrl && altIconUrl.trim() ? altIconUrl.trim() : null;

    // Get site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // Validate required fields
    const missingFields = [];
    if (!websiteName) missingFields.push('websiteName');
    if (!websiteDescription) missingFields.push('websiteDescription');
    if (!iconUrl) missingFields.push('iconUrl');
    if (!authorName) missingFields.push('authorName');
    if (!shortName) missingFields.push('shortName');
    
    if (missingFields.length > 0) {
      console.error('[PUT /api/admin/site-settings] Missing required fields:', missingFields);
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
        missingFields 
      }, { status: 400 });
    }

    // Check if a row exists
    const { data: existing, error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[PUT /api/admin/site-settings] Error checking existing row:', checkError);
    }

    let result;
    if (existing) {
      // Update existing row
      const updateData = {
        website_name: websiteName,
        website_description: websiteDescription,
        icon_url: iconUrl,
        alt_icon_url: normalizedAltIconUrl,
        site_url: siteUrl,
        author_name: authorName,
        short_name: shortName,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/site-settings] Update error:', {
          code: error.code,
          message: error.message,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      result = data;
    } else {
      // Insert new row
      const insertData = {
        website_name: websiteName,
        website_description: websiteDescription,
        icon_url: iconUrl,
        alt_icon_url: normalizedAltIconUrl,
        site_url: siteUrl,
        author_name: authorName,
        short_name: shortName,
      };
      
      const { data, error } = await supabase
        .from('site_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/site-settings] Insert error:', {
          code: error.code,
          message: error.message,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      result = data;
    }

    // Sync current_projects description with website description
    try {
      const { data: existingProjects, error: projectsCheckError } = await supabase
        .from('current_projects')
        .select('id')
        .single();

      if (projectsCheckError && projectsCheckError.code !== 'PGRST116') {
        console.warn('[PUT /api/admin/site-settings] Error checking current_projects:', projectsCheckError);
      }

      const projectsDescription = `Welcome to ${websiteName}! ${websiteDescription}`;

      if (existingProjects) {
        // Update existing current_projects description
        const { error: updateProjectsError } = await supabase
          .from('current_projects')
          .update({
            description: projectsDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProjects.id);

        if (updateProjectsError) {
          console.error('[PUT /api/admin/site-settings] Error updating current_projects:', updateProjectsError);
        }
      } else {
        // Create current_projects with synced description
        const { error: insertProjectsError } = await supabase
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

        if (insertProjectsError) {
          console.error('[PUT /api/admin/site-settings] Error inserting current_projects:', insertProjectsError);
        }
      }
    } catch (projectsError) {
      // Log but don't fail the request if current_projects update fails
      console.warn('[PUT /api/admin/site-settings] Failed to sync current_projects description:', projectsError);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[PUT /api/admin/site-settings] Request failed:', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to update site settings');
  }
}

