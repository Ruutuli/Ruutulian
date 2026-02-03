'use client';

import { useState, useEffect } from 'react';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormButton } from './forms/FormButton';
import { logger } from '@/lib/logger';

export interface EraDefinition {
  name: string;
  label?: string; // Optional label like "Past Era", "Current Era", "Future Era"
  startYear?: number | null; // Year this era starts at (for age calculation across eras)
  endYear?: number | null; // Year this era ends at (for age calculation across eras)
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
              label: item.label?.trim() || undefined,
              startYear: typeof item.startYear === 'number' ? item.startYear : (item.startYear === null ? null : undefined),
              endYear: typeof item.endYear === 'number' ? item.endYear : (item.endYear === null ? null : undefined),
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
 * Format EraDefinition array to JSON string (to preserve startYear/endYear)
 */
function formatEras(eras: EraDefinition[]): string {
  // If all eras have only name (no labels or year info), use comma-separated for backward compatibility
  const hasExtraData = eras.some(e => e.label || e.startYear !== undefined || e.endYear !== undefined);
  if (!hasExtraData) {
    return eras.map(e => e.name).join(', ');
  }
  // Otherwise use JSON to preserve all data
  return JSON.stringify(eras.map(e => ({
    name: e.name,
    ...(e.label && { label: e.label }),
    ...(e.startYear !== undefined && { startYear: e.startYear }),
    ...(e.endYear !== undefined && { endYear: e.endYear }),
  })));
}

export function EraSystemManager({ value, onChange, disabled }: EraSystemManagerProps) {
  const [eras, setEras] = useState<EraDefinition[]>(() => {
    try {
      return parseEras(value);
    } catch (error) {
      logger.warn('Component', 'EraSystemManager: Error parsing eras', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      const parsed = parseEras(value);
      setEras(parsed);
    } catch (error) {
      logger.warn('Component', 'EraSystemManager: Error parsing eras in useEffect', error);
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
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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

                <div>
                  <FormLabel htmlFor={`era-start-year-${index}`} className="text-xs" optional>
                    Start Year (Optional)
                  </FormLabel>
                  <FormInput
                    id={`era-start-year-${index}`}
                    type="text"
                    value={era.startYear !== null && era.startYear !== undefined ? era.startYear.toString() : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === '') {
                        updateEra(index, { startYear: undefined });
                      } else if (/^-?\d+$/.test(val)) {
                        // Valid integer (including negative numbers and numbers with leading zeros)
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          updateEra(index, { startYear: num });
                        }
                      }
                    }}
                    placeholder="e.g., 0 or 0000"
                    disabled={disabled}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Year this era starts</p>
                </div>

                <div>
                  <FormLabel htmlFor={`era-end-year-${index}`} className="text-xs" optional>
                    End Year (Optional)
                  </FormLabel>
                  <FormInput
                    id={`era-end-year-${index}`}
                    type="text"
                    value={era.endYear !== null && era.endYear !== undefined ? era.endYear.toString() : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === '') {
                        updateEra(index, { endYear: undefined });
                      } else if (/^-?\d+$/.test(val)) {
                        // Valid integer (including negative numbers and numbers with leading zeros)
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          updateEra(index, { endYear: num });
                        }
                      }
                    }}
                    placeholder="e.g., 2000"
                    disabled={disabled}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Year previous era ended</p>
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

