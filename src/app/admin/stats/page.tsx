import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StatCard } from '@/components/stats/StatCard';
import { DistributionChart } from '@/components/stats/DistributionChart';
import { StatsSection } from '@/components/stats/StatsSection';

export const metadata: Metadata = {
  title: 'OC Statistics',
};

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export default async function OCStatsPage() {
  const supabase = await createClient();

  // Fetch all OCs with all their fields
  const { data: ocs } = await supabase
    .from('ocs')
    .select(`
      *,
      world:worlds(name, series_type)
    `);

  if (!ocs || ocs.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-100">OC Statistics</h1>
            <p className="text-gray-400 mt-2">Comprehensive analytics for all characters</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <div className="wiki-card p-8 text-center">
          <p className="text-gray-400 text-lg">No OCs found. Create some characters to see statistics!</p>
        </div>
      </div>
    );
  }

  const totalOCs = ocs.length;

  // ========== OVERVIEW CALCULATIONS ==========

  const publicOCs = ocs.filter(oc => oc.is_public).length;
  const privateOCs = totalOCs - publicOCs;
  const withIdentity = ocs.filter(oc => oc.identity_id).length;
  const withStoryAlias = ocs.filter(oc => oc.story_alias_id).length;
  const withAge = ocs.filter(oc => oc.age !== null && oc.age !== undefined).length;
  const withBirthday = ocs.filter(oc => oc.date_of_birth).length;
  const withStarSign = ocs.filter(oc => oc.star_sign).length;

  // ========== CONTENT DISTRIBUTION CALCULATIONS ==========

  // Template type distribution
  const templateCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    templateCounts[oc.template_type] = (templateCounts[oc.template_type] || 0) + 1;
  });
  const templateDistribution: DistributionItem[] = Object.entries(templateCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1).replace('-', ' '),
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const status = oc.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusDistribution: DistributionItem[] = Object.entries(statusCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1).replace('-', ' '),
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // World distribution
  const worldCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const worldName = (oc.world as any)?.name || oc.world_name || 'Unknown';
    worldCounts[worldName] = (worldCounts[worldName] || 0) + 1;
  });
  const worldDistribution: DistributionItem[] = Object.entries(worldCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Series type distribution
  const seriesTypeCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const seriesType = (oc.world as any)?.series_type || oc.series_type || 'unknown';
    seriesTypeCounts[seriesType] = (seriesTypeCounts[seriesType] || 0) + 1;
  });
  const seriesTypeDistribution: DistributionItem[] = Object.entries(seriesTypeCounts)
    .map(([label, count]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // ========== DEMOGRAPHICS CALCULATIONS ==========

  // Gender distribution
  const genderCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const gender = oc.gender || 'not specified';
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;
  });
  const genderDistribution: DistributionItem[] = Object.entries(genderCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Sex distribution
  const sexCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const sex = oc.sex || 'not specified';
    sexCounts[sex] = (sexCounts[sex] || 0) + 1;
  });
  const sexDistribution: DistributionItem[] = Object.entries(sexCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Pronouns distribution
  const pronounCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const pronouns = oc.pronouns || 'not specified';
    pronounCounts[pronouns] = (pronounCounts[pronouns] || 0) + 1;
  });
  const pronounDistribution: DistributionItem[] = Object.entries(pronounCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Alignment distribution
  const alignmentCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const alignment = oc.alignment || 'not specified';
    alignmentCounts[alignment] = (alignmentCounts[alignment] || 0) + 1;
  });
  const alignmentDistribution: DistributionItem[] = Object.entries(alignmentCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // ========== BIRTHDAY & ASTROLOGY CALCULATIONS ==========

  // Birthday statistics
  const monthCounts: Record<string, number> = {};
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  ocs.forEach(oc => {
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
  ocs.forEach(oc => {
    const starSign = oc.star_sign || 'not specified';
    starSignCounts[starSign] = (starSignCounts[starSign] || 0) + 1;
  });
  const starSignDistribution: DistributionItem[] = Object.entries(starSignCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => {
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  // Orientation statistics
  const romanticOrientationCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const orientation = oc.romantic_orientation || 'not specified';
    romanticOrientationCounts[orientation] = (romanticOrientationCounts[orientation] || 0) + 1;
  });
  const romanticOrientationDistribution: DistributionItem[] = Object.entries(romanticOrientationCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const sexualOrientationCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const orientation = oc.sexual_orientation || 'not specified';
    sexualOrientationCounts[orientation] = (sexualOrientationCounts[orientation] || 0) + 1;
  });
  const sexualOrientationDistribution: DistributionItem[] = Object.entries(sexualOrientationCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ========== CHARACTER ATTRIBUTES CALCULATIONS ==========

  // Age statistics
  const ages = ocs.map(oc => oc.age).filter((age): age is number => age !== null && age !== undefined);
  const avgAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

  // Species distribution (top 10)
  const speciesCounts: Record<string, number> = {};
  ocs.forEach(oc => {
    const species = oc.species || 'not specified';
    speciesCounts[species] = (speciesCounts[species] || 0) + 1;
  });
  const speciesDistribution: DistributionItem[] = Object.entries(speciesCounts)
    .map(([label, count]) => ({
      label: label,
      count,
      percentage: Math.round((count / totalOCs) * 100),
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
    const values = ocs
      .map(oc => oc[metric])
      .filter((val): val is number => val !== null && val !== undefined);
    if (values.length > 0) {
      personalityAverages[metric] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  });

  // ========== FIELD COMPLETION CALCULATIONS ==========

  const importantFields = [
    'name',
    'species',
    'gender',
    'pronouns',
    'age',
    'occupation',
    'personality_summary',
    'abilities',
    'standard_look',
    'origin',
    'likes',
    'dislikes',
    'gallery',
    'image_url',
  ] as const;

  const completionRates: Record<string, number> = {};
  importantFields.forEach(field => {
    const filled = ocs.filter(oc => {
      const value = oc[field as keyof typeof oc];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    }).length;
    completionRates[field] = Math.round((filled / totalOCs) * 100);
  });

  // ========== MEDIA & ASSETS CALCULATIONS ==========

  const withImage = ocs.filter(oc => oc.image_url).length;
  const withIcon = ocs.filter(oc => oc.icon_url).length;
  const withGallery = ocs.filter(oc => oc.gallery && oc.gallery.length > 0).length;
  const withThemeSong = ocs.filter(oc => oc.theme_song).length;
  const withVoiceActor = ocs.filter(oc => oc.voice_actor || oc.seiyuu).length;

  // ========== RELATIONSHIPS CALCULATIONS ==========

  const withFamily = ocs.filter(oc => oc.family).length;
  const withFriends = ocs.filter(oc => oc.friends_allies).length;
  const withRivals = ocs.filter(oc => oc.rivals_enemies).length;
  const withRomantic = ocs.filter(oc => oc.romantic).length;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-100">OC Statistics</h1>
          <p className="text-gray-400 mt-2">Comprehensive analytics for all {totalOCs} characters</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Overview */}
      <StatsSection title="Overview" icon="fas fa-chart-line" iconColor="text-purple-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total OCs"
            value={totalOCs}
            color="#ec4899"
            icon="fas fa-users"
          />
          <StatCard
            title="Public"
            value={publicOCs}
            subtitle={`${Math.round((publicOCs / totalOCs) * 100)}%`}
            color="#10b981"
            icon="fas fa-eye"
          />
          <StatCard
            title="Private"
            value={privateOCs}
            subtitle={`${Math.round((privateOCs / totalOCs) * 100)}%`}
            color="#6b7280"
            icon="fas fa-eye-slash"
          />
          <StatCard
            title="With Identity"
            value={withIdentity}
            subtitle={`${Math.round((withIdentity / totalOCs) * 100)}%`}
            color="#8b5cf6"
            icon="fas fa-id-card"
          />
          <StatCard
            title="With Story Alias"
            value={withStoryAlias}
            subtitle={`${Math.round((withStoryAlias / totalOCs) * 100)}%`}
            color="#3b82f6"
            icon="fas fa-bookmark"
          />
          <StatCard
            title="With Age"
            value={withAge}
            subtitle={`${Math.round((withAge / totalOCs) * 100)}%`}
            color="#f59e0b"
            icon="fas fa-birthday-cake"
          />
          <StatCard
            title="With Birthday"
            value={withBirthday}
            subtitle={`${Math.round((withBirthday / totalOCs) * 100)}%`}
            color="#ec4899"
            icon="fas fa-calendar-day"
          />
          <StatCard
            title="With Star Sign"
            value={withStarSign}
            subtitle={`${Math.round((withStarSign / totalOCs) * 100)}%`}
            color="#8b5cf6"
            icon="fas fa-star"
          />
        </div>
      </StatsSection>

      {/* Content Distribution */}
      <StatsSection title="Content Distribution" icon="fas fa-chart-bar" iconColor="text-teal-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            title="Template Types"
            items={templateDistribution}
            color="#ec4899"
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="Status Distribution"
            items={statusDistribution}
            color="#ef4444"
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="World Distribution"
            items={worldDistribution}
            color="#8b5cf6"
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="Series Type"
            items={seriesTypeDistribution}
            color="#3b82f6"
            horizontal={true}
            height={300}
          />
        </div>
      </StatsSection>

      {/* Character Demographics */}
      <StatsSection title="Character Demographics" icon="fas fa-users" iconColor="text-purple-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart
            title="Gender Distribution"
            items={genderDistribution}
            color="#ec4899"
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="Sex Distribution"
            items={sexDistribution}
            color="#f472b6"
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="Top Pronouns (Top 10)"
            items={pronounDistribution}
            color="#a78bfa"
            limit={10}
            horizontal={true}
            height={300}
          />
          <DistributionChart
            title="Alignment Distribution"
            items={alignmentDistribution}
            color="#f59e0b"
            horizontal={true}
            height={300}
          />
        </div>
      </StatsSection>

      {/* Birthday & Astrology */}
      {(withBirthday > 0 || starSignDistribution.length > 1 || romanticOrientationDistribution.length > 0 || sexualOrientationDistribution.length > 0) && (
        <StatsSection title="Birthday & Astrology" icon="fas fa-calendar-day" iconColor="text-pink-400">
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
        </StatsSection>
      )}

      {/* Character Attributes */}
      <StatsSection title="Character Attributes" icon="fas fa-brain" iconColor="text-indigo-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
          {withAge > 0 && (
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          )}
        </div>
        {Object.keys(personalityAverages).length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Average Personality Metrics (1-10 scale)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(personalityAverages).map(([metric, value]) => (
                <StatCard
                  key={metric}
                  title={metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  value={value.toFixed(1)}
                  subtitle="/ 10"
                  color="#8b5cf6"
                  icon="fas fa-chart-line"
                />
              ))}
            </div>
          </div>
        )}
      </StatsSection>

      {/* Field Completion - Admin Specific */}
      <StatsSection title="Field Completion Rates" icon="fas fa-check-circle" iconColor="text-green-400">
        <div className="wiki-card p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(completionRates).map(([field, percentage]) => (
              <div key={field} className="text-center">
                <div 
                  className="text-2xl font-bold mb-1" 
                  style={{ 
                    color: percentage >= 50 ? '#10b981' : percentage >= 25 ? '#f59e0b' : '#ef4444' 
                  }}
                >
                  {percentage}%
                </div>
                <div className="text-xs text-gray-400 capitalize">{field.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      </StatsSection>

      {/* Media & Assets */}
      <StatsSection title="Media & Assets" icon="fas fa-images" iconColor="text-teal-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="With Image"
            value={withImage}
            subtitle={`${Math.round((withImage / totalOCs) * 100)}%`}
            color="#10b981"
            icon="fas fa-image"
          />
          <StatCard
            title="With Icon"
            value={withIcon}
            subtitle={`${Math.round((withIcon / totalOCs) * 100)}%`}
            color="#3b82f6"
            icon="fas fa-user-circle"
          />
          <StatCard
            title="With Gallery"
            value={withGallery}
            subtitle={`${Math.round((withGallery / totalOCs) * 100)}%`}
            color="#8b5cf6"
            icon="fas fa-images"
          />
          <StatCard
            title="With Theme Song"
            value={withThemeSong}
            subtitle={`${Math.round((withThemeSong / totalOCs) * 100)}%`}
            color="#ec4899"
            icon="fas fa-music"
          />
          <StatCard
            title="With Voice Actor"
            value={withVoiceActor}
            subtitle={`${Math.round((withVoiceActor / totalOCs) * 100)}%`}
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
            subtitle={`${Math.round((withFamily / totalOCs) * 100)}%`}
            color="#8b5cf6"
            icon="fas fa-home"
          />
          <StatCard
            title="With Friends"
            value={withFriends}
            subtitle={`${Math.round((withFriends / totalOCs) * 100)}%`}
            color="#10b981"
            icon="fas fa-user-friends"
          />
          <StatCard
            title="With Rivals"
            value={withRivals}
            subtitle={`${Math.round((withRivals / totalOCs) * 100)}%`}
            color="#ef4444"
            icon="fas fa-fist-raised"
          />
          <StatCard
            title="With Romantic"
            value={withRomantic}
            subtitle={`${Math.round((withRomantic / totalOCs) * 100)}%`}
            color="#ec4899"
            icon="fas fa-heart"
          />
        </div>
      </StatsSection>
    </div>
  );
}
