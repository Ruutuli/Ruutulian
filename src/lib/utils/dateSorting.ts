import type { EventDateData, ExactDate, DateRange } from '@/types/oc';
import { compareEraDates } from './eraDates';
import type { EraDate } from './eraDates';

/**
 * Convert EventDateData to EraDate for comparison
 */
function eventDateToEraDate(dateData: EventDateData | null | undefined, eraOrder?: string[]): EraDate | null {
  if (!dateData || dateData.type !== 'exact') return null;
  
  const exact = dateData as ExactDate;
  if (!exact.era) return null;
  
  return {
    era: exact.era,
    year: exact.year,
    month: exact.month,
    day: exact.day,
  };
}

/**
 * Get sort value for a date - lower values sort first
 * Handles era-based dates where eras have custom ordering
 */
export function getDateSortValue(dateData: EventDateData | null | undefined, eraOrder?: string[]): number {
  if (!dateData) return Infinity;
  
  if (dateData.type === 'exact') {
    const exact = dateData as ExactDate;
    const eraDate = eventDateToEraDate(dateData, eraOrder);
    
    if (eraDate && eraOrder && eraOrder.length > 0) {
      // Use era order from timeline
      const eraIndex = eraOrder.indexOf(eraDate.era);
      if (eraIndex >= 0) {
        // Era found in order - use index * 1000000 to ensure eras sort correctly
        // Then add year/month/day for fine sorting within era
        const baseValue = eraIndex * 1000000;
        const yearValue = eraDate.year * 10000;
        const monthValue = (eraDate.month || 0) * 100;
        const dayValue = eraDate.day || 0;
        return baseValue + yearValue + monthValue + dayValue;
      }
    }
    
    // Fallback: if era exists but not in order, or no era order provided
    // Use a simple numeric sort (negative for BE-like, positive for SE-like)
    if (exact.era) {
      // For custom eras, use a hash-like approach
      const eraHash = exact.era.charCodeAt(0) * 1000;
      return eraHash + exact.year * 10000 + (exact.month || 0) * 100 + (exact.day || 0);
    }
    
    // No era - standard numeric sort
    return exact.year * 10000 + (exact.month || 0) * 100 + (exact.day || 0);
  }
  
  if (dateData.type === 'range') {
    const range = dateData as DateRange;
    // Use start date for sorting
    return getDateSortValue({ type: 'exact', era: range.start?.era, year: range.start.year, month: range.start.month, day: range.start.day } as ExactDate, eraOrder);
  }
  
  if (dateData.type === 'approximate' && (dateData as any).year) {
    const approx = dateData as any;
    return getDateSortValue({ type: 'exact', era: null, year: approx.year } as ExactDate, eraOrder);
  }
  
  // For other types, return a high value so they sort last
  return Infinity;
}

/**
 * Compare two EventDateData objects for sorting
 * Uses era order if provided
 */
export function compareEventDates(a: EventDateData | null | undefined, b: EventDateData | null | undefined, eraOrder?: string[]): number {
  const aValue = getDateSortValue(a, eraOrder);
  const bValue = getDateSortValue(b, eraOrder);
  return aValue - bValue;
}

