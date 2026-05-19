/**
 * Clears legacy per-OC gallery URLs stored on `ocs.gallery`.
 * Artworks linked via Admin → Gallery (`gallery_item_ocs`) are untouched.
 *
 * Run (preview only):
 *   npx tsx scripts/utilities/clear-oc-gallery-fields.ts
 *
 * Run (apply):
 *   npx tsx scripts/utilities/clear-oc-gallery-fields.ts --execute
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error(
    'Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
  );
  process.exit(1);
}

const execute = process.argv.includes('--execute');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type OcRow = {
  id: string;
  name: string;
  slug: string;
  gallery: string[] | null;
};

function hasGalleryUrls(gallery: string[] | null | undefined): boolean {
  if (!Array.isArray(gallery) || gallery.length === 0) return false;
  return gallery.some((u) => typeof u === 'string' && u.trim().length > 0);
}

async function fetchOcsWithGallery(): Promise<OcRow[]> {
  const rows: OcRow[] = [];
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('ocs')
      .select('id, name, slug, gallery')
      .not('gallery', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data as OcRow[]) {
      if (hasGalleryUrls(row.gallery)) rows.push(row);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

async function main() {
  console.log(execute ? 'Mode: EXECUTE (will update database)' : 'Mode: DRY RUN (no changes)');
  console.log('Target: ocs.gallery → null\n');

  const affected = await fetchOcsWithGallery();
  const totalUrls = affected.reduce(
    (sum, oc) =>
      sum +
      (oc.gallery?.filter((u) => typeof u === 'string' && u.trim().length > 0).length ?? 0),
    0
  );

  console.log(`OCs with legacy gallery URLs: ${affected.length}`);
  console.log(`Total URL entries to remove: ${totalUrls}\n`);

  if (affected.length === 0) {
    console.log('Nothing to clear.');
    return;
  }

  for (const oc of affected.slice(0, 25)) {
    const count = oc.gallery?.filter((u) => typeof u === 'string' && u.trim().length > 0).length ?? 0;
    console.log(`  - ${oc.name} (${oc.slug}): ${count} URL(s)`);
  }
  if (affected.length > 25) {
    console.log(`  ... and ${affected.length - 25} more`);
  }

  if (!execute) {
    console.log('\nRe-run with --execute to apply.');
    return;
  }

  const ids = affected.map((oc) => oc.id);
  const batchSize = 100;
  let updated = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error } = await supabase.from('ocs').update({ gallery: null }).in('id', batch);
    if (error) throw error;
    updated += batch.length;
    console.log(`Updated ${updated}/${ids.length}...`);
  }

  console.log(`\nDone. Cleared gallery on ${updated} OC(s).`);
  console.log('Tagged gallery items (gallery_item_ocs / gallery_items) were not modified.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
