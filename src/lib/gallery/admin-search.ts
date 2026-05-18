import type { SupabaseClient } from '@supabase/supabase-js';

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

/**
 * Fallback when admin_gallery_search_ids RPC is not deployed yet.
 * Returns gallery item IDs matching search (substring + scattered + linked OCs).
 */
export async function fallbackGallerySearchIds(
  supabase: SupabaseClient,
  searchRaw: string
): Promise<string[]> {
  const term = escapeIlike(searchRaw.trim());
  if (!term) return [];

  const ids = new Set<string>();
  const scattered = buildScatteredIlikePattern(searchRaw.trim());

  const itemOr = [`name.ilike.%${term}%`, `drive_file_id.ilike.%${term}%`];
  if (searchRaw.trim().length >= 2) {
    itemOr.push(`name.ilike.${scattered}`, `drive_file_id.ilike.${scattered}`);
  }

  const { data: items } = await supabase.from('gallery_items').select('id').or(itemOr.join(','));
  for (const row of items ?? []) {
    ids.add(row.id);
  }

  const ocOr = [`name.ilike.%${term}%`, `slug.ilike.%${term}%`];
  if (searchRaw.trim().length >= 2) {
    ocOr.push(`name.ilike.${scattered}`, `slug.ilike.${scattered}`);
  }

  const { data: ocs } = await supabase.from('ocs').select('id').or(ocOr.join(','));
  const ocIds = (ocs ?? []).map((o) => o.id);
  if (ocIds.length > 0) {
    const { data: links } = await supabase
      .from('gallery_item_ocs')
      .select('gallery_item_id')
      .in('oc_id', ocIds);
    for (const link of links ?? []) {
      ids.add(link.gallery_item_id);
    }
  }

  return Array.from(ids);
}

export async function resolveGallerySearchIds(
  supabase: SupabaseClient,
  searchRaw: string
): Promise<string[]> {
  const trimmed = searchRaw.trim();
  if (!trimmed) return [];

  const { data: rpcIds, error: rpcError } = await supabase.rpc('admin_gallery_search_ids', {
    p_search: trimmed,
  });

  if (!rpcError && Array.isArray(rpcIds)) {
    return rpcIds as string[];
  }

  return fallbackGallerySearchIds(supabase, trimmed);
}
