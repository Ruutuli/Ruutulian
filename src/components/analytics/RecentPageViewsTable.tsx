import Link from 'next/link';
import type { PageViewEvent } from '@/lib/analytics/types';
import {
  formatEntityTypeLabel,
  getPublicPathForViewEvent,
} from '@/lib/analytics/event-url';
import { formatDateToEST, formatTimeToEST } from '@/lib/utils/dateFormat';

interface RecentPageViewsTableProps {
  events: PageViewEvent[];
  loreWorldSlugs?: Record<string, string>;
}

export function RecentPageViewsTable({
  events,
  loreWorldSlugs = {},
}: RecentPageViewsTableProps) {
  if (events.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-8">
        No page views recorded yet. Visit public pages while logged out (or in a
        private window) to generate traffic.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left text-gray-400">
            <th className="py-3 pr-4 font-medium">When</th>
            <th className="py-3 pr-4 font-medium">Type</th>
            <th className="py-3 pr-4 font-medium">Target</th>
            <th className="py-3 font-medium">Path</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const publicPath = getPublicPathForViewEvent(event, loreWorldSlugs);
            const target =
              event.slug ??
              (typeof event.metadata?.chapter_number === 'number'
                ? `Ch. ${event.metadata.chapter_number}`
                : null) ??
              '—';

            return (
              <tr
                key={event.id}
                className="border-b border-gray-800/80 hover:bg-gray-800/40"
              >
                <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">
                  <div>{formatDateToEST(event.viewed_at)}</div>
                  <div className="text-xs text-gray-500">
                    {formatTimeToEST(event.viewed_at)}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs uppercase tracking-wide">
                    {formatEntityTypeLabel(event.entity_type)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-200 max-w-[12rem] truncate">
                  {publicPath ? (
                    <Link
                      href={publicPath}
                      className="hover:text-purple-400 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {target}
                    </Link>
                  ) : (
                    target
                  )}
                </td>
                <td className="py-3 text-gray-400 font-mono text-xs truncate max-w-[14rem]">
                  {publicPath ?? event.path ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
