/**
 * Field mapping: form field name -> optionsSource field name
 * This maps the form field names to the dropdown_options table field names
 */
export const FIELD_TO_OPTIONS_SOURCE: Record<string, string> = {
  // OC Form fields
  pronouns: 'pronouns',
  gender: 'gender_identity',
  occupation: 'occupation',
  sex: 'sex',
  species: 'species',
  romantic_orientation: 'romantic',
  sexual_orientation: 'sexual',
  ethnicity: 'ethnicity_race',
  eye_color: 'eye_color',
  hair_color: 'hair_color',
  skin_tone: 'skin_tone',
  positive_traits: 'positive_traits',
  neutral_traits: 'neutral_traits',
  negative_traits: 'negative_traits',
  // Template fields use field.options directly (handled separately)
  // World custom fields use fieldDef.options (handled separately)
};

/**
 * Fields that store hex codes along with the option value
 * Format: "Color Name|#hex" or just "Color Name"
 */
const COLOR_FIELDS = ['eye_color', 'hair_color', 'skin_tone'];

/**
 * Fields that are multi-select (comma-separated values)
 */
const MULTI_SELECT_FIELDS = ['positive_traits', 'neutral_traits', 'negative_traits'];

/**
 * Extract color name from a color field value
 * Handles formats: "Color Name|#hex", "#hex Color Name", or just "Color Name"
 */
