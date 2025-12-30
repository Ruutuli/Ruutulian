import type { Metadata } from 'next';
import { WritingPromptsManager } from '@/components/admin/WritingPromptsManager';

export const metadata: Metadata = {
  title: 'Writing Prompts',
};

export default function AdminWritingPromptsPage() {
  return <WritingPromptsManager />;
}

