'use client';

import { useState, useEffect } from 'react';

interface SiteSettings {
  websiteName: string;
  websiteDescription: string;
  iconUrl: string;
  altIconUrl: string;
  authorName: string;
  shortName: string;
}

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>({
    websiteName: '',
    websiteDescription: '',
    iconUrl: '',
    altIconUrl: '',
    authorName: '',
    shortName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/admin/site-settings');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);
        setMessage({ type: 'error', text: `Failed to load settings (${response.status})` });
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      console.log('Settings API response:', result);

      if (!result.success) {
        console.error('API returned error:', result.error);
        setMessage({ type: 'error', text: result.error || 'Failed to load settings' });
        setIsLoading(false);
        return;
      }

      // If data exists, populate the form. If null, leave form empty (no file fallback)
      if (result.data) {
        console.log('Loading settings from database:', result.data);
        setSettings({
          websiteName: result.data.website_name || '',
          websiteDescription: result.data.website_description || '',
          iconUrl: result.data.icon_url || '',
          altIconUrl: result.data.alt_icon_url || '',
          authorName: result.data.author_name || '',
          shortName: result.data.short_name || '',
        });
      } else {
        // No data in database - form will be empty, user needs to fill it in
        console.log('No database settings found. Form will be empty.');
        // Settings state already initialized with empty strings, so no action needed
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
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
      const submitData = {
        ...settings,
        altIconUrl: settings.altIconUrl?.trim() || null,
      };

      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
        // Dispatch custom event to refresh site name in navigation after a delay
        // to ensure database transaction is fully committed
        // Include the saved websiteName in the event so components can use it immediately
        setTimeout(() => {
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

