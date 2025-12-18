import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TemplatesAndFieldsManager } from '@/components/admin/TemplatesAndFieldsManager';
import { requireAuth } from '@/lib/auth/require-auth';

export const metadata: Metadata = {
  title: 'Fields Management',
};

export default async function FieldsPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: worlds, error } = await supabase
    .from('worlds')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching worlds:', error);
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2 flex items-center gap-2 sm:gap-3">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">Fields Management</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg">
            Edit <strong>Character Template Fields</strong> (fields for characters) and <strong>World Custom Fields</strong> (fields for worlds)
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-700/80 text-white rounded-lg hover:bg-gray-600 font-medium transition-all flex items-center justify-center gap-2 shadow-md text-sm sm:text-base flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </div>

      <div className="bg-gray-800/40 rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden">
        <TemplatesAndFieldsManager worlds={worlds || []} />
      </div>
    </div>
  );
}
