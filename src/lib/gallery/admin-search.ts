import type { SupabaseClient } from '@supabase/supabase-js';

export const GALLERY_SEARCH_MIN_LEN = 2;
const FUZZY_MIN_LEN = 3;
const FUZZY_MAX_LEN = 4;
const MAX_OC_MATCHES = 50;
const MAX_OC_LINKED_ITEMS = 100;

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&');
}

/** Scattered ILIKE: "naho" → %n%a%h%o% (letters in order, gaps allowed). */
export function buildScatteredIlikePattern(term: string): string {
  const chars = term
    .trim()
    .split('')
    .map((c) => escapeIlike(c))
    .filter(Boolean);
  if (chars.length === 0) return '%';
  if (chars.length === 1) return `%${chars[0]}%`;
  return `%${chars.join('%')}%`;
}

function useFuzzyCharacterSearch(term: string): boolean {
  const len = term.trim().length;
  return len >= FUZZY_MIN_LEN && len <= FUZZY_MAX_LEN;
}

/**
 * Builds PostgREST OR filters for gallery search (no huge .in() ID lists on the main query).
 * Filename/drive_id use substring; tags/characters use capped ID lists when needed.
 */
export async function buildGallerySearchOrFilter(
  supabase: SupabaseClient,
  searchRaw: string
): Promise<string | null> {
  const trimmed = searchRaw.trim();
  if (trimmed.length < GALLERY_SEARCH_MIN_LEN) {
    return null;
  }

  const term = escapeIlike(trimmed);
  const orParts = [`name.ilike.%${term}%`, `drive_file_id.ilike.%${term}%`];

  const { data: tagRows, error: tagRpcError } = await supabase.rpc('admin_gallery_tag_search_ids', {
    p_search: trimmed,
    p_limit: MAX_OC_LINKED_ITEMS,
  });
  if (!tagRpcError) {
    const tagIds = (tagRows ?? []) as string[];
    if (tagIds.length > 0) {
      orParts.push(`id.in.(${tagIds.join(',')})`);
    }
  }

  const ocOr = [`name.ilike.%${term}%`, `slug.ilike.%${term}%`];
  if (useFuzzyCharacterSearch(trimmed)) {
    const scattered = buildScatteredIlikePattern(trimmed);
    ocOr.push(`name.ilike.${scattered}`, `slug.ilike.${scattered}`);
  }

  const { data: ocs } = await supabase.from('ocs').select('id').or(ocOr.join(',')).limit(MAX_OC_MATCHES);
  const ocIds = (ocs ?? []).map((o) => o.id);
  if (ocIds.length > 0) {
    const { data: links } = await supabase
      .from('gallery_item_ocs')
      .select('gallery_item_id')
      .in('oc_id', ocIds)
      .limit(MAX_OC_LINKED_ITEMS * 3);
    const linkedIds = [...new Set((links ?? []).map((l) => l.gallery_item_id))].slice(
      0,
      MAX_OC_LINKED_ITEMS
    );
    if (linkedIds.length > 0) {
      orParts.push(`id.in.(${linkedIds.join(',')})`);
    }
  }

  return orParts.join(',');
}
