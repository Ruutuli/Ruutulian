import Link from 'next/link';

interface GalleryPaginationProps {
  page: number;
  perPage: number;
  total: number;
  tagFilter: string;
  characterSlug: string;
}

function buildHref(targetPage: number, tagFilter: string, characterSlug: string): string {
  const sp = new URLSearchParams();
  if (tagFilter) sp.set('tag', tagFilter);
  if (characterSlug) sp.set('character', characterSlug);
  if (targetPage > 1) sp.set('page', String(targetPage));
  const qs = sp.toString();
  return qs ? `/gallery?${qs}` : '/gallery';
}

export function GalleryPagination({
  page,
  perPage,
  total,
  tagFilter,
  characterSlug,
}: GalleryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const linkCls =
    'px-4 py-2 rounded-md text-sm font-medium border border-gray-600 bg-gray-800/80 text-gray-200 hover:bg-gray-700 hover:border-gray-500 transition-colors';
  const disabledCls = 'px-4 py-2 rounded-md text-sm text-gray-600 border border-transparent cursor-not-allowed';

  return (
    <nav
      className="flex flex-wrap justify-center items-center gap-4 pt-8 pb-2"
      aria-label="Gallery pagination"
    >
      {page > 1 ? (
        <Link href={buildHref(page - 1, tagFilter, characterSlug)} className={linkCls}>
          Previous
        </Link>
      ) : (
        <span className={disabledCls}>Previous</span>
      )}
      <span className="text-sm text-gray-400">
        Showing {from}–{to} of {total} · Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1, tagFilter, characterSlug)} className={linkCls}>
          Next
        </Link>
      ) : (
        <span className={disabledCls}>Next</span>
      )}
    </nav>
  );
}
