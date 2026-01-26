import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Generate a seed based on the current date in EST (same seed for the same day)
function getDaySeed(): number {
  const today = new Date();
  // Get date components in EST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', // EST/EDT
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(today);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const dateString = `${year}-${month}-${day}`;
  
  // Hash function to convert date string to number
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator (Linear Congruential Generator)
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    // LCG parameters (from Numerical Recipes)
    value = (value * 1664525 + 1013904223) % Math.pow(2, 32);
    return value / Math.pow(2, 32);
  };
}

// Fisher-Yates shuffle with seeded random
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const useDailySeed = searchParams.get('daily') !== 'false'; // Default to true

    // Fetch all public OCs
    const { data: ocs, error } = await supabase
      .from('ocs')
      .select('*, world:worlds(id, name, slug, primary_color, accent_color)')
      .eq('is_public', true);

    if (error) {
      logger.error('API', 'Error fetching OCs', error);
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    if (!ocs || ocs.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 404 });
    }

    // Get random character
    let randomOC;
    if (useDailySeed) {
      const seed = getDaySeed();
      const shuffled = seededShuffle(ocs, seed);
      randomOC = shuffled[0];
    } else {
      // Truly random for refresh
      randomOC = ocs[Math.floor(Math.random() * ocs.length)];
    }

    return NextResponse.json({ oc: randomOC });
  } catch (error) {
    logger.error('API', 'Error in random character API', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


