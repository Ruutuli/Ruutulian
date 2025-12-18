'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplates, type TemplateField, type TemplateDefinition } from '@/lib/templates/ocTemplates';
import type { World, WorldFieldDefinitions, FieldSet, WorldFieldDefinition } from '@/types/oc';

interface TemplateRecord {
  id: string;
  key: string;
  name: string;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
}

interface UnifiedFieldsManagerProps {
  worlds: Array<World & { world_fields?: WorldFieldDefinitions | null }>;
  initialTemplates: TemplateRecord[];
}

type TabType = 'world' | 'template';

export function UnifiedFieldsManager({ worlds: initialWorlds, initialTemplates }: UnifiedFieldsManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('world');
  const [worlds] = useState(initialWorlds);
  const [templates, setTemplates] = useState<Record<string, TemplateDefinition>>({});
  const [selectedWorld, setSelectedWorld] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      if (activeTab !== 'template') return;
      
      setIsLoadingTemplates(true);
      try {
        const fetchedTemplates = await getTemplates();
        setTemplates(fetchedTemplates);
        
        // Set default selected template if none is selected
        setSelectedTemplate(prev => {
          if (prev) return prev; // Don't override if already selected
          const availableTemplates = Object.keys(fetchedTemplates).filter(t => t !== 'none');
          return availableTemplates.length > 0 ? availableTemplates[0] : '';
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
    if (worlds.length > 0 && !selectedWorld && activeTab === 'world') {
      setSelectedWorld(worlds[0].id);
    }
  }, [worlds, activeTab]);

  const selectedWorldData = worlds.find(w => w.id === selectedWorld);
  const selectedTemplateData = templates[selectedTemplate];

  // ========== WORLD FIELDS MANAGEMENT ==========
  const [worldFieldSets, setWorldFieldSets] = useState<FieldSet[]>([]);

  useEffect(() => {
    if (selectedWorldData) {
      const fieldSets = selectedWorldData.world_fields?.field_sets || [];
      setWorldFieldSets(fieldSets);
    }
  }, [selectedWorldData]);

  const handleAddFieldSet = () => {
    const newFieldSet: FieldSet = {
      id: `fieldset-${Date.now()}`,
      name: '',
      description: '',
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
        throw new Error(errorData.error || 'Failed to save World Custom Fields');
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving World Custom Fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to save World Custom Fields');
    } finally {
      setIsSaving(false);
    }
  };

  // ========== TEMPLATE FIELDS MANAGEMENT ==========
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

  const handleSaveTemplateFields = async () => {
    if (!selectedTemplate || !selectedTemplateData) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate fields
      for (const field of selectedTemplateData.fields) {
        if (!field.key || !field.label || !field.type) {
          throw new Error('All Template Fields must have key, label, and type');
        }
      }

      // Find which world(s) have this template
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
      
      // Reload templates
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving Template Fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to save Template Fields');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Fields Management</h2>
        <p className="text-gray-400">
          Manage World Custom Fields (custom fields per world stored in world_fields) and Character Template Fields (character template field definitions stored in oc_templates)
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-600">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('world')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'world'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            World Custom Fields
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'template'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Template Fields
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
          <p className="text-green-400">Saved successfully!</p>
        </div>
      )}

      {/* World Custom Fields Tab */}
      {activeTab === 'world' && (
        <div className="space-y-6">
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">World Custom Fields</h3>
            <p className="text-sm text-gray-400 mb-4">
              World Custom Fields are custom field sets that can be added to any world. These appear in the world form when editing/adding worlds.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select World
              </label>
              <select
                value={selectedWorld}
                onChange={(e) => setSelectedWorld(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedWorldData && (
              <div className="space-y-4">
                {worldFieldSets.map((fieldSet, setIndex) => (
                  <div
                    key={fieldSet.id}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30"
                  >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Field Set Name
                        </label>
                        <input
                          type="text"
                          value={fieldSet.name}
                          onChange={(e) => handleFieldSetChange(setIndex, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., Combat Stats"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Description (optional)
                        </label>
                        <input
                          type="text"
                          value={fieldSet.description || ''}
                          onChange={(e) => handleFieldSetChange(setIndex, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Brief description"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 mb-3">
                      {fieldSet.fields.map((field, fieldIndex) => (
                        <div
                          key={fieldIndex}
                          className="bg-gray-700/50 rounded p-3 border border-gray-600/20"
                        >
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                Field Key
                              </label>
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => handleWorldFieldChange(setIndex, fieldIndex, { key: e.target.value })}
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="field_key"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                Field Label
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleWorldFieldChange(setIndex, fieldIndex, { label: e.target.value })}
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Field Label"
                              />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                  Type
                                </label>
                                <select
                                  value={field.type}
                                  onChange={(e) => handleWorldFieldChange(setIndex, fieldIndex, { type: e.target.value as 'text' | 'array' | 'number' })}
                                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                  <option value="text">Text</option>
                                  <option value="array">Array</option>
                                  <option value="number">Number</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorldField(setIndex, fieldIndex)}
                                className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30 border border-red-600/50 self-end"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddWorldField(setIndex)}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-sm"
                      >
                        + Add World Field
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFieldSet(setIndex)}
                      className="px-3 py-1 bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/30 text-sm border border-red-600/50"
                    >
                      Remove Field Set
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddFieldSet}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
                >
                  + Add Field Set
                </button>

                <button
                  type="button"
                  onClick={handleSaveWorldFields}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save World Custom Fields'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Fields Tab */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Character Template Fields</h3>
            <p className="text-sm text-gray-400 mb-4">
              Character Template Fields define the base structure for character templates (e.g., Naruto, Pokémon). These are the default fields that appear for all characters using that template.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Template
              </label>
              {isLoadingTemplates ? (
                <div className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400">
                  Loading templates...
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={Object.keys(templates).filter(t => t !== 'none').length === 0}
                >
                  {Object.keys(templates).filter(t => t !== 'none').length === 0 ? (
                    <option value="">No templates available</option>
                  ) : (
                    Object.keys(templates)
                      .filter(t => t !== 'none')
                      .map((templateType) => (
                        <option key={templateType} value={templateType}>
                          {templates[templateType]?.name || templateType}
                        </option>
                      ))
                  )}
                </select>
              )}
              {!isLoadingTemplates && Object.keys(templates).filter(t => t !== 'none').length === 0 && (
                <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-md">
                  <p className="text-sm text-yellow-400 mb-2">
                    No templates found. You need to create character template field definitions first before managing their fields.
                  </p>
                  <Link 
                    href="/admin/templates" 
                    className="text-sm text-yellow-300 hover:text-yellow-200 underline font-medium"
                  >
                    Go to Templates section →
                  </Link>
                </div>
              )}
            </div>

            {selectedTemplate && selectedTemplateData && (
              <div className="space-y-4">
                {selectedTemplateData.fields.map((field, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30"
                  >
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Field Key
                        </label>
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) => handleTemplateFieldChange(index, { key: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="field_key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleTemplateFieldChange(index, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Field Label"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleTemplateFieldChange(index, { type: e.target.value as 'text' | 'array' | 'number' })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="text">Text</option>
                          <option value="array">Array</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                    </div>
                    {field.type === 'array' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Max Items (optional)
                        </label>
                        <input
                          type="number"
                          value={field.max || ''}
                          onChange={(e) => handleTemplateFieldChange(index, { max: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Leave empty for unlimited"
                          min="1"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveTemplateField(index)}
                      className="px-3 py-1 bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/30 text-sm border border-red-600/50"
                    >
                      Remove Template Field
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTemplateField}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
                >
                  + Add Template Field
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplateFields}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Template Fields'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

