import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/stats/StatCard';
import { DistributionChart } from '@/components/stats/DistributionChart';
import { PieChart } from '@/components/stats/PieChart';
import { StatsSection } from '@/components/stats/StatsSection';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ArchetypeAnalyzer } from '@/components/analytics/ArchetypeAnalyzer';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { getAnalyticsSummary } from '@/lib/analytics/record-view';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import {
  fetchPublicSiteStats,
  sortDistributionNotSpecifiedLast,
  toPieData,
} from '@/lib/stats/public-site-stats';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Statistics',
    `Comprehensive statistics and analytics for ${config.websiteName}. View detailed demographics, distributions, and insights about characters, worlds, and content.`,
    '/stats'
  );
}

export const revalidate = 300;

export default async function StatsPage() {
  const supabase = await createClient();
  const stats = await fetchPublicSiteStats(supabase);

  if (!stats) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Statistics & Analytics"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Statistics' }]}
        />
        <div className="wiki-card p-12 text-center text-gray-400">
          Statistics are temporarily unavailable. Run the latest database migrations to enable
          server-side stats aggregation.
        </div>
      </div>
    );
  }

  const {
    counts,
    world_distribution,
    series_type_distribution,
    template_distribution,
    gender_distribution,
    sex_distribution,
    pronoun_distribution,
    alignment_distribution,
    age_distribution,
    age_summary,
    birthday_month_distribution,
    with_birthday,
    star_sign_distribution,
    romantic_orientation_distribution,
    sexual_orientation_distribution,
    status_distribution,
    species_distribution,
    personality_averages,
    dnd_stats,
    media,
    relationships,
    analytics_ocs,
  } = stats;

  const publicOCCount = counts.public_ocs;
  const allOCCount = counts.all_ocs;
  const publicWorldCount = counts.public_worlds;
  const allWorldCount = counts.all_worlds;
  const publicLoreCount = counts.public_lore;
  const allLoreCount = counts.all_lore;

  let analyticsSummary = null;
  try {
    analyticsSummary = await getAnalyticsSummary(supabase, 30);
  } catch {
    // Analytics RPC may not be deployed yet
  }

  const genderDistribution = sortDistributionNotSpecifiedLast(gender_distribution);
  const sexDistribution = sortDistributionNotSpecifiedLast(sex_distribution);
  const starSignDistribution = sortDistributionNotSpecifiedLast(star_sign_distribution);

  const seriesTypePieData = toPieData(series_type_distribution);
  const publicPrivatePieData = [
    { name: 'Public', value: publicOCCount },
    { name: 'Private', value: allOCCount - publicOCCount },
  ].filter((item) => item.value > 0);

  const avgOCsPerWorld =
    publicWorldCount > 0 ? (publicOCCount / publicWorldCount).toFixed(1) : '0';
  const publicPrivateRatio =
    allOCCount > 0 ? Math.round((publicOCCount / allOCCount) * 100) : 0;

  const avgStats = dnd_stats.averages;
  const withDnDStats = dnd_stats.count;

  return (
    <div className="space-y-12">
      <PageViewTracker entityType="page" path="/stats" />
      <PageHeader
        title="Statistics & Analytics"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Statistics' }]}
      />

      <StatsSection title="Overview" icon="fas fa-chart-line" iconColor="text-purple-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Public Worlds"
            value={publicWorldCount}
            subtitle={allWorldCount > publicWorldCount ? `${allWorldCount} total` : undefined}
            color="#8b5cf6"
            icon="fas fa-globe"
            href="/worlds"
          />
          <StatCard
            title="Public Characters"
            value={publicOCCount}
            subtitle={allOCCount > publicOCCount ? `${allOCCount} total` : undefined}
            color="#ec4899"
            icon="fas fa-users"
            href="/ocs"
          />
          <StatCard
            title="Lore Entries"
            value={publicLoreCount}
            subtitle={allLoreCount > publicLoreCount ? `${allLoreCount} total` : undefined}
            color="#14b8a6"
            icon="fas fa-book"
            href="/lore"
          />
          <StatCard
            title="Timeline Events"
            value={counts.timeline_events}
            color="#f59e0b"
            icon="fas fa-calendar-alt"
            href="/timelines"
          />
          <StatCard
            title="Timelines"
            value={counts.timelines}
            color="#3b82f6"
            icon="fas fa-timeline"
            href="/timelines"
          />
          <StatCard
            title="OC Identities"
            value={counts.identities}
            color="#8b5cf6"
            icon="fas fa-id-card"
          />
        </div>
      </StatsSection>

      <StatsSection title="Content Distribution" icon="fas fa-chart-bar" iconColor="text-teal-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {world_distribution.length > 0 && (
            <DistributionChart
              title="Characters by World (Top 15)"
              items={world_distribution}
              color="#8b5cf6"
              limit={15}
              horizontal={true}
              height={400}
            />
          )}
          {series_type_distribution.length > 0 && (
            <PieChart
              title="Worlds by Series Type"
              data={seriesTypePieData}
              colors={['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']}
              height={400}
            />
          )}
          {template_distribution.length > 0 && (
            <DistributionChart
              title="Characters by Template Type"
              items={template_distribution}
              color="#ec4899"
              horizontal={true}
              height={300}
            />
          )}
          {publicPrivatePieData.length > 0 && (
            <PieChart
              title="Public vs Private Characters"
              data={publicPrivatePieData}
              colors={['#10b981', '#6b7280']}
              height={300}
            />
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Average Characters per World"
            value={avgOCsPerWorld}
            color="#10b981"
            icon="fas fa-calculator"
          />
          <StatCard
            title="Public Visibility"
            value={`${publicPrivateRatio}%`}
            subtitle={`${publicOCCount} public, ${allOCCount - publicOCCount} private`}
            color="#3b82f6"
            icon="fas fa-eye"
          />
        </div>
      </StatsSection>

      <StatsSection title="Character Demographics" icon="fas fa-users" iconColor="text-purple-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {genderDistribution.length > 0 && (
            <DistributionChart
              title="Gender Distribution"
              items={genderDistribution}
              color="#ec4899"
              horizontal={true}
              height={300}
            />
          )}
          {sexDistribution.length > 0 && (
            <DistributionChart
              title="Sex Distribution"
              items={sexDistribution}
              color="#f472b6"
              horizontal={true}
              height={300}
            />
          )}
          {pronoun_distribution.length > 0 && (
            <DistributionChart
              title="Top Pronouns (Top 10)"
              items={pronoun_distribution}
              color="#a78bfa"
              limit={10}
              horizontal={true}
              height={300}
            />
          )}
          {alignment_distribution.length > 0 && (
            <DistributionChart
              title="Alignment Distribution"
              items={alignment_distribution}
              color="#f59e0b"
              horizontal={true}
              height={300}
            />
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {age_distribution.length > 0 && (
            <DistributionChart
              title="Age Distribution"
              items={age_distribution}
              color="#f59e0b"
              height={300}
            />
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Characters with Age"
              value={age_summary.count}
              subtitle={
                publicOCCount > 0
                  ? `${Math.round((age_summary.count / publicOCCount) * 100)}%`
                  : '0%'
              }
              color="#f59e0b"
              icon="fas fa-birthday-cake"
            />
            {age_summary.count > 0 && (
              <>
                <StatCard
                  title="Average Age"
                  value={Number(age_summary.avg).toFixed(1)}
                  color="#f59e0b"
                  icon="fas fa-calculator"
                />
                <StatCard title="Min Age" value={age_summary.min} color="#3b82f6" icon="fas fa-arrow-down" />
                <StatCard title="Max Age" value={age_summary.max} color="#ef4444" icon="fas fa-arrow-up" />
              </>
            )}
          </div>
        </div>
      </StatsSection>

      {(with_birthday > 0 ||
        starSignDistribution.length > 1 ||
        romantic_orientation_distribution.length > 0 ||
        sexual_orientation_distribution.length > 0) && (
        <StatsSection title="Birthday & Astrology" icon="fas fa-calendar-day" iconColor="text-pink-400">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {birthday_month_distribution.length > 0 && (
              <DistributionChart
                title="Birthdays by Month"
                items={birthday_month_distribution}
                color="#ec4899"
                height={350}
              />
            )}
            {starSignDistribution.length > 1 && (
              <DistributionChart
                title="Star Signs"
                items={starSignDistribution}
                color="#8b5cf6"
                horizontal={true}
                height={350}
              />
            )}
            {romantic_orientation_distribution.length > 0 && (
              <DistributionChart
                title="Romantic Orientation (Top 8)"
                items={romantic_orientation_distribution}
                color="#ec4899"
                limit={8}
                horizontal={true}
                height={300}
              />
            )}
            {sexual_orientation_distribution.length > 0 && (
              <DistributionChart
                title="Sexual Orientation (Top 8)"
                items={sexual_orientation_distribution}
                color="#f472b6"
                limit={8}
                horizontal={true}
                height={300}
              />
            )}
          </div>
          {with_birthday > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                title="Characters with Birthday"
                value={with_birthday}
                subtitle={
                  publicOCCount > 0 ? `${Math.round((with_birthday / publicOCCount) * 100)}%` : '0%'
                }
                color="#ec4899"
                icon="fas fa-calendar-day"
              />
            </div>
          )}
        </StatsSection>
      )}

      <StatsSection title="Character Attributes" icon="fas fa-brain" iconColor="text-indigo-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {status_distribution.length > 0 && (
            <DistributionChart
              title="Character Status Distribution"
              items={status_distribution}
              color="#ef4444"
              horizontal={true}
              height={300}
            />
          )}
          {species_distribution.length > 0 && (
            <DistributionChart
              title="Top Species (Top 10)"
              items={species_distribution}
              color="#14b8a6"
              limit={10}
              horizontal={true}
              height={300}
            />
          )}
        </div>
        {Object.keys(personality_averages).length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">
              Average Personality Metrics (1-10 scale)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(personality_averages).map(([metric, value]) => (
                <StatCard
                  key={metric}
                  title={metric.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  value={Number(value).toFixed(1)}
                  subtitle="/ 10"
                  color="#8b5cf6"
                  icon="fas fa-chart-line"
                />
              ))}
            </div>
          </div>
        )}
        {withDnDStats > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-4">D&D Statistics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DistributionChart
                title="Average Ability Scores"
                items={[
                  { label: 'STR', count: avgStats.strength, percentage: Math.round((avgStats.strength / 30) * 100) },
                  { label: 'DEX', count: avgStats.dexterity, percentage: Math.round((avgStats.dexterity / 30) * 100) },
                  { label: 'CON', count: avgStats.constitution, percentage: Math.round((avgStats.constitution / 30) * 100) },
                  { label: 'INT', count: avgStats.intelligence, percentage: Math.round((avgStats.intelligence / 30) * 100) },
                  { label: 'WIS', count: avgStats.wisdom, percentage: Math.round((avgStats.wisdom / 30) * 100) },
                  { label: 'CHA', count: avgStats.charisma, percentage: Math.round((avgStats.charisma / 30) * 100) },
                ]}
                color="#8b5cf6"
                height={300}
              />
              <div className="wiki-card p-4 md:p-6">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">Characters with D&D Stats</h4>
                <div className="text-3xl font-bold text-purple-400 mb-2">{withDnDStats}</div>
                <div className="text-gray-400">
                  {publicOCCount > 0 ? Math.round((withDnDStats / publicOCCount) * 100) : 0}% of all
                  characters
                </div>
              </div>
            </div>
          </div>
        )}
      </StatsSection>

      <StatsSection title="Media & Assets" icon="fas fa-images" iconColor="text-teal-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="With Image"
            value={media.with_image}
            subtitle={publicOCCount > 0 ? `${Math.round((media.with_image / publicOCCount) * 100)}%` : '0%'}
            color="#10b981"
            icon="fas fa-image"
          />
          <StatCard
            title="With Icon"
            value={media.with_icon}
            subtitle={publicOCCount > 0 ? `${Math.round((media.with_icon / publicOCCount) * 100)}%` : '0%'}
            color="#3b82f6"
            icon="fas fa-user-circle"
          />
          <StatCard
            title="With Gallery"
            value={media.with_gallery}
            subtitle={publicOCCount > 0 ? `${Math.round((media.with_gallery / publicOCCount) * 100)}%` : '0%'}
            color="#8b5cf6"
            icon="fas fa-images"
          />
          <StatCard
            title="With Theme Song"
            value={media.with_theme_song}
            subtitle={publicOCCount > 0 ? `${Math.round((media.with_theme_song / publicOCCount) * 100)}%` : '0%'}
            color="#ec4899"
            icon="fas fa-music"
          />
          <StatCard
            title="With Voice Actor"
            value={media.with_voice_actor}
            subtitle={publicOCCount > 0 ? `${Math.round((media.with_voice_actor / publicOCCount) * 100)}%` : '0%'}
            color="#f59e0b"
            icon="fas fa-microphone"
          />
        </div>
      </StatsSection>

      <StatsSection title="Relationships" icon="fas fa-heart" iconColor="text-red-400">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="With Family"
            value={relationships.with_family}
            subtitle={publicOCCount > 0 ? `${Math.round((relationships.with_family / publicOCCount) * 100)}%` : '0%'}
            color="#8b5cf6"
            icon="fas fa-home"
          />
          <StatCard
            title="With Friends"
            value={relationships.with_friends}
            subtitle={publicOCCount > 0 ? `${Math.round((relationships.with_friends / publicOCCount) * 100)}%` : '0%'}
            color="#10b981"
            icon="fas fa-user-friends"
          />
          <StatCard
            title="With Rivals"
            value={relationships.with_rivals}
            subtitle={publicOCCount > 0 ? `${Math.round((relationships.with_rivals / publicOCCount) * 100)}%` : '0%'}
            color="#ef4444"
            icon="fas fa-fist-raised"
          />
          <StatCard
            title="With Romantic"
            value={relationships.with_romantic}
            subtitle={publicOCCount > 0 ? `${Math.round((relationships.with_romantic / publicOCCount) * 100)}%` : '0%'}
            color="#ec4899"
            icon="fas fa-heart"
          />
        </div>
      </StatsSection>

      {analytics_ocs.length > 0 && (
        <StatsSection title="Analytics" icon="fas fa-chart-line" iconColor="text-purple-400">
          <AnalyticsDashboard ocs={analytics_ocs} analytics={analyticsSummary} />
          <div className="mt-6">
            <ArchetypeAnalyzer ocs={analytics_ocs} />
          </div>
        </StatsSection>
      )}
    </div>
  );
}
