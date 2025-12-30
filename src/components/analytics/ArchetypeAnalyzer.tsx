'use client';

import type { OC } from '@/types/oc';

interface ArchetypeAnalyzerProps {
  ocs: OC[];
  className?: string;
}

export function ArchetypeAnalyzer({ ocs, className = '' }: ArchetypeAnalyzerProps) {
  // Analyze character archetypes based on alignment
  const alignmentCounts: Record<string, number> = {};
  ocs.forEach((oc) => {
    const alignment = oc.alignment || 'unknown';
    alignmentCounts[alignment] = (alignmentCounts[alignment] || 0) + 1;
  });

  // Analyze status distribution
  const statusCounts: Record<string, number> = {};
  ocs.forEach((oc) => {
    const status = oc.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Suggest diversity improvements
  const suggestions: string[] = [];
  
  if (Object.keys(alignmentCounts).length < 5) {
    suggestions.push('Consider adding more diverse character alignments');
  }
  
  if (statusCounts['alive'] && statusCounts['alive'] / ocs.length > 0.9) {
    suggestions.push('Most characters are alive - consider adding more variety in status');
  }

  const hasDnDStats = ocs.filter(oc => oc.stat_strength || oc.stat_dexterity).length;
  if (hasDnDStats / ocs.length < 0.5) {
    suggestions.push('Less than half of characters have D&D stats - consider adding more');
  }

  const hasImages = ocs.filter(oc => oc.image_url).length;
  if (hasImages / ocs.length < 0.8) {
    suggestions.push(`Only ${Math.round((hasImages / ocs.length) * 100)}% of characters have images - consider adding more visual content`);
  }

  return (
    <div className={className}>
      {/* Diversity Suggestions */}
      {suggestions.length > 0 && (
        <div className="wiki-card p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <i className="fas fa-lightbulb text-yellow-400"></i>
            Diversity & Completion Suggestions
          </h3>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-300">
                <i className="fas fa-arrow-right text-purple-400 mt-1"></i>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="wiki-card p-4 md:p-6 text-center text-gray-400">
          <i className="fas fa-check-circle text-green-400 text-4xl mb-2"></i>
          <p>Great diversity and completion in your character collection!</p>
        </div>
      )}
    </div>
  );
}

