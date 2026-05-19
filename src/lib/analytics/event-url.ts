import type { PageViewEvent } from '@/lib/analytics/types';

/** Map a stored view event to a public site path (when possible). */
export function getPublicPathForViewEvent(
  event: PageViewEvent,
  loreWorldSlugs?: Record<string, string>
): string | null {
  const slug = event.slug ?? undefined;
  const meta = event.metadata ?? {};

  switch (event.entity_type) {
    case 'oc':
      return slug ? `/ocs/${slug}` : null;
    case 'world':
      return slug ? `/worlds/${slug}` : null;
    case 'lore': {
      const worldSlug =
        (typeof meta.world_slug === 'string' ? meta.world_slug : null) ??
        (event.entity_id && loreWorldSlugs?.[event.entity_id]);
      return slug && worldSlug ? `/worlds/${worldSlug}/lore/${slug}` : null;
    }
    case 'fanfic':
      return slug ? `/fanfics/${slug}` : null;
    case 'fanfic_chapter': {
      const chapter =
        typeof meta.chapter_number === 'number' ? meta.chapter_number : null;
      return slug && chapter != null
        ? `/fanfics/${slug}/chapters/${chapter}`
        : slug
          ? `/fanfics/${slug}`
          : null;
    }
    case 'page':
      return event.path ?? null;
    default:
      return event.path ?? null;
  }
}

export function formatEntityTypeLabel(entityType: string): string {
  return entityType.replace(/_/g, ' ');
}
