import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OC {
  id: string;
  name: string;
  slug: string;
  date_of_birth?: string | null;
}

interface UseOCsByWorldResult {
  ocs: OC[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch OCs filtered by world_id.
 * Used in forms that need to select characters from a specific world.
 */
export function useOCsByWorld(
  worldId: string | null | undefined,
  storyAliasId?: string | null | undefined
): UseOCsByWorldResult {
  const [ocs, setOCs] = useState<OC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOCs() {
      if (!worldId) {
        setOCs([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        let query = supabase
          .from('ocs')
          .select('id, name, slug, date_of_birth')
          .eq('world_id', worldId);
        
        if (storyAliasId !== undefined) {
          if (storyAliasId === null) {
            query = query.is('story_alias_id', null);
          } else {
            query = query.eq('story_alias_id', storyAliasId);
          }
        }
        
        const { data, error: fetchError } = await query.order('name');

        if (fetchError) {
          throw fetchError;
        }

        setOCs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch characters');
        console.error('Error fetching characters:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOCs();
  }, [worldId, storyAliasId]);

  return { ocs, loading, error };
}

