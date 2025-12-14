import type { TemplateDefinition } from './ocTemplates';
import { createClient } from '@/lib/supabase/server';
import { defaultFallbackTemplate } from './defaultTemplates';

/**
 * Fetch all templates from worlds.oc_templates (server-only)
 * Aggregates templates from all worlds' oc_templates fields.
 * Templates are stored per-world in the oc_templates JSONB field.
 */
export async function fetchTemplates(): Promise<Record<string, TemplateDefinition>> {
  try {
    const supabase = await createClient();
    
    // Fetch all worlds with their oc_templates
    const { data: worlds, error } = await supabase
      .from('worlds')
      .select('oc_templates')
      .not('oc_templates', 'is', null);

    if (error) {
      console.error('Error fetching templates from worlds:', error);
      return { none: defaultFallbackTemplate };
    }

    if (!worlds || worlds.length === 0) {
      return { none: defaultFallbackTemplate };
    }

    // Aggregate templates from all worlds
    // If multiple worlds define the same template key, the last one wins
    const templates: Record<string, TemplateDefinition> = {};
    
    for (const world of worlds) {
      if (world.oc_templates && typeof world.oc_templates === 'object') {
        const worldTemplates = world.oc_templates as Record<string, { name?: string; fields?: any[] }>;
        
        for (const [key, template] of Object.entries(worldTemplates)) {
          if (template && template.fields && Array.isArray(template.fields)) {
            templates[key] = {
              name: template.name || key,
              fields: template.fields,
            };
          }
        }
      }
    }

    // Ensure 'none' template exists as fallback
    if (!templates.none) {
      templates.none = defaultFallbackTemplate;
    }

    return templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { none: defaultFallbackTemplate };
  }
}

/**
 * Fetch templates for a specific world (server-only)
 * Returns templates from the world's oc_templates field.
 */
export async function fetchTemplatesForWorld(worldId: string): Promise<Record<string, TemplateDefinition>> {
  try {
    const supabase = await createClient();
    
    const { data: world, error } = await supabase
      .from('worlds')
      .select('oc_templates')
      .eq('id', worldId)
      .single();

    if (error || !world) {
      console.error('Error fetching world templates:', error);
      return { none: defaultFallbackTemplate };
    }

    if (!world.oc_templates || typeof world.oc_templates !== 'object') {
      return { none: defaultFallbackTemplate };
    }

    const templates: Record<string, TemplateDefinition> = {};
    const worldTemplates = world.oc_templates as Record<string, { name?: string; fields?: any[] }>;
    
    for (const [key, template] of Object.entries(worldTemplates)) {
      if (template && template.fields && Array.isArray(template.fields)) {
        templates[key] = {
          name: template.name || key,
          fields: template.fields,
        };
      }
    }

    // Ensure 'none' template exists as fallback
    if (!templates.none) {
      templates.none = defaultFallbackTemplate;
    }

    return templates;
  } catch (error) {
    console.error('Error fetching world templates:', error);
    return { none: defaultFallbackTemplate };
  }
}

/**
 * Clear the templates cache (no-op now, kept for API compatibility)
 * @deprecated Templates are now fetched from database, no cache to clear
 */
export function clearTemplatesCache() {
  // No-op: templates are now fetched from database
}

/**
 * Fetch a single template by key (server-only)
 */
export async function fetchTemplate(key: string): Promise<TemplateDefinition> {
  const templates = await fetchTemplates();
  return templates[key] || defaultFallbackTemplate;
}

/**
 * Get template types (server-only, for backward compatibility)
 */
export async function getTemplateTypes(): Promise<string[]> {
  const templates = await fetchTemplates();
  return Object.keys(templates);
}

