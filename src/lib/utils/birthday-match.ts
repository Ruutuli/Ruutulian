import { getDateInEST } from '@/lib/utils/dateFormat';

/** Minimal shape for client-side birthday fallback filtering */
export type OcBirthdayRow = {
  id: string;
  name: string;
  slug: string;
  date_of_birth: string | null;
  image_url?: string | null;
};

/** Mirrors legacy home-page parsing when RPC is unavailable (bounded caller `.limit`). */
export function filterOcsBirthdayToday<T extends OcBirthdayRow>(
  rows: T[] | null | undefined,
  todayMonth: number,
  todayDay: number
): T[] {
  return (rows || []).filter((oc) => {
    if (!oc.date_of_birth) return false;
    try {
      const dateStr = oc.date_of_birth.trim();

      const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        const birthMonth = parseInt(isoMatch[2], 10);
        const birthDay = parseInt(isoMatch[3], 10);
        return birthMonth === todayMonth && birthDay === todayDay;
      }

      const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
      if (mmddMatch) {
        const birthMonth = parseInt(mmddMatch[1], 10);
        const birthDay = parseInt(mmddMatch[2], 10);
        return birthMonth === todayMonth && birthDay === todayDay;
      }

      const birthDate = new Date(dateStr);
      if (!isNaN(birthDate.getTime())) {
        const birthEST = getDateInEST(birthDate);
        return birthEST.month === todayMonth && birthEST.day === todayDay;
      }

      return false;
    } catch {
      return false;
    }
  });
}
