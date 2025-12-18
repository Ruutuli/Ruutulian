import { z } from 'zod';

/**
 * Normalizes empty strings to undefined for optional string fields.
 * Used for fields that should be optional and treat empty strings as undefined.
 */
export const optionalString = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().optional()
);

/**
 * Normalizes empty strings to null for optional UUID fields.
 * Used for foreign key fields that can be null (e.g., story_alias_id).
 */
export const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null ? null : val),
  z.string().uuid().nullable().optional()
);

/**
 * Validates URL or empty string for optional URL fields.
 * Used for image URLs and other URL fields that can be empty.
 */
export const optionalUrl = z.union([
  z.string().url(),
  z.literal(''),
]).optional();

