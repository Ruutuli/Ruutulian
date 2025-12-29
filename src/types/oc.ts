export type SeriesType = 'canon' | 'original';

export type RelationshipType =
  | 'lovers'
  | 'crush'
  | 'close_friend'
  | 'friend'
  | 'acquaintance'
  | 'dislike'
  | 'hate'
  | 'neutral'
  | 'family'
  | 'rival'
  | 'admire'
  | 'other';

export interface RelationshipEntry {
  name: string;
  relationship?: string;
  description?: string;
  oc_id?: string;
  oc_slug?: string;
  relationship_type?: RelationshipType;
  image_url?: string;
}

export type TemplateType =
  | 'naruto'
  | 'ff7'
  | 'inuyasha'
  | 'shaman-king'
  | 'zelda'
  | 'dragonball'
  | 'pokemon'
  | 'nier'
  | 'original'
  | 'none';

export type OCStatus = 'alive' | 'deceased' | 'missing' | 'unknown' | 'au-only';

// World Field System Types
export type WorldFieldType = 'text' | 'array' | 'number';

export interface WorldFieldDefinition {
  key: string;
  label: string;
  type: WorldFieldType;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | string[];
  options?: string; // Field key in dropdown_options table for autocomplete (e.g., "accent", "ethnicity_race", "species")
  multiline?: boolean; // If true, renders a textarea instead of a single-line input for text fields
}

export interface FieldSet {
  id: string;
  name: string;
  description?: string;
  template_key?: string; // Optional template association - when set, field set only appears for OCs using that template
  fields: WorldFieldDefinition[];
}

export interface WorldFieldDefinitions {
  field_sets: FieldSet[];
}

export type WorldFieldValues = Record<string, string | number | string[] | null>;

export interface OCIdentity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  // Joined data
  versions?: OC[]; // All versions of this identity across fandoms
}

export interface StoryAlias {
  id: string;
  world_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  world?: World;
}

export interface WorldStoryData {
  id: string;
  world_id: string;
  story_alias_id?: string | null;
  // World content fields (story-specific versions)
  setting?: string | null;
  lore?: string | null;
  the_world_society?: string | null;
  culture?: string | null;
  politics?: string | null;
  technology?: string | null;
  environment?: string | null;
  races_species?: string | null;
  power_systems?: string | null;
  religion?: string | null;
  government?: string | null;
  important_factions?: string | null;
  notable_figures?: string | null;
  languages?: string | null;
  trade_economy?: string | null;
  travel_transport?: string | null;
  themes?: string | null;
  inspirations?: string | null;
  current_era_status?: string | null;
  notes?: string | null;
  // New world information fields
  canon_status?: string | null;
  timeline_era?: string | null;
  power_source?: string | null;
  central_conflicts?: string | null;
  world_rules_limitations?: string | null;
  oc_integration_notes?: string | null;
  // Section image URLs (story-specific)
  overview_image_url?: string | null;
  society_culture_image_url?: string | null;
  world_building_image_url?: string | null;
  economy_systems_image_url?: string | null;
  additional_info_image_url?: string | null;
  history_image_url?: string | null;
  // History field
  history?: string | null;
  // World field system values (story-specific)
  modular_fields?: WorldFieldValues | null;
  created_at: string;
  updated_at: string;
  // Joined data
  world?: World;
  story_alias?: StoryAlias | null;
}

