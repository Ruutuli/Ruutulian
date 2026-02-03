import type { EventDateData, ExactDate } from '@/types/oc';
import type { EraDate } from './eraDates';
import { parseEraDate } from './eraDates';

export interface EraConfig {
  name: string;
  /** Stored as string to preserve format like "0001"; parsed to number for calculations */
  startYear?: number | string | null;
  endYear?: number | string | null;
}

/**
 * Parse era configuration from timeline.era field
 * Supports both comma-separated format and JSON format
 */
export function parseEraConfig(eraString: string | null | undefined): EraConfig[] {
  if (!eraString || typeof eraString !== 'string' || eraString.trim() === '') {
    return [];
  }

  const trimmed = eraString.trim();
  
  // Check if it's JSON format
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') {
            return { name: item.trim() };
          }
          if (item && typeof item === 'object') {
            // Accept string ("0001") or number for backward compatibility
            const startYear = item.startYear == null ? undefined : (typeof item.startYear === 'string' ? item.startYear : item.startYear);
            const endYear = item.endYear == null ? undefined : (typeof item.endYear === 'string' ? item.endYear : item.endYear);
            return {
              name: item.name?.trim() || '',
              startYear: startYear ?? undefined,
              endYear: endYear ?? undefined,
            };
          }
          return null;
        }).filter((e): e is EraConfig => e !== null && e.name !== '');
      }
    } catch {
      // Not valid JSON, fall through to comma-separated parsing
    }
  }

  // Parse as comma-separated string
  return trimmed
    .split(',')
    .map(era => era.trim())
    .filter(era => era)
    .map(era => ({ name: era }));
}

/** Parse era year (string "0001" or number) to number for calculations */
function toEraYearNum(val: number | string | null | undefined): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Calculate age from birth date and event date
 * Supports both regular dates and era-based dates
 * @param birthDate - Birth date string (can be era format like "[ μ ] – εγλ 1990" or regular format)
 * @param eventDate - Event date data
 * @param eraConfig - Optional array of era configurations for cross-era age calculation
 */
export function calculateAge(
  birthDate: string | null | undefined,
  eventDate: EventDateData | null | undefined,
  eraConfig?: EraConfig[]
): number | null {
  if (!birthDate || !eventDate || eventDate.type !== 'exact') {
    return null;
  }

  // Try to parse as era date first (e.g., "BE 1000", "SE 0005")
  const birthEraDate = parseEraDate(birthDate);
  const eventEraDate = eventDateToEraDate(eventDate);

  if (birthEraDate && eventEraDate) {
    return calculateEraAge(birthEraDate, eventEraDate, eraConfig);
  }

  // Fallback to regular date calculation
  // Parse birth date (could be "YYYY-MM-DD" or era format)
  const birthMatch = birthDate.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!birthMatch) {
    // Try era format as fallback
    if (birthEraDate && eventEraDate) {
      return calculateEraAge(birthEraDate, eventEraDate, eraConfig);
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
 * Supports cross-era age calculation when era configuration is provided
 */
function calculateEraAge(birthDate: EraDate, eventDate: EraDate, eraConfig?: EraConfig[]): number | null {
  // If eras are the same, calculate normally
  if (birthDate.era === eventDate.era) {
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

    return age >= 0 ? age : null;
  }

  // Different eras - need era configuration to calculate cross-era age
  if (!eraConfig || eraConfig.length === 0) {
    return null;
  }

  // Find era configurations
  const birthEraConfig = eraConfig.find(e => e.name.trim() === birthDate.era.trim());
  const eventEraConfig = eraConfig.find(e => e.name.trim() === eventDate.era.trim());

  if (!birthEraConfig || !eventEraConfig) {
    return null;
  }

  // Find era order
  const birthEraIndex = eraConfig.findIndex(e => e.name.trim() === birthDate.era.trim());
  const eventEraIndex = eraConfig.findIndex(e => e.name.trim() === eventDate.era.trim());

  if (birthEraIndex < 0 || eventEraIndex < 0) {
    return null;
  }

  // If event is before birth era, return null (can't have negative age)
  if (eventEraIndex < birthEraIndex) {
    return null;
  }

  // Calculate age across eras
  let totalAge = 0;

  // Age in birth era (from birth year to end of that era)
  const birthEraEndNum = toEraYearNum(birthEraConfig.endYear);
  if (birthEraEndNum !== undefined) {
    const birthYear = birthDate.year;
    const birthMonth = birthDate.month ?? 1;
    const birthDay = birthDate.day ?? 1;
    
    // Calculate years from birth to end of birth era
    const yearsInBirthEra = birthEraEndNum - birthYear;
    
    // Adjust for partial year (if birthday hasn't occurred yet in the end year)
    // For simplicity, we'll use the full year count
    totalAge += yearsInBirthEra;
  }

  // Age in intermediate eras (full era spans)
  for (let i = birthEraIndex + 1; i < eventEraIndex; i++) {
    const era = eraConfig[i];
    const startNum = toEraYearNum(era.startYear);
    const endNum = toEraYearNum(era.endYear);
    if (startNum !== undefined && endNum !== undefined) {
      totalAge += (endNum - startNum);
    }
  }

  // Age in event era (from start of event era to event year)
  const eventEraStartNum = toEraYearNum(eventEraConfig.startYear);
  if (eventEraStartNum !== undefined) {
    const eventYear = eventDate.year;
    const eventMonth = eventDate.month ?? 1;
    const eventDay = eventDate.day ?? 1;
    
    // Calculate years from start of event era to event year
    let yearsInEventEra = eventYear - eventEraStartNum;
    
    // Adjust if birthday hasn't occurred yet this year
    // We need to know the birth month/day to adjust properly
    // For now, we'll use a simplified calculation
    // If the event is in the same year as the era start, check if birthday has passed
    if (yearsInEventEra === 0) {
      // In first year of era, check if birthday has occurred
      const birthMonth = birthDate.month ?? 1;
      const birthDay = birthDate.day ?? 1;
      if (eventMonth < birthMonth || (eventMonth === birthMonth && eventDay < birthDay)) {
        // Birthday hasn't occurred yet in this era
        return totalAge - 1;
      }
    }
    
    totalAge += yearsInEventEra;
  }

  return totalAge >= 0 ? totalAge : null;
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

