import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

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
 * Uses explicit foreign key constraint to avoid ambiguous relationship errors.
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
 * Helper function to build OC select query without story_aliases relationship (fallback version).
 */
export function buildOCSelectQueryFallback() {
  return `
    *,
    likes,
    dislikes,
    world:worlds(*),
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
 * Tries with story_alias relationship first, falls back to query without it if PGRST200 error occurs.
 * If fallback is used, manually fetches story_alias data separately.
 */
export async function queryOCWithFallback<T extends { story_alias_id?: string | null; story_alias?: any }>(
  queryBuilder: (selectQuery: string) => Promise<{ data: T | null; error: any }>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  logContext?: string
): Promise<{ data: T | null; error: any }> {
  // Try with story_alias relationship first
  const selectQuery = buildOCSelectQuery();
  const result = await queryBuilder(selectQuery);
  
  // Check if error is related to relationship issues (PGRST200 or PGRST201)
  if (result.error && (result.error.code === 'PGRST200' || result.error.code === 'PGRST201') && 
      (result.error.message?.includes('story_aliases') || 
       result.error.message?.includes('more than one relationship') ||
       result.error.details?.includes('fk_ocs_story_alias_id') ||
       result.error.details?.includes('story_aliases'))) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: story_aliases relationship failed, falling back to query without it`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Retry without story_alias relationship
    const fallbackQuery = buildOCSelectQueryFallback();
    const fallbackResult = await queryBuilder(fallbackQuery);
    
    // If fallback succeeded and we have story_alias_id, fetch story_alias separately
    if (fallbackResult.data && fallbackResult.data.story_alias_id) {
      try {
        const { data: storyAlias } = await supabase
          .from('story_aliases')
          .select('id, name, slug, description')
          .eq('id', fallbackResult.data.story_alias_id)
          .single();
        
        if (storyAlias) {
          fallbackResult.data.story_alias = storyAlias;
        }
      } catch (err) {
        // Silently fail - story_alias is optional
        if (logContext) {
          logger.debug('Utility', `${logContext}: Failed to fetch story_alias separately`, { err });
        }
      }
    }
    
    return fallbackResult;
  }
  
  return result;
}

/**
 * Helper function to execute a query with graceful fallback for story_aliases relationship.
 * If the query fails due to missing story_aliases relationship, retries without it and fetches story_alias separately.
 */
export async function queryWithStoryAliasFallback<T extends { story_alias_id?: string | null; story_alias?: any }>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  logContext?: string
): Promise<{ data: T | null; error: any }> {
  // Try the query as-is first
  const result = await queryFn();
  
  // Check if error is related to story_aliases relationship issues (PGRST200 or PGRST201)
  if (result.error && (result.error.code === 'PGRST200' || result.error.code === 'PGRST201') && 
      (result.error.message?.includes('story_aliases') || 
       result.error.message?.includes('more than one relationship') ||
       result.error.details?.includes('fk_') && result.error.details?.includes('story_alias') ||
       result.error.details?.includes('story_aliases'))) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: story_aliases relationship failed, will retry without it`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Return the error but don't block - let the calling code handle it
    // The calling code should retry without story_alias in the select
    return result;
  }
  
  return result;
}

/**
 * Fetches story_alias data separately if story_alias_id is present but story_alias is missing.
 */
export async function fetchStoryAliasIfNeeded<T extends { story_alias_id?: string | null; story_alias?: any }>(
  data: T | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  fields: string = 'id, name, slug, description'
): Promise<T | null> {
  if (!data || !data.story_alias_id || data.story_alias) {
    return data;
  }
  
  try {
    const { data: storyAlias } = await supabase
      .from('story_aliases')
      .select(fields)
      .eq('id', data.story_alias_id)
      .single();
    
    if (storyAlias) {
      data.story_alias = storyAlias;
    }
  } catch (err) {
    // Silently fail - story_alias is optional
    logger.debug('Utility', 'Failed to fetch story_alias separately', { err });
  }
  
  return data;
}
