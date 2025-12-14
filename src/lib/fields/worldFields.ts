import type {
  World,
  OC,
  WorldLore,
  WorldFieldDefinition,
  FieldSet,
  WorldFieldDefinitions,
  WorldFieldValues,
} from '@/types/oc';
import type { TemplateField } from '@/lib/templates/ocTemplates';

/**
 * Gets all field definitions from a world's field sets
 * Optionally filters by template_key - if provided, only returns field sets for that template or universal ones
 */
export function getWorldFieldDefinitions(
  world: World | null | undefined,
  templateKey?: string | null
): WorldFieldDefinition[] {
  if (!world?.world_fields?.field_sets) {
    return [];
  }

  // Filter field sets by template if templateKey is provided
  const filteredSets = templateKey
    ? world.world_fields.field_sets.filter(
        (set) => !set.template_key || set.template_key === templateKey
      )
    : world.world_fields.field_sets;

  return filteredSets.flatMap((set) => set.fields);
}

/**
 * Gets all field definitions from an OC's field sets (OC-specific add-ons)
 */
export function getOCFieldDefinitions(oc: OC | null | undefined): WorldFieldDefinition[] {
  // For now, OCs don't have their own field definitions stored separately
  // They inherit from world. This can be extended later if needed.
  return [];
}

/**
 * Gets all field definitions from a world lore entry's field sets
 */
export function getWorldLoreFieldDefinitions(
  lore: WorldLore | null | undefined
): WorldFieldDefinition[] {
  if (!lore?.world_fields?.field_sets) {
    return [];
  }

  return lore.world_fields.field_sets.flatMap((set: FieldSet) => set.fields);
}

/**
 * Converts template fields from oc_templates to WorldFieldDefinition format
 * Preserves category information for proper section placement
 */
function convertTemplateFieldsToWorldFields(
  templateFields: TemplateField[]
): WorldFieldDefinition[] {
  return templateFields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    description: field.category, // Store category directly for section mapping
    required: false,
    defaultValue: undefined,
  }));
}

/**
 * Gets template field definitions from world's oc_templates
 */
function getTemplateFieldDefinitions(
  world: World | null | undefined,
  templateKey: string | null
): WorldFieldDefinition[] {
  if (!world?.oc_templates || !templateKey) {
    return [];
  }

  const templates = world.oc_templates as Record<string, { name?: string; fields?: TemplateField[] }>;
  const template = templates[templateKey];

  if (!template?.fields || !Array.isArray(template.fields)) {
    return [];
  }

  return convertTemplateFieldsToWorldFields(template.fields);
}

/**
 * Gets effective field definitions for an OC (world + OC-specific + template fields)
 * This merges all field definitions that should be available for an OC
 * Filters world fields by the OC's template_type if available
 * Also includes template fields from world's oc_templates
 */
export function getEffectiveFieldDefinitions(
  world: World | null | undefined,
  oc?: OC | null | undefined
): WorldFieldDefinition[] {
  // Get template key from OC if available
  const templateKey = oc?.template_type || null;
  const worldFields = getWorldFieldDefinitions(world, templateKey);
  const ocFields = getOCFieldDefinitions(oc);
  const templateFields = getTemplateFieldDefinitions(world, templateKey);

  // Merge field definitions, with OC fields taking precedence for same keys
  const fieldMap = new Map<string, WorldFieldDefinition>();

  // Add world fields first (already filtered by template)
  worldFields.forEach((field) => {
    fieldMap.set(field.key, field);
  });

  // Add template fields from oc_templates (these override world fields if same key)
  templateFields.forEach((field) => {
    fieldMap.set(field.key, field);
  });

  // Override with OC-specific fields if any (highest precedence)
  ocFields.forEach((field) => {
    fieldMap.set(field.key, field);
  });

  return Array.from(fieldMap.values());
}

/**
 * Gets a field value from modular_fields with fallback to default
 */
export function getFieldValue(
  fieldDef: WorldFieldDefinition,
  modularFields: WorldFieldValues | null | undefined
): string | number | string[] | null {
  if (!modularFields) {
    return fieldDef.defaultValue ?? getDefaultValueForType(fieldDef.type);
  }

  const value = modularFields[fieldDef.key];
  if (value !== undefined && value !== null) {
    return value;
  }

  return fieldDef.defaultValue ?? getDefaultValueForType(fieldDef.type);
}

/**
 * Gets default value for a field type
 */
function getDefaultValueForType(type: 'text' | 'array' | 'number'): string | number | string[] | null {
  switch (type) {
    case 'text':
      return '';
    case 'array':
      return [];
    case 'number':
      return 0;
    default:
      return null;
  }
}

/**
 * Validates a field value against its definition
 */
