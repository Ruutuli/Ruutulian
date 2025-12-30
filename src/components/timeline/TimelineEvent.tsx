import type { TimelineEvent as TimelineEventType, EventDateData } from '@/types/oc';
import { Markdown } from '@/lib/utils/markdown';

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
      const parts = [dateData.year.toString()];
      if (dateData.month) parts.push(dateData.month.toString().padStart(2, '0'));
      if (dateData.day) parts.push(dateData.day.toString().padStart(2, '0'));
      return parts.join('-');
    case 'approximate':
      return dateData.text;
    case 'range':
      const startParts = [dateData.start.year.toString()];
      if (dateData.start.month) startParts.push(dateData.start.month.toString().padStart(2, '0'));
      if (dateData.start.day) startParts.push(dateData.start.day.toString().padStart(2, '0'));
      const endParts = [dateData.end.year.toString()];
      if (dateData.end.month) endParts.push(dateData.end.month.toString().padStart(2, '0'));
      if (dateData.end.day) endParts.push(dateData.end.day.toString().padStart(2, '0'));
      return `${startParts.join('-')} to ${endParts.join('-')}${dateData.text ? ` (${dateData.text})` : ''}`;
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
                  className="text-xs px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded"
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
              <p className="text-sm text-gray-400 mb-2">Characters Involved:</p>
              <div className="flex flex-wrap gap-2">
                {event.characters.map((char) => (
                  <a
                    key={char.id}
                    href={`/ocs/${char.oc?.slug}`}
                    className="text-sm text-purple-400 hover:text-purple-300 bg-gray-800 px-2 py-1 rounded"
                  >
                    {char.oc?.name}
                    {char.role && (
                      <span className="text-gray-500 ml-1">({char.role})</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