function extractColorName(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  // Format: "Color Name|#hex"
  if (value.includes('|')) {
    const [colorName] = value.split('|');
    return colorName.trim();
  }
  
  // Format: "#hex Color Name"
  const hexAtStartMatch = value.match(/^(#[0-9A-Fa-f]{6})\s+(.+)$/i);
  if (hexAtStartMatch) {
    return hexAtStartMatch[2].trim();
  }
  
  // Just a hex color
  if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
    return '';
  }
  
  return value.trim();
}

/**
 * Extract hex code from a color field value
 */
function extractHexCode(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  // Format: "Color Name|#hex"
  if (value.includes('|')) {
    const [, hex] = value.split('|');
    const trimmedHex = hex?.trim();
    if (trimmedHex && /^#[0-9A-Fa-f]{6}$/i.test(trimmedHex)) {
      return trimmedHex;
    }
  }
  
  // Format: "#hex Color Name"
  const hexAtStartMatch = value.match(/^(#[0-9A-Fa-f]{6})\s+(.+)$/i);
  if (hexAtStartMatch) {
    return hexAtStartMatch[1];
  }
  
  // Just a hex color
  if (/^#[0-9A-Fa-f]{6}$/i.test(value)) {
    return value;
  }
  
  return null;
}

/**
 * Check if a value exists in the options (case-insensitive)
 */
function valueExistsInOptions(value: string, options: string[]): boolean {
  if (!value || !options || options.length === 0) return false;
  const normalizedValue = value.trim().toLowerCase();
  return options.some(opt => opt.trim().toLowerCase() === normalizedValue);
}

/**
 * Create a single option in the database
 */
async function createOption(
  field: string,
  option: string,
  hexCode?: string | null
): Promise<{ success: boolean; created: boolean; option: string }> {
  try {
    const response = await fetch(`/api/admin/dropdown-options/${field}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        option,
        hex_code: hexCode || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to create option');
    }

    const data = await response.json();
    return {
      success: true,
      created: data.created || false,
      option: data.option || option,
    };
  } catch (error) {
    console.error(`[autoCreateOptions] Failed to create option "${option}" for field "${field}":`, error);
    return {
      success: false,
      created: false,
      option,
    };
  }

}

/**
 * Auto-create dropdown options for form fields that use optionsSource
 * 
 * @param formData - The form data object
 * @param fieldMappings - Optional additional field mappings (form field -> optionsSource)
 * @param existingOptions - Optional map of optionsSource -> options array (to avoid fetching)
 * @returns Array of created options for logging
 */
export async function autoCreateOptions(
  formData: Record<string, any>,
  fieldMappings?: Record<string, string>,
  existingOptions?: Record<string, string[]>
): Promise<Array<{ field: string; option: string; created: boolean }>> {
  const created: Array<{ field: string; option: string; created: boolean }> = [];
  
  // Merge default mappings with custom mappings
  const allMappings = { ...FIELD_TO_OPTIONS_SOURCE, ...(fieldMappings || {}) };
  
  // Process each field that has an optionsSource mapping
  for (const [formField, optionsSource] of Object.entries(allMappings)) {
    const value = formData[formField];
    
    // Skip if value is empty, null, or undefined
    if (!value || (typeof value === 'string' && !value.trim())) {
      continue;
    }
    
    // Get existing options (either from cache or fetch)
    let options: string[] = [];
    if (existingOptions && existingOptions[optionsSource]) {
      options = existingOptions[optionsSource];
    } else {
      // Fetch options from API
      try {
        const response = await fetch('/api/admin/dropdown-options');
        if (response.ok) {
          const data = await response.json();
          options = data.options?.[optionsSource] || [];
        }
      } catch (error) {
        console.warn(`[autoCreateOptions] Failed to fetch options for ${optionsSource}:`, error);
        // Continue without options - will create anyway if needed
      }
    }
    
    // Handle multi-select fields (comma-separated)
    if (MULTI_SELECT_FIELDS.includes(formField)) {
      const values = typeof value === 'string' 
        ? value.split(',').map(v => v.trim()).filter(Boolean)
        : Array.isArray(value) 
          ? value.map(v => String(v).trim()).filter(Boolean)
          : [];
      
      for (const val of values) {
        if (!valueExistsInOptions(val, options)) {
          const result = await createOption(optionsSource, val);
          created.push({
            field: optionsSource,
            option: result.option,
            created: result.created,
          });
        }
      }
      continue;
    }
    
    // Handle color fields (may have hex codes)
    if (COLOR_FIELDS.includes(formField)) {
      const colorName = extractColorName(value);
      const hexCode = extractHexCode(value);
      
      if (colorName && !valueExistsInOptions(colorName, options)) {
        const result = await createOption(optionsSource, colorName, hexCode);
        created.push({
          field: optionsSource,
          option: result.option,
          created: result.created,
        });
      }
      continue;
    }
    
    // Handle regular single-select fields
    const stringValue = String(value).trim();
    if (stringValue && !valueExistsInOptions(stringValue, options)) {
      const result = await createOption(optionsSource, stringValue);
      created.push({
        field: optionsSource,
        option: result.option,
        created: result.created,
      });
    }
  }
  
  return created;
}

/**
 * Auto-create options for template fields (from oc_templates)
 * These fields are stored in modular_fields and have their optionsSource in the field definition
 */
export async function autoCreateTemplateOptions(
  modularFields: Record<string, any>,
  templateFields: Array<{ key: string; options?: string }>
): Promise<Array<{ field: string; option: string; created: boolean }>> {
  const created: Array<{ field: string; option: string; created: boolean }> = [];
  
  if (!modularFields || !templateFields) {
    return created;
  }
  
  for (const templateField of templateFields) {
    if (!templateField.options) continue;
    
    const value = modularFields[templateField.key];
    if (!value || (typeof value === 'string' && !value.trim())) {
      continue;
    }
    
    const optionsSource = templateField.options;
    
    // Fetch existing options
    let options: string[] = [];
    try {
      const response = await fetch('/api/admin/dropdown-options');
      if (response.ok) {
        const data = await response.json();
        options = data.options?.[optionsSource] || [];
      }
    } catch (error) {
      console.warn(`[autoCreateOptions] Failed to fetch options for ${optionsSource}:`, error);
    }
    
    const stringValue = String(value).trim();
    if (stringValue && !valueExistsInOptions(stringValue, options)) {
      const result = await createOption(optionsSource, stringValue);
      created.push({
        field: optionsSource,
        option: result.option,
        created: result.created,
      });
    }
  }
  
  return created;
}

/**
 * Auto-create options for world custom fields
 * These fields are stored in modular_fields and have their optionsSource in the field definition
 */
export async function autoCreateWorldFieldOptions(
  modularFields: Record<string, any>,
  worldFieldDefinitions: Array<{ key: string; options?: string }>
): Promise<Array<{ field: string; option: string; created: boolean }>> {
  const created: Array<{ field: string; option: string; created: boolean }> = [];
  
  if (!modularFields || !worldFieldDefinitions) {
    return created;
  }
  
  for (const fieldDef of worldFieldDefinitions) {
    if (!fieldDef.options) continue;
    
    const value = modularFields[fieldDef.key];
    if (!value || (typeof value === 'string' && !value.trim())) {
      continue;
    }
    
    const optionsSource = fieldDef.options;
    
    // Fetch existing options
    let options: string[] = [];
    try {
      const response = await fetch('/api/admin/dropdown-options');
      if (response.ok) {
        const data = await response.json();
        options = data.options?.[optionsSource] || [];
      }
    } catch (error) {
      console.warn(`[autoCreateOptions] Failed to fetch options for ${optionsSource}:`, error);
    }
    
    const stringValue = String(value).trim();
    if (stringValue && !valueExistsInOptions(stringValue, options)) {
      const result = await createOption(optionsSource, stringValue);
      created.push({
        field: optionsSource,
        option: result.option,
        created: result.created,
      });
    }
  }
  
  return created;
}