export function validateFieldValue(
  value: unknown,
  fieldDef: WorldFieldDefinition
): { valid: boolean; error?: string } {
  if (fieldDef.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${fieldDef.label} is required` };
  }

  switch (fieldDef.type) {
    case 'text':
      if (typeof value !== 'string' && value !== null && value !== undefined) {
        return { valid: false, error: `${fieldDef.label} must be text` };
      }
      break;
    case 'number':
      if (typeof value !== 'number' && value !== null && value !== undefined) {
        return { valid: false, error: `${fieldDef.label} must be a number` };
      }
      break;
    case 'array':
      if (!Array.isArray(value) && value !== null && value !== undefined) {
        return { valid: false, error: `${fieldDef.label} must be an array` };
      }
      break;
  }

  return { valid: true };
}

/**
 * Merges world and OC field values
 * OC values take precedence over world values
 */
export function mergeFieldValues(
  worldFields: WorldFieldValues | null | undefined,
  ocFields: WorldFieldValues | null | undefined
): WorldFieldValues {
  const merged: WorldFieldValues = {};

  // Add world fields first
  if (worldFields) {
    Object.assign(merged, worldFields);
  }

  // Override with OC fields
  if (ocFields) {
    Object.assign(merged, ocFields);
  }

  return merged;
}

/**
 * Gets all field values for an OC (merged from world and OC)
 */
export function getOCFieldValues(world: World | null | undefined, oc: OC | null | undefined): WorldFieldValues {
  return mergeFieldValues(world?.modular_fields ?? null, oc?.modular_fields ?? null);
}

/**
 * Checks if a field key conflicts with base OC fields
 */
export function isBaseFieldKey(key: string): boolean {
  const baseFields = [
    'id',
    'name',
    'slug',
    'world_id',
    'series_type',
    'template_type',
    'age',
    'pronouns',
    'gender_identity',
    'status',
    'image_url',
    'icon_url',
    'tags',
    'short_bio',
    'full_bio_markdown',
    'extra_fields',
    'is_public',
    'created_at',
    'updated_at',
    'last_name',
    'first_name',
    'alias',
    'date_of_birth',
    'occupation',
    'gender',
    'sex',
    'romantic',
    'sexual',
    'relationship_type',
    'nationality',
    'ethnicity_race',
    'species',
    'height',
    'weight',
    'eye_color',
    'hair_color',
    'skin_tone',
    'build',
    'notes',
    'hometown',
    'current_home',
    'languages',
    'maternal_parent',
    'paternal_parent',
    'ship',
    'relationships',
    'star_sign',
    'likes',
    'dislikes',
    'voice_actor',
    'seiyuu',
    'theme_song',
    'worlds',
    'personality',
    'positive_traits',
    'neutral_traits',
    'negative_traits',
    'mbti',
    'history',
    'trivia',
    'modular_fields',
  ];

  return baseFields.includes(key);
}

/**
 * Checks if a field key conflicts with base World fields
 */
export function isBaseWorldFieldKey(key: string): boolean {
  const baseFields = [
    'id',
    'name',
    'slug',
    'series_type',
    'summary',
    'description_markdown',
    'primary_color',
    'accent_color',
    'header_image_url',
    'icon_url',
    'is_public',
    'created_at',
    'updated_at',
    'genre',
    'setting',
    'lore',
    'the_world_society',
    'culture',
    'politics',
    'technology',
    'environment',
    'races_species',
    'power_systems',
    'religion',
    'government',
    'important_factions',
    'notable_figures',
    'languages',
    'trade_economy',
    'travel_transport',
    'themes',
    'inspirations',
    'current_era_status',
    'notes',
    'canon_status',
    'timeline_era',
    'power_source',
    'central_conflicts',
    'world_rules_limitations',
    'oc_integration_notes',
    'template_customizations',
    'field_definitions',
    'modular_fields',
  ];

  return baseFields.includes(key);
}

/**
 * Validates a field key (must be valid identifier, not conflict with base fields)
 */
export function validateFieldKey(
  key: string,
  isWorld: boolean = false
): { valid: boolean; error?: string } {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'Field key is required' };
  }

  // Must be a valid identifier (alphanumeric, underscore, hyphen)
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) {
    return {
      valid: false,
      error: 'Field key must start with a letter and contain only letters, numbers, underscores, and hyphens',
    };
  }

  // Check for conflicts with base fields
  if (isWorld) {
    if (isBaseWorldFieldKey(key)) {
      return { valid: false, error: `Field key "${key}" conflicts with a base world field` };
    }
  } else {
    if (isBaseFieldKey(key)) {
      return { valid: false, error: `Field key "${key}" conflicts with a base OC field` };
    }
  }

  return { valid: true };
}

