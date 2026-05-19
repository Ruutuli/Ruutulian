import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PAGE_ENTITY_TYPES,
  type AnalyticsSummary,
  type PageEntityType,
  type PageViewEvent,
  type RecordPageViewPayload,
} from '@/lib/analytics/types';

export function isValidPageEntityType(value: string): value is PageEntityType {
  return (PAGE_ENTITY_TYPES as readonly string[]).includes(value);
}

export async function recordPageView(
  supabase: SupabaseClient,
  payload: RecordPageViewPayload
) {
  const { data, error } = await supabase.rpc('record_page_view', {
    p_entity_type: payload.entityType,
    p_slug: payload.slug ?? null,
    p_entity_id: payload.entityId ?? null,
    p_path: payload.path ?? null,
    p_world_slug: payload.worldSlug ?? null,
    p_chapter_number: payload.chapterNumber ?? null,
    p_metadata: payload.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return data as {
    ok: boolean;
    error?: string;
    view_count?: number;
    entity_type?: string;
    entity_id?: string;
    slug?: string;
  };
}

export async function getAnalyticsSummary(
  supabase: SupabaseClient,
  days = 30
): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_days: days,
  });

  if (error) {
    throw error;
  }

  return (data as AnalyticsSummary | null) ?? null;
}

export async function getRecentPageViews(
  supabase: SupabaseClient,
  limit = 50
): Promise<PageViewEvent[]> {
  const { data, error } = await supabase.rpc('get_recent_page_views', {
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return (data as PageViewEvent[]) ?? [];
}
