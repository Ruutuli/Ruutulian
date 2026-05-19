'use client';

import { useEffect, useRef } from 'react';
import type { PageEntityType } from '@/lib/analytics/types';

interface PageViewTrackerProps {
  entityType: PageEntityType;
  slug?: string;
  entityId?: string;
  path?: string;
  worldSlug?: string;
  chapterNumber?: number;
}

export function PageViewTracker({
  entityType,
  slug,
  entityId,
  path,
  worldSlug,
  chapterNumber,
}: PageViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) {
      return;
    }
    tracked.current = true;

    const storageKey = [
      'pv',
      entityType,
      entityId ?? slug ?? path ?? '',
      worldSlug ?? '',
      chapterNumber ?? '',
    ].join(':');

    try {
      const lastTracked = sessionStorage.getItem(storageKey);
      if (lastTracked && Date.now() - Number(lastTracked) < 30_000) {
        return;
      }
      sessionStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // sessionStorage unavailable — still record the view
    }

    void fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        slug,
        entityId,
        path,
        worldSlug,
        chapterNumber,
      }),
      keepalive: true,
    });
  }, [entityType, slug, entityId, path, worldSlug, chapterNumber]);

  return null;
}
