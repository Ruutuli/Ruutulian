import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logMemoryUsage } from '@/lib/memory-monitor';

/**
 * Validates that required fields are present in the request body.
 * Returns an error response if validation fails, or null if validation passes.
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): NextResponse | null {
  const missingFields = requiredFields.filter((field) => !body[field]);

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required fields: ${missingFields.join(', ')}`,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Checks if a slug is unique within a specific scope (e.g., per world).
 * Returns the existing record if found, or null if unique.
 */
export async function checkSlugUniqueness(
  supabase: SupabaseClient,
  table: string,
  slug: string,
  scopeField: string,
  scopeValue: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('slug', slug)
    .eq(scopeField, scopeValue)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is what we want
    throw error;
  }

  return data || null;
}

/**
 * Checks if a slug is unique within a specific scope, excluding a specific record (for updates).
 * Returns the existing record if found, or null if unique.
 */
export async function checkSlugUniquenessExcluding(
  supabase: SupabaseClient,
  table: string,
  slug: string,
  scopeField: string,
  scopeValue: string,
  excludeId: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('slug', slug)
    .eq(scopeField, scopeValue)
    .neq('id', excludeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is what we want
    throw error;
  }

  return data || null;
}

/**
 * Creates a standard error response.
 */
export function errorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Creates a standard success response with data.
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Handles errors and returns appropriate error response.
 */
export function handleError(error: unknown, defaultMessage: string = 'Internal server error'): NextResponse {
  // Import logger dynamically to avoid circular dependencies
  const { logger } = require('@/lib/logger');
  
  logMemoryUsage('API', 'handleError: Error occurred', {
    error: error instanceof Error ? error.message : String(error),
  });
  
  if (error instanceof Error) {
    logger.error('API', defaultMessage, {
      error: error.message,
      stack: error.stack
    });
    return errorResponse(error.message, 500);
  }
  
  logger.error('API', defaultMessage, { error: String(error) });
  return errorResponse(defaultMessage, 500);
}

/**
 * Wraps an API route handler with memory logging
 */
export function withMemoryLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    logMemoryUsage('API', `${routeName}: Request start`);
    
    try {
      const response = await handler(...args);
      logMemoryUsage('API', `${routeName}: Request complete`, {
        status: response.status,
      });
      return response;
    } catch (error) {
      logMemoryUsage('API', `${routeName}: Request error`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }) as T;
}

