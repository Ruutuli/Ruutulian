import { NextResponse } from 'next/server';
import {
  getAnalyticsSummary,
  getRecentPageViews,
} from '@/lib/analytics/record-view';
import { withAdminAuth } from '@/lib/api/admin-route-wrapper';

export const GET = withAdminAuth(async ({ supabase, request }) => {
  const { searchParams } = new URL(request.url);
  const days = Math.min(
    Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1),
    365
  );
  const includeRecent = searchParams.get('recent') === 'true';
  const recentLimit = Math.min(
    Math.max(parseInt(searchParams.get('recentLimit') ?? '50', 10) || 50, 1),
    200
  );

  const summary = await getAnalyticsSummary(supabase, days);
  const recent = includeRecent
    ? await getRecentPageViews(supabase, recentLimit)
    : undefined;

  return NextResponse.json({
    summary,
    recent,
  });
});
