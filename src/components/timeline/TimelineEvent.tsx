import type { TimelineEvent as TimelineEventType, EventDateData } from '@/types/oc';
import { Markdown } from '@/lib/utils/markdown';
import { getCategoryColorClasses } from '@/lib/utils/categoryColors';
import { calculateAge } from '@/lib/utils/ageCalculation';

interface TimelineEventProps {
  event: TimelineEventType;
}

function formatDateData(dateData: EventDateData | null | undefined): string {
  if (!dateData) return '';
  
  // Handle case where dateData might be a string (invalid JSON from DB)
  if (typeof dateData === 'string') {
    return dateData;
  }
  
  // Ensure dateData has a type property
  if (typeof dateData !== 'object' || !('type' in dateData)) {
    return '';
  }
  
  switch (dateData.type) {
    case 'exact':
      const exact = dateData as any;
      const eraPrefix = exact.era ? `${exact.era} ` : '';
      const yearStr = exact.year.toString().padStart(4, '0');
      const approximateSuffix = exact.approximate ? ' ~' : '';
      
      if (exact.month && exact.day) {
        const monthStr = exact.month.toString().padStart(2, '0');
        const dayStr = exact.day.toString().padStart(2, '0');
        return `${eraPrefix}${yearStr}-${monthStr}-${dayStr}${approximateSuffix}`;
      }
      return `${eraPrefix}${yearStr}${approximateSuffix}`;
    case 'approximate':
      return dateData.text;
    case 'range':
      const range = dateData as any;
      const startEra = range.start?.era ? `${range.start.era} ` : '';
      const endEra = range.end?.era ? `${range.end.era} ` : '';
      const startParts = [range.start.year.toString().padStart(4, '0')];
      if (range.start.month) startParts.push(range.start.month.toString().padStart(2, '0'));
      if (range.start.day) startParts.push(range.start.day.toString().padStart(2, '0'));
      const endParts = [range.end.year.toString().padStart(4, '0')];
      if (range.end.month) endParts.push(range.end.month.toString().padStart(2, '0'));
      if (range.end.day) endParts.push(range.end.day.toString().padStart(2, '0'));
      const separator = range.start?.era && range.end?.era && range.start.era === range.end.era ? '–' : ' to ';
      return `${startEra}${startParts.join('-')}${separator}${endEra}${endParts.join('-')}${range.text ? ` (${range.text})` : ''}`;
    case 'relative':
      return dateData.text;
    case 'unknown':
      return dateData.text || 'Date unknown';
    default:
      return '';
  }
}

export function TimelineEvent({ event }: TimelineEventProps) {
  const displayDate = event.date_data ? formatDateData(event.date_data) : event.date_text;

  return (
    <div className="wiki-card p-6 mb-4 relative">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-purple-500 mt-2" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-xl font-bold text-gray-100">{event.title}</h3>
            {event.story_alias && (
              <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs font-semibold">
                {event.story_alias.name}
              </span>
            )}
            {event.is_key_event && (
              <span className="px-2 py-1 bg-yellow-600/30 text-yellow-300 rounded text-xs font-semibold">
                KEY EVENT
              </span>
            )}
            {displayDate && (
              <span className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                {displayDate}
              </span>
            )}
            {event.location && (
              <span className="text-sm text-gray-400 italic">
                📍 {event.location}
              </span>
            )}
          </div>
          
          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {event.categories.map((cat) => (
                <span
                  key={cat}
                  className={`text-xs px-2 py-0.5 rounded border ${getCategoryColorClasses(cat)}`}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Description summary */}
          {event.description && (
            <p className="text-gray-300 mb-3">{event.description}</p>
          )}

          {/* Full description markdown */}
          {event.description_markdown && (
            <div className="text-gray-300 mb-3 prose prose-invert max-w-none">
              <Markdown content={event.description_markdown} />
            </div>
          )}

          {/* Characters */}
          {event.characters && event.characters.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Characters:{' '}
                {event.characters.map((char, index) => {
                  const characterName = char.custom_name || char.oc?.name;
                  const age = char.oc?.date_of_birth && event.date_data
                    ? calculateAge(char.oc.date_of_birth, event.date_data)
                    : null;
                  
                  return (
                    <span key={char.id}>
                      {char.oc?.slug ? (
                        <a
                          href={`/ocs/${char.oc.slug}`}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {characterName}
                        </a>
                      ) : (
                        <span className="text-gray-300">{characterName}</span>
                      )}
                      {age !== null && ` (${age})`}
                      {index < event.characters.length - 1 && ', '}
                    </span>
                  );
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
