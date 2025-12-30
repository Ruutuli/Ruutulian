import type { Metadata } from 'next';
import { WritingPromptResponsesManager } from '@/components/admin/WritingPromptResponsesManager';

export const metadata: Metadata = {
  title: 'Writing Prompt Responses',
};

export default function AdminWritingPromptResponsesPage() {
  return <WritingPromptResponsesManager />;
}

