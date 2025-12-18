import { UseFormSetValue, UseFormWatch } from 'react-hook-form';

/**
 * Generic hook for managing arrays of related items in forms.
 * Provides add, remove, and update functions that work with react-hook-form.
 * 
 * @param fieldName - The form field name (e.g., 'related_ocs', 'characters')
 * @param watch - The watch function from react-hook-form
 * @param setValue - The setValue function from react-hook-form
 * @param defaultItem - Function that returns a default item to add (or a default item object)
 * @returns Object with items array and management functions
 */
export function useRelatedItems<T extends Record<string, any>>(
  fieldName: string,
  watch: UseFormWatch<any>,
  setValue: UseFormSetValue<any>,
  defaultItem: (() => T) | T
) {
  const items = (watch(fieldName) || []) as T[];

  const addItem = () => {
    const newItem = typeof defaultItem === 'function' ? defaultItem() : defaultItem;
    setValue(fieldName, [...items, newItem]);
  };

  const removeItem = (index: number) => {
    setValue(fieldName, items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<T>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    setValue(fieldName, updated);
  };

  const updateItemField = <K extends keyof T>(index: number, field: K, value: T[K]) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setValue(fieldName, updated);
  };

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    updateItemField,
  };
}

