'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface StorySnippet {
  id: string;
  title: string;
  snippet_text: string;
  created_at?: string;
  updated_at?: string;
}

interface StorySnippetsProps {
  snippets: StorySnippet[];
  showTitle?: boolean;
}

function SnippetItem({ 
  snippet, 
  isExpanded, 
  onToggle 
}: { 
  snippet: StorySnippet; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const shouldTruncate = snippet.snippet_text.length > 300;
  const displayText = isExpanded || !shouldTruncate
    ? snippet.snippet_text
    : `${snippet.snippet_text.substring(0, 300)}...`;

  return (
    <div
      className="border-l-4 border-purple-400 pl-4 py-3 hover:bg-gray-800/30 transition-colors rounded-r-lg"
    >
      <h3 className="text-lg font-semibold text-gray-100 mb-2">{snippet.title}</h3>
      <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
        {displayText}
      </div>
      {shouldTruncate && (
        <button
          onClick={onToggle}
          className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {(snippet.created_at || snippet.updated_at) && (
        <p className="mt-2 text-gray-400 text-xs">
          {snippet.updated_at && snippet.updated_at !== snippet.created_at
            ? `Updated ${format(new Date(snippet.updated_at), 'MMM d, yyyy')}`
            : snippet.created_at
            ? `Added ${format(new Date(snippet.created_at), 'MMM d, yyyy')}`
            : null}
        </p>
      )}
    </div>
  );
}

export function StorySnippets({ snippets, showTitle = true }: StorySnippetsProps) {
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);

  if (!snippets || snippets.length === 0) {
    return null;
  }

  const snippetsContent = (
    <div className="space-y-4">
      {snippets.map((snippet) => (
        <SnippetItem
          key={snippet.id}
          snippet={snippet}
          isExpanded={expandedSnippet === snippet.id}
          onToggle={() => setExpandedSnippet(expandedSnippet === snippet.id ? null : snippet.id)}
        />
      ))}
    </div>
  );

  if (showTitle) {
    return (
      <section className="wiki-card p-4 md:p-6 lg:p-8">
        <h2 id="story-snippets" className="wiki-section-header scroll-mt-20 mb-4">
          <i className="fas fa-book-open text-purple-400" aria-hidden="true"></i>
          Story Snippets
        </h2>
        {snippetsContent}
      </section>
    );
  }

  return snippetsContent;
}