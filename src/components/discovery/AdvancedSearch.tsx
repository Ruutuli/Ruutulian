'use client';

import { useState } from 'react';
import type { OC } from '@/types/oc';

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  className?: string;
}

export interface SearchFilters {
  name?: string;
  worldId?: string;
  ageMin?: number;
  ageMax?: number;
  status?: string;
  species?: string;
  gender?: string;
  statMin?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  personalityMin?: {
    sociability?: number;
    courage?: number;
    honesty?: number;
  };
}

export function AdvancedSearch({ onSearch, className = '' }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleStatChange = (stat: string, value: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      statMin: {
        ...prev.statMin,
        [stat]: value,
      },
    }));
  };

  const handlePersonalityChange = (trait: string, value: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      personalityMin: {
        ...prev.personalityMin,
        [trait]: value,
      },
    }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({});
    onSearch({});
  };

  return (
    <div className={`wiki-card p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <i className="fas fa-search text-purple-400"></i>
          Advanced Search
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={filters.name || ''}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                placeholder="Search by name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
              >
                <option value="">All</option>
                <option value="alive">Alive</option>
                <option value="deceased">Deceased</option>
                <option value="missing">Missing</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Age Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.ageMin || ''}
                  onChange={(e) => handleFilterChange('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                  placeholder="Min"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.ageMax || ''}
                  onChange={(e) => handleFilterChange('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Species</label>
              <input
                type="text"
                value={filters.species || ''}
                onChange={(e) => handleFilterChange('species', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
                placeholder="Filter by species..."
              />
            </div>
          </div>

          {/* D&D Stats */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">D&D Stats (Minimum)</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((stat) => (
                <div key={stat}>
                  <label className="block text-xs text-gray-400 mb-1 uppercase">{stat.substring(0, 3)}</label>
                  <input
                    type="number"
                    value={filters.statMin?.[stat as keyof typeof filters.statMin] || ''}
                    onChange={(e) => handleStatChange(stat, e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-purple-500 text-sm"
                    min="1"
                    max="30"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Personality Traits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Personality Traits (Minimum 1-10)</h3>
            <div className="grid grid-cols-3 gap-2">
              {['sociability', 'courage', 'honesty'].map((trait) => (
                <div key={trait}>
                  <label className="block text-xs text-gray-400 mb-1 capitalize">{trait}</label>
                  <input
                    type="number"
                    value={filters.personalityMin?.[trait as keyof typeof filters.personalityMin] || ''}
                    onChange={(e) => handlePersonalityChange(trait, e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-purple-500 text-sm"
                    min="1"
                    max="10"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

