'use client';

import { useState } from 'react';
import type { OC } from '@/types/oc';
import { OCCard } from '@/components/oc/OCCard';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { GalleryView } from './GalleryView';
import { ViewToggle } from './ViewToggle';

interface PaginationInfo {
  page: number;
  totalPages: number;
  totalCount: number;
}

interface OCListViewProps {
  ocs: OC[];
  pagination?: PaginationInfo;
  searchParams?: Record<string, string | string[] | undefined>;
}

function buildQueryString(params: Record<string, string | string[] | undefined>, page: number): string {
  const next = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'page') return;
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
    else if (value != null && value !== '') next.set(key, value);
  });
  if (page > 1) next.set('page', String(page));
  const s = next.toString();
  return s ? `?${s}` : '';
}

export function OCListView({ ocs, pagination, searchParams = {} }: OCListViewProps) {
  const [view, setView] = useState<'list' | 'gallery'>('list');
  const count = pagination?.totalCount ?? ocs.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          {count} character{count !== 1 ? 's' : ''} found
        </p>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {ocs.map((oc) => (
            <OCCard key={oc.id} oc={oc} />
          ))}
        </div>
      ) : (
        <GalleryView ocs={ocs} />
      )}

      {pagination && (
        <NumberedPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          buildHref={(p) => `/ocs${buildQueryString(searchParams, p)}`}
          ariaLabel="Character list pagination"
        />
      )}
    </div>
  );
}



