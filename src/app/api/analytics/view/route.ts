import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidPageEntityType, recordPageView } from '@/lib/analytics/record-view';
import type { RecordPageViewPayload } from '@/lib/analytics/types';
import { logger } from '@/lib/logger';

function parsePayload(body: unknown): RecordPageViewPayload | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const entityType = raw.entityType ?? raw.entity_type;

  if (typeof entityType !== 'string' || !isValidPageEntityType(entityType)) {
    return null;
  }

  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : undefined;
  const entityId = typeof raw.entityId === 'string' ? raw.entityId : undefined;
  const path = typeof raw.path === 'string' ? raw.path.trim() : undefined;
  const worldSlug =
    typeof raw.worldSlug === 'string' ? raw.worldSlug.trim() : undefined;
  const chapterNumber =
    typeof raw.chapterNumber === 'number'
      ? raw.chapterNumber
      : typeof raw.chapter_number === 'number'
        ? raw.chapter_number
        : undefined;
  const metadata =
    raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : undefined;

  if (entityType === 'page' && !path) {
    return null;
  }

  if (entityType !== 'page' && !slug && !entityId) {
    return null;
  }

  if (entityType === 'lore' && !slug && !entityId) {
    return null;
  }

  return {
    entityType,
    slug,
    entityId,
    path,
    worldSlug,
    chapterNumber,
    metadata,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parsePayload(body);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await recordPageView(supabase, payload);

    if (!result?.ok) {
      return NextResponse.json(
        { ok: false, error: result?.error ?? 'not_recorded' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('AnalyticsView', 'Failed to record page view', { error });
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
