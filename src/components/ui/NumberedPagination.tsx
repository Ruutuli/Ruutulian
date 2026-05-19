import Link from 'next/link';

export function pageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

interface NumberedPaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  ariaLabel?: string;
}

export function NumberedPagination({
  page,
  totalPages,
  buildHref,
  ariaLabel = 'Pagination',
}: NumberedPaginationProps) {
  if (totalPages <= 1) return null;

  const linkCls =
    'inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-lg text-sm font-medium border border-gray-600/80 bg-gray-800/60 text-gray-200 hover:bg-gray-700/80 hover:border-gray-500 transition-colors';
  const activeCls =
    'inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-lg text-sm font-medium border border-purple-500/60 bg-purple-950/50 text-purple-100';
  const disabledCls =
    'inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm text-gray-600 border border-transparent cursor-not-allowed';

  const pages = pageNumbers(page, totalPages);

  return (
    <nav
      className="flex flex-wrap justify-center items-center gap-2 pt-6 pb-2"
      aria-label={ariaLabel}
    >
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={linkCls} aria-label="Previous page">
          <i className="fas fa-chevron-left text-xs mr-1" aria-hidden />
          Prev
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden>
          <i className="fas fa-chevron-left text-xs mr-1 opacity-40" />
          Prev
        </span>
      )}

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-gray-500 text-sm">
              …
            </span>
          ) : p === page ? (
            <span key={p} className={activeCls} aria-current="page">
              {p}
            </span>
          ) : (
            <Link key={p} href={buildHref(p)} className={linkCls}>
              {p}
            </Link>
          )
        )}
      </div>

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={linkCls} aria-label="Next page">
          Next
          <i className="fas fa-chevron-right text-xs ml-1" aria-hidden />
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden>
          Next
          <i className="fas fa-chevron-right text-xs ml-1 opacity-40" />
        </span>
      )}
    </nav>
  );
}
