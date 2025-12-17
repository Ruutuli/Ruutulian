'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTemplates, type TemplateField, type TemplateDefinition } from '@/lib/templates/ocTemplates';
import type { World, WorldFieldDefinitions, FieldSet, WorldFieldDefinition } from '@/types/oc';
import { slugify } from '@/lib/utils/slugify';
import { getTemplateTypeFromWorldSlug } from '@/lib/templates/worldTemplateMap';

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

interface TemplateRecord {
  id: string;
  key: string;
  name: string;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
}

interface TemplatesAndFieldsManagerProps {
  worlds: Array<World & { field_definitions?: WorldFieldDefinitions | null }>;
}

type TabType = 'definitions' | 'world-fields';

export function TemplatesAndFieldsManager({ worlds: initialWorlds }: TemplatesAndFieldsManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('definitions');
  const [worlds] = useState(initialWorlds);
  const [templates, setTemplates] = useState<Record<string, TemplateDefinition>>({});
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Template creation state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplateWorld, setNewTemplateWorld] = useState('');
  const [newTemplateKey, setNewTemplateKey] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFields, setNewTemplateFields] = useState<TemplateField[]>([]);
  const [templateKeyError, setTemplateKeyError] = useState<string | null>(null);
  const [customCategoryFields, setCustomCategoryFields] = useState<Set<number>>(new Set());
  const [customCategoryFieldsNew, setCustomCategoryFieldsNew] = useState<Set<number>>(new Set());

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
    newTemplateFields.forEach(field => {
      if (field.category) {
        categories.add(field.category);
      }
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

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      try {
        const fetchedTemplates = await getTemplates();
        setTemplates(fetchedTemplates);
        
        // Set default selected template for definitions tab
        setSelectedTemplate(prev => {
          if (prev) return prev; // Don't override if already selected
          if (activeTab === 'definitions') {
            const availableTemplates = Object.keys(fetchedTemplates).filter(t => t !== 'none');
            return availableTemplates.length > 0 ? availableTemplates[0] : '';
          }
          return prev;
        });
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load templates. Please refresh the page.');
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, [activeTab]);

  // Set default selected world
  useEffect(() => {
    if (worlds.length > 0 && !selectedWorld && activeTab === 'world-fields') {
      setSelectedWorld(worlds[0].id);
    }
  }, [worlds, activeTab, selectedWorld]);

  const selectedWorldData = worlds.find(w => w.id === selectedWorld);
  const selectedTemplateData = templates[selectedTemplate];
  
  // World fields - auto-detect template from world slug
  const selectedWorldTemplateType = selectedWorldData 
    ? getTemplateTypeFromWorldSlug(selectedWorldData.slug, selectedWorldData)
    : null;

  // ========== WORLD FIELDS MANAGEMENT ==========
  const [worldFieldSets, setWorldFieldSets] = useState<FieldSet[]>([]);

  useEffect(() => {
    if (selectedWorldData) {
      const fieldSets = selectedWorldData.world_fields?.field_sets || [];
      setWorldFieldSets(fieldSets);
    }
  }, [selectedWorldData]);

  // Get field sets grouped by template
  const fieldSetsByTemplate = (() => {
    const groups: Record<string, FieldSet[]> = {
      all: worldFieldSets.filter(set => !set.template_key),
    };
    worldFieldSets.forEach(set => {
      if (set.template_key) {
        if (!groups[set.template_key]) {
          groups[set.template_key] = [];
        }
        groups[set.template_key].push(set);
      }
    });
    return groups;
  })();

  const handleAddFieldSet = (forTemplate?: string) => {
    const newFieldSet: FieldSet = {
      id: `fieldset-${Date.now()}`,
      name: '',
      description: '',
      template_key: forTemplate,
      fields: [],
    };
    setWorldFieldSets([...worldFieldSets, newFieldSet]);
  };

  const handleRemoveFieldSet = (index: number) => {
    setWorldFieldSets(worldFieldSets.filter((_, i) => i !== index));
  };

  const handleFieldSetChange = (index: number, updates: Partial<FieldSet>) => {
    const newFieldSets = worldFieldSets.map((set, i) =>
      i === index ? { ...set, ...updates } : set
    );
    setWorldFieldSets(newFieldSets);
  };

  const handleAddWorldField = (fieldSetIndex: number) => {
    const newField: WorldFieldDefinition = {
      key: '',
      label: '',
      type: 'text',
    };
    const newFieldSets = worldFieldSets.map((set, i) =>
      i === fieldSetIndex
        ? { ...set, fields: [...set.fields, newField] }
        : set
    );
    setWorldFieldSets(newFieldSets);
  };

  const handleRemoveWorldField = (fieldSetIndex: number, fieldIndex: number) => {
    const newFieldSets = worldFieldSets.map((set, i) =>
      i === fieldSetIndex
        ? { ...set, fields: set.fields.filter((_, fi) => fi !== fieldIndex) }
        : set
    );
    setWorldFieldSets(newFieldSets);
  };

  const handleWorldFieldChange = (
    fieldSetIndex: number,
    fieldIndex: number,
    updates: Partial<WorldFieldDefinition>
  ) => {
    const newFieldSets = worldFieldSets.map((set, i) =>
      i === fieldSetIndex
        ? {
            ...set,
            fields: set.fields.map((f, fi) =>
              fi === fieldIndex ? { ...f, ...updates } : f
            ),
          }
        : set
    );
    setWorldFieldSets(newFieldSets);
  };

  const handleSaveWorldFields = async () => {
    if (!selectedWorld) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate template keys exist
      const templateKeys = new Set(Object.keys(templates).filter(t => t !== 'none'));
      for (const fieldSet of worldFieldSets) {
        if (fieldSet.template_key && !templateKeys.has(fieldSet.template_key)) {
          throw new Error(`Invalid template key "${fieldSet.template_key}" in field set "${fieldSet.name}". Template does not exist.`);
        }
      }

      const response = await fetch(`/api/admin/worlds/${selectedWorld}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world_fields: {
            field_sets: worldFieldSets,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save World Fields');
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving World Fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to save World Fields');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateFieldSet = (setIndex: number, targetTemplate?: string) => {
    const fieldSet = worldFieldSets[setIndex];
    const newFieldSet: FieldSet = {
      id: `fieldset-${Date.now()}`,
      name: `${fieldSet.name} (Copy)`,
      description: fieldSet.description,
      template_key: targetTemplate || fieldSet.template_key,
      fields: fieldSet.fields.map(f => ({ ...f })),
    };
    setWorldFieldSets([...worldFieldSets, newFieldSet]);
  };

  const handleMoveFieldSet = (setIndex: number, newTemplateKey: string | undefined) => {
    const newFieldSets = worldFieldSets.map((set, i) =>
      i === setIndex ? { ...set, template_key: newTemplateKey } : set
    );
    setWorldFieldSets(newFieldSets);
  };

  const handleFieldSetReorder = (setIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && setIndex === 0) return;
    if (direction === 'down' && setIndex === worldFieldSets.length - 1) return;

    const newFieldSets = [...worldFieldSets];
    const targetIndex = direction === 'up' ? setIndex - 1 : setIndex + 1;
    [newFieldSets[setIndex], newFieldSets[targetIndex]] = [newFieldSets[targetIndex], newFieldSets[setIndex]];
    setWorldFieldSets(newFieldSets);
  };

  // ========== TEMPLATE DEFINITIONS MANAGEMENT ==========
  const handleTemplateFieldChange = (
    index: number,
    field: Partial<TemplateField>
  ) => {
    if (!selectedTemplateData) return;

    const newFields = selectedTemplateData.fields.map((f, i) =>
      i === index ? { ...f, ...field } : f
    );

    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...selectedTemplateData,
        fields: newFields,
      },
    }));
  };

  const handleAddTemplateField = () => {
    if (!selectedTemplateData) return;

    const newField: TemplateField = {
      key: '',
      label: '',
      type: 'text',
    };

    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...selectedTemplateData,
        fields: [...selectedTemplateData.fields, newField],
      },
    }));
  };

  const handleRemoveTemplateField = (index: number) => {
    if (!selectedTemplateData) return;

    const newFields = selectedTemplateData.fields.filter((_, i) => i !== index);

    setTemplates(prev => ({
      ...prev,
      [selectedTemplate]: {
        ...selectedTemplateData,
        fields: newFields,
      },
    }));
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate || !selectedTemplateData) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate fields
      for (const field of selectedTemplateData.fields) {
        if (!field.key || !field.label || !field.type) {
          throw new Error('All fields must have key, label, and type');
        }
      }

      // Find which world(s) have this template
      // Since templates are per-world, we need to update all worlds that have this template
      const worldsWithTemplate = worlds.filter(w => {
        const worldTemplates = (w.oc_templates as Record<string, any>) || {};
        return worldTemplates[selectedTemplate] !== undefined;
      });

      if (worldsWithTemplate.length === 0) {
        throw new Error(`No world found with template "${selectedTemplate}". Please create the template for a world first.`);
      }

      // Update all worlds that have this template
      const updatePromises = worldsWithTemplate.map(async (world) => {
        const worldTemplates = ((world.oc_templates as Record<string, any>) || {});
        const updatedTemplates = {
          ...worldTemplates,
          [selectedTemplate]: {
            name: selectedTemplateData.name,
            fields: selectedTemplateData.fields,
          },
        };

        const response = await fetch(`/api/admin/worlds/${world.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oc_templates: updatedTemplates,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to save template for world "${world.name}"`);
        }

        return response.json();
      });

      await Promise.all(updatePromises);

      setSuccess(true);
      
      // Reload templates to get the latest from database
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Template creation handlers
  const validateTemplateKey = (key: string): string | null => {
    if (!key || key.trim() === '') {
      return 'Template key is required';
    }

    // Check format: lowercase, alphanumeric, hyphens, underscores
    if (!/^[a-z][a-z0-9_-]*$/.test(key)) {
      return 'Template key must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores';
    }

    // Check uniqueness
    if (templates[key] && key !== selectedTemplate) {
      return 'Template key already exists';
    }

    return null;
  };

  const handleTemplateKeyChange = (key: string) => {
    setNewTemplateKey(key);
    const error = validateTemplateKey(key);
    setTemplateKeyError(error);
  };

  const handleAddNewTemplateField = () => {
    const newField: TemplateField = {
      key: '',
      label: '',
      type: 'text',
    };
    setNewTemplateFields([...newTemplateFields, newField]);
  };

  const handleRemoveNewTemplateField = (index: number) => {
    setNewTemplateFields(newTemplateFields.filter((_, i) => i !== index));
  };

  const handleNewTemplateFieldChange = (index: number, field: Partial<TemplateField>) => {
    const newFields = newTemplateFields.map((f, i) =>
      i === index ? { ...f, ...field } : f
    );
    setNewTemplateFields(newFields);
  };

  const handleCreateTemplate = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    setTemplateKeyError(null);

    try {
      // Validate world selection
      if (!newTemplateWorld) {
        throw new Error('Please select a world for this template');
      }

      // Validate template key
      const keyError = validateTemplateKey(newTemplateKey);
      if (keyError) {
        setTemplateKeyError(keyError);
        throw new Error(keyError);
      }

      // Validate template name
      if (!newTemplateName || newTemplateName.trim() === '') {
        throw new Error('Template name is required');
      }

      // Validate fields
      for (const field of newTemplateFields) {
        if (!field.key || !field.label || !field.type) {
          throw new Error('All fields must have key, label, and type');
        }
      }

      // Create template for the selected world
      const selectedWorldData = worlds.find(w => w.id === newTemplateWorld);
      if (!selectedWorldData) {
        throw new Error('Selected world not found');
      }

      // Get existing templates for this world
      const existingTemplates = ((selectedWorldData.oc_templates as Record<string, any>) || {});
      const updatedTemplates = {
        ...existingTemplates,
        [newTemplateKey]: {
          name: newTemplateName,
          fields: newTemplateFields,
        },
      };

      const response = await fetch(`/api/admin/worlds/${newTemplateWorld}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oc_templates: updatedTemplates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create template');
      }

      setSuccess(true);

      // Reload templates
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);

      // Switch to edit mode for the new template
      setSelectedTemplate(newTemplateKey);
      setIsCreatingNew(false);
      setNewTemplateWorld('');
      setNewTemplateKey('');
      setNewTemplateName('');
      setNewTemplateFields([]);

      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setNewTemplateWorld('');
    setNewTemplateKey('');
    setNewTemplateName('');
    setNewTemplateFields([]);
    setTemplateKeyError(null);
  };


  const availableTemplates = Object.keys(templates).filter(t => t !== 'none');

  return (
    <div className="space-y-8">
      {/* Header removed - handled by page component */}

      {/* Enhanced Tabs */}
      <div className="border-b border-gray-700/50 bg-gray-800/30 rounded-t-lg">
        <nav className="flex space-x-1 px-4">
          <button
            onClick={() => setActiveTab('definitions')}
            className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 ${
              activeTab === 'definitions'
                ? 'text-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="relative z-10">OC Templates</span>
            {activeTab === 'definitions' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('world-fields')}
            className={`relative py-4 px-6 font-medium text-sm transition-all duration-200 ${
              activeTab === 'world-fields'
                ? 'text-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="relative z-10">World Form Fields</span>
            {activeTab === 'world-fields' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
            )}
          </button>
        </nav>
      </div>

      {/* Enhanced Alert Messages */}
      {error && (
        <div className="bg-red-900/30 border-l-4 border-red-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border-l-4 border-green-500 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-300 font-medium">Saved successfully!</p>
          </div>
        </div>
      )}

      {/* Template Definitions Tab */}
      {activeTab === 'definitions' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-xl p-6 border border-gray-700/50 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-100 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  OC Template Definitions
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">
                  Create and edit template definitions (e.g., Naruto, Pokémon). These templates add <strong>extra fields to OC forms</strong> when creating/editing characters. For example, Naruto OCs get fields like "chakra nature". Changes will affect all worlds using these templates.
                </p>
              </div>
              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="ml-4 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Template
                </button>
              )}
            </div>

            {isCreatingNew ? (
              <div className="space-y-6 border-t border-gray-700/50 pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-100">Create New Template</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      World <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={newTemplateWorld}
                      onChange={(e) => {
                        setNewTemplateWorld(e.target.value);
                        // Auto-generate key and name when world is selected
                        if (e.target.value) {
                          const selectedWorld = worlds.find(w => w.id === e.target.value);
                          if (selectedWorld) {
                            // Only auto-generate if fields are empty
                            if (!newTemplateKey) {
                              const autoKey = slugify(selectedWorld.slug);
                              setNewTemplateKey(autoKey);
                              handleTemplateKeyChange(autoKey);
                            }
                            if (!newTemplateName) {
                              setNewTemplateName(selectedWorld.name);
                            }
                          }
                        } else {
                          // Clear fields if world is deselected
                          if (!newTemplateKey) setNewTemplateKey('');
                          if (!newTemplateName) setNewTemplateName('');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    >
                      <option value="">Select a world...</option>
                      {worlds.map((world) => (
                        <option key={world.id} value={world.id}>
                          {world.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">Select which world this template is for</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Template Key <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTemplateKey}
                      onChange={(e) => handleTemplateKeyChange(e.target.value)}
                      className={`w-full px-4 py-2.5 bg-gray-700/80 border rounded-lg text-gray-100 focus:outline-none focus:ring-2 transition-all ${
                        templateKeyError
                          ? 'border-red-500/50 focus:ring-red-500'
                          : 'border-gray-600/50 focus:ring-purple-500 focus:border-purple-500'
                      }`}
                      placeholder="Auto-generated from world slug"
                    />
                    {templateKeyError && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {templateKeyError}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Auto-generated from world slug. Lowercase letters, numbers, hyphens, and underscores only. Must be unique.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Template Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Auto-generated from world name"
                  />
                  <p className="text-xs text-gray-400 mt-2">Auto-generated from world name. Display name shown in dropdowns.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                    <h5 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Template Fields
                    </h5>
                    <button
                      type="button"
                      onClick={handleAddNewTemplateField}
                      className="px-4 py-2 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Field
                    </button>
                  </div>

                  {newTemplateFields.map((field, index) => (
                    <div
                      key={index}
                      className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50 shadow-md hover:border-gray-600/50 transition-all"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Category
                          </label>
                          <div className="space-y-1">
                            <select
                              value={customCategoryFieldsNew.has(index) ? '__custom__' : (field.category || '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '__custom__') {
                                  setCustomCategoryFieldsNew(prev => new Set(prev).add(index));
                                  handleNewTemplateFieldChange(index, { category: '' });
                                } else {
                                  setCustomCategoryFieldsNew(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                  handleNewTemplateFieldChange(index, { category: value || undefined });
                                }
                              }}
                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            >
                              <option value="">(No Category)</option>
                              {getAvailableCategories().map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                              <option value="__custom__">+ Custom Category</option>
                            </select>
                            {customCategoryFieldsNew.has(index) && (
                              <input
                                type="text"
                                value={field.category || ''}
                                onChange={(e) =>
                                  handleNewTemplateFieldChange(index, { category: e.target.value || undefined })
                                }
                                onBlur={() => {
                                  if (field.category && getAvailableCategories().includes(field.category)) {
                                    setCustomCategoryFieldsNew(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(index);
                                      return newSet;
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                placeholder="Enter custom category"
                                autoFocus
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Field Key
                          </label>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => handleNewTemplateFieldChange(index, { key: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="field_key"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Label
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleNewTemplateFieldChange(index, { label: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="Field Label"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => handleNewTemplateFieldChange(index, { type: e.target.value as 'text' | 'array' | 'number' })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="array">Array</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                      </div>
                      {field.type === 'array' && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Max Items (optional)
                          </label>
                          <input
                            type="number"
                            value={field.max || ''}
                            onChange={(e) => handleNewTemplateFieldChange(index, { max: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="Leave empty for unlimited"
                            min="1"
                          />
                        </div>
                      )}
                      {field.type === 'text' && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.multiline || false}
                              onChange={(e) =>
                                handleNewTemplateFieldChange(index, {
                                  multiline: e.target.checked || undefined,
                                })
                              }
                              className="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer checked:bg-purple-600 checked:border-purple-600"
                              style={{ accentColor: '#9333ea' }}
                            />
                            <span className="text-sm text-gray-300 font-medium">Enable multiline entry (textarea)</span>
                          </label>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <button
                          type="button"
                          onClick={() => handleRemoveNewTemplateField(index)}
                          className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Field
                        </button>
                      </div>
                    </div>
                  ))}

                  {newTemplateFields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-700/50 rounded-xl bg-gray-800/30">
                      <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <p className="text-sm text-gray-400 font-medium">No fields yet</p>
                      <p className="text-xs text-gray-500 mt-1">Click "Add Field" to get started</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-700/50 mt-6">
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    disabled={isSaving || !!templateKeyError}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Template
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
                </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-200 mb-3">
                    Select Template to Edit
                  </label>
                  {isLoadingTemplates ? (
                    <div className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-400 flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading templates...
                    </div>
                  ) : availableTemplates.length === 0 ? (
                    <div className="space-y-4">
                      <div className="w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-400 text-center">
                        No templates available
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNew(true)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-medium shadow-lg transition-all"
                      >
                        Create Your First Template
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availableTemplates.map((templateType) => {
                        const template = templates[templateType];
                        const isSelected = selectedTemplate === templateType;
                        return (
                          <button
                            key={templateType}
                            type="button"
                            onClick={() => setSelectedTemplate(templateType)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                                : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-100 text-sm">{template?.name || templateType}</h4>
                              {isSelected && (
                                <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 font-mono">{templateType}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {template?.fields?.length || 0} field{template?.fields?.length !== 1 ? 's' : ''}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedTemplate && selectedTemplateData && (
              <div className="space-y-6 border-t border-gray-700/50 pt-6 mt-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                  <div>
                    <h4 className="text-lg font-bold text-gray-100">{selectedTemplateData.name}</h4>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{selectedTemplate}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-semibold border border-purple-500/30">
                    {selectedTemplateData.fields.length} field{selectedTemplateData.fields.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4">
                  {selectedTemplateData.fields
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
                      className="bg-gray-800/60 rounded-xl p-5 border border-gray-700/50 shadow-md hover:border-gray-600/50 transition-all"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Category
                          </label>
                          <div className="space-y-1">
                            <select
                              value={customCategoryFields.has(originalIndex) ? '__custom__' : (field.category || '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '__custom__') {
                                  setCustomCategoryFields(prev => new Set(prev).add(originalIndex));
                                  handleTemplateFieldChange(originalIndex, { category: '' });
                                } else {
                                  setCustomCategoryFields(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(originalIndex);
                                    return newSet;
                                  });
                                  handleTemplateFieldChange(originalIndex, { category: value || undefined });
                                }
                              }}
                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
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
                                  handleTemplateFieldChange(originalIndex, { category: e.target.value || undefined })
                                }
                                onBlur={() => {
                                  if (field.category && getAvailableCategories().includes(field.category)) {
                                    setCustomCategoryFields(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(originalIndex);
                                      return newSet;
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                placeholder="Enter custom category"
                                autoFocus
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Field Key
                          </label>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => handleTemplateFieldChange(originalIndex, { key: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="field_key"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Label
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleTemplateFieldChange(originalIndex, { label: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="Field Label"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => handleTemplateFieldChange(originalIndex, { type: e.target.value as 'text' | 'array' | 'number' })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="array">Array</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                      </div>
                      {field.type === 'array' && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Max Items (optional)
                          </label>
                          <input
                            type="number"
                            value={field.max || ''}
                            onChange={(e) => handleTemplateFieldChange(originalIndex, { max: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                            placeholder="Leave empty for unlimited"
                            min="1"
                          />
                        </div>
                      )}
                      {field.type === 'text' && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.multiline || false}
                              onChange={(e) =>
                                handleTemplateFieldChange(originalIndex, {
                                  multiline: e.target.checked || undefined,
                                })
                              }
                              className="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer checked:bg-purple-600 checked:border-purple-600"
                              style={{ accentColor: '#9333ea' }}
                            />
                            <span className="text-sm text-gray-300 font-medium">Enable multiline entry (textarea)</span>
                          </label>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplateField(originalIndex)}
                          className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Field
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTemplateData.fields.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700/50 rounded-xl bg-gray-800/30">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <p className="text-sm text-gray-400 font-medium">No fields yet</p>
                    <p className="text-xs text-gray-500 mt-1">Click "Add Field" to get started</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-700/50">
                  <button
                    type="button"
                    onClick={handleAddTemplateField}
                    className="flex-1 px-4 py-2.5 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Field
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Template
                      </>
                    )}
                  </button>
                </div>
              </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* World Fields Tab */}
      {activeTab === 'world-fields' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-xl p-6 border border-gray-700/50 shadow-xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-100 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                World Form Fields
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
                World Form Fields are extra fields that appear in the <strong>World form</strong> when editing or adding worlds. These are for storing additional information about the world itself that doesn't fit in the standard world fields.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Select World
              </label>
              <select
                value={selectedWorld}
                onChange={(e) => setSelectedWorld(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">-- Select a world --</option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedWorldData && selectedWorldTemplateType && (
              <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">
                      This world uses the <span className="text-purple-400">{templates[selectedWorldTemplateType]?.name || selectedWorldTemplateType}</span> template
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add extra fields below that will appear in the <strong>World form</strong> when editing this world
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedWorldData && (
              <div className="space-y-6">
                {/* Show fields for this world's template and universal fields */}
                <div className="space-y-5">
                  {/* Fields for this world's template */}
                  {selectedWorldTemplateType && selectedWorldTemplateType !== 'none' && (
                    <div className="bg-gray-800/60 rounded-xl p-5 border-2 border-purple-500/50 shadow-lg shadow-purple-500/10">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                              World Form Fields
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">
                              Extra fields that appear in the <strong>World form</strong> when editing this world
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 mt-5 pt-5 border-t border-gray-700/50">
                        {worldFieldSets
                          .filter(set => set.template_key === selectedWorldTemplateType)
                          .map((fieldSet) => {
                            const actualIndex = worldFieldSets.findIndex(s => s.id === fieldSet.id);
                            return (
                              <div
                                key={fieldSet.id}
                                className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/30 shadow-md hover:border-gray-600/50 transition-all"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                                      Field Set Name
                                    </label>
                                    <input
                                      type="text"
                                      value={fieldSet.name}
                                      onChange={(e) => handleFieldSetChange(actualIndex, { name: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                      placeholder="e.g., Combat Stats"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                                      Description (optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={fieldSet.description || ''}
                                      onChange={(e) => handleFieldSetChange(actualIndex, { description: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                      placeholder="Brief description"
                                    />
                                  </div>
                                </div>

                                  <div className="mb-5">
                                    <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                                      Description (optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={fieldSet.description || ''}
                                      onChange={(e) => handleFieldSetChange(actualIndex, { description: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                      placeholder="Brief description"
                                    />
                                  </div>

                                <div className="space-y-3 mb-5">
                                  <div className="flex items-center justify-between pb-2 border-b border-gray-700/50">
                                    <h5 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Fields</h5>
                                    <span className="text-xs text-gray-500">{fieldSet.fields.length} field{fieldSet.fields.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  {fieldSet.fields.map((field, fieldIndex) => (
                                    <div
                                      key={fieldIndex}
                                      className="bg-gray-800/60 rounded-lg p-4 border border-gray-600/30"
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Field Key
                                          </label>
                                          <input
                                            type="text"
                                            value={field.key}
                                            onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { key: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            placeholder="field_key"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Field Label
                                          </label>
                                          <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { label: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            placeholder="Field Label"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Type
                                          </label>
                                          <select
                                            value={field.type}
                                            onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { type: e.target.value as 'text' | 'array' | 'number' })}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                          >
                                            <option value="text">Text</option>
                                            <option value="array">Array</option>
                                            <option value="number">Number</option>
                                          </select>
                                        </div>
                                        <div className="flex items-end">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveWorldField(actualIndex, fieldIndex)}
                                            className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-700/50">
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Description (optional)
                                          </label>
                                          <input
                                            type="text"
                                            value={field.description || ''}
                                            onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { description: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            placeholder="Field description"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Required
                                          </label>
                                          <select
                                            value={field.required ? 'true' : 'false'}
                                            onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { required: e.target.value === 'true' })}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                          >
                                            <option value="false">Optional</option>
                                            <option value="true">Required</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                            Default Value (optional)
                                          </label>
                                          <input
                                            type="text"
                                            value={field.defaultValue?.toString() || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              let parsed: string | number | string[] | undefined;
                                              if (field.type === 'number') {
                                                parsed = val ? parseFloat(val) : undefined;
                                              } else if (field.type === 'array') {
                                                parsed = val ? val.split(',').map(s => s.trim()) : undefined;
                                              } else {
                                                parsed = val || undefined;
                                              }
                                              handleWorldFieldChange(actualIndex, fieldIndex, { defaultValue: parsed });
                                            }}
                                            className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            placeholder={field.type === 'array' ? 'comma, separated' : field.type === 'number' ? '0' : 'default'}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {fieldSet.fields.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-gray-700/50 rounded-lg bg-gray-800/30">
                                      <p className="text-xs text-gray-400">No fields yet</p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddWorldField(actualIndex)}
                                    className="w-full px-4 py-2.5 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 text-sm font-medium transition-all flex items-center justify-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Field
                                  </button>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-700/50">
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateFieldSet(actualIndex)}
                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm font-medium border border-blue-600/50 transition-all flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Duplicate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFieldSet(actualIndex)}
                                    className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove Field Set
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Universal fields (all templates) */}
                    {worldFieldSets.filter(set => !set.template_key).length > 0 && (
                      <div className="bg-gray-800/60 rounded-xl p-5 border-2 border-gray-700/50">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-700/50">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-100">Universal Fields (All Templates)</h4>
                              <p className="text-xs text-gray-400 mt-1">
                                Fields that apply to all OCs in this world, regardless of template
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-5 mt-5 pt-5 border-t border-gray-700/50">
                          {worldFieldSets
                            .filter(set => !set.template_key)
                            .map((fieldSet) => {
                              const actualIndex = worldFieldSets.findIndex(s => s.id === fieldSet.id);
                              return (
                                <div
                                  key={fieldSet.id}
                                  className="bg-gray-700/40 rounded-xl p-5 border border-gray-600/30 shadow-md hover:border-gray-600/50 transition-all"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                                        Field Set Name
                                      </label>
                                      <input
                                        type="text"
                                        value={fieldSet.name}
                                        onChange={(e) => handleFieldSetChange(actualIndex, { name: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                        placeholder="e.g., Combat Stats"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                                        Description (optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={fieldSet.description || ''}
                                        onChange={(e) => handleFieldSetChange(actualIndex, { description: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm"
                                        placeholder="Brief description"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-3 mb-5">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-700/50">
                                      <h5 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Fields</h5>
                                      <span className="text-xs text-gray-500">{fieldSet.fields.length} field{fieldSet.fields.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {fieldSet.fields.map((field, fieldIndex) => (
                                      <div
                                        key={fieldIndex}
                                        className="bg-gray-800/60 rounded-lg p-4 border border-gray-600/30"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Field Key
                                            </label>
                                            <input
                                              type="text"
                                              value={field.key}
                                              onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { key: e.target.value })}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                              placeholder="field_key"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Field Label
                                            </label>
                                            <input
                                              type="text"
                                              value={field.label}
                                              onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { label: e.target.value })}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                              placeholder="Field Label"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Type
                                            </label>
                                            <select
                                              value={field.type}
                                              onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { type: e.target.value as 'text' | 'array' | 'number' })}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            >
                                              <option value="text">Text</option>
                                              <option value="array">Array</option>
                                              <option value="number">Number</option>
                                            </select>
                                          </div>
                                          <div className="flex items-end">
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveWorldField(actualIndex, fieldIndex)}
                                              className="w-full px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-700/50">
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Description (optional)
                                            </label>
                                            <input
                                              type="text"
                                              value={field.description || ''}
                                              onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { description: e.target.value })}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                              placeholder="Field description"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Required
                                            </label>
                                            <select
                                              value={field.required ? 'true' : 'false'}
                                              onChange={(e) => handleWorldFieldChange(actualIndex, fieldIndex, { required: e.target.value === 'true' })}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                            >
                                              <option value="false">Optional</option>
                                              <option value="true">Required</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                                              Default Value (optional)
                                            </label>
                                            <input
                                              type="text"
                                              value={field.defaultValue?.toString() || ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                let parsed: string | number | string[] | undefined;
                                                if (field.type === 'number') {
                                                  parsed = val ? parseFloat(val) : undefined;
                                                } else if (field.type === 'array') {
                                                  parsed = val ? val.split(',').map(s => s.trim()) : undefined;
                                                } else {
                                                  parsed = val || undefined;
                                                }
                                                handleWorldFieldChange(actualIndex, fieldIndex, { defaultValue: parsed });
                                              }}
                                              className="w-full px-3 py-2 bg-gray-700/80 border border-gray-600/50 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                              placeholder={field.type === 'array' ? 'comma, separated' : field.type === 'number' ? '0' : 'default'}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {fieldSet.fields.length === 0 && (
                                      <div className="text-center py-8 border-2 border-dashed border-gray-700/50 rounded-lg bg-gray-800/30">
                                        <p className="text-xs text-gray-400">No fields yet</p>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleAddWorldField(actualIndex)}
                                      className="w-full px-4 py-2.5 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 text-sm font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Add Field
                                    </button>
                                  </div>
                                  <div className="flex gap-2 pt-4 border-t border-gray-700/50">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateFieldSet(actualIndex)}
                                      className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm font-medium border border-blue-600/50 transition-all flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      Duplicate
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFieldSet(actualIndex)}
                                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-sm font-medium border border-red-600/50 transition-all flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Remove Field Set
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {worldFieldSets.length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-gray-700/50 rounded-xl bg-gray-800/30">
                        <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-400 font-medium mb-1">No field sets yet</p>
                        <p className="text-xs text-gray-500">Add a field set to get started</p>
                      </div>
                    )}

                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-700/50 mt-6">
                      {selectedWorldTemplateType && selectedWorldTemplateType !== 'none' && (
                        <button
                          type="button"
                          onClick={() => handleAddFieldSet(selectedWorldTemplateType)}
                          className="px-5 py-2.5 bg-purple-600/80 text-white rounded-lg hover:bg-purple-500 font-medium transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Field Set for {templates[selectedWorldTemplateType]?.name || selectedWorldTemplateType}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddFieldSet()}
                        className="px-5 py-2.5 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500 font-medium transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Universal Field Set
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveWorldFields}
                        disabled={isSaving}
                        className="flex-1 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save World Fields
                          </>
                        )}
                      </button>
                    </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

