'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { WorldLore, OC, TimelineEvent, FieldSet, WorldFieldDefinitions } from '@/types/oc';
import { createClient } from '@/lib/supabase/client';
import { useWorlds } from '@/lib/hooks/useWorlds';
import { useOCsByWorld } from '@/lib/hooks/useOCsByWorld';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { slugify } from '@/lib/utils/slugify';
import { useRelatedItems } from '@/hooks/useRelatedItems';
import { WorldFieldsSection } from './WorldFieldsSection';
import { getWorldLoreFieldDefinitions } from '@/lib/fields/worldFields';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormAutocomplete } from './forms/FormAutocomplete';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { StoryAliasSelector } from './StoryAliasSelector';
import { optionalUuid, optionalUrl } from '@/lib/utils/zodSchemas';
import { autoCreateWorldFieldOptions } from '@/lib/utils/autoCreateOptions';

const loreTypes = ['clan', 'organization', 'location', 'religion', 'species', 'technique', 'concept', 'artifact', 'other'] as const;

const worldLoreSchema = z.object({
  world_id: z.string().uuid('Invalid world'),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  lore_type: z.string().min(1, 'Lore type is required'),
  description: z.string().optional(),
  description_markdown: z.string().optional(),
  banner_image_url: optionalUrl,
  world_fields: z.any().optional(),
  modular_fields: z.record(z.any()).optional(),
  related_ocs: z.array(z.object({
    oc_id: z.string().uuid(),
    role: z.string().optional(),
  })).default([]),
  related_events: z.array(z.object({
    timeline_event_id: z.string().uuid(),
  })).default([]),
  story_alias_id: optionalUuid,
});

type WorldLoreFormData = z.infer<typeof worldLoreSchema>;

interface WorldLoreFormProps {
  lore?: WorldLore;
  worldId?: string; // Pre-select a world
}

