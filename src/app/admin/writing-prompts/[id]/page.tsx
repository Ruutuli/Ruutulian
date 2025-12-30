import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WritingPromptForm } from '@/components/admin/WritingPromptForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: 'Edit Writing Prompt',
  };
}

export default async function EditWritingPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: prompt, error } = await supabase
    .from('writing_prompts')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !prompt) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6">Edit Writing Prompt</h1>
      <WritingPromptForm prompt={prompt} />
    </div>
  );
}

