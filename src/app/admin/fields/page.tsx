import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { WorldFieldDefinitions, FieldSet } from '@/types/oc';

export const metadata: Metadata = {
  title: 'World Fields',
};

export default async function FieldsPage() {
  const supabase = await createClient();

  const { data: worlds, error } = await supabase
    .from('worlds')
    .select('id, name, slug, series_type, world_fields')
    .order('name');

  if (error) {
    console.error('Error fetching worlds:', error);
  }

  const worldsWithFields = (worlds || []).filter(
    (world) => world.world_fields && typeof world.world_fields === 'object'
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">World Fields</h1>
          <p className="text-gray-400 mt-2">
            View and manage custom field definitions for each world
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {worldsWithFields.length === 0 ? (
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <p className="text-gray-400 text-center">
            No worlds with custom fields found. Edit a world to add custom field definitions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {worldsWithFields.map((world) => {
            const worldFields = world.world_fields as WorldFieldDefinitions;
            const fieldSets = worldFields?.field_sets || [];

            return (
              <div
                key={world.id}
                className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-100">{world.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-400">{world.slug}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {world.series_type}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/worlds/${world.id}`}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Edit World
                  </Link>
                </div>

                {fieldSets.length === 0 ? (
                  <p className="text-gray-400 text-sm">No field sets defined</p>
                ) : (
                  <div className="space-y-4">
                    {fieldSets.map((fieldSet: FieldSet, setIndex: number) => (
                      <div
                        key={fieldSet.id || setIndex}
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50"
                      >
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-gray-200">
                            {fieldSet.name}
                          </h3>
                          {fieldSet.description && (
                            <p className="text-sm text-gray-400 mt-1">
                              {fieldSet.description}
                            </p>
                          )}
                          {fieldSet.template_key && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50">
                              Template: {fieldSet.template_key}
                            </span>
                          )}
                        </div>

                        {fieldSet.fields && fieldSet.fields.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {fieldSet.fields.map((field, fieldIndex) => (
                              <div
                                key={field.key || fieldIndex}
                                className="bg-gray-800/50 rounded p-3 border border-gray-600/30"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-200">
                                    {field.label}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                                    {field.type}
                                  </span>
                                </div>
                                {field.key && (
                                  <code className="text-xs text-gray-400">
                                    {field.key}
                                  </code>
                                )}
                                {field.description && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {field.description}
                                  </p>
                                )}
                                {field.required && (
                                  <span className="inline-block mt-1 text-xs text-red-400">
                                    Required
                                  </span>
                                )}
                                {field.defaultValue !== undefined && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Default: {JSON.stringify(field.defaultValue)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">No fields in this set</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