export function WorldLoreForm({ lore, worldId }: WorldLoreFormProps) {
  const router = useRouter();
  const { worlds } = useWorlds();
  const [timelineEvents, setTimelineEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [fieldSets, setFieldSets] = useState<FieldSet[]>(
    lore?.world_fields?.field_sets || []
  );

  const methods = useForm<WorldLoreFormData>({
    resolver: zodResolver(worldLoreSchema),
    defaultValues: lore ? {
      world_id: lore.world_id,
      name: lore.name,
      slug: lore.slug,
      lore_type: lore.lore_type,
      description: lore.description || '',
      description_markdown: lore.description_markdown || '',
      banner_image_url: lore.banner_image_url || '',
      world_fields: lore.world_fields || { field_sets: [] },
      modular_fields: lore.modular_fields || {},
      related_ocs: lore.related_ocs?.map(rel => ({
        oc_id: rel.oc_id,
        role: rel.role || '',
      })) || [],
      related_events: lore.related_events?.map(rel => ({
        timeline_event_id: rel.timeline_event_id,
      })) || [],
      story_alias_id: lore.story_alias_id ?? null,
    } : {
      world_id: worldId || '',
      name: '',
      slug: '',
      lore_type: 'other',
      description: '',
      description_markdown: '',
      banner_image_url: '',
      world_fields: { field_sets: [] },
      modular_fields: {},
      related_ocs: [],
      related_events: [],
      story_alias_id: null,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = methods;
  const nameValue = watch('name');
  const watchedWorldId = watch('world_id');

  const { ocs: characters } = useOCsByWorld(watchedWorldId);

  // Manage related OCs
  const relatedOCs = useRelatedItems(
    'related_ocs',
    watch,
    setValue,
    () => ({ oc_id: characters[0]?.id || '', role: '' })
  );

  // Manage related events
  const relatedEvents = useRelatedItems(
    'related_events',
    watch,
    setValue,
    () => ({ timeline_event_id: timelineEvents[0]?.id || '' })
  );
  const { isSubmitting, error, success, submit } = useFormSubmission<WorldLoreFormData>({
    apiRoute: '/api/admin/world-lore',
    entity: lore,
    successRoute: '/admin/world-lore',
    showSuccessMessage: true,
    successMessage: 'Lore entry saved successfully!',
    transformData: (data) => ({
      ...data,
      banner_image_url: data.banner_image_url || null,
      description: data.description || null,
      description_markdown: data.description_markdown || null,
      world_fields: {
        field_sets: fieldSets,
      },
    }),
  });

  // Auto-generate slug from name
  useEffect(() => {
    if (!lore && nameValue) {
      const slug = slugify(nameValue);
      setValue('slug', slug);
    }
  }, [nameValue, lore, setValue]);

  // Preserve existing field sets (no editing allowed on this form)

  // Set world_id when worldId prop is provided
  useEffect(() => {
    if (worldId && !lore) {
      setValue('world_id', worldId);
    }
  }, [worldId, lore, setValue]);

  // Fetch timeline events when world changes
  useEffect(() => {
    async function fetchTimelineEvents() {
      if (!watchedWorldId) {
        setTimelineEvents([]);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('timeline_events')
        .select('id, title')
        .eq('world_id', watchedWorldId)
        .order('title');

      if (data) {
        setTimelineEvents(data);
      }
    }
    fetchTimelineEvents();
  }, [watchedWorldId]);

  const onSubmit = async (data: WorldLoreFormData) => {
    // Auto-create dropdown options for custom values before form submission
    try {
      // Create options for world custom fields
      if (data.modular_fields && fieldDefinitions.length > 0) {
        const fieldsWithOptions = fieldDefinitions.filter(f => f.options);
        if (fieldsWithOptions.length > 0) {
          await autoCreateWorldFieldOptions(data.modular_fields, fieldsWithOptions);
        }
      }
    } catch (error) {
      // Log but don't block form submission if option creation fails
      console.warn('[WorldLoreForm] Failed to auto-create some options:', error);
    }

    await submit(data);
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };


  // Get field definitions from the world (not from lore's world_fields)
  const fieldDefinitions = getWorldLoreFieldDefinitions(lore || undefined);

  const worldOptions = worlds.map((world) => ({
    value: world.id,
    label: world.name,
  }));

  // Keep options as lowercase to match existing database values
  // Users can still add custom values in any case
  const loreTypeOptions = [...loreTypes];

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {error && <FormMessage type="error" message={error} />}
        {success && <FormMessage type="success" message="Lore entry saved successfully!" />}

        <FormSection title="Core Identity" icon="core-identity" accentColor="core-identity" defaultOpen={true}>
          <div>
            <FormLabel htmlFor="world_id" required>
              World
            </FormLabel>
            <FormSelect
              {...register('world_id')}
              options={worldOptions}
              placeholder="Select a world"
              error={errors.world_id?.message}
              disabled={isSubmitting || !!lore}
            />
          </div>

          <StoryAliasSelector
            worldId={watchedWorldId}
            register={register('story_alias_id')}
            error={errors.story_alias_id?.message}
            disabled={isSubmitting}
          />

          <div>
            <FormLabel htmlFor="name" required>
              Name
            </FormLabel>
            <FormInput
              {...register('name')}
              error={errors.name?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="slug" required>
              Slug
            </FormLabel>
            <FormInput
              {...register('slug')}
              error={errors.slug?.message}
              disabled={isSubmitting || !!lore}
              helpText={lore ? 'Slug cannot be changed after creation' : undefined}
            />
          </div>

          <div>
            <FormLabel htmlFor="lore_type" required>
              Lore Type
            </FormLabel>
            <FormAutocomplete
              {...register('lore_type')}
              options={loreTypeOptions}
              allowCustom={true}
              placeholder="Type to search or add custom type..."
              error={errors.lore_type?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="description">
              Description (Summary)
            </FormLabel>
            <FormTextarea
              {...register('description')}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="description_markdown">
              Full Description (Markdown)
            </FormLabel>
            <FormTextarea
              {...register('description_markdown')}
              rows={10}
              markdown
              disabled={isSubmitting}
            />
          </div>
        </FormSection>

        <FormSection title="Visual Identity" icon="visual-identity" accentColor="visual-identity" defaultOpen={true}>
          <div>
            <FormLabel htmlFor="banner_image_url">
              Banner/Header Image URL
            </FormLabel>
            <FormInput
              type="url"
              {...register('banner_image_url')}
              placeholder="https://example.com/banner.jpg"
              disabled={isSubmitting}
              helpText="Aesthetic banner image displayed at the top of the lore page"
            />
          </div>
        </FormSection>

        <FormSection title="Related Characters" icon="relationships" accentColor="relationships" defaultOpen={false}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <FormLabel>Characters</FormLabel>
              {characters.length > 0 && (
                <FormButton
                  type="button"
                  variant="primary"
                  onClick={relatedOCs.addItem}
                  className="px-3 py-1 text-sm"
                >
                  + Add Character
                </FormButton>
              )}
            </div>
            {relatedOCs.items && relatedOCs.items.length > 0 ? (
              <div className="space-y-2">
                {relatedOCs.items.map((rel, index) => {
                  const characterOptions = characters.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }));
                  return (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <FormSelect
                          value={rel.oc_id}
                          onChange={(e) => relatedOCs.updateItemField(index, 'oc_id', e.target.value)}
                          options={characterOptions}
                          placeholder="Select character"
                        />
                      </div>
                      <div className="flex-1">
                        <FormInput
                          type="text"
                          value={rel.role || ''}
                          onChange={(e) => relatedOCs.updateItemField(index, 'role', e.target.value)}
                          placeholder="Role (optional)"
                        />
                      </div>
                      <FormButton
                        type="button"
                        variant="danger"
                        onClick={() => relatedOCs.removeItem(index)}
                        className="px-3 py-2"
                      >
                        Remove
                      </FormButton>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {watchedWorldId
                  ? 'No characters available in this world. Add characters first.'
                  : 'Select a world to add characters.'}
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title="Related Timeline Events" icon="timeline" accentColor="timeline" defaultOpen={false}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <FormLabel>Timeline Events</FormLabel>
              {timelineEvents.length > 0 && (
                <FormButton
                  type="button"
                  variant="primary"
                  onClick={relatedEvents.addItem}
                  className="px-3 py-1 text-sm"
                >
                  + Add Event
                </FormButton>
              )}
            </div>
            {relatedEvents.items && relatedEvents.items.length > 0 ? (
              <div className="space-y-2">
                {relatedEvents.items.map((rel, index) => {
                  const eventOptions = timelineEvents.map((e) => ({
                    value: e.id,
                    label: e.title,
                  }));
                  return (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1">
                        <FormSelect
                          value={rel.timeline_event_id}
                          onChange={(e) => relatedEvents.updateItemField(index, 'timeline_event_id', e.target.value)}
                          options={eventOptions}
                          placeholder="Select event"
                        />
                      </div>
                      <FormButton
                        type="button"
                        variant="danger"
                        onClick={() => relatedEvents.removeItem(index)}
                        className="px-3 py-2"
                      >
                        Remove
                      </FormButton>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {watchedWorldId
                  ? 'No timeline events available in this world. Add events first.'
                  : 'Select a world to add timeline events.'}
              </p>
            )}
          </div>
        </FormSection>

        {/* World Field Values Section */}
        {fieldDefinitions.length > 0 && (
          <WorldFieldsSection
            fieldDefinitions={fieldDefinitions}
            fieldPrefix="modular_fields"
            disabled={isSubmitting}
            title="Lore Entry-Specific Fields"
            defaultOpen={false}
          />
        )}

        <div className="flex gap-4 pt-4">
          <FormButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {lore ? 'Update Lore Entry' : 'Create Lore Entry'}
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
        </div>
      </form>
    </FormProvider>
  );
}

