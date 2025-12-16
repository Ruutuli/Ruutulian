/**
 * Dropdown Options Utility
 * 
 * Utility functions for managing dropdown options across the application.
 * This file provides helper functions for working with dropdown option data.
 */

import { csvOptions } from './csvOptionsData';

export type DropdownField = keyof typeof csvOptions;

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Get all available dropdown fields
 */
export function getDropdownFields(): DropdownField[] {
  return Object.keys(csvOptions) as DropdownField[];
}

/**
 * Get options for a specific dropdown field
 */
export function getDropdownOptions(field: DropdownField): string[] {
  return csvOptions[field] || [];
}

/**
 * Check if a value exists in a dropdown field's options
 */
export function isValidDropdownOption(field: DropdownField, value: string): boolean {
  const options = getDropdownOptions(field);
  return options.includes(value);
}

/**
 * Get options as an array of {value, label} objects
 * Useful for select components that need both value and label
 */
export function getDropdownOptionsAsObjects(field: DropdownField): DropdownOption[] {
  const options = getDropdownOptions(field);
  return options.map(value => ({
    value,
    label: value,
  }));
}

/**
 * Add a new option to a dropdown field (does not persist, returns new array)
 */
export function addDropdownOption(
  field: DropdownField,
  newOption: string,
  currentOptions?: string[]
): string[] {
  const options = currentOptions || getDropdownOptions(field);
  const trimmed = newOption.trim();
  
  if (!trimmed || options.includes(trimmed)) {
    return options;
  }
  
  return [...options, trimmed].sort();
}

/**
 * Remove an option from a dropdown field (does not persist, returns new array)
 */
export function removeDropdownOption(
  field: DropdownField,
  optionToRemove: string,
  currentOptions?: string[]
): string[] {
  const options = currentOptions || getDropdownOptions(field);
  return options.filter(opt => opt !== optionToRemove);
}

/**
 * Get field label/display name
 */
export function getFieldLabel(field: DropdownField): string {
  const labels: Record<string, string> = {
    pronouns: 'Pronouns',
    gender_identity: 'Gender Identity',
    romantic: 'Romantic Orientation',
    sexual: 'Sexual Orientation',
    relationship_type: 'Relationship Type',
    sex: 'Sex',
    accent: 'Accent',
    nationality: 'Nationality',
    ethnicity_race: 'Ethnicity/Race',
    species: 'Species',
    skin_tone: 'Skin Tone',
    occupation: 'Occupation',
    mbti: 'MBTI',
    moral: 'Moral Alignment',
    positive_traits: 'Positive Traits',
    neutral_traits: 'Neutral Traits',
    negative_traits: 'Negative Traits',
    eye_color: 'Eye Color',
    hair_color: 'Hair Color',
  };
  
  return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Search options across all fields or within a specific field
 */
export function searchDropdownOptions(
  query: string,
  field?: DropdownField
): Array<{ field: DropdownField; options: string[] }> {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return [];
  
  const fieldsToSearch = field ? [field] : getDropdownFields();
  const results: Array<{ field: DropdownField; options: string[] }> = [];
  
  fieldsToSearch.forEach(f => {
    const options = getDropdownOptions(f);
    const matching = options.filter(opt => 
      opt.toLowerCase().includes(searchTerm)
    );
    
    if (matching.length > 0) {
      results.push({ field: f, options: matching });
    }
  });
  
  return results;
}

/**
 * Get statistics about dropdown options
 */
export function getDropdownOptionsStats(): {
  totalFields: number;
  totalOptions: number;
  fieldsWithOptions: Array<{ field: DropdownField; count: number; label: string }>;
} {
  const fields = getDropdownFields();
  const fieldsWithOptions = fields.map(field => ({
    field,
    count: getDropdownOptions(field).length,
    label: getFieldLabel(field),
  }));
  
  const totalOptions = fieldsWithOptions.reduce((sum, item) => sum + item.count, 0);
  
  return {
    totalFields: fields.length,
    totalOptions,
    fieldsWithOptions: fieldsWithOptions.sort((a, b) => b.count - a.count),
  };
}

