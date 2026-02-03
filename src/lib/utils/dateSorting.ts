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
 * 
 * CRITICAL: Eras may have completely different year notation systems that restart at 1.
 * We MUST NEVER compare years across eras - only compare years within the same era.
 * Era order always takes precedence over year values.
 */
export function getDateSortValue(dateData: EventDateData | null | undefined, eraOrder?: string[]): number {
  if (!dateData) return Infinity;
  
  if (dateData.type === 'exact') {
    const exact = dateData as ExactDate;
    
    if (exact.era) {
      // Always prioritize era-based sorting - eras may have completely different year systems
      // that restart at 1, so we must NEVER compare years across eras
      
      if (eraOrder && eraOrder.length > 0) {
        // Use era order from timeline
        // Normalize era strings for comparison (trim whitespace)
        const normalizedEra = exact.era.trim();
        const eraIndex = eraOrder.findIndex(era => era.trim() === normalizedEra);
        
        if (eraIndex >= 0) {
          // Era found in order - use index * 100000000 (100 million) to ensure eras sort correctly
          // This ensures era order takes precedence even for very large years (up to 9999)
          // Years are ONLY compared within the same era, never across eras
          const baseValue = eraIndex * 100000000;
          const yearValue = exact.year * 10000;
          const monthValue = (exact.month || 0) * 100;
          const dayValue = exact.day || 0;
          return baseValue + yearValue + monthValue + dayValue;
        } else {
          // Era exists but not in order - assign a very high index so it sorts after known eras
          // Still use era-based separation (don't compare years across unknown eras)
          // Use a hash of the era name to group same-era events together
          const eraHash = Array.from(exact.era).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000;
          const baseValue = (9999 + eraHash) * 100000000; // Start after all known eras
          const yearValue = exact.year * 10000;
          const monthValue = (exact.month || 0) * 100;
          const dayValue = exact.day || 0;
          return baseValue + yearValue + monthValue + dayValue;
        }
      } else {
        // No era order provided - still use era-based sorting to prevent cross-era year comparison
        // Hash the era name to group same-era events together
        const eraHash = Array.from(exact.era).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000;
        const baseValue = eraHash * 100000000;
        const yearValue = exact.year * 10000;
        const monthValue = (exact.month || 0) * 100;
        const dayValue = exact.day || 0;
        return baseValue + yearValue + monthValue + dayValue;
      }
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
    // Get base sort value from era + year (same as exact)
    const exactValue = getDateSortValue({ type: 'exact', era: approx.era || null, year: approx.year, month: undefined, day: undefined } as ExactDate, eraOrder);
    if (exactValue === Infinity) return Infinity;
    // Within the same year: early < mid < late < no period (no period = last in that year)
    const period = approx.period?.toLowerCase?.();
    let periodOffset = 9999; // no period = last in year
    if (period === 'early') periodOffset = 1;
    else if (period === 'mid') periodOffset = 5000;
    else if (period === 'late') periodOffset = 9000;
    return exactValue + periodOffset;
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

