'use client';

import { useState, useEffect, useRef } from 'react';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface TagsInputProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag | null>;
  placeholder?: string;
  disabled?: boolean;
}

export function TagsInput({
  selectedTags,
  availableTags,
  onTagsChange,
  onCreateTag,
  placeholder = 'Add tags...',
  disabled = false,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLSelectElement>(null);

  // Get unselected tags for dropdown
  const unselectedTags = availableTags.filter(
    tag => !selectedTags.some(st => st.id === tag.id)
  );

  // Filter available tags based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = availableTags.filter(
        tag =>
          tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedTags.some(st => st.id === tag.id)
      );
      setFilteredTags(filtered);
      setShowSuggestions(filtered.length > 0 || onCreateTag);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  }, [inputValue, availableTags, selectedTags, onCreateTag]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      await handleAddTag(inputValue.trim());
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setInputValue('');
    } else if (e.key === 'ArrowDown' && filteredTags.length > 0) {
      e.preventDefault();
      // Could implement keyboard navigation here
    }
  };

  const handleAddTag = async (tagName: string) => {
    // Check if tag already exists
    const existingTag = availableTags.find(
      tag => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      if (!selectedTags.some(st => st.id === existingTag.id)) {
        onTagsChange([...selectedTags, existingTag]);
      }
      setInputValue('');
      setShowSuggestions(false);
      return;
    }

    // Create new tag if onCreateTag is provided
    if (onCreateTag) {
      const newTag = await onCreateTag(tagName);
      if (newTag) {
        onTagsChange([...selectedTags, newTag]);
        setInputValue('');
        setShowSuggestions(false);
      }
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleSelectSuggestion = (tag: Tag) => {
    if (!selectedTags.some(st => st.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tagId = e.target.value;
    if (tagId) {
      const tag = availableTags.find(t => t.id === tagId);
      if (tag && !selectedTags.some(st => st.id === tag.id)) {
        onTagsChange([...selectedTags, tag]);
      }
      // Reset dropdown
      e.target.value = '';
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-3">
      {/* Dropdown for selecting from predefined tags */}
      {!disabled && unselectedTags.length > 0 && (
        <div>
          <label htmlFor="tag-dropdown" className="block text-sm font-medium text-gray-300 mb-2">
            Select from predefined tags:
          </label>
          <select
            id="tag-dropdown"
            ref={dropdownRef}
            onChange={handleDropdownChange}
            value=""
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Choose a tag...</option>
            {unselectedTags
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Selected tags display */}
      <div>
        {selectedTags.length > 0 && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selected tags:
          </label>
        )}
        <div className="flex flex-wrap gap-2 p-2 border border-gray-600 rounded-lg bg-gray-800/30 min-h-[42px]">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-purple-600/20 text-purple-300 border border-purple-500/30"
              style={tag.color ? { borderColor: tag.color, backgroundColor: `${tag.color}20`, color: tag.color } : {}}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:text-red-400 transition-colors"
                  aria-label={`Remove ${tag.name} tag`}
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </span>
          ))}
          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => {
                if (inputValue.trim()) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={selectedTags.length === 0 ? placeholder : 'Type to search or create new tag...'}
              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-200 placeholder-gray-500"
            />
          )}
        </div>
      </div>

      {showSuggestions && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredTags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelectSuggestion(tag)}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-gray-200"
            >
              {tag.name}
            </button>
          ))}
          {onCreateTag && inputValue.trim() && !availableTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              type="button"
              onClick={() => handleAddTag(inputValue.trim())}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-gray-200 border-t border-gray-600"
            >
              <i className="fas fa-plus mr-2"></i>
              Create &quot;{inputValue.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Display component for tags (read-only)
interface TagsDisplayProps {
  tags: Tag[];
  onTagClick?: (tag: Tag) => void;
  className?: string;
}

export function TagsDisplay({ tags, onTagClick, className = '' }: TagsDisplayProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => (
        <span
          key={tag.id}
          onClick={() => onTagClick?.(tag)}
          className={`inline-flex items-center px-2 py-1 rounded-md text-sm bg-purple-600/20 text-purple-300 border border-purple-500/30 ${
            onTagClick ? 'cursor-pointer hover:bg-purple-600/30 transition-colors' : ''
          }`}
          style={tag.color ? { borderColor: tag.color, backgroundColor: `${tag.color}20`, color: tag.color } : {}}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}

