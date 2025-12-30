import type { Metadata } from 'next';
import { WritingPromptForm } from '@/components/admin/WritingPromptForm';

export const metadata: Metadata = {
  title: 'New Writing Prompt',
};

export default function NewWritingPromptPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6">Create New Writing Prompt</h1>
      <WritingPromptForm />
    </div>
  );
}

