'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';

interface WritingPromptResponse {
  id: string;
  oc_id: string;
  other_oc_id: string | null;
  category: string;
  prompt_text: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  oc?: {
    id: string;
    name: string;
    slug: string;
  };
  other_oc?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function WritingPromptResponsesManager() {
  const router = useRouter();
  const [responses, setResponses] = useState<WritingPromptResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('writing_prompt_responses')
        .select(`
          *,
          oc:ocs!writing_prompt_responses_oc_id_fkey(id, name, slug),
          other_oc:ocs!writing_prompt_responses_other_oc_id_fkey(id, name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading responses:', error);
        alert('Failed to load responses');
      } else {
        setResponses(data || []);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
      alert('Failed to load responses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/writing-prompt-responses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete response');
      }

      await loadResponses();
    } catch (error: any) {
      console.error('Error deleting response:', error);
      alert(error.message || 'Failed to delete response');
    }
  };

  // Get unique categories
  const categories = Array.from(new Set(responses.map(r => r.category))).sort();

  // Filter responses
  const filteredResponses = responses.filter(response => {
    if (filterCategory && response.category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesPrompt = response.prompt_text.toLowerCase().includes(query);
      const matchesResponse = response.response_text.toLowerCase().includes(query);
      const matchesCharacter = response.oc?.name.toLowerCase().includes(query) || false;
      const matchesOtherCharacter = response.other_oc?.name.toLowerCase().includes(query) || false;
      if (!matchesPrompt && !matchesResponse && !matchesCharacter && !matchesOtherCharacter) {
        return false;
      }
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading responses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Writing Prompt Responses</h1>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt, response, or character name..."
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded-md border border-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <div className="text-sm text-gray-400">
          Showing {filteredResponses.length} of {responses.length} responses
        </div>
      </div>

      {/* Responses */}
      <div className="space-y-4">
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No responses found matching your filters.
          </div>
        ) : (
          filteredResponses.map((response) => (
            <div
              key={response.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30">
                      {response.category}
                    </span>
                    {response.oc && (
                      <Link
                        href={`/admin/ocs/${response.oc.id}`}
                        className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                      >
                        <i className="fas fa-user mr-1"></i>
                        {response.oc.name}
                      </Link>
                    )}
                    {response.other_oc && (
                      <>
                        <span className="text-gray-500">×</span>
                        <Link
                          href={`/admin/ocs/${response.other_oc.id}`}
                          className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                        >
                          <i className="fas fa-user mr-1"></i>
                          {response.other_oc.name}
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="mb-3 p-3 bg-gray-900/50 rounded border border-gray-700/50">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Prompt</div>
                    <p className="text-gray-200">{response.prompt_text}</p>
                  </div>
                  <div className="mb-3">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Response</div>
                    <p className="text-gray-300 whitespace-pre-wrap">{response.response_text}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {response.updated_at && response.updated_at !== response.created_at
                      ? `Updated ${format(new Date(response.updated_at), 'MMM d, yyyy')}`
                      : `Added ${format(new Date(response.created_at), 'MMM d, yyyy')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/writing-prompt-responses/${response.id}`}
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-sm font-medium hover:bg-purple-500/30 transition-colors"
                  >
                    <i className="fas fa-edit"></i>
                  </Link>
                  <button
                    onClick={() => handleDelete(response.id)}
                    className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

