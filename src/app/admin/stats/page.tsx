import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'OC Statistics',
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: string;
}

function StatCard({ title, value, subtitle, color = '#ec4899', icon }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
        {icon && <i className={`${icon} text-xl`} style={{ color }}></i>}
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color }}>
        {value}
      </p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

function DistributionChart({ title, items, color = '#ec4899' }: { title: string; items: DistributionItem[]; color?: string }) {
  const maxCount = Math.max(...items.map(item => item.count), 1);
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-300">{item.label || '(empty)'}</span>
              <span className="text-sm font-semibold text-gray-400">{item.count} ({item.percentage}%)</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AverageMetricCard({ title, value, max = 10, color = '#ec4899' }: { title: string; value: number; max?: number; color?: string }) {
  const percentage = (value / max) * 100;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="flex items-end gap-3 mb-3">
        <p className="text-3xl font-bold" style={{ color }}>
          {value.toFixed(1)}
        </p>
        <p className="text-lg text-gray-500 mb-1">/ {max}</p>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
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
        <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
          <p className="text-gray-400 text-lg">No OCs found. Create some characters to see statistics!</p>
        </div>
      </div>
    );
  }

  const totalOCs = ocs.length;

  // Basic counts
  const publicOCs = ocs.filter(oc => oc.is_public).length;
  const privateOCs = totalOCs - publicOCs;
  const withIdentity = ocs.filter(oc => oc.identity_id).length;
  const withStoryAlias = ocs.filter(oc => oc.story_alias_id).length;

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
      // Sort "not specified" to the end
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

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
      // Sort "not specified" to the end
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
    .slice(0, 10); // Top 10

  // Species distribution
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
    .slice(0, 10); // Top 10

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

  // Age statistics
  const ages = ocs.map(oc => oc.age).filter((age): age is number => age !== null && age !== undefined);
  const avgAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
  const withAge = ages.length;

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

  // Field completion rates
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

  // Media statistics
  const withImage = ocs.filter(oc => oc.image_url).length;
  const withIcon = ocs.filter(oc => oc.icon_url).length;
  const withGallery = ocs.filter(oc => oc.gallery && oc.gallery.length > 0).length;
  const withThemeSong = ocs.filter(oc => oc.theme_song).length;
  const withVoiceActor = ocs.filter(oc => oc.voice_actor || oc.seiyuu).length;

  // Relationship statistics
  const withFamily = ocs.filter(oc => oc.family).length;
  const withFriends = ocs.filter(oc => oc.friends_allies).length;
  const withRivals = ocs.filter(oc => oc.rivals_enemies).length;
  const withRomantic = ocs.filter(oc => oc.romantic).length;

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

  // Birthday statistics
  const withBirthday = ocs.filter(oc => oc.date_of_birth).length;
  const monthCounts: Record<string, number> = {};
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  ocs.forEach(oc => {
    if (oc.date_of_birth) {
      try {
        // Try to parse the date - it could be in various formats
        const date = new Date(oc.date_of_birth);
        if (!isNaN(date.getTime())) {
          const month = monthNames[date.getMonth()];
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      } catch (e) {
        // If date parsing fails, skip
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
      // Sort by month order
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
      // Sort "not specified" to the end
      if (a.label === 'not specified') return 1;
      if (b.label === 'not specified') return -1;
      return b.count - a.count;
    });

  return (
    <div className="space-y-8">
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

      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
            value={ocs.filter(oc => oc.star_sign).length}
            subtitle={`${Math.round((ocs.filter(oc => oc.star_sign).length / totalOCs) * 100)}%`}
            color="#8b5cf6"
            icon="fas fa-star"
          />
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title="Template Types"
          items={templateDistribution}
          color="#ec4899"
        />
        <DistributionChart
          title="Status Distribution"
          items={statusDistribution}
          color="#ef4444"
        />
        <DistributionChart
          title="World Distribution"
          items={worldDistribution}
          color="#8b5cf6"
        />
        <DistributionChart
          title="Series Type"
          items={seriesTypeDistribution}
          color="#3b82f6"
        />
        <DistributionChart
          title="Sex Distribution"
          items={sexDistribution}
          color="#f472b6"
        />
        <DistributionChart
          title="Gender Distribution"
          items={genderDistribution}
          color="#ec4899"
        />
        <DistributionChart
          title="Top Pronouns"
          items={pronounDistribution}
          color="#a78bfa"
        />
        <DistributionChart
          title="Top Species"
          items={speciesDistribution}
          color="#14b8a6"
        />
        <DistributionChart
          title="Alignment"
          items={alignmentDistribution}
          color="#f59e0b"
        />
      </div>

      {/* Age Statistics */}
      {withAge > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Age Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Average Age"
              value={avgAge.toFixed(1)}
              color="#f59e0b"
              icon="fas fa-calculator"
            />
            <StatCard
              title="Minimum Age"
              value={minAge}
              color="#3b82f6"
              icon="fas fa-arrow-down"
            />
            <StatCard
              title="Maximum Age"
              value={maxAge}
              color="#ef4444"
              icon="fas fa-arrow-up"
            />
          </div>
        </div>
      )}

      {/* Birthday & Star Sign Statistics */}
      {(withBirthday > 0 || starSignDistribution.length > 1) && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Birthdays & Star Signs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {birthdayMonthDistribution.length > 0 && (
              <DistributionChart
                title="Birthdays by Month"
                items={birthdayMonthDistribution}
                color="#ec4899"
              />
            )}
            {starSignDistribution.length > 1 && (
              <DistributionChart
                title="Star Signs"
                items={starSignDistribution}
                color="#8b5cf6"
              />
            )}
          </div>
        </div>
      )}

      {/* Personality Metrics */}
      {Object.keys(personalityAverages).length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Average Personality Metrics (1-10 scale)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(personalityAverages).map(([metric, value]) => (
              <AverageMetricCard
                key={metric}
                title={metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value}
                max={10}
                color="#ec4899"
              />
            ))}
          </div>
        </div>
      )}

      {/* Field Completion */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Field Completion Rates</h2>
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(completionRates).map(([field, percentage]) => (
              <div key={field} className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: percentage >= 50 ? '#10b981' : percentage >= 25 ? '#f59e0b' : '#ef4444' }}>
                  {percentage}%
                </div>
                <div className="text-xs text-gray-400 capitalize">{field.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Media Statistics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Media & Assets</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
      </div>

      {/* Relationship Statistics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Relationships</h2>
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
      </div>

      {/* Orientation Statistics */}
      {(romanticOrientationDistribution.length > 0 || sexualOrientationDistribution.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {romanticOrientationDistribution.length > 0 && (
            <DistributionChart
              title="Romantic Orientation"
              items={romanticOrientationDistribution}
              color="#ec4899"
            />
          )}
          {sexualOrientationDistribution.length > 0 && (
            <DistributionChart
              title="Sexual Orientation"
              items={sexualOrientationDistribution}
              color="#f472b6"
            />
          )}
        </div>
      )}
    </div>
  );
}




















