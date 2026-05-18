'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  return (
    <div className="space-y-6">
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
          <span className="text-sm text-gray-500 ml-auto">
            {loading ? 'Loading…' : `${total.toLocaleString()} match${total === 1 ? '' : 'es'}`}
          </span>
        </div>
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
                selected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
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

      {selectedItem ? (
        <GalleryAdminEditDrawer
          item={selectedItem}
          ocOptions={ocOptions}
          onClose={() => setSelectedId(null)}
          onSaved={async () => {
            await reloadCurrentPage();
          }}
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

function GalleryAdminTile({
  item,
  selected,
  onSelect,
}: {
  item: GalleryAdminItem;
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
          ? 'border-purple-500 ring-1 ring-purple-500/50'
          : 'border-gray-700/80 hover:border-gray-500 bg-gray-800/40'
      }`}
    >
      <div className="aspect-square bg-gray-950 relative">
        <GoogleDriveImage
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
        />
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
    setSelectedOcIds((prev) => {
      if (prev.includes(ocId)) {
        const next = prev.filter((id) => id !== ocId);
        if (profileImageOcId === ocId) {
          setProfileImageOcId(next[0] ?? '');
        }
        return next;
      }
      const next = [...prev, ocId];
      if (!profileImageOcId || !prev.includes(profileImageOcId)) {
        setProfileImageOcId(ocId);
      }
      return next;
    });
  }

  async function setAsMainImage() {
    if (!profileImageOcId || !selectedOcIds.includes(profileImageOcId)) return;
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
      <aside className="fixed top-0 right-0 z-50 h-dvh w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-100 truncate">Edit gallery item</h2>
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
          <button
            type="button"
            onClick={() => setImageLightbox(true)}
            className="w-full shrink-0 border-b border-gray-700 bg-gray-950 p-2 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset"
            title="Click to view full image"
          >
            <GoogleDriveImage
              src={src}
              alt={item.name || item.drive_file_id}
              className="max-w-full max-h-[min(38vh,320px)] w-auto h-auto object-contain mx-auto"
            />
          </button>

          <div className="p-4 space-y-4 pb-6">
            {item.name ? (
              <div className="text-sm text-gray-200 font-medium break-words">{item.name}</div>
            ) : null}
            <div className="text-xs text-gray-500 font-mono break-all">{item.drive_file_id}</div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-200">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-purple-600"
              />
              Published on site
            </label>

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

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Characters ({selectedOcIds.length} selected)
              </label>
              <p className="text-[11px] text-gray-500 mb-2 leading-snug">
                Check who appears in this piece. Select <span className="text-purple-300/90">Profile</span>{' '}
                on one linked character, then apply below.
              </p>
              <input
                type="search"
                value={ocSearch}
                onChange={(e) => setOcSearch(e.target.value)}
                placeholder="Filter characters…"
                className="w-full mb-2 px-3 py-1.5 text-sm bg-gray-950 border border-gray-600 rounded-md text-gray-100"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-md bg-gray-950/80 p-2 space-y-1">
                {filteredOcOptions.length === 0 ? (
                  <p className="text-xs text-gray-500 px-1 py-2">No characters match.</p>
                ) : (
                  filteredOcOptions.map((oc) => {
                    const isLinked = selectedOcIds.includes(oc.id);
                    return (
                      <div
                        key={oc.id}
                        className={`flex items-center gap-2 text-xs py-0.5 rounded px-1 ${
                          isLinked ? 'text-gray-200' : 'text-gray-400'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => toggleOc(oc.id)}
                            className="rounded border-gray-600 bg-gray-700 text-purple-600 shrink-0"
                          />
                          <span className="truncate">{oc.name}</span>
                        </label>
                        {isLinked ? (
                          <label
                            className="flex items-center gap-1 shrink-0 cursor-pointer text-[10px] text-purple-300/90"
                            title="Use as this character's profile image"
                          >
                            <input
                              type="radio"
                              name={`profile-image-${item.id}`}
                              checked={profileImageOcId === oc.id}
                              onChange={() => setProfileImageOcId(oc.id)}
                              className="border-gray-600 bg-gray-700 text-purple-500"
                            />
                            <span className="whitespace-nowrap">Profile</span>
                          </label>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              {selectedOcIds.length > 0 ? (
                <button
                  type="button"
                  disabled={!profileImageOcId || settingMainImage}
                  onClick={() => void setAsMainImage()}
                  className="mt-2 w-full py-2 text-sm rounded-md border border-purple-600/60 bg-purple-900/40 text-purple-100 hover:bg-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {settingMainImage
                    ? 'Updating…'
                    : `Set as ${
                        ocOptions.find((o) => o.id === profileImageOcId)?.name ?? 'character'
                      }'s profile image`}
                </button>
              ) : null}
            </div>

            {isDirty ? (
              <p className="text-xs text-amber-300/90">You have unsaved changes.</p>
            ) : null}
            {localMessage ? (
              <p
                className={`text-xs ${
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

        <div className="shrink-0 p-4 border-t border-gray-700 bg-gray-900/95 space-y-2">
          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => void save()}
            className={`w-full py-2.5 text-sm rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isDirty
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {saving ? 'Saving…' : isDirty ? 'Save changes' : 'No changes'}
          </button>
          <a
            href={driveFileViewUrl(item.drive_file_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-gray-500 hover:text-purple-300"
          >
            Open in Google Drive ↗
          </a>
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
