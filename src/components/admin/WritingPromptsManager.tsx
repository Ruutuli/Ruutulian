'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface WritingPrompt {
  id: string;
  category: string;
  prompt_text: string;
  requires_two_characters: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WritingPromptsManager() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'single' | 'two'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('writing_prompts')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading prompts:', error);
        alert('Failed to load prompts');
      } else {
        setPrompts(data || []);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      alert('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/writing-prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete prompt');
      }

      await loadPrompts();
    } catch (error: any) {
      console.error('Error deleting prompt:', error);
      alert(error.message || 'Failed to delete prompt');
    }
  };

  const handleToggleActive = async (prompt: WritingPrompt) => {
    try {
      const response = await fetch(`/api/admin/writing-prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prompt,
          is_active: !prompt.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update prompt');
      }

      await loadPrompts();
    } catch (error: any) {
      console.error('Error updating prompt:', error);
      alert(error.message || 'Failed to update prompt');
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(prompts.map(p => p.category))).sort();

  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => {
    if (filterCategory && prompt.category !== filterCategory) return false;
    if (filterType === 'single' && prompt.requires_two_characters) return false;
    if (filterType === 'two' && !prompt.requires_two_characters) return false;
    if (filterActive === 'active' && !prompt.is_active) return false;
    if (filterActive === 'inactive' && prompt.is_active) return false;
    return true;
  });

  // Group by category
  const groupedPrompts = filteredPrompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, WritingPrompt[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading prompts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Writing Prompts</h1>
        <Link
          href="/admin/writing-prompts/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-500 transition-colors text-sm sm:text-base w-fit"
        >
          <i className="fas fa-plus mr-2"></i>
          Add New Prompt
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600 focus:outline-none focus:border-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Types</option>
              <option value="single">Single Character</option>
              <option value="two">Two Characters</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Showing {filteredPrompts.length} of {prompts.length} prompts
        </div>
      </div>

      {/* Prompts grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
          <div key={category} className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <i className="fas fa-tag text-purple-400"></i>
              {category}
              <span className="text-sm font-normal text-gray-400">
                ({categoryPrompts.length} {categoryPrompts.length === 1 ? 'prompt' : 'prompts'})
              </span>
            </h2>
            <div className="space-y-3">
              {categoryPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-4 rounded-lg border ${
                    prompt.is_active
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-gray-800/50 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          prompt.requires_two_characters
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {prompt.requires_two_characters ? 'Two Characters' : 'Single Character'}
                        </span>
                        {!prompt.is_active && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-200">{prompt.prompt_text}</p>
                      <div className="mt-2 text-xs text-gray-400">
                        Updated {new Date(prompt.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(prompt)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          prompt.is_active
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
                        }`}
                        title={prompt.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`fas ${prompt.is_active ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                      <Link
                        href={`/admin/writing-prompts/${prompt.id}`}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-sm font-medium hover:bg-purple-500/30 transition-colors"
                      >
                        <i className="fas fa-edit"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-sm font-medium hover:bg-red-500/30 transition-colors"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredPrompts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No prompts found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}

