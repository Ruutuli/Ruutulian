'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTemplates, type TemplateField, type TemplateDefinition } from '@/lib/templates/ocTemplates';

interface TemplateRecord {
  id: string;
  key: string;
  name: string;
  fields: TemplateField[];
  created_at: string;
  updated_at: string;
}

interface TemplatesManagerProps {
  initialTemplates: TemplateRecord[];
}

export function TemplatesManager({ initialTemplates }: TemplatesManagerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Record<string, TemplateDefinition>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      if (Object.keys(fetchedTemplates).length > 0 && !selectedTemplate) {
        setSelectedTemplate(Object.keys(fetchedTemplates)[0]);
      }
    }
    loadTemplates();
  }, []);

  const selectedTemplateData = templates[selectedTemplate];

  const handleFieldChange = (
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

  const handleAddField = () => {
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

  const handleRemoveField = (index: number) => {
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

  const handleSave = async () => {
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

      // Templates are stored per-world. This component doesn't have world context.
      // Use WorldTemplateManager or TemplatesAndFieldsManager instead.
      throw new Error(
        'Templates must be managed per-world. Please use the world-specific template manager at /admin/worlds/[id]/templates or use the Templates & Fields Manager in the admin dashboard.'
      );

      setSuccess(true);
      
      // Reload templates to get the latest from database
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      
      router.refresh();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const availableTemplates = Object.keys(templates).filter(t => t !== 'none');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          Character Template Fields
        </h2>
        <p className="text-gray-400 mb-4">
          Edit the base character template field definitions. Changes will affect all worlds using these templates.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
          <p className="text-green-400">Template saved successfully!</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Template to Edit
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {availableTemplates.map((templateType) => (
            <option key={templateType} value={templateType}>
              {templates[templateType]?.name || templateType}
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && selectedTemplateData && (
        <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              {selectedTemplateData.name} Template Fields
            </h3>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>

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
                      onChange={(e) => handleFieldChange(index, { key: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="field_key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleFieldChange(index, { label: e.target.value })}
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
                      onChange={(e) => handleFieldChange(index, { type: e.target.value as 'text' | 'array' | 'number' })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="text">Text</option>
                      <option value="array">Array</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                </div>
                {field.type === 'array' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Max Items (optional)
                    </label>
                    <input
                      type="number"
                      value={field.max || ''}
                      onChange={(e) => handleFieldChange(index, { max: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveField(index)}
                  className="mt-3 px-3 py-1 bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/30 text-sm border border-red-600/50"
                >
                  Remove Field
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddField}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
            >
              + Add Field
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

