/**
 * Utilities for handling era-based dates (e.g., BE 1000, SE 0005)
 * BE (Before Era) dates come before SE (Some Era) dates
 */

export type Era = 'BE' | 'SE' | string; // Allow custom eras

export interface EraDate {
  era: Era;
  year: number;
  month?: number;
  day?: number;
}

/**
 * Parse a date string like "BE 1000", "SE 0005", "BE 0010-08-15"
 */
export function parseEraDate(dateString: string): EraDate | null {
  // Match patterns like "BE 1000", "SE 0005", "BE 0010-08-15", "BE 0001 ~"
  const match = dateString.match(/^([A-Z]+)\s+(\d{4})(?:-(\d{2})-(\d{2}))?(?:\s*~)?$/);
  if (!match) return null;

  const [, era, yearStr, monthStr, dayStr] = match;
  return {
    era: era.trim(),
    year: parseInt(yearStr, 10),
    month: monthStr ? parseInt(monthStr, 10) : undefined,
    day: dayStr ? parseInt(dayStr, 10) : undefined,
  };
}

/**
 * Format an EraDate to string like "BE 1000" or "SE 0005-08-15"
 */
export function formatEraDate(date: EraDate): string {
  const yearStr = date.year.toString().padStart(4, '0');
  if (date.month && date.day) {
    const monthStr = date.month.toString().padStart(2, '0');
    const dayStr = date.day.toString().padStart(2, '0');
    return `${date.era} ${yearStr}-${monthStr}-${dayStr}`;
  }
  return `${date.era} ${yearStr}`;
}

/**
 * Compare two era dates for sorting
 * Uses custom era order if provided, otherwise uses default order
 * Within same era, earlier years come first
 */
export function compareEraDates(a: EraDate, b: EraDate, customEraOrder?: string[]): number {
  // Use custom era order from timeline if provided
  let eraOrder: Record<string, number> = {};
  
  if (customEraOrder && customEraOrder.length > 0) {
    // Build order map from custom era list (earlier in list = earlier in time)
    customEraOrder.forEach((era, index) => {
      eraOrder[era.trim()] = index;
    });
  } else {
    // Default order (BE comes before SE)
    eraOrder = {
      'BE': 0,
      'SE': 1,
    };
  }

  const aEraOrder = eraOrder[a.era] ?? 999;
  const bEraOrder = eraOrder[b.era] ?? 999;

  if (aEraOrder !== bEraOrder) {
    return aEraOrder - bEraOrder;
  }

  // Same era, compare years
  if (a.year !== b.year) {
    return a.year - b.year;
  }

  // Same year, compare months
  const aMonth = a.month ?? 0;
  const bMonth = b.month ?? 0;
  if (aMonth !== bMonth) {
    return aMonth - bMonth;
  }

  // Same month, compare days
  const aDay = a.day ?? 0;
  const bDay = b.day ?? 0;
  return aDay - bDay;
}

/**
 * Convert EventDateData to EraDate if possible
 */
export function eventDateToEraDate(dateData: any): EraDate | null {
  if (!dateData || dateData.type !== 'exact') return null;

  // Check if year is negative (could indicate BE) or if there's an era in text
  // For now, we'll need to extend the date structure to include era
  // This is a placeholder - we'll need to update the date structure
  return null;
}

