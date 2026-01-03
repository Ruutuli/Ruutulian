'use client';

import { useState, useEffect } from 'react';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { createClient } from '@/lib/supabase/client';

interface StorySnippet {
  id: string;
  title: string;
  snippet_text: string;
}

interface StorySnippetsFormSectionProps {
  ocId: string;
}

export function StorySnippetsFormSection({ ocId }: StorySnippetsFormSectionProps) {
  const [snippets, setSnippets] = useState<StorySnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSnippet, setNewSnippet] = useState({ title: '', snippet_text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSnippets() {
      const { data } = await supabase
        .from('story_snippets')
        .select('*')
        .eq('oc_id', ocId)
        .order('created_at', { ascending: false });
      
      if (data) {
        setSnippets(data);
      }
      setLoading(false);
    }

    if (ocId) {
      fetchSnippets();
    }
  }, [ocId, supabase]);

  const handleAddSnippet = async () => {
    if (!newSnippet.title.trim() || !newSnippet.snippet_text.trim()) {
      setError('Please fill in both title and snippet text');
      return;
    }

    if (!ocId) {
      setError('OC ID is missing. Please save the character first before adding story snippets.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error: insertError } = await supabase
      .from('story_snippets')
      .insert({
        oc_id: ocId,
        title: newSnippet.title.trim(),
        snippet_text: newSnippet.snippet_text.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving story snippet:', insertError);
      setError(`Failed to save snippet: ${insertError.message}`);
      setIsSaving(false);
      return;
    }

    if (data) {
      setSnippets([data, ...snippets]);
      setNewSnippet({ title: '', snippet_text: '' });
      setSuccessMessage('Story snippet saved successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setIsSaving(false);
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    if (!confirm('Are you sure you want to delete this story snippet?')) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('story_snippets')
      .delete()
      .eq('id', snippetId);

    if (deleteError) {
      console.error('Error deleting story snippet:', deleteError);
      setError(`Failed to delete snippet: ${deleteError.message}`);
      return;
    }

    setSnippets(snippets.filter(s => s.id !== snippetId));
    setSuccessMessage('Story snippet deleted successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <FormSection title="Story Snippets" icon="book" accentColor="content" defaultOpen={false}>
        <p className="text-gray-400">Loading snippets...</p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Story Snippets" icon="book" accentColor="content" defaultOpen={false}>
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300 text-sm">
            <i className="fas fa-check-circle mr-2"></i>
            {successMessage}
          </div>
        )}

        {/* Existing Snippets */}
        {snippets.length > 0 && (
          <div className="space-y-3">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-100 mb-1">{snippet.title}</h4>
                    <p className="text-gray-300 text-sm line-clamp-3">{snippet.snippet_text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete snippet"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Snippet */}
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
          <FormLabel htmlFor="new-snippet-title">Title</FormLabel>
          <FormInput
            id="new-snippet-title"
            type="text"
            value={newSnippet.title}
            onChange={(e) => {
              setNewSnippet({ ...newSnippet, title: e.target.value });
              setError(null); // Clear error when user types
            }}
            placeholder="Snippet title..."
            className="mb-3"
          />
          <FormLabel htmlFor="new-snippet-text">Snippet Text</FormLabel>
          <FormTextarea
            id="new-snippet-text"
            value={newSnippet.snippet_text}
            onChange={(e) => {
              setNewSnippet({ ...newSnippet, snippet_text: e.target.value });
              setError(null); // Clear error when user types
            }}
            placeholder="Enter story excerpt..."
            rows={5}
            className="mb-3"
          />
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleAddSnippet}
            disabled={isSaving || !newSnippet.title.trim() || !newSnippet.snippet_text.trim() || !ocId}
            isLoading={isSaving}
          >
            <i className="fas fa-plus mr-2"></i>
            Add Snippet
          </FormButton>
          {!ocId && (
            <p className="mt-2 text-sm text-yellow-400">
              <i className="fas fa-info-circle mr-1"></i>
              Please save the character first before adding story snippets.
            </p>
          )}
        </div>
      </div>
    </FormSection>
  );
}



