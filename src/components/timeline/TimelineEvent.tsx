import Image from 'next/image';
import type { TimelineEvent as TimelineEventType, EventDateData } from '@/types/oc';
import { Markdown } from '@/lib/utils/markdown';
import { getCategoryColorClasses, getCategoryCardAccentClasses, getFallbackCardAccentClasses } from '@/lib/utils/categoryColors';
import { calculateAge } from '@/lib/utils/ageCalculation';
import { convertGoogleDriveUrl, getProxyUrl, shouldUseUnoptimizedImage } from '@/lib/utils/googleDriveImage';

interface TimelineEventProps {
  event: TimelineEventType;
  isLast?: boolean;
}

/** Format full date for top-left: exact date, "Mid 1977", range, or date_text fallback. */
function getFullDateLabel(
  dateData: EventDateData | null | undefined,
  dateText: string | null | undefined
): string {
  if (dateData && typeof dateData === 'object' && 'type' in dateData) {
    const d = dateData as any;
    switch (d.type) {
      case 'exact': {
        const era = d.era ? `${d.era} ` : '';
        const y = d.year != null ? d.year.toString().padStart(4, '0') : '';
        if (d.month != null && d.day != null) {
          const m = d.month.toString().padStart(2, '0');
          const day = d.day.toString().padStart(2, '0');
          return `${era}${y}-${m}-${day}${d.approximate ? ' ~' : ''}`;
        }
        return `${era}${y}${d.approximate ? ' ~' : ''}`;
      }
      case 'approximate': {
        const periodLabel = d.period ? d.period.charAt(0).toUpperCase() + d.period.slice(1) : '';
        const era = d.era ? `${d.era} ` : '';
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = d.month != null && d.month >= 1 && d.month <= 12 ? monthNames[d.month - 1] : null;
        // "Early March 1977" or "Early March" or "Mid 1977" (year-only period)
        if (periodLabel && monthName) {
          const yearPart = d.year != null ? ` ${d.year}` : '';
          return `${periodLabel} ${monthName}${yearPart}`;
        }
        if (d.year != null) {
          const y = d.year.toString().padStart(4, '0');
          return periodLabel ? `${periodLabel} ${y}` : `~${era}${y}`;
        }
        if (d.year_range && Array.isArray(d.year_range) && d.year_range.length === 2) {
          const a = d.year_range[0].toString().padStart(4, '0');
          const b = d.year_range[1].toString().padStart(4, '0');
          return periodLabel ? `${periodLabel} ${a}–${b}` : `~${era}${a}–${b}`;
        }
        return d.text || 'Approximate date';
      }
      case 'range': {
        const startEra = d.start?.era ? `${d.start.era} ` : '';
        const endEra = d.end?.era ? `${d.end.era} ` : '';
        const startParts = [d.start?.year != null ? d.start.year.toString().padStart(4, '0') : ''];
        if (d.start?.month) startParts.push(d.start.month.toString().padStart(2, '0'));
        if (d.start?.day) startParts.push(d.start.day.toString().padStart(2, '0'));
        const endParts = [d.end?.year != null ? d.end.year.toString().padStart(4, '0') : ''];
        if (d.end?.month) endParts.push(d.end.month.toString().padStart(2, '0'));
        if (d.end?.day) endParts.push(d.end.day.toString().padStart(2, '0'));
        const start = startEra + startParts.join('-');
        const end = endEra + endParts.join('-');
        return start && end ? `${start} – ${end}` : start || end;
      }
      case 'relative':
        return d.text || 'Relative date';
      case 'unknown':
        return d.text || 'Date unknown';
      default:
        return '';
    }
  }
  if (dateText && typeof dateText === 'string') return dateText.trim();
  return '';
}

/** Extract year-only string for display in top-right (e.g. "2024", "2020–2022", or from date_text). */
function getYearFromDateData(
  dateData: EventDateData | null | undefined,
  dateText: string | null | undefined
): string {
  if (dateData && typeof dateData === 'object' && 'type' in dateData) {
    const d = dateData as any;
    switch (d.type) {
      case 'exact':
        return d.year != null ? d.year.toString().padStart(4, '0') : '';
      case 'approximate':
        if (d.year != null) return d.year.toString().padStart(4, '0');
        if (d.year_range && Array.isArray(d.year_range) && d.year_range.length === 2) {
          return `${d.year_range[0].toString().padStart(4, '0')}–${d.year_range[1].toString().padStart(4, '0')}`;
        }
        return '';
      case 'range':
        const start = d.start?.year != null ? d.start.year.toString().padStart(4, '0') : '';
        const end = d.end?.year != null ? d.end.year.toString().padStart(4, '0') : '';
        return start && end ? `${start}–${end}` : start || end;
      default:
        return '';
    }
  }
  if (dateText && typeof dateText === 'string') {
    const fourDigit = /\b(1\d{3}|2\d{3})\b/.exec(dateText);
    return fourDigit ? fourDigit[1] : '';
  }
  return '';
}

