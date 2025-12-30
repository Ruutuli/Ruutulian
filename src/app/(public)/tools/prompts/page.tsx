import { createClient } from '@/lib/supabase/server';
import { WritingPrompts } from '@/components/creative/WritingPrompts';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';

export async function generateMetadata() {
  const config = await getSiteConfig();
  return generatePageMetadata(
    'Writing Prompts',
    `Generate writing prompts based on your characters on ${config.websiteName}.`,
    '/tools/prompts'
  );
}

export const revalidate = 60;

export default async function WritingPromptsPage() {
  const supabase = await createClient();

  const { data: ocs, error: ocsError } = await supabase
    .from('ocs')
    .select('id, name, slug, world_id, world:worlds(id, name, slug)')
    .eq('is_public', true);

  if (ocsError) {
    console.error('Error fetching OCs:', ocsError);
  }

  // Fetch active prompts from database
  const { data: prompts, error: promptsError } = await supabase
    .from('writing_prompts')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (promptsError) {
    console.error('Error fetching prompts:', promptsError);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Writing Prompts" />
      <WritingPrompts ocs={ocs || []} prompts={prompts || []} />
    </div>
  );
}

