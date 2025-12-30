'use client';

import { useState } from 'react';
import { PREDEFINED_EVENT_CATEGORIES } from '@/types/oc';
import { getCategoryButtonColorClasses, getCategoryColorClasses } from '@/lib/utils/categoryColors';

interface CategorySelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const [customCategory, setCustomCategory] = useState('');

  const toggleCategory = (category: string) => {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
    } else {
      onChange([...value, category]);
    }
  };

  const addCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setCustomCategory('');
    }
  };

  const removeCategory = (category: string) => {
    onChange(value.filter((c) => c !== category));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Categories</label>
        
        {/* Predefined categories */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">Predefined Categories:</p>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_EVENT_CATEGORIES.map((category) => {
              const isSelected = value.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${getCategoryButtonColorClasses(category, isSelected)}`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom category input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomCategory();
              }
            }}
            placeholder="Add custom category..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
          />
          <button
            type="button"
            onClick={addCustomCategory}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected categories display */}
      {value.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Selected Categories:</p>
          <div className="flex flex-wrap gap-2">
            {value.map((category) => {
              const isPredefined = PREDEFINED_EVENT_CATEGORIES.includes(category as any);
              return (
                <span
                  key={category}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm border ${
                    isPredefined
                      ? getCategoryColorClasses(category)
                      : 'bg-gray-700 text-gray-300 border-gray-600'
                  }`}
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="ml-1 text-gray-400 hover:text-red-400"
                    aria-label={`Remove ${category}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

