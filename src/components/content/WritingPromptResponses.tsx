'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

interface WritingPromptResponse {
  id: string;
  oc_id: string;
  other_oc_id?: string | null;
  category: string;
  prompt_text: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  other_oc?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface WritingPromptResponsesProps {
  responses: WritingPromptResponse[];
  showTitle?: boolean;
}

export function WritingPromptResponses({ responses, showTitle = true }: WritingPromptResponsesProps) {
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  if (!responses || responses.length === 0) {
    return null;
  }

  // Sort by date, newest first
  const sortedResponses = [...responses].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <section className="wiki-card p-4 md:p-6 lg:p-8">
      {showTitle && (
        <h2 id="writing-prompts" className="wiki-section-header scroll-mt-20 mb-4">
          <i className="fas fa-pen-fancy text-purple-400" aria-hidden="true"></i>
          Writing Prompt Responses
        </h2>
      )}
      <div className="space-y-6">
        {sortedResponses.map((response) => {
          const isExpanded = expandedResponse === response.id;
          const shouldTruncate = response.response_text.length > 500;
          const displayText = isExpanded || !shouldTruncate
            ? response.response_text
            : `${response.response_text.substring(0, 500)}...`;

          return (
            <div
              key={response.id}
              className="border-l-4 border-purple-400 pl-5 py-4 bg-gradient-to-r from-gray-800/30 to-transparent hover:from-gray-800/50 transition-colors rounded-r-lg"
            >
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 rounded-lg">
                  <i className="fas fa-tag text-purple-400 text-xs"></i>
                  <span className="text-purple-300 font-semibold text-xs uppercase tracking-wider">
                    {response.category}
                  </span>
                </span>
                {response.other_oc && (
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <i className="fas fa-user-friends text-purple-400"></i>
                    with{' '}
                    <Link 
                      href={`/ocs/${response.other_oc.slug}`}
                      className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                    >
                      {response.other_oc.name}
                    </Link>
                  </span>
                )}
              </div>
              
              <div className="mb-4 p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg border border-gray-700/50">
                <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-quote-left text-purple-400 text-xs"></i>
                  Prompt
                </div>
                <p className="text-gray-200 text-lg leading-relaxed font-medium">
                  {response.prompt_text}
                </p>
              </div>

              <div className="mb-3">
                <div className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-pen-nib text-purple-400 text-xs"></i>
                  Response
                </div>
                <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {displayText}
                </div>
                {shouldTruncate && (
                  <button
                    onClick={() => setExpandedResponse(isExpanded ? null : response.id)}
                    className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium flex items-center gap-2"
                  >
                    {isExpanded ? (
                      <>
                        <i className="fas fa-chevron-up"></i>
                        Show less
                      </>
                    ) : (
                      <>
                        <i className="fas fa-chevron-down"></i>
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-gray-500 text-xs mt-4 pt-3 border-t border-gray-700/50">
                {response.updated_at && response.updated_at !== response.created_at ? (
                  <span>Updated {format(new Date(response.updated_at), 'MMM d, yyyy')}</span>
                ) : (
                  <span>Added {format(new Date(response.created_at), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

