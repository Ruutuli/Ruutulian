import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, successResponse, handleError } from '@/lib/api/route-helpers';
import { hashPassword } from '@/lib/auth/security';
import { NextResponse } from 'next/server';

/**
 * Check if setup is needed (no site settings or admin credentials exist)
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Check if site settings exist
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('id')
      .single();

    // Check if admin credentials exist
    const { data: adminCreds } = await supabase
      .from('admin_credentials')
      .select('id')
      .single();

    const needsSetup = !siteSettings || !adminCreds;

    return successResponse({ needsSetup });
  } catch (error) {
    return handleError(error, 'Failed to check setup status');
  }
}

/**
 * Complete initial setup - create site settings and admin credentials
 */
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();

    // Check if setup is already complete
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('id')
      .single();

    const { data: adminCreds } = await supabase
      .from('admin_credentials')
      .select('id')
      .single();

    if (siteSettings && adminCreds) {
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
      username,
      password,
    } = body;

    // Validate required fields
    if (
      !websiteName ||
      !websiteDescription ||
      !iconUrl ||
      !siteUrl ||
      !authorName ||
      !shortName ||
      !username ||
      !password
    ) {
      return errorResponse('Missing required fields');
    }

    // Validate password strength
    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters long');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create site settings if they don't exist
    if (!siteSettings) {
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
    }

    // Create admin credentials if they don't exist
    if (!adminCreds) {
      const { error: credsError } = await supabase
        .from('admin_credentials')
        .insert({
          username: username.trim(),
          password_hash: passwordHash,
        });

      if (credsError) {
        return errorResponse(`Failed to create admin credentials: ${credsError.message}`);
      }
    }

    return successResponse({ success: true, message: 'Setup completed successfully' });
  } catch (error) {
    return handleError(error, 'Failed to complete setup');
  }
}

