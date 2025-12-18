import { withAdminAuth, createPostHandler } from '@/lib/api/admin-route-wrapper';
import { NextRequest } from 'next/server';

export const POST = withAdminAuth(
  createPostHandler({
    table: 'timelines',
    entityName: 'Timeline',
    requiredFields: ['world_id', 'name'],
  })
);
