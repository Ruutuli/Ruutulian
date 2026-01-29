import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';

/**
 * Check if setup is needed (no site settings exist)
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('id')
      .single();

    const needsSetup = !siteSettings;

    return successResponse({ needsSetup });
  } catch (error) {
    return handleError(error, 'Failed to check setup status');
  }
}

/**
 * Complete initial setup - create site settings only.
 * Admin login uses USERNAME and PASSWORD from env (e.g. Railway).
 */
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();

    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('id')
      .single();

    if (siteSettings) {
      return errorResponse('Setup already completed');
    }

    const body = await request.json();
    const {
      websiteName,
      websiteDescription,
      iconUrl,
      siteUrl,
      authorName,
      shortName,
    } = body;

    if (
      !websiteName ||
      !websiteDescription ||
      !iconUrl ||
      !siteUrl ||
      !authorName ||
      !shortName
    ) {
      return errorResponse('Missing required fields');
    }

    const { error: settingsError } = await supabase
      .from('site_settings')
      .insert({
        website_name: websiteName,
        website_description: websiteDescription,
        icon_url: iconUrl,
        site_url: siteUrl,
        author_name: authorName,
        short_name: shortName,
      });

    if (settingsError) {
      return errorResponse(`Failed to create site settings: ${settingsError.message}`);
    }

    return successResponse({ success: true, message: 'Setup completed successfully' });
  } catch (error) {
    return handleError(error, 'Failed to complete setup');
  }
}

