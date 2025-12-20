/**
 * Formats a date string to "December 8" format
 * Handles various input formats:
 * - MM/DD (e.g., "12/08" -> "December 8")
 * - YYYY-MM-DD (e.g., "2000-12-08" -> "December 8")
 * - MM/DD/YYYY (e.g., "12/08/2000" -> "December 8")
 * - Already formatted dates (returns as-is if parsing fails)
 */
export function formatDateOfBirth(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Try parsing MM/DD format (e.g., "12/08")
  const mmddMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{4})?$/);
  if (mmddMatch) {
    const month = parseInt(mmddMatch[1], 10);
    const day = parseInt(mmddMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${monthNames[month - 1]} ${day}`;
    }
  }

  // Try parsing YYYY-MM-DD format (e.g., "2000-12-08")
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${monthNames[month - 1]} ${day}`;
    }
  }

  // Try parsing as a Date object
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const month = date.getMonth();
    const day = date.getDate();
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return `${monthNames[month]} ${day}`;
    }
  }

  // If all parsing fails, return the original string
  return trimmed;
}










