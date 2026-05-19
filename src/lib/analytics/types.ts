export const PAGE_ENTITY_TYPES = [
  'oc',
  'world',
  'lore',
  'fanfic',
  'fanfic_chapter',
  'page',
] as const;

export type PageEntityType = (typeof PAGE_ENTITY_TYPES)[number];

export interface RecordPageViewPayload {
  entityType: PageEntityType;
  slug?: string;
  entityId?: string;
  path?: string;
  worldSlug?: string;
  chapterNumber?: number;
  metadata?: Record<string, unknown>;
}

export interface ViewLeaderboardItem {
  id: string;
  name?: string;
  title?: string;
  slug: string;
  view_count: number;
  last_viewed_at?: string | null;
  world_slug?: string;
}

export interface AnalyticsSummary {
  total_views: number;
  views_in_period: number;
  period_days: number;
  views_by_type: Record<string, number>;
  top_ocs: ViewLeaderboardItem[];
  top_worlds: ViewLeaderboardItem[];
  top_lore: ViewLeaderboardItem[];
  top_fanfics: ViewLeaderboardItem[];
}

export interface PageViewEvent {
  id: string;
  entity_type: string;
  entity_id: string | null;
  slug: string | null;
  path: string | null;
  metadata: Record<string, unknown>;
  viewed_at: string;
}
