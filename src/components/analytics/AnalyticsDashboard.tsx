'use client';

import type { OC } from '@/types/oc';
import { StatCard } from '@/components/stats/StatCard';
import Link from 'next/link';

interface AnalyticsDashboardProps {
  ocs: OC[];
  className?: string;
}

export function AnalyticsDashboard({ ocs, className = '' }: AnalyticsDashboardProps) {
  // Calculate statistics
  const totalOCs = ocs.length;
  const withImages = ocs.filter(oc => oc.image_url).length;
  const withDnDStats = ocs.filter(oc => 
    oc.stat_strength || oc.stat_dexterity || oc.stat_constitution
  ).length;
  const withQuotes = 0; // Will be calculated from quotes table
  const withTags = 0; // Will be calculated from tags table

  // Most viewed (by view_count)
  const mostViewed = [...ocs]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  // Recently updated
  const recentlyUpdated = [...ocs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Completion stats
  const completionStats = {
    withImage: (withImages / totalOCs) * 100,
    withDnDStats: (withDnDStats / totalOCs) * 100,
    withAge: (ocs.filter(oc => oc.age).length / totalOCs) * 100,
    withPersonality: (ocs.filter(oc => oc.personality_summary).length / totalOCs) * 100,
    withHistory: (ocs.filter(oc => oc.history_summary).length / totalOCs) * 100,
  };

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
            value={ocs.filter(oc => oc.age).length}
            subtitle={`${completionStats.withAge.toFixed(0)}%`}
            color="#f59e0b"
            icon="fas fa-birthday-cake"
          />
          <StatCard
            title="With Personality"
            value={ocs.filter(oc => oc.personality_summary).length}
            subtitle={`${completionStats.withPersonality.toFixed(0)}%`}
            color="#ec4899"
            icon="fas fa-brain"
          />
          <StatCard
            title="With History"
            value={ocs.filter(oc => oc.history_summary).length}
            subtitle={`${completionStats.withHistory.toFixed(0)}%`}
            color="#14b8a6"
            icon="fas fa-book"
          />
        </div>
      </div>

      {/* Most Viewed */}
      {mostViewed.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <i className="fas fa-eye text-purple-400"></i>
            Most Viewed Characters
          </h2>
          <div className="wiki-card p-4 md:p-6">
            <div className="space-y-2">
              {mostViewed.map((oc, index) => (
                <Link
                  key={oc.id}
                  href={`/ocs/${oc.slug}`}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-mono w-6">{index + 1}</span>
                    <span className="text-gray-100 font-medium">{oc.name}</span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {oc.view_count || 0} views
                  </div>
                </Link>
              ))}
            </div>
          </div>
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
                    {new Date(oc.updated_at).toLocaleDateString()}
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
                  {totalOCs - ocs.filter(oc => oc.age).length}
                </span>
              </div>
            )}
            {completionStats.withPersonality < 100 && (
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                <span className="text-gray-200">Characters without personality summary</span>
                <span className="text-yellow-400 font-semibold">
                  {totalOCs - ocs.filter(oc => oc.personality_summary).length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


