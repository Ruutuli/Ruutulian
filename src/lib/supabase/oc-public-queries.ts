import type { SupabaseClient } from '@supabase/supabase-js';

/** Fields needed for /stats and analytics dashboards — excludes long markdown blobs. */
export const OC_STATS_SELECT = `
  id,
  name,
  slug,
  world_name,
  template_type,
  gender,
  sex,
  pronouns,
  alignment,
  age,
  date_of_birth,
  star_sign,
  romantic_orientation,
  sexual_orientation,
  status,
  species,
  modular_fields,
  sociability,
  communication_style,
  judgment,
  emotional_resilience,
  courage,
  risk_behavior,
  honesty,
  discipline,
  temperament,
  humor,
  stat_strength,
  stat_dexterity,
  stat_constitution,
  stat_intelligence,
  stat_wisdom,
  stat_charisma,
  image_url,
  icon_url,
  gallery,
  theme_song,
  voice_actor,
  seiyuu,
  family,
  friends_allies,
  rivals_enemies,
  romantic,
  view_count,
  last_viewed_at,
  updated_at,
  personality_summary,
  history_summary,
  world:worlds(name, series_type, slug)
`;

/** Fields for character cards and side-by-side comparison. */
export const OC_CARD_COMPARE_SELECT = `
  id,
  name,
  slug,
  image_url,
  age,
  status,
  species,
  alignment,
  stat_strength,
  stat_dexterity,
  stat_constitution,
  stat_intelligence,
  stat_wisdom,
  stat_charisma,
  world:worlds(id, name, slug, primary_color, accent_color)
`;

export interface OCCardCompareWorld {
  id: string;
  name: string;
  slug: string;
  primary_color?: string | null;
  accent_color?: string | null;
}

/** Slim OC shape returned by OC_CARD_COMPARE_SELECT (+ optional NSFW flag from attachImageNsfwFlags). */
export interface OCCardCompareOC {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  image_is_nsfw?: boolean;
  age?: number | null;
  status?: string | null;
  species?: string | null;
  alignment?: string | null;
  stat_strength?: number | null;
  stat_dexterity?: number | null;
  stat_constitution?: number | null;
  stat_intelligence?: number | null;
  stat_wisdom?: number | null;
  stat_charisma?: number | null;
  world?: OCCardCompareWorld | OCCardCompareWorld[] | null;
}

/** Fields for the interactive timeline visualization. */
export const TIMELINE_VISUAL_SELECT =
  'id, title, description, year, timeline_id, date_data, category, world_id';

export interface TimelineVisualEvent {
  id: string;
  title: string;
  description?: string | null;
  year?: number | null;
  timeline_id?: string | null;
  date_data?: Record<string, unknown> | null;
  category?: string | null;
  world_id?: string;
}

/** Fanfic index cards — excludes chapter bodies and long notes. */
export const FANFIC_LIST_SELECT = `
  id,
  slug,
  title,
  author,
  summary,
  rating,
  image_url,
  alternative_titles,
  story_alias_id,
  world_id,
  created_at,
  world:worlds(id, name, slug, is_public),
  story_alias:story_aliases(id, name, slug),
  characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
  tags:fanfic_tags(tag:tags(id, name))
`;

export const FANFIC_LIST_SELECT_WITH_TAG = `
  id,
  slug,
  title,
  author,
  summary,
  rating,
  image_url,
  alternative_titles,
  story_alias_id,
  world_id,
  created_at,
  world:worlds(id, name, slug, is_public),
  story_alias:story_aliases(id, name, slug),
  characters:fanfic_characters(id, oc_id, name, oc:ocs(id, name, slug)),
  tags:fanfic_tags!inner(tag_id, tag:tags(id, name))
`;

/** Lore index cards — excludes full article bodies. */
export const LORE_LIST_SELECT = `
  id,
  slug,
  name,
  lore_type,
  description,
  description_markdown,
  banner_image_url,
  world_id,
  story_alias_id,
  created_at,
  updated_at,
  world:worlds!inner(id, name, slug, is_public, primary_color, accent_color),
  story_alias:story_aliases(id, name, slug),
  related_ocs:world_lore_ocs(id, oc:ocs(id, name, slug))
`;

/** Admin OC progress tracking — all completion fields, no unrelated blobs. */
export const OC_ADMIN_PROGRESS_SELECT = `
  id,
  name,
  slug,
  world_name,
  first_name,
  last_name,
  aliases,
  species,
  sex,
  gender,
  pronouns,
  age,
  date_of_birth,
  occupation,
  affiliations,
  romantic_orientation,
  sexual_orientation,
  star_sign,
  ethnicity,
  place_of_origin,
  current_residence,
  languages,
  personality_summary,
  alignment,
  sociability,
  communication_style,
  judgment,
  emotional_resilience,
  courage,
  risk_behavior,
  honesty,
  discipline,
  temperament,
  humor,
  positive_traits,
  neutral_traits,
  negative_traits,
  abilities,
  skills,
  aptitudes,
  strengths,
  limits,
  conditions,
  standard_look,
  alternate_looks,
  accessories,
  visual_motifs,
  appearance_changes,
  height,
  weight,
  build,
  eye_color,
  hair_color,
  skin_tone,
  features,
  appearance_summary,
  family,
  friends_allies,
  rivals_enemies,
  romantic,
  other_relationships,
  origin,
  formative_years,
  major_life_events,
  history_summary,
  likes,
  dislikes,
  gallery,
  image_url,
  icon_url,
  seiyuu,
  voice_actor,
  theme_song,
  inspirations,
  design_notes,
  name_meaning_etymology,
  creator_notes,
  trivia,
  development_status,
  world:worlds(id, name, slug)
`;

export interface OCFilterFacets {
  worlds: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  genderOptions: string[];
  sexOptions: string[];
}

export async function fetchOCFilterFacets(
  supabase: SupabaseClient
): Promise<OCFilterFacets> {
  const [worldsRes, tagsRes, genderRes, sexRes] = await Promise.all([
    supabase.from('worlds').select('id, name').eq('is_public', true).order('name'),
    supabase.from('tags').select('id, name').order('name'),
    supabase
      .from('ocs')
      .select('gender')
      .eq('is_public', true)
      .not('gender', 'is', null)
      .not('gender', 'eq', ''),
    supabase
      .from('ocs')
      .select('sex')
      .eq('is_public', true)
      .not('sex', 'is', null)
      .not('sex', 'eq', ''),
  ]);

  const genderOptions = Array.from(
    new Set((genderRes.data ?? []).map((r) => r.gender).filter(Boolean))
  ).sort() as string[];

  const sexOptions = Array.from(
    new Set((sexRes.data ?? []).map((r) => r.sex).filter(Boolean))
  ).sort() as string[];

  return {
    worlds: worldsRes.data ?? [],
    tags: tagsRes.data ?? [],
    genderOptions,
    sexOptions,
  };
}

export interface FanficFilterFacets {
  worlds: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}

export async function fetchFanficFilterFacets(
  supabase: SupabaseClient
): Promise<FanficFilterFacets> {
  const [worldsRes, tagsRes] = await Promise.all([
    supabase.from('worlds').select('id, name').eq('is_public', true).order('name'),
    supabase.from('tags').select('id, name').eq('category', 'fanfic').order('name'),
  ]);

  return {
    worlds: worldsRes.data ?? [],
    tags: tagsRes.data ?? [],
  };
}

export async function fetchLoreFilterWorlds(
  supabase: SupabaseClient
): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabase
    .from('worlds')
    .select('id, name')
    .eq('is_public', true)
    .order('name');
  return data ?? [];
}
