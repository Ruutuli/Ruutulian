'use client';

import type { OC } from '@/types/oc';
import type { AnalyticsSummary, ViewLeaderboardItem } from '@/lib/analytics/types';
import { StatCard } from '@/components/stats/StatCard';
import Link from 'next/link';
import { formatDateToEST } from '@/lib/utils/dateFormat';

interface AnalyticsDashboardProps {
  ocs: OC[];
  analytics?: AnalyticsSummary | null;
  className?: string;
}

function LeaderboardList({
  items,
  emptyMessage,
  getHref,
  getLabel,
}: {
  items: ViewLeaderboardItem[];
  emptyMessage: string;
  getHref: (item: ViewLeaderboardItem) => string;
  getLabel: (item: ViewLeaderboardItem) => string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-6">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <Link
          key={item.id}
          href={getHref(item)}
          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-gray-400 font-mono w-6 shrink-0">{index + 1}</span>
            <span className="text-gray-100 font-medium truncate">{getLabel(item)}</span>
          </div>
          <div className="text-gray-400 text-sm shrink-0 ml-3">
            {item.view_count.toLocaleString()} {item.view_count === 1 ? 'view' : 'views'}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ ocs, analytics, className = '' }: AnalyticsDashboardProps) {
  const totalOCs = ocs.length;
  const withImages = ocs.filter((oc) => oc.image_url).length;
  const withDnDStats = ocs.filter(
    (oc) => oc.stat_strength || oc.stat_dexterity || oc.stat_constitution
  ).length;

  const topOcsFromAnalytics = analytics?.top_ocs ?? [];
  const mostViewed =
    topOcsFromAnalytics.length > 0
      ? topOcsFromAnalytics
      : [...ocs]
          .filter((oc) => (oc.view_count ?? 0) > 0)
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5)
          .map((oc) => ({
            id: oc.id,
            name: oc.name,
            slug: oc.slug,
            view_count: oc.view_count ?? 0,
            last_viewed_at: oc.last_viewed_at,
          }));

  const recentlyUpdated = [...ocs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const completionStats = {
    withImage: totalOCs > 0 ? (withImages / totalOCs) * 100 : 0,
    withDnDStats: totalOCs > 0 ? (withDnDStats / totalOCs) * 100 : 0,
    withAge: totalOCs > 0 ? (ocs.filter((oc) => oc.age).length / totalOCs) * 100 : 0,
    withPersonality:
      totalOCs > 0
        ? (ocs.filter((oc) => oc.personality_summary).length / totalOCs) * 100
        : 0,
    withHistory:
      totalOCs > 0
        ? (ocs.filter((oc) => oc.history_summary).length / totalOCs) * 100
        : 0,
  };

  const viewsByType = analytics?.views_by_type ?? {};
  const hasTraffic = (analytics?.total_views ?? 0) > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-chart-line text-purple-400"></i>
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Characters"
            value={totalOCs}
            color="#8b5cf6"
            icon="fas fa-users"
          />
          {analytics && (
            <>
              <StatCard
                title="All-Time Views"
                value={analytics.total_views}
                color="#a855f7"
                icon="fas fa-eye"
              />
              <StatCard
                title={`Views (${analytics.period_days}d)`}
                value={analytics.views_in_period}
                color="#6366f1"
                icon="fas fa-chart-bar"
              />
            </>
          )}
          <StatCard
            title="With Images"
            value={withImages}
            subtitle={`${completionStats.withImage.toFixed(0)}%`}
            color="#10b981"
            icon="fas fa-image"
          />
          <StatCard
            title="With D&D Stats"
            value={withDnDStats}
            subtitle={`${completionStats.withDnDStats.toFixed(0)}%`}
            color="#3b82f6"
            icon="fas fa-dice-d20"
          />
          <StatCard
            title="With Age"
            value={ocs.filter((oc) => oc.age).length}
            subtitle={`${completionStats.withAge.toFixed(0)}%`}
            color="#f59e0b"
            icon="fas fa-birthday-cake"
          />
        </div>
      </div>

      {/* Traffic by content type */}
      {hasTraffic && Object.keys(viewsByType).length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <i className="fas fa-signal text-purple-400"></i>
            Traffic by Page Type
            <span className="text-sm font-normal text-gray-400">
              (last {analytics?.period_days ?? 30} days)
            </span>
          </h2>
          <div className="wiki-card p-4 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(viewsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="p-3 bg-gray-800 rounded-lg text-center"
                  >
                    <p className="text-2xl font-bold text-purple-300">{count}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                      {type.replace(/_/g, ' ')}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Most Viewed Characters */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-eye text-purple-400"></i>
          Most Viewed Characters
        </h2>
        <div className="wiki-card p-4 md:p-6">
          <LeaderboardList
            items={mostViewed}
            emptyMessage="No character page views yet. Visit a character profile to start tracking."
            getHref={(item) => `/ocs/${item.slug}`}
            getLabel={(item) => item.name ?? item.slug}
          />
        </div>
      </div>

      {/* Other top content */}
      {analytics && (analytics.top_worlds.length > 0 || analytics.top_lore.length > 0 || analytics.top_fanfics.length > 0) && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analytics.top_worlds.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Top Worlds</h3>
              <div className="wiki-card p-4">
                <LeaderboardList
                  items={analytics.top_worlds}
                  emptyMessage=""
                  getHref={(item) => `/worlds/${item.slug}`}
                  getLabel={(item) => item.name ?? item.slug}
                />
              </div>
            </div>
          )}
          {analytics.top_lore.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Top Lore</h3>
              <div className="wiki-card p-4">
                <LeaderboardList
                  items={analytics.top_lore}
                  emptyMessage=""
                  getHref={(item) =>
                    item.world_slug
                      ? `/worlds/${item.world_slug}/lore/${item.slug}`
                      : '#'
                  }
                  getLabel={(item) => item.name ?? item.slug}
                />
              </div>
            </div>
          )}
          {analytics.top_fanfics.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Top Fanfics</h3>
              <div className="wiki-card p-4">
                <LeaderboardList
                  items={analytics.top_fanfics}
                  emptyMessage=""
                  getHref={(item) => `/fanfics/${item.slug}`}
                  getLabel={(item) => item.title ?? item.slug}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Updated */}
      {recentlyUpdated.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <i className="fas fa-clock text-purple-400"></i>
            Recently Updated
          </h2>
          <div className="wiki-card p-4 md:p-6">
            <div className="space-y-2">
              {recentlyUpdated.map((oc) => (
                <Link
                  key={oc.id}
                  href={`/ocs/${oc.slug}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <span className="text-gray-100 font-medium">{oc.name}</span>
                  <div className="text-gray-400 text-sm">
                    {formatDateToEST(oc.updated_at)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completion Warnings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-yellow-400"></i>
          Missing Information
        </h2>
        <div className="wiki-card p-4 md:p-6">
          <div className="space-y-3">
            {completionStats.withImage < 100 && (
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <span className="text-gray-200">Characters without images</span>
                <span className="text-yellow-400 font-semibold">
                  {totalOCs - withImages}
                </span>
              </div>
            )}
            {completionStats.withAge < 100 && (
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <span className="text-gray-200">Characters without age</span>
                <span className="text-yellow-400 font-semibold">
                  {totalOCs - ocs.filter((oc) => oc.age).length}
                </span>
              </div>
            )}
            {completionStats.withPersonality < 100 && (
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <span className="text-gray-200">Characters without personality summary</span>
                <span className="text-yellow-400 font-semibold">
                  {totalOCs - ocs.filter((oc) => oc.personality_summary).length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
