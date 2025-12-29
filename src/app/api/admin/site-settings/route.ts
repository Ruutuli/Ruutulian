import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/config/site-config';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log('[GET /api/admin/site-settings] Request received:', {
    method: 'GET',
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  try {
    console.log('[GET /api/admin/site-settings] Creating Supabase client...');
    const supabase = createAdminClient();

    console.log('[GET /api/admin/site-settings] Fetching site_settings...');
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

    // If no data in database, return site-config.json as fallback using getSiteConfig
    if (!data) {
      console.log('[GET /api/admin/site-settings] No data in database, using site-config.json fallback');
      const config = await getSiteConfig();
      const duration = Date.now() - startTime;
      console.log('[GET /api/admin/site-settings] Request completed in', duration, 'ms (using fallback)');
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
    const duration = Date.now() - startTime;
    console.log('[GET /api/admin/site-settings] Request completed in', duration, 'ms (using database)');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[GET /api/admin/site-settings] Request failed after', duration, 'ms:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return handleError(error, 'Failed to fetch site settings');
  }
}

export async function PUT(request: Request) {
  const startTime = Date.now();
  const requestUrl = request.url;
  const requestMethod = request.method;
  
  console.log('[PUT /api/admin/site-settings] Request received:', {
    method: requestMethod,
    url: requestUrl,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  });

  try {
    console.log('[PUT /api/admin/site-settings] Checking authentication...');
    const user = await checkAuth();
    console.log('[PUT /api/admin/site-settings] Auth check result:', {
      authenticated: !!user,
      userId: user?.id || null,
    });
    
    if (!user) {
      console.warn('[PUT /api/admin/site-settings] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PUT /api/admin/site-settings] Creating Supabase client...');
    const supabase = createAdminClient();

    console.log('[PUT /api/admin/site-settings] Parsing request body...');
    const body = await request.json();
    console.log('[PUT /api/admin/site-settings] Request body received:', {
      websiteName: body.websiteName,
      websiteDescription: body.websiteDescription?.substring(0, 50) + '...',
      iconUrl: body.iconUrl,
      altIconUrl: body.altIconUrl,
      authorName: body.authorName,
      shortName: body.shortName,
    });
    
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
    console.log('[PUT /api/admin/site-settings] Normalized altIconUrl:', normalizedAltIconUrl);

    // Get site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    console.log('[PUT /api/admin/site-settings] Using site URL:', siteUrl);

    // Validate required fields
    console.log('[PUT /api/admin/site-settings] Validating required fields...');
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
    console.log('[PUT /api/admin/site-settings] All required fields present');

    // Check if a row exists
    console.log('[PUT /api/admin/site-settings] Checking for existing site_settings row...');
    const { data: existing, error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[PUT /api/admin/site-settings] Error checking existing row:', checkError);
    } else {
      console.log('[PUT /api/admin/site-settings] Existing row check:', {
        exists: !!existing,
        id: existing?.id || null,
      });
    }

    let result;
    if (existing) {
      // Update existing row
      console.log('[PUT /api/admin/site-settings] Updating existing row with id:', existing.id);
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
      console.log('[PUT /api/admin/site-settings] Update data:', updateData);
      
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
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      console.log('[PUT /api/admin/site-settings] Update successful:', { id: data?.id });
      result = data;
    } else {
      // Insert new row
      console.log('[PUT /api/admin/site-settings] Inserting new row');
      const insertData = {
        website_name: websiteName,
        website_description: websiteDescription,
        icon_url: iconUrl,
        alt_icon_url: normalizedAltIconUrl,
        site_url: siteUrl,
        author_name: authorName,
        short_name: shortName,
      };
      console.log('[PUT /api/admin/site-settings] Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('site_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[PUT /api/admin/site-settings] Insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      console.log('[PUT /api/admin/site-settings] Insert successful:', { id: data?.id });
      result = data;
    }

    // Sync current_projects description with website description
    console.log('[PUT /api/admin/site-settings] Syncing current_projects description...');
    try {
      const { data: existingProjects, error: projectsCheckError } = await supabase
        .from('current_projects')
        .select('id')
        .single();

      if (projectsCheckError && projectsCheckError.code !== 'PGRST116') {
        console.warn('[PUT /api/admin/site-settings] Error checking current_projects:', projectsCheckError);
      }

      const projectsDescription = `Welcome to ${websiteName}! ${websiteDescription}`;
      console.log('[PUT /api/admin/site-settings] Projects description:', projectsDescription.substring(0, 100) + '...');

      if (existingProjects) {
        // Update existing current_projects description
        console.log('[PUT /api/admin/site-settings] Updating existing current_projects with id:', existingProjects.id);
        const { error: updateProjectsError } = await supabase
          .from('current_projects')
          .update({
            description: projectsDescription,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProjects.id);

        if (updateProjectsError) {
          console.error('[PUT /api/admin/site-settings] Error updating current_projects:', updateProjectsError);
        } else {
          console.log('[PUT /api/admin/site-settings] Successfully updated current_projects');
        }
      } else {
        // Create current_projects with synced description
        console.log('[PUT /api/admin/site-settings] Creating new current_projects entry');
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
        } else {
          console.log('[PUT /api/admin/site-settings] Successfully created current_projects');
        }
      }
    } catch (projectsError) {
      // Log but don't fail the request if current_projects update fails
      console.warn('[PUT /api/admin/site-settings] Failed to sync current_projects description:', projectsError);
    }

    const duration = Date.now() - startTime;
    console.log('[PUT /api/admin/site-settings] Request completed successfully in', duration, 'ms');
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[PUT /api/admin/site-settings] Request failed after', duration, 'ms:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return handleError(error, 'Failed to update site settings');
  }
}

