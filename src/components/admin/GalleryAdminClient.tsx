'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { driveFileViewUrl } from '@/lib/gallery/constants';
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

export function GalleryAdminClient({ ocs }: GalleryAdminClientProps) {
  const [items, setItems] = useState<GalleryAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const ocOptions = useMemo(() => [...ocs].sort((a, b) => a.name.localeCompare(b.name)), [ocs]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gallery/items');
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'error', text: json.error || 'Failed to load gallery items' });
        setItems([]);
        return;
      }
      setItems(json.data ?? []);
    } catch (e) {
      logger.error('GalleryAdmin', 'Load failed', e);
      setMessage({ type: 'error', text: 'Failed to load gallery items' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

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
      await loadItems();
    } catch (e) {
      logger.error('GalleryAdmin', 'Sync failed', e);
      setMessage({ type: 'error', text: 'Sync request failed' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <p className="text-gray-400 text-sm max-w-2xl">
          Pull images from the Drive folders configured in Site Settings. New files stay unpublished until you enable them
          here. Share those folders with your Google service account email (Viewer).
        </p>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void runSync()}
          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium"
        >
          {syncing ? 'Syncing…' : 'Sync from Google Drive'}
        </button>
      </div>

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

      {loading ? (
        <div className="text-gray-400 text-sm">Loading gallery items…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm">
          No items yet. Run sync after sharing folders with the service account and setting{' '}
          <code className="text-purple-300">GOOGLE_SERVICE_ACCOUNT_JSON</code>,{' '}
          <code className="text-purple-300">GOOGLE_SERVICE_ACCOUNT_JSON_PATH</code>, or{' '}
          <code className="text-purple-300">GOOGLE_APPLICATION_CREDENTIALS</code>.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <GalleryAdminCard key={item.id} item={item} ocOptions={ocOptions} onSaved={loadItems} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryAdminCard({
  item,
  ocOptions,
  onSaved,
}: {
  item: GalleryAdminItem;
  ocOptions: GalleryOcOption[];
  onSaved: () => Promise<void>;
}) {
  const [published, setPublished] = useState(item.published);
  const [tagsStr, setTagsStr] = useState(tagsToString(item.tags));
  const [sortOrder, setSortOrder] = useState(String(item.sort_order ?? 0));
  const [selectedOcIds, setSelectedOcIds] = useState<string[]>(() =>
    (item.gallery_item_ocs ?? []).map((r) => r.oc_id)
  );
  const [saving, setSaving] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const src = convertGoogleDriveUrl(driveFileViewUrl(item.drive_file_id));

  useEffect(() => {
    setPublished(item.published);
    setTagsStr(tagsToString(item.tags));
    setSortOrder(String(item.sort_order ?? 0));
    setSelectedOcIds((item.gallery_item_ocs ?? []).map((r) => r.oc_id));
  }, [item]);

  async function save() {
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

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40 overflow-hidden flex flex-col">
      <div className="aspect-square bg-gray-950 relative border-b border-gray-700">
        <GoogleDriveImage
          src={src}
          alt={item.name || item.drive_file_id}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-3 space-y-3 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 font-mono truncate" title={item.drive_file_id}>
          {item.drive_file_id}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-purple-600"
          />
          Published
        </label>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100"
            placeholder="sketch, commission, …"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sort order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100"
          />
        </div>
        <div className="flex-1 min-h-[120px] flex flex-col">
          <label className="block text-xs text-gray-400 mb-1">Characters</label>
          <div className="flex-1 overflow-y-auto max-h-40 border border-gray-600 rounded bg-gray-900/80 p-2 space-y-1">
            {ocOptions.map((oc) => (
              <label key={oc.id} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOcIds.includes(oc.id)}
                  onChange={() => toggleOc(oc.id)}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600"
                />
                <span className="truncate">{oc.name}</span>
              </label>
            ))}
          </div>
        </div>
        {localMessage ? (
          <div className={`text-xs ${localMessage === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>
            {localMessage}
          </div>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-auto w-full py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