export interface WorldRace {
  id: string;
  world_id: string;
  story_alias_id?: string | null;
  name: string;
  info?: string | null;
  picture_url?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface World {
  id: string;
  name: string;
  slug: string;
  series_type: SeriesType;
  summary: string;
  description_markdown?: string | null;
  primary_color: string;
  accent_color: string;
  header_image_url?: string | null;
  icon_url?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Default world fields (custom depending on world)
  genre?: string | null;
  setting?: string | null;
  lore?: string | null;
  the_world_society?: string | null;
  culture?: string | null;
  politics?: string | null;
  technology?: string | null;
  environment?: string | null;
  races_species?: string | null;
  power_systems?: string | null;
  religion?: string | null;
  government?: string | null;
  important_factions?: string | null;
  notable_figures?: string | null;
  languages?: string | null;
  trade_economy?: string | null;
  travel_transport?: string | null;
  themes?: string | null;
  inspirations?: string | null;
  current_era_status?: string | null;
  notes?: string | null;
  // New world information fields
  canon_status?: string | null;
  timeline_era?: string | null;
  power_source?: string | null;
  central_conflicts?: string | null;
  world_rules_limitations?: string | null;
  oc_integration_notes?: string | null;
  // Section image URLs
  overview_image_url?: string | null;
  society_culture_image_url?: string | null;
  world_building_image_url?: string | null;
  economy_systems_image_url?: string | null;
  additional_info_image_url?: string | null;
  history_image_url?: string | null;
  // History field
  history?: string | null;
  template_type?: string | null; // Template type for this world (e.g., naruto, pokemon, dragonball, original)
  oc_templates?: Record<string, { fields: Array<{ key: string; label: string; type: 'text' | 'array' | 'number' }> }> | null;
  // World field system
  world_fields?: WorldFieldDefinitions | null;
  // World field values (for storing values entered in world fields)
  modular_fields?: WorldFieldValues | null;
  // Story aliases
  story_aliases?: StoryAlias[];
  // Story-specific world data
  story_data?: WorldStoryData[];
  // Races
  races?: WorldRace[];
}

export interface OC {
  // System fields
  id: string;
  name: string;
  slug: string;
  world_id: string;
  world_name?: string | null; // Denormalized world name for easier querying
  identity_id?: string | null;
  series_type?: SeriesType | null;
  template_type: TemplateType;
  status: OCStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  story_alias_id?: string | null;
  extra_fields: Record<string, any>;
  modular_fields?: WorldFieldValues | null;
  
  // Joined data
  world?: World;
  identity?: OCIdentity;
  story_alias?: StoryAlias | null;
  
  // Overview
  first_name?: string | null;
  last_name?: string | null;
  aliases?: string | null;
  species?: string | null;
  sex?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  occupation?: string | null;
  affiliations?: string | null;
  romantic_orientation?: string | null;
  sexual_orientation?: string | null;
  star_sign?: string | null;
  
  // Identity Background
  ethnicity?: string | null;
  place_of_origin?: string | null;
  current_residence?: string | null;
  languages?: string[] | null;
  
  // Personality Overview
  personality_summary?: string | null;
  alignment?: string | null;
  
  // Personality Metrics (1-10 scale)
  sociability?: number | null;
  communication_style?: number | null;
  judgment?: number | null;
  emotional_resilience?: number | null;
  courage?: number | null;
  risk_behavior?: number | null;
  honesty?: number | null;
  discipline?: number | null;
  temperament?: number | null;
  humor?: number | null;
  
  // Personality Traits
  positive_traits?: string | null;
  neutral_traits?: string | null;
  negative_traits?: string | null;
  
  // Abilities
  abilities?: string | null;
  skills?: string | null;
  aptitudes?: string | null;
  strengths?: string | null;
  limits?: string | null;
  conditions?: string | null;
  
  // Appearance
  standard_look?: string | null;
  alternate_looks?: string | null;
  accessories?: string | null;
  visual_motifs?: string | null;
  appearance_changes?: string | null;
  height?: string | null;
  weight?: string | null;
  build?: string | null;
  eye_color?: string | null;
  hair_color?: string | null;
  skin_tone?: string | null;
  features?: string | null;
  appearance_summary?: string | null;
  
  // Relationships
  family?: string | null;
  friends_allies?: string | null;
  rivals_enemies?: string | null;
  romantic?: string | null;
  other_relationships?: string | null;
  
  // History
  origin?: string | null;
  formative_years?: string | null;
  major_life_events?: string | null;
  history_summary?: string | null;
  
  // Preferences & Habits
  likes?: string | null;
  dislikes?: string | null;
  
  // Media
  gallery?: string[] | null;
  image_url?: string | null;
  icon_url?: string | null;
  seiyuu?: string | null;
  voice_actor?: string | null;
  theme_song?: string | null;
  inspirations?: string | null;
  design_notes?: string | null;
  name_meaning_etymology?: string | null;
  creator_notes?: string | null;
  
  // Trivia
  trivia?: string | null;
  
  // Development
  development_status?: string | null;
  
