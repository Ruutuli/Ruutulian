import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/stats/StatCard';
import { DistributionChart } from '@/components/stats/DistributionChart';
import { PieChart } from '@/components/stats/PieChart';
import { BarChart } from '@/components/stats/BarChart';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Statistics',
  description: 'Comprehensive statistics and analytics for Ruutulian. View detailed demographics, distributions, and insights about characters, worlds, and content.',
  keywords: ['statistics', 'analytics', 'demographics', 'data', 'insights', 'OC wiki'],
  openGraph: {
    title: 'Statistics | Ruutulian',
    description: 'Comprehensive statistics and analytics for Ruutulian. View detailed demographics, distributions, and insights.',
    url: '/stats',
    type: 'website',
    images: [
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'Ruutulian Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Statistics | Ruutulian',
    description: 'Comprehensive statistics and analytics for Ruutulian.',
    images: ['/images/logo.png'],
  },
  alternates: {
    canonical: '/stats',
  },
};

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

  const { data: allWorlds } = await supabase
    .from('worlds')
    .select('id, name, slug, series_type, is_public')
    .eq('is_public', true);

  // Calculate distributions
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
    const species = oc.species || 'not specified';
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

  // Age distribution (if available)
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

  // Media statistics
  const withImage = allOCs?.filter(oc => oc.image_url).length || 0;
  const withIcon = allOCs?.filter(oc => oc.icon_url).length || 0;
  const withGallery = allOCs?.filter(oc => oc.gallery && oc.gallery.length > 0).length || 0;
  const withThemeSong = allOCs?.filter(oc => oc.theme_song).length || 0;
  const withVoiceActor = allOCs?.filter(oc => oc.voice_actor || oc.seiyuu).length || 0;

  // Relationship statistics
  const withFamily = allOCs?.filter(oc => oc.family).length || 0;
  const withFriends = allOCs?.filter(oc => oc.friends_allies).length || 0;
  const withRivals = allOCs?.filter(oc => oc.rivals_enemies).length || 0;
  const withRomantic = allOCs?.filter(oc => oc.romantic).length || 0;

  // Calculate averages and ratios
  const avgOCsPerWorld = publicWorldCount > 0 ? (publicOCCount / publicWorldCount).toFixed(1) : '0';
  const publicPrivateRatio = allOCCount > 0 
    ? Math.round((publicOCCount / allOCCount) * 100) 
    : 0;

  // Pie chart data for series type
  const seriesTypePieData = seriesTypeDistribution.map(item => ({
    name: item.label,
    value: item.count,
  }));

  // Public vs Private pie data
  const publicPrivatePieData = [
    { name: 'Public', value: publicOCCount },
    { name: 'Private', value: allOCCount - publicOCCount },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-3">
          Statistics
        </h1>
        <p className="text-gray-400 text-lg">
          Comprehensive analytics and insights about Ruutulian
        </p>
        <Link
          href="/"
          className="inline-block mt-4 text-purple-400 hover:text-purple-300 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Overview Stats */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-chart-line text-purple-400"></i>
          Overview
        </h2>
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
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-chart-pie text-pink-400"></i>
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
      </section>

      {/* Demographics */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-users text-purple-400"></i>
          Demographics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {genderDistribution.length > 0 && (
            <DistributionChart
              title="Gender Distribution"
              items={genderDistribution}
              color="#ec4899"
              horizontal={true}
            />
          )}
          {sexDistribution.length > 0 && (
            <DistributionChart
              title="Sex Distribution"
              items={sexDistribution}
              color="#f472b6"
              horizontal={true}
            />
          )}
          {pronounDistribution.length > 0 && (
            <DistributionChart
              title="Top Pronouns (Top 10)"
              items={pronounDistribution}
              color="#a78bfa"
              limit={10}
              horizontal={true}
            />
          )}
          {alignmentDistribution.length > 0 && (
            <DistributionChart
              title="Alignment Distribution"
              items={alignmentDistribution}
              color="#f59e0b"
              horizontal={true}
            />
          )}
        </div>
      </section>

      {/* Birthdays & Star Signs */}
      {(withBirthday > 0 || starSignDistribution.length > 1) && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <i className="fas fa-calendar-day text-pink-400"></i>
            Birthdays & Star Signs
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div>
          {withBirthday > 0 && (
            <div className="mt-4">
              <StatCard
                title="Characters with Birthday"
                value={withBirthday}
                subtitle={publicOCCount > 0 ? `${Math.round((withBirthday / publicOCCount) * 100)}%` : '0%'}
                color="#ec4899"
                icon="fas fa-calendar-day"
              />
            </div>
          )}
        </section>
      )}

      {/* Orientation Statistics */}
      {(romanticOrientationDistribution.length > 0 || sexualOrientationDistribution.length > 0) && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <i className="fas fa-heart text-red-400"></i>
            Orientation
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {romanticOrientationDistribution.length > 0 && (
              <DistributionChart
                title="Romantic Orientation (Top 8)"
                items={romanticOrientationDistribution}
                color="#ec4899"
                limit={8}
                horizontal={true}
              />
            )}
            {sexualOrientationDistribution.length > 0 && (
              <DistributionChart
                title="Sexual Orientation (Top 8)"
                items={sexualOrientationDistribution}
                color="#f472b6"
                limit={8}
                horizontal={true}
              />
            )}
          </div>
        </section>
      )}

      {/* Personality Metrics */}
      {Object.keys(personalityAverages).length > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <i className="fas fa-brain text-indigo-400"></i>
            Average Personality Metrics (1-10 scale)
          </h2>
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
        </section>
      )}

      {/* Media & Assets */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-images text-teal-400"></i>
          Media & Assets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
      </section>

      {/* Relationships */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-heart text-red-400"></i>
          Relationships
        </h2>
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
      </section>

      {/* Distribution Charts */}
      <section>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
          <i className="fas fa-chart-bar text-teal-400"></i>
          Distributions
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              colors={['#8b5cf6', '#ec4899']}
              height={350}
            />
          )}
          {templateDistribution.length > 0 && (
            <DistributionChart
              title="Characters by Template Type"
              items={templateDistribution}
              color="#ec4899"
              horizontal={true}
            />
          )}
          {statusDistribution.length > 0 && (
            <DistributionChart
              title="Character Status Distribution"
              items={statusDistribution}
              color="#ef4444"
              horizontal={true}
            />
          )}
          {speciesDistribution.length > 0 && (
            <DistributionChart
              title="Top Species (Top 10)"
              items={speciesDistribution}
              color="#14b8a6"
              limit={10}
              horizontal={true}
              height={350}
            />
          )}
          {ageDistribution.length > 0 && (
            <DistributionChart
              title="Age Distribution"
              items={ageDistribution}
              color="#f59e0b"
            />
          )}
        </div>
      </section>

      {/* Public vs Private Visualization */}
      {publicPrivatePieData.length > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <i className="fas fa-eye text-blue-400"></i>
            Visibility
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              title="Public vs Private Characters"
              data={publicPrivatePieData}
              colors={['#10b981', '#6b7280']}
            />
          </div>
        </section>
      )}
    </div>
  );
}

