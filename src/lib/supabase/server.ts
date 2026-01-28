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
 * Helper function to build OC select query with explicit foreign key constraint.
 * Used for environments that have ambiguous relationships (PGRST201).
 */
export function buildOCSelectQueryWithExplicitFK() {
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
 * Helper function to build OC select query with implicit relationship.
 * Used for environments that don't recognize explicit FK syntax (PGRST200).
 */
export function buildOCSelectQueryWithImplicitFK() {
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
 * Tries three approaches in order:
 * 1. Explicit FK syntax (for PGRST201 - ambiguous relationship)
 * 2. Implicit relationship (for PGRST200 - relationship not found with explicit FK)
 * 3. No relationship, fetch separately
 */
export async function queryOCWithFallback<T extends { story_alias_id?: string | null; story_alias?: any }>(
  queryBuilder: (selectQuery: string) => Promise<{ data: T | null; error: any }>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  logContext?: string
): Promise<{ data: T | null; error: any }> {
  // Try 1: Explicit FK syntax (for environments with ambiguous relationships)
  let selectQuery = buildOCSelectQueryWithExplicitFK();
  let result = await queryBuilder(selectQuery);
  
  // If PGRST116 (multiple rows), the query builder should handle limit(1), but if it still fails,
  // we need to handle it at a higher level. For now, we'll let the caller handle PGRST116.
  
  // If PGRST200 (relationship not found) with explicit FK, try implicit relationship
  if (result.error && result.error.code === 'PGRST200' && 
      result.error.message?.includes('story_aliases') &&
      result.error.message?.includes('schema cache')) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: Explicit FK syntax failed, trying implicit relationship`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Try 2: Implicit relationship syntax
    selectQuery = buildOCSelectQueryWithImplicitFK();
    result = await queryBuilder(selectQuery);
  }
  
  // If still error (PGRST200 or PGRST201), fall back to no relationship
  if (result.error && (result.error.code === 'PGRST200' || result.error.code === 'PGRST201') && 
      (result.error.message?.includes('story_aliases') || 
       result.error.message?.includes('more than one relationship') ||
       result.error.message?.includes('schema cache'))) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: story_aliases relationship failed, falling back to query without it`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Try 3: No relationship, fetch separately
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

/**
 * Helper function to build story_aliases relationship string that works in both environments.
 * Returns the appropriate syntax based on what works in the current Supabase instance.
 * This is a utility for building select queries manually.
 */
export function getStoryAliasSelectString(fields: string = 'id, name, slug, description'): string {
  // Return both options - the query builder will try explicit first, then implicit
  // For manual queries, we'll use explicit FK first
  return `story_alias:story_aliases!fk_ocs_story_alias_id(${fields})`;
}

/**
 * Helper function to try a query with story_aliases relationship, with automatic fallback.
 * Tries explicit FK, then implicit, then fetches separately.
 */
export async function queryWithStoryAliasFallback<T extends { story_alias_id?: string | null; story_alias?: any }>(
  queryFn: (selectString: string) => Promise<{ data: T | null; error: any }>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  fields: string = 'id, name, slug, description',
  logContext?: string
): Promise<{ data: T | null; error: any }> {
  // Try 1: Explicit FK syntax
  let selectString = `story_alias:story_aliases!fk_ocs_story_alias_id(${fields})`;
  let result = await queryFn(selectString);
  
  // If PGRST200 (relationship not found) with explicit FK, try implicit relationship
  if (result.error && result.error.code === 'PGRST200' && 
      result.error.message?.includes('story_aliases') &&
      result.error.message?.includes('schema cache')) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: Explicit FK syntax failed, trying implicit relationship`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Try 2: Implicit relationship syntax
    selectString = `story_alias:story_aliases(${fields})`;
    result = await queryFn(selectString);
  }
  
  // If still error, fetch separately
  if (result.error && (result.error.code === 'PGRST200' || result.error.code === 'PGRST201') && 
      (result.error.message?.includes('story_aliases') || 
       result.error.message?.includes('more than one relationship') ||
       result.error.message?.includes('schema cache'))) {
    
    if (logContext) {
      logger.warn('Utility', `${logContext}: story_aliases relationship failed, fetching separately`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    // Try without story_alias
    selectString = '';
    result = await queryFn(selectString);
    
    // Fetch story_alias separately if we have story_alias_id
    if (result.data && result.data.story_alias_id) {
      try {
        const { data: storyAlias } = await supabase
          .from('story_aliases')
          .select(fields)
          .eq('id', result.data.story_alias_id)
          .single();
        
        if (storyAlias) {
          result.data.story_alias = storyAlias;
        }
      } catch (err) {
        // Silently fail - story_alias is optional
        if (logContext) {
          logger.debug('Utility', `${logContext}: Failed to fetch story_alias separately`, { err });
        }
      }
    }
  }
  
  return result;
}