  // D&D-like Stats
  stat_strength?: number | null;
  stat_dexterity?: number | null;
  stat_constitution?: number | null;
  stat_intelligence?: number | null;
  stat_wisdom?: number | null;
  stat_charisma?: number | null;
  stat_hit_points_current?: number | null;
  stat_hit_points_max?: number | null;
  stat_armor_class?: number | null;
  stat_speed?: number | null;
  stat_level?: number | null;
  stat_class?: string | null;
  stat_notes?: string | null;
}

export interface Timeline {
  id: string;
  world_id: string;
  name: string;
  description_markdown?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  world?: World;
  events?: TimelineEvent[];
}

// Date data structures for flexible event dating
export type DateType = 'exact' | 'approximate' | 'range' | 'relative' | 'unknown';

export interface ExactDate {
  type: 'exact';
  year: number;
  month?: number;
  day?: number;
}

export interface ApproximateDate {
  type: 'approximate';
  year?: number;
  year_range?: [number, number];
  text: string; // e.g., "circa 500 BCE", "early 3rd century"
}

export interface DateRange {
  type: 'range';
  start: { year: number; month?: number; day?: number };
  end: { year: number; month?: number; day?: number };
  text?: string;
}

export interface RelativeDate {
  type: 'relative';
  text: string; // e.g., "Before the Great War", "After Character X's birth"
  reference_event_id?: string;
}

export interface UnknownDate {
  type: 'unknown';
  text?: string; // e.g., "Date unknown", "Time period unclear"
}

export type EventDateData = ExactDate | ApproximateDate | DateRange | RelativeDate | UnknownDate;

// Predefined event categories
export const PREDEFINED_EVENT_CATEGORIES = [
  'Death',
  'Birth',
  'War',
  'Battle',
  'Discovery',
  'Celebration',
  'Political',
  'Disaster',
  'Marriage',
  'Coronation',
  'Treaty',
  'Rebellion',
  'Founding',
  'Destruction',
  'Revelation',
  'Transformation',
] as const;

export type PredefinedEventCategory = typeof PREDEFINED_EVENT_CATEGORIES[number];

export interface TimelineEvent {
  id: string;
  world_id: string; // Required
  timeline_id?: string | null; // Optional, for backward compatibility during migration
  title: string;
  description?: string | null; // Summary
  description_markdown?: string | null; // Full markdown content (renamed from body_markdown)
  date_data?: EventDateData | null; // JSONB flexible date
  date_text?: string | null; // Legacy/display fallback
  year?: number | null; // For sorting/compatibility
  month?: number | null;
  day?: number | null;
  categories: string[]; // Array of category tags
  is_key_event?: boolean | null;
  location?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  world?: World;
  characters?: TimelineEventCharacter[];
  timelines?: Timeline[]; // Timelines this event appears in
  // Story alias
  story_alias_id?: string | null;
  story_alias?: StoryAlias | null;
}

export interface TimelineEventTimeline {
  id: string;
  timeline_id: string;
  timeline_event_id: string;
  position: number;
  created_at: string;
  // Joined data
  timeline?: Timeline;
  event?: TimelineEvent;
}

export interface TimelineEventCharacter {
  id: string;
  timeline_event_id: string;
  oc_id: string;
  role?: string | null;
  created_at: string;
  // Joined data
  oc?: OC;
}

// World Lore System Types
export type LoreType = string; // Allow any string value for custom lore types

export interface WorldLore {
  id: string;
  name: string;
  slug: string;
  world_id: string;
  lore_type: LoreType;
  description?: string | null;
  description_markdown?: string | null;
  image_url?: string | null;
  icon_url?: string | null;
  banner_image_url?: string | null;
  world_fields?: WorldFieldDefinitions | null;
  modular_fields?: WorldFieldValues | null;
  created_at: string;
  updated_at: string;
  // Joined data
  world?: World;
  related_ocs?: WorldLoreOC[];
  related_events?: WorldLoreTimelineEvent[];
  // Story alias
  story_alias_id?: string | null;
  story_alias?: StoryAlias | null;
}

export interface WorldLoreOC {
  id: string;
  world_lore_id: string;
  oc_id: string;
  role?: string | null;
  created_at: string;
  // Joined data
  world_lore?: WorldLore;
  oc?: OC;
}

export interface WorldLoreTimelineEvent {
  id: string;
  world_lore_id: string;
  timeline_event_id: string;
  created_at: string;
  // Joined data
  world_lore?: WorldLore;
  event?: TimelineEvent;
}