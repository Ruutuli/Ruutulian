import { NumberedPagination } from '@/components/ui/NumberedPagination';

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

  return (
    <NumberedPagination
      page={page}
      totalPages={totalPages}
      buildHref={(p) => buildHref(p, tagFilter, characterSlug)}
      ariaLabel="Gallery pagination"
    />
  );
}
