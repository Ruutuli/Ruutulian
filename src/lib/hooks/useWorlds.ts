import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { World } from '@/types/oc';
import { logger } from '@/lib/logger';

type WorldListItem = Pick<World, 'id' | 'name'> & { slug?: string };

interface UseWorldsOptions {
  includeSlug?: boolean;
}

interface UseWorldsResult {
  worlds: WorldListItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch all worlds from the database.
 * Used across multiple forms for world selection dropdowns.
 */
export function useWorlds(options: UseWorldsOptions = {}): UseWorldsResult {
  const { includeSlug = false } = options;
  const [worlds, setWorlds] = useState<WorldListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWorlds() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        
        let result;
        if (includeSlug) {
          result = await supabase
            .from('worlds')
            .select('id, name, slug')
            .order('name');
        } else {
          result = await supabase
            .from('worlds')
            .select('id, name')
            .order('name');
        }

        if (cancelled) return;

        const { data, error: fetchError } = result;

        if (fetchError) {
          throw fetchError;
        }

        if (!cancelled) {
          setWorlds((data as unknown as WorldListItem[]) || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch worlds');
          logger.error('Hook', 'useWorlds: Error fetching worlds', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWorlds();

    return () => {
      cancelled = true;
    };
  }, [includeSlug]);

  return { worlds, loading, error };
}




