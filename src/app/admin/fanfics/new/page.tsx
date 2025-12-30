import type { Metadata } from 'next';
import { FanficForm } from '@/components/admin/FanficForm';

export const metadata: Metadata = {
  title: 'Create Fanfic',
};

export default async function NewFanficPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-50 mb-8">Create Fanfic</h1>
      <div className="bg-gray-800/40 rounded-xl shadow-xl p-8 border border-gray-600/50 backdrop-blur-sm">
        <FanficForm />
      </div>
    </div>
  );
}

