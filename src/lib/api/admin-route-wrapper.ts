import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth/require-auth';
import { createAdminClient } from '@/lib/supabase/server';
import { errorResponse, handleError } from './route-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Context passed to route handlers
 */
export interface AdminRouteContext {
  user: { id: string; email: string };
  supabase: SupabaseClient;
  request: NextRequest;
}

/**
 * Handler function type for admin routes
 */
export type AdminRouteHandler = (
  context: AdminRouteContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

/**
 * Wraps an admin route handler with authentication and error handling.
 * Automatically checks auth, creates supabase client, and handles errors.
 * 
 * For routes without params: use `withAdminAuth(handler)`
 * For routes with params: use `withAdminAuth(handler)` and access params from the handler's second argument
 * 
 * @param handler - The route handler function
 * @returns Wrapped route handler compatible with Next.js App Router
 */
export function withAdminAuth(handler: AdminRouteHandler) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      // Check authentication
      const user = await checkAuth();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Create supabase client
      const supabase = createAdminClient();

      // Resolve params if provided (handle both Promise and direct object)
      let params: Record<string, string> = {};
      if (context?.params) {
        params = context.params instanceof Promise 
          ? await context.params 
          : context.params;
      }

      // Call the handler with context
      return await handler({ user, supabase, request }, params);
    } catch (error) {
      return handleError(error, 'Internal server error');
    }
  };
}

/**
 * Options for creating a standard CRUD route handler
 */
export interface CrudRouteOptions {
  table: string;
  entityName: string;
  requiredFields?: string[];
  transformBody?: (body: any) => any;
  validateBody?: (body: any, supabase: SupabaseClient) => Promise<NextResponse | null>;
  afterCreate?: (data: any, context: AdminRouteContext) => Promise<void>;
  afterUpdate?: (data: any, context: AdminRouteContext) => Promise<void>;
  selectQuery?: string;
}

/**
 * Creates a standard POST handler for creating entities
 */
export function createPostHandler(options: CrudRouteOptions): AdminRouteHandler {
  return async (context) => {
    const { supabase, request } = context;
    const body = await request.json();

    // Validate required fields if specified
    if (options.requiredFields) {
      const missingFields = options.requiredFields.filter((field) => !body[field]);
      if (missingFields.length > 0) {
        return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
      }
    }

    // Custom validation if provided
    if (options.validateBody) {
      const validationError = await options.validateBody(body, supabase);
      if (validationError) {
        return validationError;
      }
    }

    // Transform body if provided
    const transformedBody = options.transformBody ? options.transformBody(body) : body;

    // Insert into database
    const query = supabase.from(options.table).insert(transformedBody);
    const { data, error } = options.selectQuery
      ? await query.select(options.selectQuery).single()
      : await query.select().single();

    if (error) {
      return errorResponse(error.message);
    }

    // Run afterCreate hook if provided
    if (options.afterCreate && data) {
      await options.afterCreate(data, context);
    }

    return NextResponse.json(data, { status: 200 });
  };
}

/**
 * Creates a standard PUT handler for updating entities
 */
export function createPutHandler(options: CrudRouteOptions & { idParam?: string }): AdminRouteHandler {
  return async (context, params) => {
    const { supabase, request } = context;
    const id = params?.[options.idParam || 'id'];

    if (!id) {
      return errorResponse(`${options.entityName} ID is required`);
    }

    const body = await request.json();

    // Validate required fields if specified
    if (options.requiredFields) {
      const missingFields = options.requiredFields.filter((field) => !body[field]);
      if (missingFields.length > 0) {
        return errorResponse(`Missing required fields: ${missingFields.join(', ')}`);
      }
    }

    // Custom validation if provided
    if (options.validateBody) {
      const validationError = await options.validateBody(body, supabase);
      if (validationError) {
        return validationError;
      }
    }

    // Transform body if provided
    const transformedBody = options.transformBody ? options.transformBody(body) : body;

    // Update in database
    const query = supabase
      .from(options.table)
      .update(transformedBody)
      .eq('id', id);
    
    const { data, error } = options.selectQuery
      ? await query.select(options.selectQuery).single()
      : await query.select().single();

    if (error) {
      return errorResponse(error.message || `Failed to update ${options.entityName}`);
    }

    // Run afterUpdate hook if provided
    if (options.afterUpdate && data) {
      await options.afterUpdate(data, context);
    }

    return NextResponse.json(data, { status: 200 });
  };
}

/**
 * Creates a standard DELETE handler for deleting entities
 */
export function createDeleteHandler(options: CrudRouteOptions & { idParam?: string }): AdminRouteHandler {
  return async (context, params) => {
    const { supabase } = context;
    const id = params?.[options.idParam || 'id'];

    if (!id) {
      return errorResponse(`${options.entityName} ID is required`);
    }

    const { error } = await supabase
      .from(options.table)
      .delete()
      .eq('id', id);

    if (error) {
      return errorResponse(error.message || `Failed to delete ${options.entityName}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  };
}

