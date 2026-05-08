import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { checkAuth } from '@/lib/auth/require-auth';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { DEFAULT_GALLERY_DRIVE_FOLDER_IDS } from '@/lib/gallery/constants';
import { revalidateTag } from 'next/cache';

// Ensure runtime is set to nodejs for proper route handler execution
export const runtime = 'nodejs';

// Force dynamic rendering to ensure route handlers are properly recognized
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();

    // PGRST116 is "not found" - this is normal if no settings exist yet
    if (error && error.code !== 'PGRST116') {
      logger.error('SiteSettings', 'Error fetching site settings', {
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
    logger.error('SiteSettings', 'Request failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to fetch site settings');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await checkAuth();
    
    if (!user) {
      logger.warn('SiteSettings', 'Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    
    logger.debug('SiteSettings', 'Received body', {
      websiteName: body.websiteName,
      iconUrl: body.iconUrl,
      altIconUrl: body.altIconUrl,
      hasIconUrl: !!body.iconUrl,
      hasAltIconUrl: !!body.altIconUrl,
    });
    
    const {
      websiteName,
      websiteDescription,
      iconUrl,
      altIconUrl,
      authorName,
      shortName,
      galleryEnabled,
      galleryDriveFolderIds,
    } = body;

    let galleryEnabledDb: boolean | undefined;
    if (typeof galleryEnabled === 'boolean') {
      galleryEnabledDb = galleryEnabled;
    }

    let galleryDriveFolderIdsDb: string[] | undefined;
    if (Array.isArray(galleryDriveFolderIds) && galleryDriveFolderIds.every((x: unknown) => typeof x === 'string')) {
      const trimmed = (galleryDriveFolderIds as string[]).map((id) => id.trim()).filter(Boolean);
      galleryDriveFolderIdsDb = trimmed.length > 0 ? trimmed : [...DEFAULT_GALLERY_DRIVE_FOLDER_IDS];
    }

    // Normalize iconUrl: trim whitespace
    const normalizedIconUrl = iconUrl && typeof iconUrl === 'string' ? iconUrl.trim() : '';
    
    // Normalize altIconUrl: convert empty strings, null, or undefined to null
    const normalizedAltIconUrl = altIconUrl && typeof altIconUrl === 'string' && altIconUrl.trim() ? altIconUrl.trim() : null;

    // Get site URL from environment variable
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // Validate required fields
    const missingFields = [];
    if (!websiteName || !websiteName.trim()) missingFields.push('websiteName');
    if (!websiteDescription || !websiteDescription.trim()) missingFields.push('websiteDescription');
    if (!normalizedIconUrl) missingFields.push('iconUrl');
    if (!authorName || !authorName.trim()) missingFields.push('authorName');
    if (!shortName || !shortName.trim()) missingFields.push('shortName');
    
    if (missingFields.length > 0) {
      logger.error('SiteSettings', 'Missing required fields', missingFields);
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
      logger.error('SiteSettings', 'Error checking existing row', checkError);
    }

    let result;
    if (existing) {
      // Update existing row
      const updateData: Record<string, unknown> = {
        website_name: websiteName.trim(),
        website_description: websiteDescription.trim(),
        icon_url: normalizedIconUrl,
        alt_icon_url: normalizedAltIconUrl,
        site_url: siteUrl,
        author_name: authorName.trim(),
        short_name: shortName.trim(),
        updated_at: new Date().toISOString(),
      };
      if (galleryEnabledDb !== undefined) {
        updateData.gallery_enabled = galleryEnabledDb;
      }
      if (galleryDriveFolderIdsDb !== undefined) {
        updateData.gallery_drive_folder_ids = galleryDriveFolderIdsDb;
      }
      
      logger.debug('SiteSettings', 'Updating with data', {
        icon_url: updateData.icon_url,
        alt_icon_url: updateData.alt_icon_url,
        id: existing.id,
      });
      
      const { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        logger.error('SiteSettings', 'Update error', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      logger.info('SiteSettings', 'Successfully updated', {
        icon_url: data?.icon_url,
        alt_icon_url: data?.alt_icon_url,
      });

      result = data;
    } else {
      // Insert new row
      const insertData = {
        website_name: websiteName.trim(),
        website_description: websiteDescription.trim(),
        icon_url: normalizedIconUrl,
        alt_icon_url: normalizedAltIconUrl,
        site_url: siteUrl,
        author_name: authorName.trim(),
        short_name: shortName.trim(),
        gallery_enabled:
          galleryEnabledDb !== undefined ? galleryEnabledDb : false,
        gallery_drive_folder_ids:
          galleryDriveFolderIdsDb !== undefined
            ? galleryDriveFolderIdsDb
            : [...DEFAULT_GALLERY_DRIVE_FOLDER_IDS],
      };
      
      logger.debug('SiteSettings', 'Inserting with data', {
        icon_url: insertData.icon_url,
        alt_icon_url: insertData.alt_icon_url,
      });
      
      const { data, error } = await supabase
        .from('site_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error('SiteSettings', 'Insert error', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      logger.info('SiteSettings', 'Successfully inserted', {
        icon_url: data?.icon_url,
        alt_icon_url: data?.alt_icon_url,
      });

      result = data;
    }

    // Sync current_projects description with website description
    try {
      const { data: existingProjects, error: projectsCheckError } = await supabase
        .from('current_projects')
        .select('id')
        .single();

      if (projectsCheckError && projectsCheckError.code !== 'PGRST116') {
        logger.warn('SiteSettings', 'Error checking current_projects', projectsCheckError);
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
          logger.error('SiteSettings', 'Error updating current_projects', updateProjectsError);
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
          logger.error('SiteSettings', 'Error inserting current_projects', insertProjectsError);
        }
      }
    } catch (projectsError) {
      // Log but don't fail the request if current_projects update fails
      logger.warn('SiteSettings', 'Failed to sync current_projects description', projectsError);
    }

    try {
      revalidateTag('site-config');
    } catch {
      /* ignore */
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('SiteSettings', 'Request failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleError(error, 'Failed to update site settings');
  }
}

