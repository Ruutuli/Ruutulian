'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type TemplateField, type TemplateDefinition } from '@/lib/templates/ocTemplates';
import { getTemplateTypeFromWorldSlug } from '@/lib/templates/worldTemplateMap';
import type { World } from '@/types/oc';

interface WorldTemplateManagerProps {
  world: World;
}

// Predefined field categories matching OCForm sections
const PREDEFINED_CATEGORIES = [
  'Core Identity',
  'Overview',
  'Identity Background',
  'Appearance',
  'Personality Overview',
  'Personality Metrics',
  'Personality Traits',
  'Abilities',
  'Relationships',
  'History',
  'Preferences & Habits',
  'Media',
  'Trivia',
  'Development',
  'Settings',
] as const;

export function WorldTemplateManager({ world }: WorldTemplateManagerProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<Record<string, TemplateDefinition>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customCategoryFields, setCustomCategoryFields] = useState<Set<number>>(new Set());

  // Get the template type for this world
  const worldTemplateType = getTemplateTypeFromWorldSlug(world.slug, world);

  // Get all unique categories from existing fields across all templates
  const getExistingCategories = (): string[] => {
    const categories = new Set<string>();
    Object.values(templates).forEach(template => {
      template.fields.forEach(field => {
        if (field.category) {
          categories.add(field.category);
        }
      });
    });
    return Array.from(categories).sort();
  };

  // Get available categories (predefined + existing)
  const getAvailableCategories = (): string[] => {
    const existing = getExistingCategories();
    const predefined = Array.from(PREDEFINED_CATEGORIES);
    const allCategories = new Set([...predefined, ...existing]);
    return Array.from(allCategories).sort();
  };

  // Load templates directly from world.oc_templates
  useEffect(() => {
    if (world.oc_templates && typeof world.oc_templates === 'object') {
      const worldTemplates = world.oc_templates as Record<string, { name?: string; fields?: TemplateField[] }>;
      const loadedTemplates: Record<string, TemplateDefinition> = {};
      
      for (const [key, template] of Object.entries(worldTemplates)) {
        if (template && template.fields && Array.isArray(template.fields)) {
          loadedTemplates[key] = {
            name: template.name || key,
            fields: template.fields,
          };
        }
      }
      
      setTemplates(loadedTemplates);
      
      // Set default selected template to the world's template type, or first available
      if (!selectedTemplate) {
        if (loadedTemplates[worldTemplateType]) {
          setSelectedTemplate(worldTemplateType);
        } else if (Object.keys(loadedTemplates).length > 0) {
          setSelectedTemplate(Object.keys(loadedTemplates)[0]);
        }
      }
    }
  }, [world, worldTemplateType, selectedTemplate]);

  // Get the template for a given type
  const getTemplate = (templateType: string): TemplateDefinition => {
    return templates[templateType] || { name: templateType, fields: [] };
  };

  const handleAddField = (templateType: string) => {
    const template = getTemplate(templateType);
    const newField: TemplateField = {
      key: '',
      label: '',
      type: 'text',
    };
    
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        name: template.name,
        fields: [...template.fields, newField],
      },
    }));
  };

  const handleRemoveField = (templateType: string, index: number) => {
    const template = getTemplate(templateType);
    const newFields = template.fields.filter((_, i) => i !== index);
    
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        name: template.name,
        fields: newFields,
      },
    }));
  };

  const handleFieldChange = (
    templateType: string,
    index: number,
    field: Partial<TemplateField>
  ) => {
    const template = getTemplate(templateType);
    const newFields = template.fields.map((f, i) =>
      i === index ? { ...f, ...field } : f
    );
    
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        name: template.name,
        fields: newFields,
      },
    }));
  };

  const handleTemplateNameChange = (templateType: string, name: string) => {
    const template = getTemplate(templateType);
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        name,
        fields: template.fields,
      },
    }));
  };

  const handleAddTemplate = () => {
    const newKey = prompt('Enter template key (e.g., "naruto", "ff7"):');
    if (newKey && newKey.trim()) {
      const key = newKey.trim();
      setTemplates(prev => ({
        ...prev,
        [key]: {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          fields: [],
        },
      }));
      setSelectedTemplate(key);
    }
  };

  const handleRemoveTemplate = (templateType: string) => {
    if (confirm(`Are you sure you want to remove the "${templateType}" template?`)) {
      setTemplates(prev => {
        const newTemplates = { ...prev };
        delete newTemplates[templateType];
        return newTemplates;
      });
      if (selectedTemplate === templateType) {
        const remaining = Object.keys(templates).filter(t => t !== templateType);
        setSelectedTemplate(remaining.length > 0 ? remaining[0] : '');
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert templates to the format expected by oc_templates
      const ocTemplates: Record<string, { name: string; fields: TemplateField[] }> = {};
      for (const [key, template] of Object.entries(templates)) {
        ocTemplates[key] = {
          name: template.name,
          fields: template.fields,
        };
      }

      const response = await fetch(`/api/admin/worlds/${world.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oc_templates: ocTemplates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to save templates (${response.status})`;
        throw new Error(errorMessage);
      }

      router.refresh();
      alert('Templates saved successfully!');
    } catch (error) {
      console.error('Error saving templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save templates. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const availableTemplates = Object.keys(templates);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          Character Template Fields
        </h2>
        <p className="text-gray-400 mb-4">
          Manage character template fields for this world. These templates define the fields available
          when creating characters. Templates are stored in this world's oc_templates field.
        </p>
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-200">
            <strong>World Template Type:</strong> {worldTemplateType}
          </p>
          <p className="text-sm text-blue-300 mt-1">
            This world is mapped to the <strong>{worldTemplateType}</strong> template type.
            You can define templates for this type or any other template type.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {availableTemplates.length === 0 ? (
              <option value="">No templates defined</option>
            ) : (
              availableTemplates.map((templateType) => (
                <option key={templateType} value={templateType}>
                  {templates[templateType]?.name || templateType}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={handleAddTemplate}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + Add Template
          </button>
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => handleRemoveTemplate(selectedTemplate)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600/50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={templates[selectedTemplate]?.name || selectedTemplate}
              onChange={(e) => handleTemplateNameChange(selectedTemplate, e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Template name"
            />
          </div>

          <div className="space-y-4">
            {getTemplate(selectedTemplate).fields
              .map((field, originalIndex) => ({ field, originalIndex }))
              .sort((a, b) => {
                // Sort by category first, then by label
                const categoryA = a.field.category || '';
                const categoryB = b.field.category || '';
                if (categoryA !== categoryB) {
                  return categoryA.localeCompare(categoryB);
                }
                return a.field.label.localeCompare(b.field.label);
              })
              .map(({ field, originalIndex }) => (
                <div
                  key={originalIndex}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30"
                >
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Category
                      </label>
                      <div className="space-y-1">
                        <select
                          value={customCategoryFields.has(originalIndex) ? '__custom__' : (field.category || '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__custom__') {
                              // Show custom input
                              setCustomCategoryFields(prev => new Set(prev).add(originalIndex));
                              handleFieldChange(selectedTemplate, originalIndex, { category: '' });
                            } else {
                              // Hide custom input and set category
                              setCustomCategoryFields(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(originalIndex);
                                return newSet;
                              });
                              handleFieldChange(selectedTemplate, originalIndex, { category: value || undefined });
                            }
                          }}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">(No Category)</option>
                          {getAvailableCategories().map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Category</option>
                        </select>
                        {customCategoryFields.has(originalIndex) && (
                          <input
                            type="text"
                            value={field.category || ''}
                            onChange={(e) =>
                              handleFieldChange(selectedTemplate, originalIndex, { category: e.target.value || undefined })
                            }
                            onBlur={() => {
                              // If category is now in available list, remove from custom
                              if (field.category && getAvailableCategories().includes(field.category)) {
                                setCustomCategoryFields(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(originalIndex);
                                  return newSet;
                                });
                              }
                            }}
                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter custom category"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Field Key
                      </label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) =>
                          handleFieldChange(selectedTemplate, originalIndex, { key: e.target.value })
                        }
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., village"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          handleFieldChange(selectedTemplate, originalIndex, { label: e.target.value })
                        }
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Village"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleFieldChange(selectedTemplate, originalIndex, {
                              type: e.target.value as 'text' | 'array' | 'number',
                            })
                          }
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="text">Text</option>
                          <option value="array">Array</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(selectedTemplate, originalIndex)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {field.type === 'text' && (
                    <div className="mt-3 pt-3 border-t border-gray-600/50">
                      <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                        <input
                          type="checkbox"
                          checked={field.multiline || false}
                          onChange={(e) =>
                            handleFieldChange(selectedTemplate, originalIndex, {
                              multiline: e.target.checked || undefined,
                            })
                          }
                          className="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer checked:bg-purple-600 checked:border-purple-600"
                        />
                        <span className="text-sm text-gray-300 font-medium">Enable multiline entry (textarea)</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}

            <button
              type="button"
              onClick={() => handleAddField(selectedTemplate)}
              className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 border border-gray-600"
            >
              + Add Field
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {getTemplate(selectedTemplate).fields.length} field(s) configured
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Templates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
