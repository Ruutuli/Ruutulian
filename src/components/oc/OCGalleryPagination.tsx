import { NumberedPagination } from '@/components/ui/NumberedPagination';

interface OCGalleryPaginationProps {
  page: number;
  perPage: number;
  total: number;
  ocSlug: string;
}

function buildHref(targetPage: number, ocSlug: string): string {
  const sp = new URLSearchParams();
  if (targetPage > 1) sp.set('galleryPage', String(targetPage));
  const qs = sp.toString();
  const base = `/ocs/${ocSlug}`;
  const hash = '#gallery';
  return qs ? `${base}?${qs}${hash}` : `${base}${hash}`;
}

export function OCGalleryPagination({ page, perPage, total, ocSlug }: OCGalleryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <NumberedPagination
      page={page}
      totalPages={totalPages}
      buildHref={(p) => buildHref(p, ocSlug)}
      ariaLabel="Character gallery pagination"
    />
  );
}
