import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0; // Always fetch fresh
export const dynamic = 'force-dynamic';

export default async function RandomCharacterPage() {
  const supabase = await createClient();

  // Fetch all public OCs
  const { data: ocs, error } = await supabase
    .from('ocs')
    .select('slug')
    .eq('is_public', true);

  if (error || !ocs || ocs.length === 0) {
    redirect('/ocs');
  }

  // Get a truly random character (different every time)
  const randomIndex = Math.floor(Math.random() * ocs.length);
  const randomOC = ocs[randomIndex];

  if (!randomOC || !randomOC.slug) {
    redirect('/ocs');
  }

  // Redirect to the random OC's profile/wiki page
  redirect(`/ocs/${randomOC.slug}`);
}

