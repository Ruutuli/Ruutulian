import { withAdminAuth, createPostHandler } from '@/lib/api/admin-route-wrapper';
import { errorResponse } from '@/lib/api/route-helpers';

export const POST = withAdminAuth(
  createPostHandler({
    table: 'worlds',
    entityName: 'World',
    requiredFields: ['name', 'slug', 'series_type', 'summary'],
    validateBody: async (body, supabase) => {
      const { data: existingWorld, error: slugCheckError } = await supabase
        .from('worlds')
        .select('id')
        .eq('slug', body.slug)
        .maybeSingle();

      if (slugCheckError) {
        return errorResponse(`Error checking slug: ${slugCheckError.message}`);
      }

      if (existingWorld) {
        return errorResponse('A world with this slug already exists');
      }

      return null;
    },
  })
);
