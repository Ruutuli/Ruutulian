import { withAdminAuth, createPutHandler, createDeleteHandler } from '@/lib/api/admin-route-wrapper';
import { NextRequest } from 'next/server';

export const PUT = withAdminAuth(
  createPutHandler({
    table: 'writing_prompt_responses',
    entityName: 'Writing Prompt Response',
    requiredFields: ['oc_id', 'category', 'prompt_text', 'response_text'],
  })
);

export const DELETE = withAdminAuth(
  createDeleteHandler({
    table: 'writing_prompt_responses',
    entityName: 'Writing Prompt Response',
  })
);

