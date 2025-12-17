export type TemplateField = {
  key: string;
  label: string;
  type: 'text' | 'array' | 'number';
  max?: number; // Optional max limit for array fields
  category?: string; // Optional category for sorting/grouping fields
  options?: string; // Field key in dropdown_options table for autocomplete (e.g., "accent", "ethnicity_race", "species")
  multiline?: boolean; // If true, renders a textarea instead of a single-line input for text fields
};

export type TemplateDefinition = {
  name: string;
  fields: TemplateField[];
};

// Database template record type
export type TemplateRecord = {
  id: string;
  key: string;
  name: string;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
};

// Default fallback template (minimal, only used as last resort)
const defaultTemplate: TemplateDefinition = {
  name: 'None',
  fields: [],
};

/**
 * Get templates (for client-side use, requires API route)
 * This is the only function that should be used in client components.
 * For server components, use fetchTemplates from ocTemplates.server.ts
 */
export async function getTemplates(): Promise<Record<string, TemplateDefinition>> {
  try {
    const response = await fetch('/api/admin/templates', {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    const data = await response.json();
    return data.templates || { none: defaultTemplate };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { none: defaultTemplate };
  }
}
