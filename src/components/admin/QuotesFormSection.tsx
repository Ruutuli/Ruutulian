'use client';

import { useState, useEffect } from 'react';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { createClient } from '@/lib/supabase/client';

interface Quote {
  id: string;
  quote_text: string;
  context?: string | null;
}

interface QuotesFormSectionProps {
  ocId: string;
}

export function QuotesFormSection({ ocId }: QuotesFormSectionProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuote, setNewQuote] = useState({ quote_text: '', context: '' });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchQuotes() {
      const { data } = await supabase
        .from('character_quotes')
        .select('*')
        .eq('oc_id', ocId)
        .order('created_at', { ascending: false });
      
      if (data) {
        setQuotes(data);
      }
      setLoading(false);
    }

    if (ocId) {
      fetchQuotes();
    }
  }, [ocId, supabase]);

  const handleAddQuote = async () => {
    if (!newQuote.quote_text.trim()) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('character_quotes')
      .insert({
        oc_id: ocId,
        quote_text: newQuote.quote_text,
        context: newQuote.context || null,
      })
      .select()
      .single();

    if (!error && data) {
      setQuotes([data, ...quotes]);
      setNewQuote({ quote_text: '', context: '' });
    }
    setIsSaving(false);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    const { error } = await supabase
      .from('character_quotes')
      .delete()
      .eq('id', quoteId);

    if (!error) {
      setQuotes(quotes.filter(q => q.id !== quoteId));
    }
  };

  if (loading) {
    return (
      <FormSection title="Quotes" icon="quote" accentColor="content" defaultOpen={false}>
        <p className="text-gray-400">Loading quotes...</p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Quotes" icon="quote" accentColor="content" defaultOpen={false}>
      <div className="space-y-4">
        {/* Existing Quotes */}
        {quotes.length > 0 && (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div key={quote.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <blockquote className="text-gray-200 italic flex-1">
                    &ldquo;{quote.quote_text}&rdquo;
                  </blockquote>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuote(quote.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete quote"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                {quote.context && (
                  <p className="text-sm text-gray-400 mt-2">Context: {quote.context}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Quote */}
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
          <FormLabel htmlFor="new-quote-text">Add New Quote</FormLabel>
          <FormTextarea
            id="new-quote-text"
            value={newQuote.quote_text}
            onChange={(e) => setNewQuote({ ...newQuote, quote_text: e.target.value })}
            placeholder="Enter quote text..."
            rows={3}
            className="mb-3"
          />
          <FormLabel htmlFor="new-quote-context">Context (Optional)</FormLabel>
          <FormTextarea
            id="new-quote-context"
            value={newQuote.context}
            onChange={(e) => setNewQuote({ ...newQuote, context: e.target.value })}
            placeholder="When/where was this said?"
            rows={2}
            className="mb-3"
          />
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleAddQuote}
            disabled={isSaving || !newQuote.quote_text.trim()}
            isLoading={isSaving}
          >
            <i className="fas fa-plus mr-2"></i>
            Add Quote
          </FormButton>
        </div>
      </div>
    </FormSection>
  );
}


