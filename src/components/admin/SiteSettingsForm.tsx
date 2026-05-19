'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import {
  DEFAULT_GALLERY_DRIVE_FOLDER_IDS,
  parseGalleryDriveFolderIds,
} from '@/lib/gallery/constants';

interface SiteSettings {
  websiteName: string;
  websiteDescription: string;
  iconUrl: string;
  altIconUrl: string;
  authorName: string;
  shortName: string;
  galleryEnabled: boolean;
  galleryDriveFolderIdsText: string;
}

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>({
    websiteName: '',
    websiteDescription: '',
    iconUrl: '',
    altIconUrl: '',
    authorName: '',
    shortName: '',
    galleryEnabled: false,
    galleryDriveFolderIdsText: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const timeoutsRef = useRef<Set<number>>(new Set());

  const scheduleTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  };

  // Ensure timeouts can't outlive the component
  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/site-settings');
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Component', 'SiteSettingsForm: API response not OK', { status: response.status, errorText });
        setMessage({ type: 'error', text: `Failed to load settings (${response.status})` });
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (!result.success) {
        logger.error('Component', 'SiteSettingsForm: API returned error', result.error);
        setMessage({ type: 'error', text: result.error || 'Failed to load settings' });
        setIsLoading(false);
        return;
      }

      // If data exists, populate the form. If null, leave form empty (no file fallback)
      if (result.data) {
        setSettings({
          websiteName: result.data.website_name || '',
          websiteDescription: result.data.website_description || '',
          iconUrl: result.data.icon_url || '',
          altIconUrl: result.data.alt_icon_url || '',
          authorName: result.data.author_name || '',
          shortName: result.data.short_name || '',
          galleryEnabled: Boolean(result.data.gallery_enabled),
          galleryDriveFolderIdsText:
            Array.isArray(result.data.gallery_drive_folder_ids) &&
            result.data.gallery_drive_folder_ids.length > 0
              ? (result.data.gallery_drive_folder_ids as string[]).join('\n')
              : DEFAULT_GALLERY_DRIVE_FOLDER_IDS.join('\n'),
        });
      }
    } catch (error) {
      logger.error('Component', 'SiteSettingsForm: Failed to fetch settings', error);
      setMessage({ type: 'error', text: `Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Prepare data for submission, converting empty strings to null for optional fields
      const galleryDriveFolderIds = parseGalleryDriveFolderIds(settings.galleryDriveFolderIdsText);
      if (galleryDriveFolderIds.length === 0) {
        setMessage({
          type: 'error',
          text: 'Add at least one Google Drive folder ID or link (one per line).',
        });
        setIsSaving(false);
        return;
      }

      const { galleryDriveFolderIdsText: _omit, ...settingsRest } = settings;

      const submitData = {
        ...settingsRest,
        iconUrl: settings.iconUrl?.trim() || '',
        altIconUrl: settings.altIconUrl?.trim() || null,
        galleryEnabled: settings.galleryEnabled,
        galleryDriveFolderIds,
      };

      logger.debug('Component', 'SiteSettingsForm: Submitting data', {
        iconUrl: submitData.iconUrl,
        altIconUrl: submitData.altIconUrl,
        hasIconUrl: !!submitData.iconUrl,
        hasAltIconUrl: !!submitData.altIconUrl,
      });

      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        const folderCount = galleryDriveFolderIds.length;
        setMessage({
          type: 'success',
          text: `Settings saved successfully! Gallery sync will use ${folderCount} folder${folderCount === 1 ? '' : 's'}.`,
        });
        setSettings((prev) => ({
          ...prev,
          galleryDriveFolderIdsText: galleryDriveFolderIds.join('\n'),
        }));
        // Clear message after 3 seconds
        scheduleTimeout(() => setMessage(null), 3000);
        // Dispatch custom event to refresh site name in navigation after a delay
        // to ensure database transaction is fully committed
        // Include the saved websiteName in the event so components can use it immediately
        scheduleTimeout(() => {
          const event = new CustomEvent('site-settings-updated', {
            detail: { websiteName: settings.websiteName }
          });
          window.dispatchEvent(event);
        }, 1000); // Increased delay to ensure database commit
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving settings' });
    } finally {
      setIsSaving(false);
    }
  }

  const parsedGalleryFolderIds = useMemo(
    () => parseGalleryDriveFolderIds(settings.galleryDriveFolderIdsText),
    [settings.galleryDriveFolderIdsText]
  );

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Site Settings</h2>
      <p className="text-gray-400 mb-6 text-sm">
        Configure your site's name, description, and other settings. These values will be used throughout the site.
      </p>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-900/50 border border-green-700 text-green-200'
              : 'bg-red-900/50 border border-red-700 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="websiteName" className="block text-sm font-medium text-gray-300 mb-2">
              Website Name *
            </label>
            <input
              id="websiteName"
              type="text"
              required
              value={settings.websiteName}
              onChange={(e) => setSettings({ ...settings, websiteName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="My OC Wiki"
            />
          </div>

          <div>
            <label htmlFor="shortName" className="block text-sm font-medium text-gray-300 mb-2">
              Short Name *
            </label>
            <input
              id="shortName"
              type="text"
              required
              value={settings.shortName}
              onChange={(e) => setSettings({ ...settings, shortName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="OC Wiki"
            />
            <p className="text-xs text-gray-500 mt-1">Used in navigation and compact displays</p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="websiteDescription" className="block text-sm font-medium text-gray-300 mb-2">
              Website Description *
            </label>
            <textarea
              id="websiteDescription"
              required
              rows={3}
              value={settings.websiteDescription}
              onChange={(e) => setSettings({ ...settings, websiteDescription: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="A place to store and organize information on original characters, worlds, lore, and timelines."
            />
          </div>

          <div>
            <label htmlFor="iconUrl" className="block text-sm font-medium text-gray-300 mb-2">
              Icon URL *
            </label>
            <input
              id="iconUrl"
              type="text"
              required
              value={settings.iconUrl}
              onChange={(e) => setSettings({ ...settings, iconUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="/icon.png"
            />
            <p className="text-xs text-gray-500 mt-1">Path to your site icon (e.g., /icon.png) or Google Drive URL</p>
          </div>

          <div>
            <label htmlFor="altIconUrl" className="block text-sm font-medium text-gray-300 mb-2">
              Alt Icon URL
            </label>
            <input
              id="altIconUrl"
              type="text"
              value={settings.altIconUrl}
              onChange={(e) => setSettings({ ...settings, altIconUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="/icon-alt.png"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Alternative icon URL (supports Google Drive links)</p>
          </div>

          <div>
            <label htmlFor="authorName" className="block text-sm font-medium text-gray-300 mb-2">
              Author Name *
            </label>
            <input
              id="authorName"
              type="text"
              required
              value={settings.authorName}
              onChange={(e) => setSettings({ ...settings, authorName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Your Name"
            />
          </div>

          <div className="md:col-span-2 border-t border-gray-700 pt-6 mt-2">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Gallery</h3>
            <div className="flex items-start gap-3 mb-4">
              <input
                id="galleryEnabled"
                type="checkbox"
                checked={settings.galleryEnabled}
                onChange={(e) => setSettings({ ...settings, galleryEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <label htmlFor="galleryEnabled" className="text-sm font-medium text-gray-300">
                  Enable public gallery
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  When off, the Gallery nav link is hidden and the gallery page shows nothing. Individual artworks still need to be published from Admin → Gallery.
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="galleryDriveFolders" className="block text-sm font-medium text-gray-300 mb-2">
                Google Drive folders
              </label>
              <textarea
                id="galleryDriveFolders"
                rows={4}
                value={settings.galleryDriveFolderIdsText}
                onChange={(e) => setSettings({ ...settings, galleryDriveFolderIdsText: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder={`https://drive.google.com/drive/folders/${DEFAULT_GALLERY_DRIVE_FOLDER_IDS[0]}\nhttps://drive.google.com/drive/folders/${DEFAULT_GALLERY_DRIVE_FOLDER_IDS[1]}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                One folder per line (or comma-separated). Paste the full share link or just the folder ID. Subfolders
                are included. Share each folder with your Google service account (Viewer).
              </p>
              {parsedGalleryFolderIds.length > 0 ? (
                <p className="text-xs text-purple-300/90 mt-2">
                  {parsedGalleryFolderIds.length} folder
                  {parsedGalleryFolderIds.length === 1 ? '' : 's'} recognized:{' '}
                  {parsedGalleryFolderIds.join(', ')}
                </p>
              ) : (
                <p className="text-xs text-amber-400/90 mt-2">No folder IDs recognized yet — add one per line.</p>
              )}
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

