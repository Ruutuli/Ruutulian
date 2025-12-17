import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getTemplateTypeFromWorldSlug } from '@/lib/templates/worldTemplateMap';
import { fetchTemplates } from '@/lib/templates/ocTemplates.server';

export async function WorldTemplatesList() {
  const supabase = await createClient();
  const templates = await fetchTemplates();
  const { data: worlds } = await supabase
    .from('worlds')
    .select('id, name, slug, oc_templates')
    .order('name');

  if (!worlds || worlds.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No worlds found. Create a world first to manage its templates.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 mb-4">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">How it works</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
          <li>Each world has a default template type based on its slug</li>
          <li>You can customize which template fields appear for each template type per world</li>
          <li>Template field customizations override the default template fields</li>
          <li>When creating a character, the customized template fields will be available</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {worlds.map((world) => {
          const templateType = getTemplateTypeFromWorldSlug(world.slug, world);
          const template = templates[templateType] || templates.none || { name: 'None', fields: [] };
          const hasCustomizations = world.oc_templates && 
            Object.keys(world.oc_templates as Record<string, any>).length > 0;

          return (
            <div
              key={world.id}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-gray-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-lg font-semibold text-gray-200">{world.name}</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Template: <span className="text-gray-300">{template.name}</span>
                  </p>
                </div>
                {hasCustomizations && (
                  <span className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded border border-green-600/50">
                    Customized
                  </span>
                )}
              </div>
              <div className="mt-3">
                <Link
                  href={`/admin/worlds/${world.id}/templates`}
                  className="inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                >
                  Manage Templates →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
