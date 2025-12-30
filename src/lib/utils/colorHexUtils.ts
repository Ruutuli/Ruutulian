// Utility functions for color hex codes
// These functions work with hex codes passed from the database via useDropdownOptions hook
// The hexCodes should be provided from the hook's hexCodes property

/**
 * Get hex color for a color name from provided hexCodes map
 * Returns the hex value if found, or null if not found
 * 
 * @param hexCodes - Hex codes map from useDropdownOptions hook (field -> option -> hex_code)
 * @param field - The field name (e.g., 'eye_color', 'hair_color')
 * @param colorName - The color name to look up
 */
export function getColorHex(hexCodes: Record<string, string>, field: string, colorName: string): string | null {
  return hexCodes[colorName] || null;
}

/**
 * Check if a color name exists in the hexCodes mapping
 * 
 * @param hexCodes - Hex codes map from useDropdownOptions hook
 * @param field - The field name (e.g., 'eye_color', 'hair_color')
 * @param colorName - The color name to check
 */
export function hasColorHex(hexCodes: Record<string, string>, field: string, colorName: string): boolean {
  return colorName in hexCodes;
}

/**
 * Extract color name from stored value (removes hex codes)
 * Handles multiple formats:
 * - "#hex Color Name" -> "Color Name"
 * - "Color Name|#hex" -> "Color Name"
 * - "Color Name #hex" -> "Color Name"
 * - "Color Name" -> "Color Name" (unchanged)
 */
export function extractColorName(storedValue: string | null | undefined): string {
  if (!storedValue) return '';
  return extractColorNameOnly(storedValue);
}

/**
 * Extract hex from stored value
 * Handles multiple formats:
 * - "#hex Color Name" (hex at beginning)
 * - "Color Name|#hex" (hex after pipe)
 * - "Color Name #hex" (hex at end)
 * Returns hex if found, or null
 */
export function extractColorHex(storedValue: string | null | undefined): string | null {
  if (!storedValue) return null;
  
  // Try format: "#hex Color Name" (hex at beginning)
  const hexAtStartMatch = storedValue.match(/^(#[0-9A-Fa-f]{6})\s+/);
  if (hexAtStartMatch) {
    return hexAtStartMatch[1];
  }
  
  // Try format: "Color Name|#hex" (hex after pipe)
  if (storedValue.includes('|')) {
    const parts = storedValue.split('|');
    const hex = parts[parts.length - 1].trim();
    if (hex && hex.startsWith('#')) {
      return hex;
    }
  }
  
  // Try format: "Color Name #hex" (hex at end)
  const hexAtEndMatch = storedValue.match(/\s+(#[0-9A-Fa-f]{6})$/);
  if (hexAtEndMatch) {
    return hexAtEndMatch[1];
  }
  
  return null;
}

/**
 * Extract color name from stored value (removes hex codes)
 * Handles multiple formats and removes hex codes
 */
export function extractColorNameOnly(storedValue: string | null | undefined): string {
  if (!storedValue) return '';
  
  let colorName = storedValue;
  
  // Remove hex at beginning: "#hex Color Name" -> "Color Name"
  colorName = colorName.replace(/^#[0-9A-Fa-f]{6}\s+/, '');
  
  // Remove hex after pipe: "Color Name|#hex" -> "Color Name"
  if (colorName.includes('|')) {
    colorName = colorName.split('|')[0].trim();
  }
  
  // Remove hex at end: "Color Name #hex" -> "Color Name"
  colorName = colorName.replace(/\s+#[0-9A-Fa-f]{6}$/, '');
  
  return colorName.trim();
}













