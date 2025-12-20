'use client';

import { useState, useEffect } from 'react';

interface ProjectItem {
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface CurrentProjectsData {
  id: string | null;
  description: string;
  project_items: ProjectItem[];
}

const COLOR_OPTIONS = [
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
  { value: 'orange', label: 'Orange' },
  { value: 'indigo', label: 'Indigo' },
];

const ICON_OPTIONS = [
  { value: 'fas fa-globe', label: 'Globe' },
  { value: 'fas fa-users', label: 'Users' },
  { value: 'fas fa-book', label: 'Book' },
  { value: 'fas fa-clock', label: 'Clock' },
  { value: 'fas fa-calendar', label: 'Calendar' },
  { value: 'fas fa-star', label: 'Star' },
  { value: 'fas fa-heart', label: 'Heart' },
  { value: 'fas fa-palette', label: 'Palette' },
  { value: 'fas fa-magic', label: 'Magic' },
  { value: 'fas fa-gem', label: 'Gem' },
];

export function CurrentProjectsEditor() {
  const [data, setData] = useState<CurrentProjectsData>({
    id: null,
    description: '',
    project_items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/current-projects');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load current projects' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/current-projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: data.description,
          project_items: data.project_items,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: 'Current projects updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save current projects',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = () => {
    setData((prev) => ({
      ...prev,
      project_items: [
        ...prev.project_items,
        {
          title: '',
          description: '',
          icon: 'fas fa-star',
          color: 'purple',
        },
      ],
    }));
  };

  const handleRemoveProject = (index: number) => {
    setData((prev) => ({
      ...prev,
      project_items: prev.project_items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateProject = (index: number, field: keyof ProjectItem, value: string) => {
    setData((prev) => ({
      ...prev,
      project_items: prev.project_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-4 md:p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center gap-2">
          <i className="fas fa-folder-open text-purple-400"></i>
          Current Projects Section
        </h2>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            rows={4}
            placeholder="Enter description for the current projects section..."
          />
        </div>

        {/* Project Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-300">Project Items</label>
            <button
              onClick={handleAddProject}
              className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Add Project
            </button>
          </div>

          <div className="space-y-4">
            {data.project_items.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-200">Project {index + 1}</h3>
                  <button
                    onClick={() => handleRemoveProject(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateProject(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                      placeholder="Project title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateProject(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                      placeholder="Project description"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Icon</label>
                    <select
                      value={item.icon}
                      onChange={(e) => handleUpdateProject(index, 'icon', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    >
                      {ICON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color</label>
                    <select
                      value={item.color}
                      onChange={(e) => handleUpdateProject(index, 'color', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    >
                      {COLOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {data.project_items.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>No project items yet. Click "Add Project" to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}










