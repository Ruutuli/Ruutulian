import type { SupabaseClient } from '@supabase/supabase-js';
import type { OC } from '@/types/oc';

export interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface PublicSiteStats {
  counts: {
    public_worlds: number;
    all_worlds: number;
    public_ocs: number;
    all_ocs: number;
    public_lore: number;
    all_lore: number;
    timeline_events: number;
    timelines: number;
    identities: number;
  };
  world_distribution: DistributionItem[];
  series_type_distribution: DistributionItem[];
  template_distribution: DistributionItem[];
  gender_distribution: DistributionItem[];
  sex_distribution: DistributionItem[];
  pronoun_distribution: DistributionItem[];
  alignment_distribution: DistributionItem[];
  age_distribution: DistributionItem[];
  age_summary: { count: number; avg: number; min: number; max: number };
  birthday_month_distribution: DistributionItem[];
  with_birthday: number;
  star_sign_distribution: DistributionItem[];
  romantic_orientation_distribution: DistributionItem[];
  sexual_orientation_distribution: DistributionItem[];
  status_distribution: DistributionItem[];
  species_distribution: DistributionItem[];
  personality_averages: Record<string, number>;
  dnd_stats: {
    count: number;
    averages: {
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    };
  };
  media: {
    with_image: number;
    with_icon: number;
    with_gallery: number;
    with_theme_song: number;
    with_voice_actor: number;
  };
  relationships: {
    with_family: number;
    with_friends: number;
    with_rivals: number;
    with_romantic: number;
  };
  analytics_ocs: OC[];
}

export async function fetchPublicSiteStats(
  supabase: SupabaseClient
): Promise<PublicSiteStats | null> {
  const { data, error } = await supabase.rpc('get_public_site_stats');
  if (error || !data) return null;
  return data as PublicSiteStats;
}

export function sortDistributionNotSpecifiedLast(items: DistributionItem[]): DistributionItem[] {
  return [...items].sort((a, b) => {
    if (a.label === 'not specified') return 1;
    if (b.label === 'not specified') return -1;
    return b.count - a.count;
  });
}

export function toPieData(items: DistributionItem[]) {
  return items.map((item) => ({ name: item.label, value: item.count }));
}
