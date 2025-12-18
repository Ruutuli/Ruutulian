import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { TemplatesAndFieldsManager } from '@/components/admin/TemplatesAndFieldsManager';

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: worlds } = await supabase
    .from('worlds')
    .select('*')
    .order('name');

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Templates & Fields Management
          </h1>
          <p className="text-gray-400 text-lg">
            Manage character template fields and world custom fields
          </p>
        </div>
        <Link
          href="/admin"
          className="px-5 py-2.5 bg-gray-700/80 text-white rounded-lg hover:bg-gray-600 font-medium transition-all flex items-center gap-2 shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-gray-800/40 rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden">
        <TemplatesAndFieldsManager 
          worlds={worlds || []} 
        />
      </div>
    </div>
  );
}

