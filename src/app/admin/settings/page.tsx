import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { CurrentProjectsEditor } from '@/components/admin/CurrentProjectsEditor';

export const metadata: Metadata = {
  title: 'Site Settings',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-100">Site Settings</h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">
          Configure your site's appearance, information, and customization options
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">Setup</h2>
        <p className="text-gray-400 mb-4 text-sm">
          Access the initial setup page to configure site information.
        </p>
        <Link
          href="/admin/setup"
          className="inline-block px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
        >
          Go to Setup
        </Link>
      </div>

      {/* Basic Site Information */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Basic Information</h2>
        <SiteSettingsForm />
      </div>

      {/* Current Projects Section */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">Homepage Customization</h2>
        <CurrentProjectsEditor />
      </div>
    </div>
  );
}

