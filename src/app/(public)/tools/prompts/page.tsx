import { createClient } from '@/lib/supabase/server';
import { WritingPrompts } from '@/components/creative/WritingPrompts';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/config/metadata-helpers';
import { getSiteConfig } from '@/lib/config/site-config';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getSession } from '@/lib/auth/session-store';

const checkAdminAuth = cache(async () => {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin-session');
    
    if (!sessionCookie?.value) {
      return false;
    }

    // Verify session token exists and is valid
    const session = await getSession(sessionCookie.value);
    return session !== null;
  } catch (error) {
    return false;
  }
});

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

  // Check if admin is authenticated
  const isAdmin = await checkAdminAuth();

  const { data: ocsData, error: ocsError } = await supabase
    .from('ocs')
    .select('id, name, slug, world_id, worlds!inner(id, name, slug)')
    .eq('is_public', true);

  if (ocsError) {
    console.error('Error fetching OCs:', ocsError);
  }

  // Transform the data to match the expected type (Supabase returns world as array)
  const ocs = ocsData?.map((oc: any) => ({
    id: oc.id,
    name: oc.name,
    slug: oc.slug,
    world_id: oc.world_id,
    world: Array.isArray(oc.worlds) && oc.worlds.length > 0 ? oc.worlds[0] : null,
  })) || [];

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
    <div className="space-y-4">
      <PageHeader title="Writing Prompts" />
      <WritingPrompts ocs={ocs || []} prompts={prompts || []} isAdmin={isAdmin} />
    </div>
  );
}

