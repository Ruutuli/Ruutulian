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
    if (!newSnippet.title.trim() || !newSnippet.snippet_text.trim()) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('story_snippets')
      .insert({
        oc_id: ocId,
        title: newSnippet.title,
        snippet_text: newSnippet.snippet_text,
      })
      .select()
      .single();

    if (!error && data) {
      setSnippets([data, ...snippets]);
      setNewSnippet({ title: '', snippet_text: '' });
    }
    setIsSaving(false);
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    const { error } = await supabase
      .from('story_snippets')
      .delete()
      .eq('id', snippetId);

    if (!error) {
      setSnippets(snippets.filter(s => s.id !== snippetId));
    }
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
            onChange={(e) => setNewSnippet({ ...newSnippet, title: e.target.value })}
            placeholder="Snippet title..."
            className="mb-3"
          />
          <FormLabel htmlFor="new-snippet-text">Snippet Text</FormLabel>
          <FormTextarea
            id="new-snippet-text"
            value={newSnippet.snippet_text}
            onChange={(e) => setNewSnippet({ ...newSnippet, snippet_text: e.target.value })}
            placeholder="Enter story excerpt..."
            rows={5}
            className="mb-3"
          />
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleAddSnippet}
            disabled={isSaving || !newSnippet.title.trim() || !newSnippet.snippet_text.trim()}
            isLoading={isSaving}
          >
            <i className="fas fa-plus mr-2"></i>
            Add Snippet
          </FormButton>
        </div>
      </div>
    </FormSection>
  );
}

