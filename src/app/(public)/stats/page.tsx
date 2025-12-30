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

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Statistics',
    `Comprehensive statistics and analytics for ${config.websiteName}. View detailed demographics, distributions, and insights about characters, worlds, and content.`,
    '/stats'
  );
}

export const revalidate = 300; // Revalidate every 5 minutes

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export default async function StatsPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    publicWorldsResult,
    allWorldsResult,
    publicOCsResult,
    allOCsResult,
    publicLoreResult,
    allLoreResult,
    timelineEventsResult,
    timelinesResult,
    identitiesResult,
  ] = await Promise.all([
    supabase.from('worlds').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('worlds').select('*', { count: 'exact', head: true }),
    supabase.from('ocs').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('ocs').select('*', { count: 'exact', head: true }),
    supabase.from('world_lore').select('*', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('world_lore').select('*', { count: 'exact', head: true }),
    supabase.from('timeline_events').select('*', { count: 'exact', head: true }),
    supabase.from('timelines').select('*', { count: 'exact', head: true }),
    supabase.from('oc_identities').select('*', { count: 'exact', head: true }),
  ]);

  const publicWorldCount = publicWorldsResult.count ?? 0;
  const allWorldCount = allWorldsResult.count ?? 0;
  const publicOCCount = publicOCsResult.count ?? 0;
  const allOCCount = allOCsResult.count ?? 0;
  const publicLoreCount = publicLoreResult.count ?? 0;
  const allLoreCount = allLoreResult.count ?? 0;
  const timelineEventCount = timelineEventsResult.count ?? 0;
  const timelineCount = timelinesResult.count ?? 0;
  const identityCount = identitiesResult.count ?? 0;

  // Fetch detailed data for distributions
  const { data: allOCs } = await supabase
    .from('ocs')
    .select(`
      *,
      world:worlds(name, series_type, slug)
    `)
    .eq('is_public', true);

  const allOCsForAnalytics = allOCs || [];

  const { data: allWorlds } = await supabase
    .from('worlds')
    .select('id, name, slug, series_type, is_public')
    .eq('is_public', true);

  // ========== CONTENT DISTRIBUTION CALCULATIONS ==========
  
  // World distribution (OCs per world)
  const worldOCCounts: Record<string, { name: string; count: number; slug: string }> = {};
  allOCs?.forEach(oc => {
    const worldName = (oc.world as any)?.name || oc.world_name || 'Unknown';
    const worldSlug = (oc.world as any)?.slug || '';
    if (!worldOCCounts[worldName]) {
      worldOCCounts[worldName] = { name: worldName, count: 0, slug: worldSlug };
    }
    worldOCCounts[worldName].count++;
  });
  const worldDistribution: DistributionItem[] = Object.values(worldOCCounts)
    .map(world => ({
      label: world.name,
      count: world.count,
      percentage: publicOCCount > 0 ? Math.round((world.count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Series type distribution
  const seriesTypeCounts: Record<string, number> = {};
  allWorlds?.forEach(world => {
    const type = world.series_type || 'unknown';
    seriesTypeCounts[type] = (seriesTypeCounts[type] || 0) + 1;
  });
  const seriesTypeDistribution: DistributionItem[] = Object.entries(seriesTypeCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count,
      percentage: publicWorldCount > 0 ? Math.round((count / publicWorldCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const seriesTypePieData = seriesTypeDistribution.map(item => ({
    name: item.label,
    value: item.count,
  }));

  // Template type distribution
  const templateCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const template = oc.template_type || 'unknown';
    templateCounts[template] = (templateCounts[template] || 0) + 1;
  });
  const templateDistribution: DistributionItem[] = Object.entries(templateCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1).replace('-', ' '),
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Public vs Private pie data
  const publicPrivatePieData = [
    { name: 'Public', value: publicOCCount },
    { name: 'Private', value: allOCCount - publicOCCount },
  ].filter(item => item.value > 0);

  const avgOCsPerWorld = publicWorldCount > 0 ? (publicOCCount / publicWorldCount).toFixed(1) : '0';
  const publicPrivateRatio = allOCCount > 0 
    ? Math.round((publicOCCount / allOCCount) * 100) 
    : 0;

  // ========== DEMOGRAPHICS CALCULATIONS ==========

  // Gender distribution
  const genderCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const gender = oc.gender || 'not specified';
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;
  });
  const genderDistribution: DistributionItem[] = Object.entries(genderCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Sex distribution
  const sexCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const sex = oc.sex || 'not specified';
    sexCounts[sex] = (sexCounts[sex] || 0) + 1;
  });
  const sexDistribution: DistributionItem[] = Object.entries(sexCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Pronouns distribution
  const pronounCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const pronouns = oc.pronouns || 'not specified';
    pronounCounts[pronouns] = (pronounCounts[pronouns] || 0) + 1;
  });
  const pronounDistribution: DistributionItem[] = Object.entries(pronounCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Alignment distribution
  const alignmentCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const alignment = oc.alignment || 'not specified';
    alignmentCounts[alignment] = (alignmentCounts[alignment] || 0) + 1;
  });
  const alignmentDistribution: DistributionItem[] = Object.entries(alignmentCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Age distribution
  const ages = allOCs?.map(oc => oc.age).filter((age): age is number => age !== null && age !== undefined) || [];
  const avgAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
  const ageRanges: Record<string, number> = {
    '0-10': 0,
    '11-20': 0,
    '21-30': 0,
    '31-40': 0,
    '41-50': 0,
    '51-60': 0,
    '61-70': 0,
    '71+': 0,
  };
  ages.forEach(age => {
    if (age <= 10) ageRanges['0-10']++;
    else if (age <= 20) ageRanges['11-20']++;
    else if (age <= 30) ageRanges['21-30']++;
    else if (age <= 40) ageRanges['31-40']++;
    else if (age <= 50) ageRanges['41-50']++;
    else if (age <= 60) ageRanges['51-60']++;
    else if (age <= 70) ageRanges['61-70']++;
    else ageRanges['71+']++;
  });
  const ageDistribution: DistributionItem[] = Object.entries(ageRanges)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({
      label,
      count,
      percentage: ages.length > 0 ? Math.round((count / ages.length) * 100) : 0,
    }));

  // ========== BIRTHDAY & ASTROLOGY CALCULATIONS ==========

  // Birthday statistics
  const withBirthday = allOCs?.filter(oc => oc.date_of_birth).length || 0;
  const monthCounts: Record<string, number> = {};
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  allOCs?.forEach(oc => {
    if (oc.date_of_birth) {
      try {
        const date = new Date(oc.date_of_birth);
        if (!isNaN(date.getTime())) {
          const month = monthNames[date.getMonth()];
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  const birthdayMonthDistribution: DistributionItem[] = monthNames
    .map(month => ({
      label: month,
      count: monthCounts[month] || 0,
      percentage: withBirthday > 0 ? Math.round(((monthCounts[month] || 0) / withBirthday) * 100) : 0,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => {
      const monthOrder = monthNames.indexOf(a.label) - monthNames.indexOf(b.label);
      return monthOrder !== 0 ? monthOrder : b.count - a.count;
    });

  // Star sign distribution
  const starSignCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const starSign = oc.star_sign || 'not specified';
    starSignCounts[starSign] = (starSignCounts[starSign] || 0) + 1;
  });
  const starSignDistribution: DistributionItem[] = Object.entries(starSignCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Orientation statistics
  const romanticOrientationCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const orientation = oc.romantic_orientation || 'not specified';
    romanticOrientationCounts[orientation] = (romanticOrientationCounts[orientation] || 0) + 1;
  });
  const romanticOrientationDistribution: DistributionItem[] = Object.entries(romanticOrientationCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const sexualOrientationCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const orientation = oc.sexual_orientation || 'not specified';
    sexualOrientationCounts[orientation] = (sexualOrientationCounts[orientation] || 0) + 1;
  });
  const sexualOrientationDistribution: DistributionItem[] = Object.entries(sexualOrientationCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ========== CHARACTER ATTRIBUTES CALCULATIONS ==========

  // Status distribution
  const statusCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const status = oc.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusDistribution: DistributionItem[] = Object.entries(statusCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1).replace('-', ' '),
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Species distribution (top 10)
  const speciesCounts: Record<string, number> = {};
  allOCs?.forEach(oc => {
    const species = oc.species || (oc.modular_fields as any)?.species || 'not specified';
    speciesCounts[species] = (speciesCounts[species] || 0) + 1;
  });
  const speciesDistribution: DistributionItem[] = Object.entries(speciesCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: publicOCCount > 0 ? Math.round((count / publicOCCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Personality metrics averages
  const personalityMetrics = [
    'sociability',
    'communication_style',
    'judgment',
    'emotional_resilience',
    'courage',
    'risk_behavior',
    'honesty',
    'discipline',
    'temperament',
    'humor',
  ] as const;

  const personalityAverages: Record<string, number> = {};
  personalityMetrics.forEach(metric => {
    const values = allOCs
      ?.map(oc => oc[metric])
      .filter((val): val is number => val !== null && val !== undefined) || [];
    if (values.length > 0) {
      personalityAverages[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  });

  // D&D Stats
  const withDnDStats = allOCs?.filter(oc => 
    oc.stat_strength || oc.stat_dexterity || oc.stat_constitution ||
    oc.stat_intelligence || oc.stat_wisdom || oc.stat_charisma
  ) || [];

  let avgStats = {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  };
  
  if (withDnDStats.length > 0) {
    withDnDStats.forEach(oc => {
      if (oc.stat_strength) avgStats.strength += oc.stat_strength;
      if (oc.stat_dexterity) avgStats.dexterity += oc.stat_dexterity;
      if (oc.stat_constitution) avgStats.constitution += oc.stat_constitution;
      if (oc.stat_intelligence) avgStats.intelligence += oc.stat_intelligence;
      if (oc.stat_wisdom) avgStats.wisdom += oc.stat_wisdom;
      if (oc.stat_charisma) avgStats.charisma += oc.stat_charisma;
    });

    const statCount = withDnDStats.length;
    Object.keys(avgStats).forEach(key => {
      avgStats[key as keyof typeof avgStats] = Math.round(avgStats[key as keyof typeof avgStats] / statCount);
    });
  }

  // ========== MEDIA & ASSETS CALCULATIONS ==========

  const withImage = allOCs?.filter(oc => oc.image_url).length || 0;
  const withIcon = allOCs?.filter(oc => oc.icon_url).length || 0;
  const withGallery = allOCs?.filter(oc => oc.gallery && oc.gallery.length > 0).length || 0;
  const withThemeSong = allOCs?.filter(oc => oc.theme_song).length || 0;
  const withVoiceActor = allOCs?.filter(oc => oc.voice_actor || oc.seiyuu).length || 0;

  // ========== RELATIONSHIPS CALCULATIONS ==========

  const withFamily = allOCs?.filter(oc => oc.family).length || 0;
  const withFriends = allOCs?.filter(oc => oc.friends_allies).length || 0;
  const withRivals = allOCs?.filter(oc => oc.rivals_enemies).length || 0;
  const withRomantic = allOCs?.filter(oc => oc.romantic).length || 0;

  return (
    <div className="space-y-12">
      <PageHeader 
        title="Statistics & Analytics"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Statistics' }]}
      />

      {/* Overview */}
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
            value={timelineEventCount}
            color="#f59e0b"
            icon="fas fa-calendar-alt"
            href="/timelines"
          />
          <StatCard
            title="Timelines"
            value={timelineCount}
            color="#3b82f6"
            icon="fas fa-timeline"
            href="/timelines"
          />
          <StatCard
            title="OC Identities"
            value={identityCount}
            color="#8b5cf6"
            icon="fas fa-id-card"
          />
        </div>
      </StatsSection>

      {/* Content Distribution */}
      <StatsSection title="Content Distribution" icon="fas fa-chart-bar" iconColor="text-teal-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {worldDistribution.length > 0 && (
            <DistributionChart
              title="Characters by World (Top 15)"
              items={worldDistribution}
              color="#8b5cf6"
              limit={15}
              horizontal={true}
              height={400}
            />
          )}
          {seriesTypeDistribution.length > 0 && (
            <PieChart
              title="Worlds by Series Type"
              data={seriesTypePieData}
              colors={['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b']}
              height={400}
            />
          )}
          {templateDistribution.length > 0 && (
            <DistributionChart
              title="Characters by Template Type"
              items={templateDistribution}
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

      {/* Character Demographics */}
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
          {pronounDistribution.length > 0 && (
            <DistributionChart
              title="Top Pronouns (Top 10)"
              items={pronounDistribution}
              color="#a78bfa"
              limit={10}
              horizontal={true}
              height={300}
            />
          )}
          {alignmentDistribution.length > 0 && (
            <DistributionChart
              title="Alignment Distribution"
              items={alignmentDistribution}
              color="#f59e0b"
              horizontal={true}
              height={300}
            />
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ageDistribution.length > 0 && (
            <DistributionChart
              title="Age Distribution"
              items={ageDistribution}
              color="#f59e0b"
              height={300}
            />
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Characters with Age"
              value={ages.length}
              subtitle={publicOCCount > 0 ? `${Math.round((ages.length / publicOCCount) * 100)}%` : '0%'}
              color="#f59e0b"
              icon="fas fa-birthday-cake"
            />
            {ages.length > 0 && (
              <>
                <StatCard
                  title="Average Age"
                  value={avgAge.toFixed(1)}
                  color="#f59e0b"
                  icon="fas fa-calculator"
                />
                <StatCard
                  title="Min Age"
                  value={minAge}
                  color="#3b82f6"
                  icon="fas fa-arrow-down"
                />
                <StatCard
                  title="Max Age"
                  value={maxAge}
                  color="#ef4444"
                  icon="fas fa-arrow-up"
                />
              </>
            )}
          </div>
        </div>
      </StatsSection>

      {/* Birthday & Astrology */}
      {(withBirthday > 0 || starSignDistribution.length > 1 || romanticOrientationDistribution.length > 0 || sexualOrientationDistribution.length > 0) && (
        <StatsSection title="Birthday & Astrology" icon="fas fa-calendar-day" iconColor="text-pink-400">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {birthdayMonthDistribution.length > 0 && (
              <DistributionChart
                title="Birthdays by Month"
                items={birthdayMonthDistribution}
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
            {romanticOrientationDistribution.length > 0 && (
              <DistributionChart
                title="Romantic Orientation (Top 8)"
                items={romanticOrientationDistribution}
                color="#ec4899"
                limit={8}
                horizontal={true}
                height={300}
              />
            )}
            {sexualOrientationDistribution.length > 0 && (
              <DistributionChart
                title="Sexual Orientation (Top 8)"
                items={sexualOrientationDistribution}
                color="#f472b6"
                limit={8}
                horizontal={true}
                height={300}
              />
            )}
          </div>
          {withBirthday > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                title="Characters with Birthday"
                value={withBirthday}
                subtitle={publicOCCount > 0 ? `${Math.round((withBirthday / publicOCCount) * 100)}%` : '0%'}
                color="#ec4899"
                icon="fas fa-calendar-day"
              />
            </div>
          )}
        </StatsSection>
      )}

      {/* Character Attributes */}
      <StatsSection title="Character Attributes" icon="fas fa-brain" iconColor="text-indigo-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {statusDistribution.length > 0 && (
            <DistributionChart
              title="Character Status Distribution"
              items={statusDistribution}
              color="#ef4444"
              horizontal={true}
              height={300}
            />
          )}
          {speciesDistribution.length > 0 && (
            <DistributionChart
              title="Top Species (Top 10)"
              items={speciesDistribution}
              color="#14b8a6"
              limit={10}
              horizontal={true}
              height={300}
            />
          )}
        </div>
        {Object.keys(personalityAverages).length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Average Personality Metrics (1-10 scale)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(personalityAverages).map(([metric, value]) => (
                <StatCard
                  key={metric}
                  title={metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  value={value.toFixed(1)}
                  subtitle={`/ 10`}
                  color="#8b5cf6"
                  icon="fas fa-chart-line"
                />
              ))}
            </div>
          </div>
        )}
        {withDnDStats.length > 0 && (
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
                <div className="text-3xl font-bold text-purple-400 mb-2">{withDnDStats.length}</div>
                <div className="text-gray-400">
                  {publicOCCount > 0 ? Math.round((withDnDStats.length / publicOCCount) * 100) : 0}% of all characters
                </div>
              </div>
            </div>
          </div>
        )}
      </StatsSection>

      {/* Media & Assets */}
      <StatsSection title="Media & Assets" icon="fas fa-images" iconColor="text-teal-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="With Image"
            value={withImage}
            subtitle={publicOCCount > 0 ? `${Math.round((withImage / publicOCCount) * 100)}%` : '0%'}
            color="#10b981"
            icon="fas fa-image"
          />
          <StatCard
            title="With Icon"
            value={withIcon}
            subtitle={publicOCCount > 0 ? `${Math.round((withIcon / publicOCCount) * 100)}%` : '0%'}
            color="#3b82f6"
            icon="fas fa-user-circle"
          />
          <StatCard
            title="With Gallery"
            value={withGallery}
            subtitle={publicOCCount > 0 ? `${Math.round((withGallery / publicOCCount) * 100)}%` : '0%'}
            color="#8b5cf6"
            icon="fas fa-images"
          />
          <StatCard
            title="With Theme Song"
            value={withThemeSong}
            subtitle={publicOCCount > 0 ? `${Math.round((withThemeSong / publicOCCount) * 100)}%` : '0%'}
            color="#ec4899"
            icon="fas fa-music"
          />
          <StatCard
            title="With Voice Actor"
            value={withVoiceActor}
            subtitle={publicOCCount > 0 ? `${Math.round((withVoiceActor / publicOCCount) * 100)}%` : '0%'}
            color="#f59e0b"
            icon="fas fa-microphone"
          />
        </div>
      </StatsSection>

      {/* Relationships */}
      <StatsSection title="Relationships" icon="fas fa-heart" iconColor="text-red-400">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="With Family"
            value={withFamily}
            subtitle={publicOCCount > 0 ? `${Math.round((withFamily / publicOCCount) * 100)}%` : '0%'}
            color="#8b5cf6"
            icon="fas fa-home"
          />
          <StatCard
            title="With Friends"
            value={withFriends}
            subtitle={publicOCCount > 0 ? `${Math.round((withFriends / publicOCCount) * 100)}%` : '0%'}
            color="#10b981"
            icon="fas fa-user-friends"
          />
          <StatCard
            title="With Rivals"
            value={withRivals}
            subtitle={publicOCCount > 0 ? `${Math.round((withRivals / publicOCCount) * 100)}%` : '0%'}
            color="#ef4444"
            icon="fas fa-fist-raised"
          />
          <StatCard
            title="With Romantic"
            value={withRomantic}
            subtitle={publicOCCount > 0 ? `${Math.round((withRomantic / publicOCCount) * 100)}%` : '0%'}
            color="#ec4899"
            icon="fas fa-heart"
          />
        </div>
      </StatsSection>

      {/* Analytics */}
      {allOCsForAnalytics && allOCsForAnalytics.length > 0 && (
        <StatsSection title="Analytics" icon="fas fa-chart-line" iconColor="text-purple-400">
          <AnalyticsDashboard ocs={allOCsForAnalytics} />
          <div className="mt-6">
            <ArchetypeAnalyzer ocs={allOCsForAnalytics} />
          </div>
        </StatsSection>
      )}
    </div>
  );
}
