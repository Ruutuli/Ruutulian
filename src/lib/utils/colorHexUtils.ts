// Utility functions for color hex codes
// These functions use the database/JSON as the source of truth

import { csvOptions, colorHexCodes } from './csvOptionsData';

// Try to import colorHexCodes with fallback
let hexCodesMap: Record<string, Record<string, string>> = {};
try {
  const module = require('./csvOptionsData');
  hexCodesMap = module.colorHexCodes || {};
} catch {
  hexCodesMap = {};
}

/**
 * Get hex color for a color name from database/JSON
 * Returns the hex value if found, or null if not found
 */
export function getColorHex(field: string, colorName: string): string | null {
  return hexCodesMap[field]?.[colorName] || null;
}

/**
 * Check if a color name exists in the mapping
 */
export function hasColorHex(field: string, colorName: string): boolean {
  return field in hexCodesMap && colorName in hexCodesMap[field];
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











