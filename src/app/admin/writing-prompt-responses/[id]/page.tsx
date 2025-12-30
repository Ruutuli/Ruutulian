import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WritingPromptResponseForm } from '@/components/admin/WritingPromptResponseForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: 'Edit Writing Prompt Response',
  };
}

export default async function EditWritingPromptResponsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await params;

  const { data: response, error } = await supabase
    .from('writing_prompt_responses')
    .select(`
      *,
      oc:ocs!writing_prompt_responses_oc_id_fkey(id, name, slug),
      other_oc:ocs!writing_prompt_responses_other_oc_id_fkey(id, name, slug)
    `)
    .eq('id', resolvedParams.id)
    .single();

  if (error || !response) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-6">Edit Writing Prompt Response</h1>
      <WritingPromptResponseForm response={response} />
    </div>
  );
}

