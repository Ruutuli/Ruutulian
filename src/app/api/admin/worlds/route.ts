import { withAdminAuth, createPostHandler } from '@/lib/api/admin-route-wrapper';
import { NextRequest } from 'next/server';

export const POST = withAdminAuth(
  createPostHandler({
    table: 'worlds',
    entityName: 'World',
    requiredFields: ['name', 'slug', 'series_type', 'summary'],
  })
);
