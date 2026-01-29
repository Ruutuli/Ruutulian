'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface SetupData {
  websiteName: string;
  websiteDescription: string;
  iconUrl: string;
  siteUrl: string;
  authorName: string;
  shortName: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<SetupData>({
    websiteName: '',
    websiteDescription: '',
    iconUrl: '/icon.png',
    siteUrl: '',
    authorName: '',
    shortName: '',
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  async function checkSetupStatus() {
    try {
      const response = await fetch('/api/admin/setup');
      const result = await response.json();

      if (result.success) {
        setNeedsSetup(result.data.needsSetup);
        if (!result.data.needsSetup) {
          // Setup already complete, redirect to admin
          router.push('/admin');
        }
      }
    } catch (error) {
      logger.error('Page', 'admin/setup: Failed to check setup status', error);
      setError('Failed to check setup status');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Setup complete, redirect to login
        router.push('/admin/login');
      } else {
        setError(result.error || 'Failed to complete setup');
      }
    } catch (error) {
      setError('An error occurred during setup');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/30">
        <div className="text-gray-300">Loading...</div>
      </div>
    );
  }

  if (needsSetup === false) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/30 p-4">
      <div className="max-w-4xl w-full space-y-8 p-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-100 mb-2">
            Initial Setup
          </h2>
          <p className="text-center text-sm text-gray-300">
            Fill this out to configure your OC wiki with your own information!
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2">
              Site Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="websiteName" className="block text-sm font-medium text-gray-300 mb-2">
                  Website Name *
                </label>
                <input
                  id="websiteName"
                  type="text"
                  required
                  value={formData.websiteName}
                  onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="OC Wiki"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="websiteDescription" className="block text-sm font-medium text-gray-300 mb-2">
                  Website Description *
                </label>
                <textarea
                  id="websiteDescription"
                  required
                  rows={3}
                  value={formData.websiteDescription}
                  onChange={(e) => setFormData({ ...formData, websiteDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="A place to store and organize information on original characters, worlds, lore, and timelines."
                />
              </div>

              <div>
                <label htmlFor="siteUrl" className="block text-sm font-medium text-gray-300 mb-2">
                  Site URL *
                </label>
                <input
                  id="siteUrl"
                  type="url"
                  required
                  value={formData.siteUrl}
                  onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://example.com"
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
                  value={formData.iconUrl}
                  onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="/icon.png"
                />
              </div>

              <div>
                <label htmlFor="authorName" className="block text-sm font-medium text-gray-300 mb-2">
                  Author Name *
                </label>
                <input
                  id="authorName"
                  type="text"
                  required
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Your Name"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

