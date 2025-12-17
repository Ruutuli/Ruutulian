import type { World, SeriesType } from '@/types/oc';

// Map world slugs to template types (only for canon worlds with specific templates)
// This is a fallback for canon worlds - original worlds are handled automatically
const CANON_TEMPLATE_MAP: Record<string, string> = {
  'naruto': 'naruto',
  'final-fantasy-vii': 'ff7',
  'inuyasha': 'inuyasha',
  'shaman-king': 'shaman-king',
  'zelda': 'zelda',
  'dragon-ball-z': 'dragonball',
  'dragonball': 'dragonball', // Handle alternative slug format
  'dragon-ball': 'dragonball', // Handle alternative slug format
  'pokemon': 'pokemon',
  'nier': 'nier',
  'none': 'none',
  'not-accessible': 'none',
};

/**
 * Determine template type from world slug and optionally world data
 * 
 * Priority:
 * 1. If world data provided and series_type is 'original', return 'original'
 * 2. If World has oc_templates with a template keyed by world slug, infer template type
 * 3. Use hardcoded map for known canon worlds
 * 4. Default to 'none'
 */
export function getTemplateTypeFromWorldSlug(
  slug: string, 
  world?: World | Partial<World> | { series_type?: SeriesType; oc_templates?: World['oc_templates'] } | null
): string {
  const slugLower = slug.toLowerCase();

  // If we have world data and it's an original world, always use 'original'
  if (world?.series_type === 'original') {
    return 'original';
  }

  // If world has oc_templates, check if there's a template keyed by the world slug
  // This allows worlds to have custom templates that use their slug as the template type
  if (world?.oc_templates && typeof world.oc_templates === 'object') {
    const worldTemplates = world.oc_templates;
    
    // Check if there's a template using the world slug as the key
    if (worldTemplates[slugLower]) {
      // If the world has a custom template with its slug, we could use the slug as template type
      // But for now, if it's an original world we already handled it above
      // For canon worlds with custom templates, fall through to the map
    }
  }

  // Use hardcoded map for known canon worlds
  if (CANON_TEMPLATE_MAP[slugLower]) {
    return CANON_TEMPLATE_MAP[slugLower];
  }

  // Default to 'none' for unknown worlds
  // Note: In practice, if this is an original world without world data passed,
  // you'll need to add it to a mapping or ensure World object is passed
  return 'none';
}
