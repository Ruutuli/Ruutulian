/**
 * Sanitize Supabase/upstream error messages for logging.
 * When Supabase or Cloudflare returns 5xx, the client may surface the full HTML
 * error page as error.message; this helper avoids logging that HTML.
 */

const MAX_MESSAGE_LENGTH = 500;

export function formatSupabaseErrorForLog(error: { message?: string; code?: string } | null): string {
  if (!error || error.message == null) {
    return 'Unknown error';
  }
  const msg = String(error.message).trim();
  if (!msg) {
    return 'Empty error message';
  }
  // HTML or Cloudflare error page
  if (
    msg.startsWith('<!DOCTYPE') ||
    msg.startsWith('<html') ||
    msg.includes('Error code 500') ||
    msg.includes('Internal server error')
  ) {
    return 'Upstream 500 (Supabase/Cloudflare)';
  }
  if (msg.length <= MAX_MESSAGE_LENGTH) {
    return msg;
  }
  return msg.slice(0, MAX_MESSAGE_LENGTH) + '...';
}
