import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getAnalyticsSummary,
  getRecentPageViews,
} from '@/lib/analytics/record-view';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { RecentPageViewsTable } from '@/components/analytics/RecentPageViewsTable';
import { StatCard } from '@/components/stats/StatCard';
import type { PageViewEvent } from '@/lib/analytics/types';
import { OC_STATS_SELECT } from '@/lib/supabase/oc-public-queries';
import { fetchPublicSiteStats } from '@/lib/stats/public-site-stats';

export const metadata: Metadata = {
  title: 'Page Analytics',
};

export const dynamic = 'force-dynamic';

const PERIOD_DAYS = 30;
const RECENT_LIMIT = 100;

export default async function AdminAnalyticsPage() {
  const supabase = createAdminClient();

  let analyticsError: string | null = null;
  let summary = null;
  let recent: PageViewEvent[] = [];

  try {
    [summary, recent] = await Promise.all([
      getAnalyticsSummary(supabase, PERIOD_DAYS),
      getRecentPageViews(supabase, RECENT_LIMIT),
    ]);
  } catch (err) {
    analyticsError =
      err instanceof Error
        ? err.message
        : 'Analytics tables or functions are not available. Run the page_view_analytics migration.';
  }

  const siteStats = await fetchPublicSiteStats(supabase);
  let publicOCs = siteStats?.analytics_ocs ?? [];

  if (!siteStats) {
    const { data: fallbackOCs } = await supabase
      .from('ocs')
      .select(OC_STATS_SELECT)
      .eq('is_public', true);
    publicOCs = fallbackOCs ?? [];
  }

  const loreIds = recent
    .filter((e) => e.entity_type === 'lore' && e.entity_id)
    .map((e) => e.entity_id as string);

  const loreWorldSlugs: Record<string, string> = {};
  if (loreIds.length > 0) {
    const { data: loreRows } = await supabase
      .from('world_lore')
      .select('id, world:worlds(slug)')
      .in('id', loreIds);

    for (const row of loreRows ?? []) {
      const world = row.world as { slug?: string } | null;
      if (world?.slug) {
        loreWorldSlugs[row.id] = world.slug;
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 flex items-center gap-3">
            <i className="fas fa-chart-line text-purple-400" aria-hidden />
            Page Analytics
          </h1>
          <p className="text-gray-400 mt-2">
            Traffic across characters, worlds, lore, fanfics, and site pages.
            Last {PERIOD_DAYS} days shown for period stats.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-800 text-gray-200 rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            Public stats →
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {analyticsError && (
        <div className="wiki-card p-6 border border-amber-500/40 bg-amber-500/10">
          <p className="text-amber-200 font-medium">Analytics not available</p>
          <p className="text-gray-300 text-sm mt-2">{analyticsError}</p>
          <p className="text-gray-400 text-sm mt-3">
            Apply{' '}
            <code className="text-purple-300">
              supabase/migrations/20260519150000_page_view_analytics.sql
            </code>{' '}
            to your Supabase project, then reload this page.
          </p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="All-Time Views"
            value={summary.total_views}
            color="#a855f7"
            icon="fas fa-eye"
          />
          <StatCard
            title={`Views (${summary.period_days}d)`}
            value={summary.views_in_period}
            color="#6366f1"
            icon="fas fa-chart-bar"
          />
          <StatCard
            title="Top Characters"
            value={summary.top_ocs.length}
            color="#8b5cf6"
            icon="fas fa-user"
          />
          <StatCard
            title="Recent Events"
            value={recent.length}
            subtitle={`last ${RECENT_LIMIT}`}
            color="#14b8a6"
            icon="fas fa-list"
          />
        </div>
      )}

      {summary && publicOCs && (
        <AnalyticsDashboard ocs={publicOCs} analytics={summary} />
      )}

      <section>
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-history text-purple-400" aria-hidden />
          Recent Page Views
        </h2>
        <div className="wiki-card p-4 md:p-6">
          <RecentPageViewsTable events={recent} loreWorldSlugs={loreWorldSlugs} />
        </div>
      </section>
    </div>
  );
}
