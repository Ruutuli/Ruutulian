import type { EventDateData, ExactDate } from '@/types/oc';
import type { EraDate } from './eraDates';
import { parseEraDate } from './eraDates';

/**
 * Calculate age from birth date and event date
 * Supports both regular dates and era-based dates
 */
export function calculateAge(
  birthDate: string | null | undefined,
  eventDate: EventDateData | null | undefined
): number | null {
  if (!birthDate || !eventDate || eventDate.type !== 'exact') {
    return null;
  }

  // Try to parse as era date first (e.g., "BE 1000", "SE 0005")
  const birthEraDate = parseEraDate(birthDate);
  const eventEraDate = eventDateToEraDate(eventDate);

  if (birthEraDate && eventEraDate) {
    return calculateEraAge(birthEraDate, eventEraDate);
  }

  // Fallback to regular date calculation
  // Parse birth date (could be "YYYY-MM-DD" or era format)
  const birthMatch = birthDate.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!birthMatch) {
    // Try era format as fallback
    if (birthEraDate && eventEraDate) {
      return calculateEraAge(birthEraDate, eventEraDate);
    }
    return null;
  }

  const birthYear = parseInt(birthMatch[1], 10);
  const birthMonth = birthMatch[2] ? parseInt(birthMatch[2], 10) : 1;
  const birthDay = birthMatch[3] ? parseInt(birthMatch[3], 10) : 1;

  const eventYear = (eventDate as ExactDate).year;
  const eventMonth = (eventDate as ExactDate).month ?? 1;
  const eventDay = (eventDate as ExactDate).day ?? 1;

  let age = eventYear - birthYear;
  
  // Adjust if birthday hasn't occurred yet this year
  if (eventMonth < birthMonth || (eventMonth === birthMonth && eventDay < birthDay)) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Calculate age using era-based dates
 */
function calculateEraAge(birthDate: EraDate, eventDate: EraDate): number | null {
  // If eras are different, we can't calculate accurately
  if (birthDate.era !== eventDate.era) {
    // BE comes before SE, so if birth is BE and event is SE, age is positive
    // But we need to know the transition point (when BE 0000 becomes SE 0000)
    // For now, return null if eras differ
    return null;
  }

  // Same era, calculate normally
  const birthYear = birthDate.year;
  const birthMonth = birthDate.month ?? 1;
  const birthDay = birthDate.day ?? 1;

  const eventYear = eventDate.year;
  const eventMonth = eventDate.month ?? 1;
  const eventDay = eventDate.day ?? 1;

  let age = eventYear - birthYear;
  
  // Adjust if birthday hasn't occurred yet this year
  if (eventMonth < birthMonth || (eventMonth === birthMonth && eventDay < birthDay)) {
    age--;
  }

  return age;
}

/**
 * Convert EventDateData to EraDate
 */
function eventDateToEraDate(dateData: EventDateData): EraDate | null {
  if (dateData.type !== 'exact') return null;
  
  const exact = dateData as ExactDate;
  // Use era from date if available
  if (exact.era) {
    return {
      era: exact.era,
      year: exact.year,
      month: exact.month,
      day: exact.day,
    };
  }
  // No era specified - return null to use regular date calculation
  return null;
}

