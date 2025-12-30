import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AdminLink } from '@/components/admin/AdminLink';
import { StatsCard } from '@/components/admin/StatsCard';
import { FeatureTile } from '@/components/admin/FeatureTile';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { OCProgress } from '@/components/admin/OCProgress';
import { RandomOCOfTheDay } from '@/components/admin/RandomOCOfTheDay';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Parallel queries for better performance
  const [
    worldsResult,
    ocsResult,
    fanficsResult,
    timelinesResult,
    loreResult,
    timelineEventsResult,
    identitiesResult,
  ] = await Promise.all([
    supabase.from('worlds').select('*', { count: 'exact', head: true }),
    supabase.from('ocs').select('*', { count: 'exact', head: true }),
    supabase.from('fanfics').select('*', { count: 'exact', head: true }),
    supabase.from('timelines').select('*', { count: 'exact', head: true }),
    supabase.from('world_lore').select('*', { count: 'exact', head: true }),
    supabase.from('timeline_events').select('*', { count: 'exact', head: true }),
    supabase.from('oc_identities').select('*', { count: 'exact', head: true }),
  ]);

  const worldCount = worldsResult.count ?? 0;
  const ocCount = ocsResult.count ?? 0;
  const fanficCount = fanficsResult.count ?? 0;
  const timelineCount = timelinesResult.count ?? 0;
  const loreCount = loreResult.count ?? 0;
  const timelineEventCount = timelineEventsResult.count ?? 0;
  const identityCount = identitiesResult.count ?? 0;

  // Fetch all OCs for progress tracking
  const { data: allOCs } = await supabase
    .from('ocs')
    .select('*, world:worlds(id, name, slug)')
    .order('name', { ascending: true });

  // Query recent activity (last 10 items across all tables)
  const [recentOCs, recentWorlds, recentFanfics, recentLore, recentTimelines, recentEvents] = await Promise.all([
    supabase
      .from('ocs')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('worlds')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('fanfics')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2),
    supabase
      .from('world_lore')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2),
    supabase
      .from('timelines')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2),
    supabase
      .from('timeline_events')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2),
  ]);

  // Combine and sort recent activity
  const recentItems = [
    ...(recentOCs.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: 'oc' as const,
      updated_at: item.updated_at,
      href: `/admin/ocs/${item.id}`,
    })),
    ...(recentWorlds.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: 'world' as const,
      updated_at: item.updated_at,
      href: `/admin/worlds/${item.id}`,
    })),
    ...(recentFanfics.data || []).map((item) => ({
      id: item.id,
      name: item.title,
      type: 'fanfic' as const,
      updated_at: item.updated_at,
      href: `/admin/fanfics/${item.id}`,
    })),
    ...(recentLore.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: 'lore' as const,
      updated_at: item.updated_at,
      href: `/admin/world-lore/${item.id}`,
    })),
    ...(recentTimelines.data || []).map((item) => ({
      id: item.id,
      name: item.name,
      type: 'timeline' as const,
      updated_at: item.updated_at,
      href: `/admin/timelines/${item.id}`,
    })),
    ...(recentEvents.data || []).map((item) => ({
      id: item.id,
      name: item.title,
      type: 'timeline-event' as const,
      updated_at: item.updated_at,
      href: `/admin/timeline-events/${item.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">Control center for managing all content and settings</p>
        </div>
        <AdminLink
          href="/"
          className="w-full sm:w-fit px-4 py-3 sm:py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm md:text-base text-center sm:text-left touch-manipulation min-h-[44px] flex items-center justify-center sm:justify-start"
        >
          ← Website Home
        </AdminLink>
      </div>

      {/* Enhanced Stats Section */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <StatsCard
            title="Worlds"
            count={worldCount}
            href="/admin/worlds"
            color="#a855f7"
            icon="fas fa-globe"
          />
          <StatsCard
            title="Characters"
            count={ocCount}
            href="/admin/ocs"
            color="#ec4899"
            icon="fas fa-user"
          />
          <StatsCard
            title="Fanfics"
            count={fanficCount}
            href="/admin/fanfics"
            color="#e91e63"
            icon="fas fa-book-open"
          />
          <StatsCard
            title="Timelines"
            count={timelineCount}
            href="/admin/timelines"
            color="#3b82f6"
            icon="fas fa-clock"
          />
          <StatsCard
            title="Lore Entries"
            count={loreCount}
            href="/admin/world-lore"
            color="#14b8a6"
            icon="fas fa-book"
          />
          <StatsCard
            title="Timeline Events"
            count={timelineEventCount}
            href="/admin/timeline-events"
            color="#f97316"
            icon="fas fa-calendar"
          />
          <StatsCard
            title="OC Identities"
            count={identityCount}
            href="/admin/ocs"
            color="#8b5cf6"
            icon="fas fa-users"
          />
        </div>
      </div>

      {/* Random OC of the Day */}
      {(allOCs && allOCs.length > 0) && (
        <div>
          <RandomOCOfTheDay ocs={allOCs as any} />
        </div>
      )}

      {/* OCs Progress Section */}
      {(allOCs && allOCs.length > 0) && (
        <div>
          <OCProgress ocs={allOCs as any} />
        </div>
      )}

      {/* Quick Actions - Create & Manage */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <FeatureTile
            title="New OC"
            description="Create a new original character"
            href="/admin/ocs/new"
            icon="fas fa-user-plus"
            color="pink"
            actionLabel="Create →"
          />
          <FeatureTile
            title="New World"
            description="Create a new world or universe"
            href="/admin/worlds/new"
            icon="fas fa-globe-americas"
            color="purple"
            actionLabel="Create →"
          />
          <FeatureTile
            title="New Fanfic"
            description="Create a new fanfiction work"
            href="/admin/fanfics/new"
            icon="fas fa-book"
            color="pink"
            actionLabel="Create →"
          />
          <FeatureTile
            title="New Lore Entry"
            description="Add a new lore/codex entry"
            href="/admin/world-lore/new"
            icon="fas fa-book-open"
            color="teal"
            actionLabel="Create →"
          />
          <FeatureTile
            title="New Timeline"
            description="Create a new timeline"
            href="/admin/timelines/new"
            icon="fas fa-clock"
            color="blue"
            actionLabel="Create →"
          />
          <FeatureTile
            title="New Timeline Event"
            description="Create a new timeline event"
            href="/admin/timeline-events/new"
            icon="fas fa-calendar-plus"
            color="orange"
            actionLabel="Create →"
          />
        </div>
      </div>

      {/* Browse & Manage */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Browse & Manage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <FeatureTile
            title="Browse OCs"
            description="View and manage all original characters"
            href="/admin/ocs"
            icon="fas fa-users"
            color="pink"
            count={ocCount}
            actionLabel="Browse →"
          />
          <FeatureTile
            title="Browse Worlds"
            description="View and manage all worlds"
            href="/admin/worlds"
            icon="fas fa-globe"
            color="purple"
            count={worldCount}
            actionLabel="Browse →"
          />
          <FeatureTile
            title="Browse Fanfics"
            description="View and manage all fanfics"
            href="/admin/fanfics"
            icon="fas fa-book-open"
            color="pink"
            count={fanficCount}
            actionLabel="Browse →"
          />
          <FeatureTile
            title="Browse Lore Entries"
            description="View and manage all lore/codex entries"
            href="/admin/world-lore"
            icon="fas fa-book"
            color="teal"
            count={loreCount}
            actionLabel="Browse →"
          />
          <FeatureTile
            title="Browse Timelines"
            description="View and manage all timelines"
            href="/admin/timelines"
            icon="fas fa-clock"
            color="blue"
            count={timelineCount}
            actionLabel="Browse →"
          />
          <FeatureTile
            title="Browse Timeline Events"
            description="View and manage all timeline events"
            href="/admin/timeline-events"
            icon="fas fa-calendar-alt"
            color="orange"
            count={timelineEventCount}
            actionLabel="Browse →"
          />
        </div>
      </div>

      {/* Feature Tiles - Admin Tools Section */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <FeatureTile
            title="OC Statistics"
            description="View comprehensive analytics and statistics for all characters"
            href="/admin/stats"
            icon="fas fa-chart-bar"
            color="pink"
            actionLabel="View Stats →"
          />
          <FeatureTile
            title="Manage Templates & Fields"
            description="Manage character template fields and world custom fields"
            href="/admin/templates"
            icon="fas fa-file-code"
            color="indigo"
            actionLabel="Manage →"
          />
          <FeatureTile
            title="Manage Dropdown Options"
            description="Edit available options for form dropdowns"
            href="/admin/dropdown-options"
            icon="fas fa-list"
            color="blue"
            actionLabel="Manage →"
          />
          <FeatureTile
            title="Site Settings"
            description="Configure your site's name, description, colors, and appearance"
            href="/admin/settings"
            icon="fas fa-cog"
            color="purple"
            actionLabel="Configure →"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <RecentActivity items={recentItems} />
      </div>

      {/* Guides & Instructions Section - Collapsible */}
      <details className="bg-gray-800/50 rounded-lg border border-gray-700/50">
        <summary className="cursor-pointer p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-100 inline-flex items-center gap-2">
            <i className="fas fa-info-circle text-pink-400"></i>
            Guides & Instructions
          </h2>
        </summary>
        <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2">
          <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-700/50 rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <i className="fas fa-info-circle text-2xl text-pink-400"></i>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-100 mb-2">
                    Creating Multiple Versions of the Same OC in Different Worlds
                  </h3>
                  <p className="text-sm md:text-base text-gray-300 mb-4">
                    If you have an OC that exists in 2 different worlds, you can create separate versions that are linked together as the same character identity.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base font-semibold text-gray-100 mb-2 flex items-center gap-2">
                      <span className="text-pink-400">Step 1:</span> Create the First Version
                    </h4>
                    <p className="text-sm text-gray-300">
                      Create your OC normally by going to <strong className="text-gray-100">Admin → OCs → New OC</strong>. 
                      Select the first world and fill in all the character details. The system will automatically create an OC Identity for this character.
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base font-semibold text-gray-100 mb-2 flex items-center gap-2">
                      <span className="text-pink-400">Step 2:</span> Add a Second Version for a Different World
                    </h4>
                    <p className="text-sm text-gray-300 mb-2">
                      To add another version of the same character in a different world:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1 ml-2">
                      <li>Go to <strong className="text-gray-100">Admin → OCs</strong> and find your character</li>
                      <li>Click on the version count link (e.g., "1 version") in the Versions column</li>
                      <li>This opens the <strong className="text-gray-100">Identity Manager</strong> page</li>
                      <li>Click the <strong className="text-gray-100">"➕ Add New Version"</strong> button</li>
                      <li>Select a <strong className="text-gray-100">different World/Fandom</strong> than the first version</li>
                      <li>Fill in the character details for this new version</li>
                      <li>Click <strong className="text-gray-100">Save</strong></li>
                    </ol>
                    <p className="text-sm text-gray-400 mt-2 italic">
                      Each version has completely separate data (appearance, stats, relationships, etc.) and can exist in different worlds.
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base font-semibold text-gray-100 mb-2 flex items-center gap-2">
                      <span className="text-pink-400">Step 3:</span> Editing Versions
                    </h4>
                    <p className="text-sm text-gray-300">
                      When editing a character with multiple versions, you'll see a version switcher banner at the top of the edit form. 
                      You can switch between versions to edit each one separately. Remember: each version's data is completely independent!
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700/50 mt-4">
                  <AdminLink
                    href="/admin/ocs"
                    className="inline-flex items-center gap-2 text-sm md:text-base text-pink-400 hover:text-pink-300 font-medium"
                  >
                    Go to OCs →
                    <i className="fas fa-arrow-right"></i>
                  </AdminLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
