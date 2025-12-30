'use client';

import { useState, useEffect } from 'react';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormButton } from './forms/FormButton';

export interface EraDefinition {
  name: string;
  label?: string; // Optional label like "Past Era", "Current Era", "Future Era"
}

interface EraSystemManagerProps {
  value?: string; // Comma-separated eras or JSON array
  onChange: (value: string) => void; // Returns comma-separated string
  disabled?: boolean;
}

/**
 * Parse era string (comma-separated or JSON) into EraDefinition array
 */
function parseEras(value: string | undefined | null): EraDefinition[] {
  // Handle null, undefined, or empty values
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  
  const trimmedValue = value.trim();
  
  // Check if it looks like JSON (starts with [ or {)
  if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmedValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') {
            return { name: item.trim() };
          }
          if (item && typeof item === 'object') {
            return { 
              name: item.name?.trim() || '', 
              label: item.label?.trim() || undefined 
            };
          }
          return null;
        }).filter((e): e is EraDefinition => e !== null && e.name !== '');
      }
    } catch {
      // Not valid JSON, fall through to comma-separated parsing
    }
  }
  
  // Parse as comma-separated string
  return trimmedValue
    .split(',')
    .map(era => era.trim())
    .filter(era => era)
    .map(era => ({ name: era }));
}

/**
 * Format EraDefinition array to comma-separated string
 */
function formatEras(eras: EraDefinition[]): string {
  return eras.map(e => e.name).join(', ');
}

export function EraSystemManager({ value, onChange, disabled }: EraSystemManagerProps) {
  const [eras, setEras] = useState<EraDefinition[]>(() => {
    try {
      return parseEras(value);
    } catch (error) {
      console.warn('Error parsing eras:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      const parsed = parseEras(value);
      setEras(parsed);
    } catch (error) {
      console.warn('Error parsing eras in useEffect:', error);
      setEras([]);
    }
  }, [value]);

  const handleErasChange = (newEras: EraDefinition[]) => {
    setEras(newEras);
    onChange(formatEras(newEras));
  };

  const addEra = () => {
    handleErasChange([...eras, { name: '' }]);
  };

  const updateEra = (index: number, updates: Partial<EraDefinition>) => {
    const newEras = [...eras];
    newEras[index] = { ...newEras[index], ...updates };
    handleErasChange(newEras);
  };

  const removeEra = (index: number) => {
    const newEras = eras.filter((_, i) => i !== index);
    handleErasChange(newEras);
  };

  const moveEra = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= eras.length) return;
    
    const newEras = [...eras];
    [newEras[index], newEras[newIndex]] = [newEras[newIndex], newEras[index]];
    handleErasChange(newEras);
  };

  const presetLabels = ['Past Era', 'Current Era', 'Future Era'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Define eras in chronological order (earliest to latest). The order determines how dates are sorted.
        </p>
        <FormButton
          type="button"
          variant="secondary"
          onClick={addEra}
          disabled={disabled}
          className="text-sm"
        >
          + Add Era
        </FormButton>
      </div>

      {eras.length === 0 ? (
        <div className="text-sm text-gray-400 italic py-2">
          No eras defined. Click "Add Era" to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {eras.map((era, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-gray-700/40 border border-gray-600/50 rounded-lg"
            >
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-600/50 rounded text-sm font-semibold text-gray-300">
                {index + 1}
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <FormLabel htmlFor={`era-name-${index}`} className="text-xs">
                    Era Name
                  </FormLabel>
                  <FormInput
                    id={`era-name-${index}`}
                    value={era.name}
                    onChange={(e) => updateEra(index, { name: e.target.value })}
                    placeholder="e.g., BE, SE, CE"
                    disabled={disabled}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <FormLabel htmlFor={`era-label-${index}`} className="text-xs" optional>
                    Label (Optional)
                  </FormLabel>
                  <div className="flex gap-1">
                    <FormInput
                      id={`era-label-${index}`}
                      value={era.label || ''}
                      onChange={(e) => updateEra(index, { label: e.target.value || undefined })}
                      placeholder="e.g., Past Era"
                      disabled={disabled}
                      className="text-sm flex-1"
                    />
                    {index < presetLabels.length && (
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => updateEra(index, { label: presetLabels[index] })}
                        disabled={disabled}
                        className="text-xs px-2"
                        title={`Use "${presetLabels[index]}" label`}
                      >
                        {presetLabels[index]}
                      </FormButton>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex gap-1">
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => moveEra(index, 'up')}
                  disabled={disabled || index === 0}
                  className="px-2"
                  title="Move up"
                >
                  ↑
                </FormButton>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => moveEra(index, 'down')}
                  disabled={disabled || index === eras.length - 1}
                  className="px-2"
                  title="Move down"
                >
                  ↓
                </FormButton>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => removeEra(index)}
                  disabled={disabled}
                  className="px-2 text-red-400 hover:text-red-300"
                  title="Remove"
                >
                  ×
                </FormButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {eras.length > 0 && (
        <div className="text-xs text-gray-400 mt-2">
          <strong>Order:</strong> {eras.map((e, i) => `${i + 1}. ${e.name}${e.label ? ` (${e.label})` : ''}`).join(' → ')}
        </div>
      )}
    </div>
  );
}

