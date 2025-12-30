'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TimelineEvent, OC, EventDateData } from '@/types/oc';
import { useWorlds } from '@/lib/hooks/useWorlds';
import { useOCsByWorld } from '@/lib/hooks/useOCsByWorld';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { useRelatedItems } from '@/hooks/useRelatedItems';
import { DateInput } from './DateInput';
import { CategorySelector } from './CategorySelector';
import { FormMessage } from './forms/FormMessage';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { StoryAliasSelector } from './StoryAliasSelector';
import { optionalUuid, optionalUrl } from '@/lib/utils/zodSchemas';
import { calculateAge } from '@/lib/utils/ageCalculation';

const eventSchema = z.object({
  world_id: z.string().uuid('Invalid world'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  description_markdown: z.string().optional(),
  date_data: z.any().optional().nullable(),
  year: z.number().int().optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  day: z.number().int().min(1).max(31).optional().nullable(),
  categories: z.array(z.string()).default([]),
  is_key_event: z.boolean().default(false),
  location: z.string().optional(),
  image_url: optionalUrl,
  characters: z.array(z.object({
    oc_id: z.string().uuid(),
    role: z.string().optional(),
  })).default([]),
  story_alias_id: optionalUuid,
});

type EventFormData = z.infer<typeof eventSchema>;

interface TimelineEventFormProps {
  event?: TimelineEvent;
  worldId?: string; // Pre-select a world
  lockWorld?: boolean; // If true, hide world field and lock it to worldId
  timelineEra?: string | null; // Era system from timeline (comma-separated, e.g., "BE, SE")
  timelineStoryAliasId?: string | null; // Story alias from timeline - events inherit this
  lockStoryAlias?: boolean; // If true, hide story alias field and lock it to timelineStoryAliasId
  onSuccess?: (responseData: any) => void | Promise<void>; // Callback after successful creation
  onCancel?: () => void; // Callback when cancel is clicked
  hideCancel?: boolean; // Hide cancel button (useful for inline forms)
}

export function TimelineEventForm({ event, worldId, lockWorld = false, timelineEra, timelineStoryAliasId, lockStoryAlias = false, onSuccess, onCancel, hideCancel = false }: TimelineEventFormProps) {
  const router = useRouter();
  const { worlds } = useWorlds();
  const shouldNavigateAfterSaveRef = useRef(false);
  const { isSubmitting, error, submit } = useFormSubmission<EventFormData>({
    apiRoute: '/api/admin/timeline-events',
    entity: event,
    successRoute: (responseData, isUpdate) => {
      // After successful creation, navigate to the event detail page
      if (!isUpdate && responseData?.id) {
        return `/admin/timeline-events/${responseData.id}`;
      }
      return event ? `/admin/timeline-events/${event.id}` : '/admin/timeline-events';
    },
    shouldNavigateRef: shouldNavigateAfterSaveRef,
    onSuccess: async (responseData, isUpdate) => {
      // Call custom onSuccess callback if provided
      if (onSuccess && !isUpdate) {
        await onSuccess(responseData);
        // Return false to prevent navigation when we have a custom callback
        return false;
      }
    },
  });

  // Get world name for display when locked
  const lockedWorld = lockWorld && worldId ? worlds.find(w => w.id === worldId) : null;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ? {
      world_id: event.world_id,
      title: event.title,
      description: event.description || '',
      description_markdown: event.description_markdown || '',
      date_data: event.date_data || null,
      year: event.year || null,
      month: event.month || null,
      day: event.day || null,
      categories: event.categories || [],
      is_key_event: event.is_key_event || false,
      location: event.location || '',
      image_url: event.image_url || '',
      characters: event.characters?.map(c => ({
        oc_id: c.oc_id,
        role: c.role || '',
      })) || [],
      story_alias_id: event.story_alias_id ?? null,
    } : {
      world_id: worldId || '',
      title: '',
      description: '',
      description_markdown: '',
      date_data: null,
      year: null,
      month: null,
      day: null,
      categories: [],
      is_key_event: false,
      location: '',
      image_url: '',
      characters: [],
      story_alias_id: lockStoryAlias ? (timelineStoryAliasId || null) : null,
    },
  });

  // Ensure world_id is set when locked
  useEffect(() => {
    if (lockWorld && worldId && !event) {
      setValue('world_id', worldId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockWorld, worldId, event]);

  // Ensure story_alias_id is set when locked
  useEffect(() => {
    if (lockStoryAlias && timelineStoryAliasId !== undefined && !event) {
      setValue('story_alias_id', timelineStoryAliasId || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockStoryAlias, timelineStoryAliasId, event]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const watchedWorldId = watch('world_id');
  const watchedDateData = watch('date_data');
  const watchedCategories = watch('categories');

  const { ocs: characters } = useOCsByWorld(watchedWorldId);

  // Manage related characters
  const relatedCharacters = useRelatedItems(
    'characters',
    watch,
    setValue,
    () => ({ oc_id: characters[0]?.id || '', role: '' })
  );

  // Extract year/month/day from date_data for sorting
  useEffect(() => {
    if (watchedDateData) {
      if (watchedDateData.type === 'exact') {
        setValue('year', watchedDateData.year);
        setValue('month', watchedDateData.month);
        setValue('day', watchedDateData.day);
      } else if (watchedDateData.type === 'range') {
        setValue('year', watchedDateData.start?.year);
        setValue('month', watchedDateData.start?.month);
        setValue('day', watchedDateData.start?.day);
      } else if (watchedDateData.type === 'approximate' && watchedDateData.year) {
        setValue('year', watchedDateData.year);
      }
    }
  }, [watchedDateData, setValue]);

  const onSubmit = async (data: EventFormData) => {
    await submit(data);
  };

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  const handleSaveAndClose = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    shouldNavigateAfterSaveRef.current = true;
    handleSubmit(onSubmit, onError)();
  }, [handleSubmit, onSubmit, onError]);

  const handleSaveProgress = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    shouldNavigateAfterSaveRef.current = false;
    handleSubmit(onSubmit, onError)();
  }, [handleSubmit, onSubmit, onError]);


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <FormMessage type="error" message={error} />}

      {lockWorld && lockedWorld ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <FormLabel>World</FormLabel>
          <div className="text-gray-200 font-medium">{lockedWorld.name}</div>
          <p className="text-xs text-gray-400 mt-1">World is automatically set from timeline context</p>
          <input type="hidden" {...register('world_id')} value={worldId} />
        </div>
      ) : (
        <div>
          <FormLabel htmlFor="world_id" required>
            World
          </FormLabel>
          <FormSelect
            {...register('world_id')}
            options={worlds.map((world) => ({
              value: world.id,
              label: world.name,
            }))}
            placeholder="Select a world"
            error={errors.world_id?.message}
            disabled={!!event || isSubmitting} // Can't change world after creation
          />
        </div>
      )}

      {!lockStoryAlias && (
        <StoryAliasSelector
          worldId={watchedWorldId}
          register={register('story_alias_id')}
          error={errors.story_alias_id?.message}
          disabled={isSubmitting}
        />
      )}

      {lockStoryAlias && timelineStoryAliasId && (
        <div>
          <FormLabel htmlFor="story_alias_locked">
            Story Alias
          </FormLabel>
          <div className="px-3 py-2 bg-gray-700/50 border border-gray-600/70 rounded-md text-gray-300">
            Inherited from timeline (locked)
          </div>
        </div>
      )}

      <div>
        <FormLabel htmlFor="title" required>
          Title
        </FormLabel>
        <FormInput
          {...register('title')}
          error={errors.title?.message}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="description" optional>
          Description (Summary)
        </FormLabel>
        <FormTextarea
          {...register('description')}
          rows={3}
          placeholder="Brief summary of the event"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="description_markdown" optional>
          Full Description (Markdown)
        </FormLabel>
        <FormTextarea
          {...register('description_markdown')}
          rows={10}
          markdown
          placeholder="Full event description in Markdown"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="date_data">
          Date
        </FormLabel>
        <DateInput
          value={watchedDateData}
          onChange={(value) => setValue('date_data', value)}
          availableEras={timelineEra ? timelineEra.split(',').map(e => e.trim()).filter(Boolean) : undefined}
        />
      </div>

      <div>
        <CategorySelector
          value={watchedCategories || []}
          onChange={(categories) => setValue('categories', categories)}
        />
      </div>

      <div>
        <FormLabel htmlFor="location" optional>
          Location
        </FormLabel>
        <FormInput
          {...register('location')}
          placeholder="Where did this event take place?"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <FormLabel htmlFor="image_url" optional>
          Image URL
        </FormLabel>
        <FormInput
          {...register('image_url')}
          type="url"
          placeholder="https://..."
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('is_key_event')}
          type="checkbox"
          className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
        />
        <label className="text-sm font-medium text-gray-300">
          Key Event
        </label>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Characters Involved
          </label>
          {characters.length > 0 && (
            <button
              type="button"
              onClick={relatedCharacters.addItem}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              + Add Character
            </button>
          )}
        </div>
        {relatedCharacters.items && relatedCharacters.items.length > 0 ? (
          <div className="space-y-2">
            {relatedCharacters.items.map((char, index) => {
              const selectedCharacter = characters.find(c => c.id === char.oc_id);
              const age = selectedCharacter?.date_of_birth && watchedDateData
                ? calculateAge(selectedCharacter.date_of_birth, watchedDateData)
                : null;
              
              return (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={char.oc_id}
                    onChange={(e) => relatedCharacters.updateItemField(index, 'oc_id', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                  >
                    <option value="">Select character</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {selectedCharacter && age !== null && (
                    <span className="text-sm text-gray-400 whitespace-nowrap">
                      Age: {age}
                    </span>
                  )}
                  <input
                    type="text"
                    value={char.role || ''}
                    onChange={(e) => relatedCharacters.updateItemField(index, 'role', e.target.value)}
                    placeholder="Role (optional)"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => relatedCharacters.removeItem(index)}
                    className="px-3 py-2 bg-red-700 text-white rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
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

      <div className="flex gap-4">
        {!hideCancel && (
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                router.back();
              }
            }}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
        )}
        {event ? (
          <>
            <FormButton
              type="button"
              variant="secondary"
              onClick={handleSaveProgress}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Save Progress
            </FormButton>
            <FormButton
              type="button"
              variant="primary"
              onClick={handleSaveAndClose}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Save and Close
            </FormButton>
          </>
        ) : (
          <FormButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Event
          </FormButton>
        )}
      </div>
    </form>
  );
}

