import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { OCIdentityManager } from '@/components/admin/OCIdentityManager';

export default async function IdentityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: identity } = await supabase
    .from('oc_identities')
    .select('id')
    .eq('id', params.id)
    .single();

  if (!identity) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <OCIdentityManager identityId={params.id} />
    </div>
  );
}




















