import { withAdminAuth, createPostHandler } from '@/lib/api/admin-route-wrapper';
import { NextRequest } from 'next/server';

export const POST = withAdminAuth(
  createPostHandler({
    table: 'writing_prompts',
    entityName: 'Writing Prompt',
    requiredFields: ['category', 'prompt_text', 'requires_two_characters'],
  })
);