export function TimelineEvent({ event, isLast }: TimelineEventProps) {
  const fullDateLabel = getFullDateLabel(event.date_data, event.date_text ?? undefined);
  const displayYear = getYearFromDateData(event.date_data, event.date_text ?? undefined);
  const cardAccent = event.categories?.[0]
    ? getCategoryCardAccentClasses(event.categories[0])
    : getFallbackCardAccentClasses(event.id);

  return (
    <div className="relative flex items-center gap-6 pb-12 last:pb-0">
      {/* Timeline column - fixed width, contains only the dot */}
      <div className="flex-shrink-0 flex items-center justify-center w-12 md:w-16">
        {/* Timeline dot - vertically centered with event card */}
        <div className={`relative z-20 w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-gray-800 shadow-lg shadow-purple-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          event.is_key_event 
            ? 'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-gray-900 shadow-[0_0_12px_rgba(250,204,21,0.5)]' 
            : 'hover:shadow-purple-500/70'
        }`}>
          {event.is_key_event && (
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          )}
        </div>
      </div>

      {/* Event content - color-coded by category (or stable fallback by id) */}
      <div className="flex-1 min-w-0">
        <div className={`wiki-card p-5 md:p-6 transition-all duration-300 ${cardAccent}`}>
          {/* Event image */}
          {event.image_url && event.image_url.trim() && (
            <div className="relative w-full aspect-video max-h-64 rounded-lg overflow-hidden mb-4 bg-gray-800/50">
              <Image
                src={
                  event.image_url.includes('drive.google.com')
                    ? getProxyUrl(event.image_url)
                    : convertGoogleDriveUrl(event.image_url)
                }
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
                unoptimized={shouldUseUnoptimizedImage(
                  event.image_url.includes('drive.google.com')
                    ? getProxyUrl(event.image_url)
                    : convertGoogleDriveUrl(event.image_url)
                )}
              />
            </div>
          )}
          {/* Top row: full date (exact / Mid 1977 / range) on left, year on right */}
          {(fullDateLabel || displayYear) && (
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              {fullDateLabel && (
                <span className="text-sm font-medium text-purple-200/90">
                  {fullDateLabel}
                </span>
              )}
              {displayYear && (
                <span className="flex-shrink-0 text-sm font-semibold text-purple-300 tabular-nums">
                  {displayYear}
                </span>
              )}
            </div>
          )}
          {/* Title row: title + key event badge */}
          <div className="mb-4">
            <div className="flex items-start gap-3 flex-wrap mb-2">
              <h3 className="text-xl md:text-2xl font-bold text-gray-100 leading-tight">
                {event.title}
              </h3>
              {event.is_key_event && (
                <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-600/40 to-yellow-500/30 text-yellow-300 rounded-lg text-xs font-bold uppercase tracking-wide border border-yellow-500/30 shadow-sm whitespace-nowrap">
                  ⭐ Key Event
                </span>
              )}
            </div>
          </div>

          {/* Story alias and location - inline */}
          {(event.story_alias || event.location) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {event.story_alias && (
                <span className="px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-md text-xs font-semibold border border-purple-500/30">
                  {event.story_alias.name}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-gray-400 bg-gray-700/30 rounded-md border border-gray-600/30">
                  <i className="fas fa-map-marker-alt text-xs" aria-hidden="true"></i>
                  {event.location}
                </span>
              )}
            </div>
          )}
          
          {/* Categories */}
          {event.categories && event.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {event.categories.map((cat) => (
                <span
                  key={cat}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium ${getCategoryColorClasses(cat)}`}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-gray-300 mb-4 leading-relaxed">{event.description}</p>
          )}

          {/* Full description markdown */}
          {event.description_markdown && (
            <div className="text-gray-300 mb-4 prose prose-invert max-w-none prose-sm">
              <Markdown content={event.description_markdown} />
            </div>
          )}

          {/* Characters */}
          {event.characters && event.characters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <p className="text-sm text-gray-400 mb-2 font-medium">
                <i className="fas fa-users mr-1.5" aria-hidden="true"></i>
                Characters:
              </p>
              <div className="flex flex-wrap gap-2">
                {event.characters.map((char) => {
                  const characterName = char.custom_name || char.oc?.name;
                  // Use char.age directly if available, otherwise calculate from date_of_birth
                  let age: number | null = null;
                  if (char.age !== null && char.age !== undefined) {
                    age = char.age;
                  } else if (char.oc?.date_of_birth && event.date_data) {
                    age = calculateAge(char.oc.date_of_birth, event.date_data);
                  }
                  
                  return (
                    <span key={char.id} className="inline-flex items-center">
                      {char.oc?.slug ? (
                        <a
                          href={`/ocs/${char.oc.slug}`}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 rounded-md text-sm font-medium transition-colors border border-purple-500/30"
                        >
                          {characterName}
                          {age !== null && <span className="text-purple-400/70 ml-1">({age})</span>}
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-700/30 text-gray-300 rounded-md text-sm border border-gray-600/30">
                          {characterName}
                          {age !== null && <span className="text-gray-400 ml-1">({age})</span>}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
