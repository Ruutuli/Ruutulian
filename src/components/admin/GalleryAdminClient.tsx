'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import {
  driveFileViewUrl,
  GALLERY_ADMIN_PAGE_SIZE,
  GALLERY_ADMIN_PAGE_SIZES,
} from '@/lib/gallery/constants';
import { logger } from '@/lib/logger';

export interface GalleryOcOption {
  id: string;
  name: string;
  slug: string;
}

interface GalleryItemOcRow {
  oc_id: string;
  oc: { id: string; name: string; slug: string } | null;
}

export interface GalleryAdminItem {
  id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  folder_id: string;
  published: boolean;
  tags: string[] | null;
  sort_order: number | null;
  gallery_item_ocs?: GalleryItemOcRow[] | null;
}

interface GalleryStats {
  total: number;
  published: number;
  unpublished: number;
}

type PublishedFilter = 'all' | 'published' | 'unpublished';
type SortOption = 'sort_order' | 'name' | 'created' | 'updated';

interface GalleryAdminClientProps {
  ocs: GalleryOcOption[];
}

function tagsToString(tags: string[] | null | undefined) {
  return (tags ?? []).join(', ');
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildItemsUrl(params: {
  page: number;
  pageSize: number;
  search: string;
  publishedFilter: PublishedFilter;
  ocId: string;
  sort: SortOption;
}) {
  const sp = new URLSearchParams();
  sp.set('limit', String(params.pageSize));
  sp.set('offset', String((params.page - 1) * params.pageSize));
  sp.set('sort', params.sort);
  if (params.search.trim()) sp.set('search', params.search.trim());
  if (params.publishedFilter === 'published') sp.set('publishedFilter', 'published');
  if (params.publishedFilter === 'unpublished') sp.set('publishedFilter', 'unpublished');
  if (params.ocId) sp.set('ocId', params.ocId);
  return `/api/admin/gallery/items?${sp.toString()}`;
}

export function GalleryAdminClient({ ocs }: GalleryAdminClientProps) {
  const [items, setItems] = useState<GalleryAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<GalleryStats>({ total: 0, published: 0, unpublished: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(GALLERY_ADMIN_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>('all');
  const [ocId, setOcId] = useState('');
  const [sort, setSort] = useState<SortOption>('sort_order');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkOcIds, setBulkOcIds] = useState<string[]>([]);
  const [bulkOcSearch, setBulkOcSearch] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);

  const pageRef = useRef(page);
  pageRef.current = page;

  const filtersRef = useRef({ search, publishedFilter, ocId, sort, pageSize });
  filtersRef.current = { search, publishedFilter, ocId, sort, pageSize };

  const ocOptions = useMemo(() => [...ocs].sort((a, b) => a.name.localeCompare(b.name)), [ocs]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadItems = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    let shouldClearLoading = true;
    const f = filtersRef.current;
    try {
      const p = Math.max(1, pageToLoad);
      const res = await fetch(
        buildItemsUrl({
          page: p,
          pageSize: f.pageSize,
          search: f.search,
          publishedFilter: f.publishedFilter,
          ocId: f.ocId,
          sort: f.sort,
        })
      );
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'error', text: json.error || 'Failed to load gallery items' });
        setItems([]);
        setTotal(0);
        return;
      }
      const t = typeof json.total === 'number' ? json.total : 0;
      const tp = Math.max(1, Math.ceil(t / f.pageSize));
      const corrected = Math.min(p, tp);
      if (json.stats) setStats(json.stats);
      setTotal(t);
      if (corrected !== p) {
        setPage(corrected);
        shouldClearLoading = false;
        return;
      }
      setItems(json.data ?? []);
    } catch (e) {
      logger.error('GalleryAdmin', 'Load failed', e);
      setMessage({ type: 'error', text: 'Failed to load gallery items' });
      setItems([]);
      setTotal(0);
    } finally {
      if (shouldClearLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadItems(page);
  }, [page, search, publishedFilter, ocId, sort, pageSize, loadItems]);

  const reloadCurrentPage = useCallback(() => loadItems(pageRef.current), [loadItems]);

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setPublishedFilter('all');
    setOcId('');
    setSort('sort_order');
    setPage(1);
  }

  const hasActiveFilters =
    search.trim() !== '' || publishedFilter !== 'all' || ocId !== '' || sort !== 'sort_order';

  const pageItemIds = useMemo(() => items.map((i) => i.id), [items]);
  const allOnPageSelected =
    pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.has(id));

  const filteredBulkOcOptions = useMemo(() => {
    const q = bulkOcSearch.trim().toLowerCase();
    if (!q) return ocOptions;
    return ocOptions.filter(
      (oc) => oc.name.toLowerCase().includes(q) || oc.slug.toLowerCase().includes(q)
    );
  }, [ocOptions, bulkOcSearch]);

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkOcIds([]);
    setBulkOcSearch('');
  }

  function toggleItemSelection(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pageItemIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pageItemIds) next.add(id);
        return next;
      });
    }
  }

  async function applyBulkOcTag(mode: 'add' | 'remove' | 'replace') {
    if (selectedIds.size === 0 || bulkOcIds.length === 0) return;

    const modeLabel =
      mode === 'add' ? 'add' : mode === 'remove' ? 'remove' : 'replace with only';
    const ocNames = bulkOcIds
      .map((id) => ocOptions.find((o) => o.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    if (
      mode === 'replace' &&
      !window.confirm(
        `Replace character links on ${selectedIds.size} image(s) with only: ${ocNames}? Existing links on those images will be cleared.`
      )
    ) {
      return;
    }

    setBulkApplying(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/gallery/items/bulk-oc-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [...selectedIds],
          ocIds: bulkOcIds,
          mode,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'error', text: json.error || 'Bulk tag failed' });
        return;
      }
      const count = json.data?.itemCount ?? selectedIds.size;
      setMessage({
        type: 'success',
        text: `Updated character links on ${count} image(s) (${modeLabel}: ${ocNames}).`,
      });
      setSelectedIds(new Set());
      await reloadCurrentPage();
    } catch (e) {
      logger.error('GalleryAdmin', 'Bulk tag failed', e);
      setMessage({ type: 'error', text: 'Bulk tag request failed' });
    } finally {
      setBulkApplying(false);
    }
  }

  async function runSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/gallery/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        const errDetail =
          Array.isArray(json.errors) && json.errors.length > 0
            ? json.errors.join('; ')
            : 'Sync completed with issues';
        setMessage({
          type: 'error',
          text: `${errDetail} (${json.synced ?? 0} files touched).`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Synced ${json.synced ?? 0} image(s) from ${json.folders ?? 0} folder(s).`,
        });
      }
      await loadItems(pageRef.current);
    } catch (e) {
      logger.error('GalleryAdmin', 'Sync failed', e);
      setMessage({ type: 'error', text: 'Sync request failed' });
    } finally {
      setSyncing(false);
    }
  }

  const showBulkBar = selectionMode && selectedIds.size > 0;

  return (
    <div className={`space-y-6 ${showBulkBar ? 'pb-52' : ''}`}>
      <section className="rounded-lg border border-gray-700/80 bg-gray-800/30 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
            Pull images from the Drive folders configured in Site Settings (including nested subfolders).
            New files stay unpublished until you enable them. Share folders with your Google service account
            email (Viewer).
          </p>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void runSync()}
            className="shrink-0 px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium"
          >
            {syncing ? 'Syncing…' : 'Sync from Google Drive'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Published" value={stats.published} accent="green" />
          <StatPill label="Unpublished" value={stats.unpublished} accent="amber" />
        </div>
      </section>

      {message && (
        <div
          className={`p-3 rounded border text-sm ${
            message.type === 'success'
              ? 'bg-green-900/30 border-green-700 text-green-200'
              : 'bg-red-900/30 border-red-700 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-lg border border-gray-700/80 bg-gray-800/30 p-4 space-y-4 sticky top-0 z-20 backdrop-blur-sm bg-gray-900/95">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search filename, tags, or character (fuzzy, e.g. naho → ItsNahochan)…"
          className="w-full px-4 py-2.5 bg-gray-900/90 border border-gray-600/70 rounded-md text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          aria-label="Search gallery items"
        />

        <div className="flex flex-wrap gap-3 items-center">
          <FilterSelect
            label="Status"
            value={publishedFilter}
            onChange={(v) => {
              setPublishedFilter(v as PublishedFilter);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'published', label: 'Published only' },
              { value: 'unpublished', label: 'Unpublished only' },
            ]}
          />
          <FilterSelect
            label="Character"
            value={ocId}
            onChange={(v) => {
              setOcId(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Any character' },
              ...ocOptions.map((oc) => ({ value: oc.id, label: oc.name })),
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => {
              setSort(v as SortOption);
              setPage(1);
            }}
            options={[
              { value: 'sort_order', label: 'Sort order' },
              { value: 'name', label: 'Name' },
              { value: 'created', label: 'Newest' },
              { value: 'updated', label: 'Recently updated' },
            ]}
          />
          <FilterSelect
            label="Per page"
            value={String(pageSize)}
            onChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
            options={GALLERY_ADMIN_PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-purple-300 hover:text-purple-200 underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (selectionMode) exitSelectionMode();
              else {
                setSelectedId(null);
                setSelectionMode(true);
              }
            }}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              selectionMode
                ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                : 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {selectionMode ? 'Cancel select' : 'Select images'}
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            {loading ? 'Loading…' : `${total.toLocaleString()} match${total === 1 ? '' : 'es'}`}
          </span>
        </div>

        {selectionMode && items.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-700/60">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAllOnPage}
                className="rounded border-gray-600 bg-gray-700 text-purple-600"
              />
              Select all on this page ({pageItemIds.length})
            </label>
            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
              >
                Clear selection
              </button>
            ) : null}
            <span className="text-sm text-purple-300 ml-auto">{selectedIds.size} selected</span>
          </div>
        ) : null}
      </section>

      {loading && items.length === 0 ? (
        <div className="text-gray-400 text-sm py-12 text-center">Loading gallery items…</div>
      ) : stats.total === 0 ? (
        <div className="text-gray-400 text-sm rounded-lg border border-gray-700/80 bg-gray-800/20 p-8 text-center">
          No items yet. Run sync after sharing folders with the service account and setting{' '}
          <code className="text-purple-300">GOOGLE_SERVICE_ACCOUNT_JSON</code>,{' '}
          <code className="text-purple-300">GOOGLE_SERVICE_ACCOUNT_JSON_PATH</code>, or{' '}
          <code className="text-purple-300">GOOGLE_APPLICATION_CREDENTIALS</code>.
        </div>
      ) : total === 0 ? (
        <div className="text-gray-400 text-sm rounded-lg border border-gray-700/80 bg-gray-800/20 p-8 text-center">
          No items match your filters.{' '}
          <button type="button" onClick={resetFilters} className="text-purple-300 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <GalleryAdminPaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            loading={loading}
            onPageChange={setPage}
          />
          <div
            className={`grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${
              loading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {items.map((item) => (
              <GalleryAdminTile
                key={item.id}
                item={item}
                selectionMode={selectionMode}
                selected={
                  selectionMode ? selectedIds.has(item.id) : selectedId === item.id
                }
                onSelect={() => {
                  if (selectionMode) toggleItemSelection(item.id);
                  else setSelectedId(item.id);
                }}
              />
            ))}
          </div>
          <GalleryAdminPaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            loading={loading}
            onPageChange={setPage}
          />
        </>
      )}

      {selectedItem && !selectionMode ? (
        <GalleryAdminEditDrawer
          item={selectedItem}
          ocOptions={ocOptions}
          onClose={() => setSelectedId(null)}
          onSaved={async () => {
            await reloadCurrentPage();
          }}
        />
      ) : null}

      {selectionMode && selectedIds.size > 0 ? (
        <GalleryBulkOcTagBar
          selectedCount={selectedIds.size}
          ocOptions={filteredBulkOcOptions}
          bulkOcSearch={bulkOcSearch}
          onBulkOcSearchChange={setBulkOcSearch}
          bulkOcIds={bulkOcIds}
          onToggleOc={(ocId) => {
            setBulkOcIds((prev) =>
              prev.includes(ocId) ? prev.filter((id) => id !== ocId) : [...prev, ocId]
            );
          }}
          applying={bulkApplying}
          onAdd={() => void applyBulkOcTag('add')}
          onRemove={() => void applyBulkOcTag('remove')}
          onReplace={() => void applyBulkOcTag('replace')}
        />
      ) : null}
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'green' | 'amber';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-green-300'
      : accent === 'amber'
        ? 'text-amber-300'
        : 'text-gray-100';
  return (
    <div className="rounded-md bg-gray-900/60 border border-gray-700/60 px-3 py-2.5 text-center">
      <div className={`text-xl font-semibold tabular-nums ${accentClass}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="text-xs text-gray-500 whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[11rem] px-2.5 py-1.5 bg-gray-900/90 border border-gray-600/70 rounded-md text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 truncate"
      >
        {options.map((opt) => (
          <option key={opt.value || '__empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function GalleryAdminPaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const [jumpInput, setJumpInput] = useState(String(page));

  useEffect(() => {
    setJumpInput(String(page));
  }, [page]);

  function goToJump() {
    const n = parseInt(jumpInput, 10);
    if (!Number.isFinite(n)) return;
    onPageChange(Math.min(Math.max(1, n), totalPages));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
      <span>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
        {totalPages > 1 ? ` · page ${page} of ${totalPages.toLocaleString()}` : ''}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(1)}
          className="px-2.5 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-40 hover:bg-gray-700"
          title="First page"
        >
          «
        </button>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-40 hover:bg-gray-700"
        >
          Previous
        </button>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goToJump();
            }}
            className="w-14 px-2 py-1.5 text-center rounded-md border border-gray-600 bg-gray-900 text-gray-100 text-sm"
            aria-label="Page number"
          />
          <button
            type="button"
            disabled={loading}
            onClick={goToJump}
            className="px-2 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
          >
            Go
          </button>
        </div>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-40 hover:bg-gray-700"
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(totalPages)}
          className="px-2.5 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-40 hover:bg-gray-700"
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

function GalleryBulkOcTagBar({
  selectedCount,
  ocOptions,
  bulkOcSearch,
  onBulkOcSearchChange,
  bulkOcIds,
  onToggleOc,
  applying,
  onAdd,
  onRemove,
  onReplace,
}: {
  selectedCount: number;
  ocOptions: GalleryOcOption[];
  bulkOcSearch: string;
  onBulkOcSearchChange: (value: string) => void;
  bulkOcIds: string[];
  onToggleOc: (ocId: string) => void;
  applying: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const canApply = bulkOcIds.length > 0 && !applying;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-purple-700/60 bg-gray-900/98 backdrop-blur-sm shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-sm text-gray-300">
          Tag <span className="text-purple-300 font-medium">{selectedCount}</span> selected image
          {selectedCount === 1 ? '' : 's'} with character(s):
        </p>
        <input
          type="search"
          value={bulkOcSearch}
          onChange={(e) => onBulkOcSearchChange(e.target.value)}
          placeholder="Search characters…"
          className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
        />
        <div className="max-h-32 overflow-y-auto rounded-md border border-gray-600 bg-gray-950/80 p-2 space-y-0.5">
          {ocOptions.length === 0 ? (
            <p className="text-sm text-gray-500 px-2 py-2">No characters match.</p>
          ) : (
            ocOptions.map((oc) => (
              <label
                key={oc.id}
                className={`flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-800/80 ${
                  bulkOcIds.includes(oc.id) ? 'text-gray-100 bg-gray-800/40' : 'text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={bulkOcIds.includes(oc.id)}
                  onChange={() => onToggleOc(oc.id)}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 shrink-0"
                />
                <span className="truncate">{oc.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canApply}
            onClick={onAdd}
            className="px-4 py-2 text-sm rounded-md bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 font-medium"
          >
            {applying ? 'Applying…' : 'Add to selected'}
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={onRemove}
            className="px-4 py-2 text-sm rounded-md border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          >
            Remove from selected
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={onReplace}
            className="px-4 py-2 text-sm rounded-md border border-amber-600/70 bg-amber-900/30 text-amber-100 hover:bg-amber-900/50 disabled:opacity-50"
            title="Clears existing character links on each image, then applies only the selected characters"
          >
            Replace links
          </button>
        </div>
      </div>
    </div>
  );
}

function GalleryAdminTile({
  item,
  selectionMode,
  selected,
  onSelect,
}: {
  item: GalleryAdminItem;
  selectionMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const src = convertGoogleDriveUrl(driveFileViewUrl(item.drive_file_id));
  const linkedOcs = (item.gallery_item_ocs ?? [])
    .map((r) => r.oc?.name)
    .filter(Boolean) as string[];
  const tags = item.tags ?? [];
  const displayName = item.name || item.drive_file_id;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-lg border overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
        selected
          ? selectionMode
            ? 'border-purple-400 ring-2 ring-purple-400/60 bg-purple-950/20'
            : 'border-purple-500 ring-1 ring-purple-500/50'
          : 'border-gray-700/80 hover:border-gray-500 bg-gray-800/40'
      }`}
    >
      <div className="aspect-square bg-gray-950 relative">
        <GoogleDriveImage
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
        />
        {selectionMode ? (
          <span
            className={`absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold ${
              selected
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-gray-900/90 border-gray-500 text-transparent'
            }`}
            aria-hidden
          >
            ✓
          </span>
        ) : null}
        <span
          className={`absolute top-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
            item.published
              ? 'bg-green-900/90 text-green-200 border border-green-700/50'
              : 'bg-gray-900/90 text-gray-400 border border-gray-600/50'
          }`}
        >
          {item.published ? 'Live' : 'Draft'}
        </span>
      </div>
      <div className="p-2 space-y-1">
        <div className="text-xs text-gray-200 font-medium truncate" title={displayName}>
          {displayName}
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1 py-0.5 rounded bg-gray-900/80 text-gray-400 border border-gray-700/60 truncate max-w-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 ? (
              <span className="text-[10px] text-gray-500">+{tags.length - 2}</span>
            ) : null}
          </div>
        ) : null}
        {linkedOcs.length > 0 ? (
          <div className="text-[10px] text-gray-500 truncate" title={linkedOcs.join(', ')}>
            {linkedOcs.slice(0, 2).join(', ')}
            {linkedOcs.length > 2 ? ` +${linkedOcs.length - 2}` : ''}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function GalleryEditSection({
  step,
  title,
  description,
  accent = 'gray',
  children,
}: {
  step: number;
  title: string;
  description: string;
  accent?: 'gray' | 'green' | 'purple';
  children: ReactNode;
}) {
  const accentStyles =
    accent === 'green'
      ? 'border-green-700/50 bg-green-950/15'
      : accent === 'purple'
        ? 'border-purple-700/50 bg-purple-950/15'
        : 'border-gray-600/70 bg-gray-800/30';
  const stepStyles =
    accent === 'green'
      ? 'bg-green-900/60 text-green-200'
      : accent === 'purple'
        ? 'bg-purple-900/60 text-purple-200'
        : 'bg-gray-700 text-gray-200';

  return (
    <section className={`rounded-xl border p-4 sm:p-5 space-y-4 ${accentStyles}`}>
      <div className="flex gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${stepStyles}`}
        >
          {step}
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-base font-semibold text-gray-100">{title}</h3>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function GalleryAdminEditDrawer({
  item,
  ocOptions,
  onClose,
  onSaved,
}: {
  item: GalleryAdminItem;
  ocOptions: GalleryOcOption[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [published, setPublished] = useState(item.published);
  const [tagsStr, setTagsStr] = useState(tagsToString(item.tags));
  const [sortOrder, setSortOrder] = useState(String(item.sort_order ?? 0));
  const [selectedOcIds, setSelectedOcIds] = useState<string[]>(() =>
    (item.gallery_item_ocs ?? []).map((r) => r.oc_id)
  );
  const [ocSearch, setOcSearch] = useState('');
  const [profileImageOcId, setProfileImageOcId] = useState('');
  const [profileOcSearch, setProfileOcSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingMainImage, setSettingMainImage] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState(false);

  const src = convertGoogleDriveUrl(driveFileViewUrl(item.drive_file_id));

  useEffect(() => {
    setPublished(item.published);
    setTagsStr(tagsToString(item.tags));
    setSortOrder(String(item.sort_order ?? 0));
    setSelectedOcIds((item.gallery_item_ocs ?? []).map((r) => r.oc_id));
    setOcSearch('');
    setProfileOcSearch('');
    setProfileImageOcId((item.gallery_item_ocs ?? [])[0]?.oc_id ?? '');
    setLocalMessage(null);
    setImageLightbox(false);
  }, [item]);

  const initialOcIds = useMemo(
    () => [...(item.gallery_item_ocs ?? []).map((r) => r.oc_id)].sort(),
    [item.gallery_item_ocs]
  );

  const filteredOcOptions = useMemo(() => {
    const q = ocSearch.trim().toLowerCase();
    if (!q) return ocOptions;
    return ocOptions.filter(
      (oc) => oc.name.toLowerCase().includes(q) || oc.slug.toLowerCase().includes(q)
    );
  }, [ocOptions, ocSearch]);

  const filteredProfileOcOptions = useMemo(() => {
    const q = profileOcSearch.trim().toLowerCase();
    const sorted = [...ocOptions].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (oc) => oc.name.toLowerCase().includes(q) || oc.slug.toLowerCase().includes(q)
    );
  }, [ocOptions, profileOcSearch]);

  const isDirty = useMemo(() => {
    if (published !== item.published) return true;
    const tagsNormalized = [...parseTags(tagsStr)].sort().join('|');
    const tagsFromItem = [...(item.tags ?? [])].map((t) => t.trim()).filter(Boolean).sort().join('|');
    if (tagsNormalized !== tagsFromItem) return true;
    const soItem = item.sort_order ?? 0;
    const soLocal = parseInt(sortOrder, 10);
    if ((Number.isFinite(soLocal) ? soLocal : 0) !== soItem) return true;
    const a = [...selectedOcIds].sort().join(',');
    const b = initialOcIds.join(',');
    if (a !== b) return true;
    return false;
  }, [published, item, tagsStr, sortOrder, selectedOcIds, initialOcIds]);

  async function save() {
    if (!isDirty) return;
    setSaving(true);
    setLocalMessage(null);
    const so = parseInt(sortOrder, 10);
    try {
      const res = await fetch(`/api/admin/gallery/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published,
          tags: parseTags(tagsStr),
          sortOrder: Number.isFinite(so) ? so : 0,
          ocIds: selectedOcIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setLocalMessage(json.error || 'Save failed');
        return;
      }
      await onSaved();
      setLocalMessage('Saved');
      window.setTimeout(() => setLocalMessage(null), 2000);
    } catch {
      setLocalMessage('Save failed');
    } finally {
      setSaving(false);
    }
  }

  function toggleOc(ocId: string) {
    setSelectedOcIds((prev) =>
      prev.includes(ocId) ? prev.filter((id) => id !== ocId) : [...prev, ocId]
    );
  }

  async function setAsMainImage() {
    if (!profileImageOcId) return;
    const ocName = ocOptions.find((o) => o.id === profileImageOcId)?.name ?? 'this character';
    if (
      !window.confirm(
        `Set this image as ${ocName}'s primary profile image? This replaces their current primary image on profiles and cards.`
      )
    ) {
      return;
    }

    setSettingMainImage(true);
    setLocalMessage(null);
    try {
      const res = await fetch(`/api/admin/gallery/items/${item.id}/set-main-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocId: profileImageOcId }),
      });
      const json = await res.json();
      if (!json.success) {
        setLocalMessage(json.error || 'Failed to set profile image');
        return;
      }
      await onSaved();
      setLocalMessage(`Profile image updated for ${json.data?.ocName ?? ocName}`);
      window.setTimeout(() => setLocalMessage(null), 3000);
    } catch {
      setLocalMessage('Failed to set profile image');
    } finally {
      setSettingMainImage(false);
    }
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (imageLightbox) {
          setImageLightbox(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, imageLightbox]);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60"
        aria-label="Close editor"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 z-50 h-dvh max-h-dvh w-full max-w-lg sm:max-w-2xl lg:max-w-3xl bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-700 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-100">Edit gallery item</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {item.name || item.drive_file_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col lg:flex-row lg:min-h-full">
          <div className="lg:w-[min(42%,22rem)] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-700 bg-gray-950 flex flex-col lg:sticky lg:top-0 lg:self-start">
            <button
              type="button"
              onClick={() => setImageLightbox(true)}
              className="p-4 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset max-h-[min(36vh,280px)] lg:max-h-[min(52vh,420px)]"
              title="Click to view full image"
            >
              <GoogleDriveImage
                src={src}
                alt={item.name || item.drive_file_id}
                className="max-w-full max-h-[min(34vh,260px)] lg:max-h-[min(50vh,400px)] w-auto h-auto object-contain"
              />
            </button>
            <div className="shrink-0 p-4 space-y-3 border-t border-gray-800">
              {item.name ? (
                <p className="text-sm text-gray-200 font-medium break-words leading-snug">{item.name}</p>
              ) : null}
              <p className="text-[11px] text-gray-500 font-mono break-all leading-relaxed">
                {item.drive_file_id}
              </p>
              <a
                href={driveFileViewUrl(item.drive_file_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm rounded-md border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-colors"
              >
                Open in Google Drive
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="p-4 sm:p-5 space-y-5 pb-4">
              <GalleryEditSection
                step={1}
                title="Character galleries"
                description="Choose which character pages include this image in their personal gallery. This does not change their profile picture."
              >
                <p className="text-xs text-gray-500">
                  {selectedOcIds.length === 0
                    ? 'Not linked to any character yet.'
                    : `${selectedOcIds.length} character${selectedOcIds.length === 1 ? '' : 's'} selected`}
                </p>
                <input
                  type="search"
                  value={ocSearch}
                  onChange={(e) => setOcSearch(e.target.value)}
                  placeholder="Search characters…"
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
                />
                <div className="max-h-56 sm:max-h-64 overflow-y-auto rounded-md border border-gray-600 bg-gray-950/80 p-2 space-y-0.5">
                  {filteredOcOptions.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No characters match.</p>
                  ) : (
                    filteredOcOptions.map((oc) => {
                      const isLinked = selectedOcIds.includes(oc.id);
                      return (
                        <label
                          key={oc.id}
                          className={`flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-800/80 ${
                            isLinked ? 'text-gray-100 bg-gray-800/40' : 'text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => toggleOc(oc.id)}
                            className="rounded border-gray-600 bg-gray-700 text-purple-600 shrink-0"
                          />
                          <span className="truncate">{oc.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </GalleryEditSection>

              <GalleryEditSection
                step={2}
                title="Publish on site"
                description="When published, this image can appear on the public site gallery. Unpublished images stay admin-only."
                accent="green"
              >
                <div className="flex items-center justify-between gap-4 rounded-md border border-gray-700/80 bg-gray-950/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-100">
                      {published ? 'Published' : 'Unpublished'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {published ? 'Visible on the public gallery' : 'Hidden from visitors'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </GalleryEditSection>

              <GalleryEditSection
                step={3}
                title="Replace main profile image"
                description="Use this file as a character's primary image on their profile, cards, and infobox. Separate from their gallery list."
                accent="purple"
              >
                <input
                  type="search"
                  value={profileOcSearch}
                  onChange={(e) => setProfileOcSearch(e.target.value)}
                  placeholder="Search character to update…"
                  className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-600 bg-gray-950/80 p-2 space-y-0.5">
                  {filteredProfileOcOptions.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No characters match.</p>
                  ) : (
                    filteredProfileOcOptions.map((oc) => (
                      <label
                        key={oc.id}
                        className={`flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-md cursor-pointer hover:bg-gray-800/80 ${
                          profileImageOcId === oc.id
                            ? 'text-purple-100 bg-purple-900/30'
                            : 'text-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`profile-image-${item.id}`}
                          checked={profileImageOcId === oc.id}
                          onChange={() => setProfileImageOcId(oc.id)}
                          className="border-gray-600 bg-gray-700 text-purple-500 shrink-0"
                        />
                        <span className="truncate">{oc.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  disabled={!profileImageOcId || settingMainImage}
                  onClick={() => void setAsMainImage()}
                  className="w-full py-2.5 text-sm rounded-md border border-purple-500/70 bg-purple-700/50 text-purple-50 hover:bg-purple-700/70 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {settingMainImage
                    ? 'Updating profile image…'
                    : profileImageOcId
                      ? `Replace ${
                          ocOptions.find((o) => o.id === profileImageOcId)?.name ?? 'character'
                        }'s main image`
                      : 'Select a character above'}
                </button>
                <p className="text-xs text-gray-500">
                  Applies immediately. Does not require saving the options above.
                </p>
              </GalleryEditSection>

              <details className="rounded-lg border border-gray-700/60 bg-gray-800/20 px-4 py-3 group">
                <summary className="text-sm font-medium text-gray-300 cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>Tags & sort order</span>
                  <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="mt-4 space-y-3 pt-1 border-t border-gray-700/50">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
                      placeholder="sketch, commission, …"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sort order</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
                    />
                  </div>
                </div>
              </details>

              {isDirty ? (
                <p className="text-sm text-amber-300/90 px-1">
                  Unsaved changes to character links, publish status, tags, or sort order.
                </p>
              ) : null}
              {localMessage ? (
                <p
                  className={`text-sm px-1 ${
                    localMessage === 'Saved' || localMessage.startsWith('Profile image updated')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {localMessage}
                </p>
              ) : null}
            </div>
          </div>
          </div>
        </div>

        <div className="shrink-0 z-20 px-4 sm:px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-700 bg-gray-900 shadow-[0_-8px_24px_rgba(0,0,0,0.55)]">
          <p className="text-xs text-gray-500 mb-2">
            Save applies to character galleries, publish status, tags, and sort order only.
          </p>
          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => void save()}
            className={`w-full py-3 text-sm rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isDirty
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {saving ? 'Saving…' : isDirty ? 'Save gallery settings' : 'No changes to save'}
          </button>
        </div>
      </aside>

      {imageLightbox ? (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image preview"
          onClick={() => setImageLightbox(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/60 text-gray-200 hover:text-white"
            onClick={() => setImageLightbox(false)}
            aria-label="Close preview"
          >
            ✕
          </button>
          <div
            className="max-w-full max-h-[92vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <GoogleDriveImage
              src={src}
              alt={item.name || item.drive_file_id}
              className="max-w-full max-h-[min(92vh,900px)] w-auto h-auto object-contain mx-auto"
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
