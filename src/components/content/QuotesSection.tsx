'use client';

import { useState } from 'react';

interface Quote {
  id: string;
  quote_text: string;
  context?: string | null;
  created_at?: string;
}

interface QuotesSectionProps {
  quotes: Quote[];
  ocName?: string;
  showTitle?: boolean;
}

export function QuotesSection({ quotes, ocName, showTitle = true }: QuotesSectionProps) {
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);

  if (!quotes || quotes.length === 0) {
    return null;
  }

  return (
    <section className="wiki-card p-4 md:p-6 lg:p-8">
      {showTitle && (
        <h2 id="quotes" className="wiki-section-header scroll-mt-20 mb-4">
          <i className="fas fa-quote-left text-purple-400" aria-hidden="true"></i>
          Quotes
        </h2>
      )}
      <div className="space-y-4">
        {quotes.map((quote, index) => (
          <div
            key={quote.id || index}
            className="border-l-4 border-purple-400 pl-4 py-2 hover:bg-gray-800/30 transition-colors rounded-r-lg"
          >
            <blockquote className="text-gray-200 italic text-lg leading-relaxed">
              &ldquo;{quote.quote_text}&rdquo;
            </blockquote>
            {quote.context && (
              <div className="mt-2">
                <button
                  onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id || String(index))}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                >
                  {expandedQuote === (quote.id || String(index)) ? 'Hide' : 'Show'} context
                </button>
                {expandedQuote === (quote.id || String(index)) && (
                  <p className="mt-2 text-gray-400 text-sm">{quote.context}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Component for displaying a single quote (for homepage quote of the day)
interface QuoteOfTheDayProps {
  quote: Quote;
  ocName: string;
  ocSlug?: string;
}

export function QuoteOfTheDay({ quote, ocName, ocSlug }: QuoteOfTheDayProps) {
  return (
    <div className="wiki-card p-4 md:p-6 border-l-4 border-purple-400">
      <div className="flex items-center gap-2 mb-3">
        <i className="fas fa-quote-left text-purple-400"></i>
        <h3 className="text-lg font-semibold text-gray-200">Quote of the Day</h3>
      </div>
      <blockquote className="text-gray-200 italic text-lg leading-relaxed mb-3">
        &ldquo;{quote.quote_text}&rdquo;
      </blockquote>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">
            &mdash; {ocName}
            {quote.context && <span className="ml-2 text-gray-500">({quote.context})</span>}
          </p>
        </div>
        {ocSlug && (
          <a
            href={`/ocs/${ocSlug}`}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            View Character →
          </a>
        )}
      </div>
    </div>
  );
}

