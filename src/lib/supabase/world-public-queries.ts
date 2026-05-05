/**
 * Narrow selects for public world pages — smaller payloads than select('*').
 * Call sites must use `.select(... as any)` (or equivalent): Supabase's ParserQuery
 * only accepts string literals, not composed `string`-typed fragments.
 */

/** Worlds table columns used by WorldHeader / WorldDetails / story merge (excludes heavy JSON admin blobs). */
export const WORLD_PUBLIC_DETAIL_COLUMNS = `
  id,
  name,
  slug,
  series_type,
  summary,
  description_markdown,
  primary_color,
  accent_color,
  header_image_url,
  icon_url,
  is_public,
  genre,
  setting,
  lore,
  the_world_society,
  culture,
  politics,
  technology,
  environment,
  races_species,
  power_systems,
  religion,
  government,
  important_factions,
  notable_figures,
  languages,
  trade_economy,
  travel_transport,
  themes,
  inspirations,
  current_era_status,
  notes,
  canon_status,
  timeline_era,
  power_source,
  central_conflicts,
  world_rules_limitations,
  oc_integration_notes,
  overview_image_url,
  society_culture_image_url,
  world_building_image_url,
  economy_systems_image_url,
  additional_info_image_url,
  history_image_url,
  history,
  template_type,
  modular_fields,
  theme_song,
  playlist,
  pinterest_board,
  created_at,
  updated_at
`.replace(/\s+/g, ' ');

export const WORLD_STORY_OVERLAY_COLUMNS = `
  setting,
  lore,
  the_world_society,
  culture,
  politics,
  technology,
  environment,
  races_species,
  power_systems,
  religion,
  government,
  important_factions,
  notable_figures,
  languages,
  trade_economy,
  travel_transport,
  themes,
  inspirations,
  current_era_status,
  notes,
  canon_status,
  timeline_era,
  power_source,
  central_conflicts,
  world_rules_limitations,
  oc_integration_notes,
  overview_image_url,
  society_culture_image_url,
  world_building_image_url,
  economy_systems_image_url,
  additional_info_image_url,
  history_image_url,
  history,
  modular_fields
`.replace(/\s+/g, ' ');

/** OC rows on world detail: cards + relationship graph only. */
export const WORLD_PAGE_OC_COLUMNS = `
  id,
  name,
  slug,
  image_url,
  world_id,
  family,
  friends_allies,
  rivals_enemies,
  romantic,
  other_relationships,
  world:worlds(id, name, slug, primary_color, accent_color)
`.replace(/\s+/g, ' ');

export const TIMELINE_PUBLIC_COLUMNS = `
  id,
  world_id,
  name,
  description_markdown,
  date_format,
  era,
  story_alias_id,
  sort_chronologically,
  created_at,
  updated_at
`.replace(/\s+/g, ' ');

/** Lore rows for cards / previews (drops heavy JSON blobs). */
const WORLD_LORE_CARD_BODY_FALLBACK = `
  id,
  name,
  slug,
  world_id,
  lore_type,
  description,
  description_markdown,
  image_url,
  icon_url,
  banner_image_url,
  story_alias_id,
  is_public,
  created_at,
  updated_at,
  world:worlds(id, name, slug, primary_color, accent_color),
  related_ocs:world_lore_ocs(
    id,
    oc_id,
    role,
    oc:ocs(id, name, slug)
  ),
  related_events:world_lore_timeline_events(
    id,
    timeline_event_id,
    event:timeline_events(id, title)
  )
`.replace(/\s+/g, ' ');

/** Primary lore embed (includes story_alias FK hint). */
export const WORLD_LORE_CARD_COLUMNS_PRIMARY =
  WORLD_LORE_CARD_BODY_FALLBACK.replace(
    'story_alias_id, is_public',
    'story_alias_id, story_alias:story_aliases!fk_world_lore_story_alias_id(id, name, slug, description), is_public'
  );

/** Retry path when story_aliases relationship fails to embed (manual stitch still runs). */
export const WORLD_LORE_CARD_COLUMNS_FALLBACK = WORLD_LORE_CARD_BODY_FALLBACK;

/** Worlds index / cards only. */
export const WORLD_CARD_LIST_COLUMNS =
  'id, name, slug, series_type, header_image_url, icon_url, primary_color, accent_color, updated_at';
