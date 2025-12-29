import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates an admin client using the service role key (secret key).
 * This bypasses RLS and should only be used in admin API routes.
 * Falls back to regular client if service role key is not available.
 * 
 * Supports both old naming (SUPABASE_SERVICE_ROLE_KEY) and new naming (SUPABASE_SECRET_KEY).
 */
export function createAdminClient() {
  // Try new secret key first, then fall back to old service role key
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (secretKey) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  // Fallback to regular client if service role key is not available
  // This will use the anon key and be subject to RLS
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Helper function to build OC select query with graceful fallback for story_aliases relationship.
 * Tries with foreign key hint first, falls back to inferred relationship if that fails.
 */
export function buildOCSelectQuery() {
  return `
    *,
    likes,
    dislikes,
    world:worlds(*),
    story_alias:story_aliases!fk_ocs_story_alias_id(id, name, slug, description),
    identity:oc_identities(
      *,
      versions:ocs(
        id,
        name,
        slug,
        world_id,
        is_public,
        world:worlds(id, name, slug)
      )
    )
  `;
}

/**
 * Helper function to build OC select query without foreign key hint (fallback version).
 */
export function buildOCSelectQueryFallback() {
  return `
    *,
    likes,
    dislikes,
    world:worlds(*),
    story_alias:story_aliases(id, name, slug, description),
    identity:oc_identities(
      *,
      versions:ocs(
        id,
        name,
        slug,
        world_id,
        is_public,
        world:worlds(id, name, slug)
      )
    )
  `;
}

/**
 * Executes an OC query with graceful fallback for story_aliases relationship.
 * Tries with foreign key hint first, falls back to inferred relationship if PGRST200 error occurs.
 */
export async function queryOCWithFallback<T>(
  queryBuilder: (selectQuery: string) => Promise<{ data: T | null; error: any }>,
  logContext?: string
): Promise<{ data: T | null; error: any }> {
  // Try with foreign key hint first
  const selectQuery = buildOCSelectQuery();
  const result = await queryBuilder(selectQuery);
  
  // Check if error is related to missing relationship (PGRST200)
  if (result.error && result.error.code === 'PGRST200' && 
      result.error.message?.includes('story_aliases') &&
      result.error.details?.includes('fk_ocs_story_alias_id')) {
    
    if (logContext) {
      console.log(`[${logContext}] FK hint failed, falling back to inferred relationship`);
    }
    
    // Retry with fallback query (no FK hint)
    const fallbackQuery = buildOCSelectQueryFallback();
    return await queryBuilder(fallbackQuery);
  }
  
  return result;
}
