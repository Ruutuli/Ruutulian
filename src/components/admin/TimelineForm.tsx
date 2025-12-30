'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Timeline } from '@/types/oc';
import { useWorlds } from '@/lib/hooks/useWorlds';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { StoryAliasSelector } from './StoryAliasSelector';
import { optionalUuid } from '@/lib/utils/zodSchemas';

const timelineSchema = z.object({
  world_id: z.string().uuid('Invalid world'),
  name: z.string().min(1, 'Name is required'),
  description_markdown: z.string().optional(),
  date_format: z.string().optional(),
  era: z.string().optional(),
  story_alias_id: optionalUuid,
});

type TimelineFormData = z.infer<typeof timelineSchema>;

interface TimelineFormProps {
  timeline?: Timeline;
}

export function TimelineForm({ timeline }: TimelineFormProps) {
  const router = useRouter();
  const { worlds } = useWorlds();
  const shouldNavigateAfterSaveRef = useRef(false);
  const { isSubmitting, error, success, submit } = useFormSubmission<TimelineFormData>({
    apiRoute: '/api/admin/timelines',
    entity: timeline,
    successRoute: (responseData, isUpdate) => {
      // After creating a new timeline, navigate to its events page for quick event creation
      if (!isUpdate && responseData?.id) {
        return `/admin/timelines/${responseData.id}/events`;
      }
      // When updating, go back to timelines list
      return '/admin/timelines';
    },
    showSuccessMessage: true,
    successMessage: 'Timeline saved successfully!',
    shouldNavigateRef: shouldNavigateAfterSaveRef,
  });

  const methods = useForm<TimelineFormData>({
    resolver: zodResolver(timelineSchema),
    defaultValues: timeline
      ? {
          world_id: timeline.world_id,
          name: timeline.name,
          description_markdown: timeline.description_markdown ?? undefined,
          date_format: timeline.date_format ?? undefined,
          era: timeline.era ?? undefined,
          story_alias_id: timeline.story_alias_id ?? null,
        }
      : {
          world_id: '',
          name: '',
          description_markdown: '',
          date_format: '',
          era: '',
          story_alias_id: null,
        },
  });

  const { register, handleSubmit, formState: { errors }, watch } = methods;
  
  const watchedWorldId = watch('world_id');

  const onSubmit = async (data: TimelineFormData) => {
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

  const worldOptions = worlds.map((world) => ({
    value: world.id,
    label: world.name,
  }));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <FormMessage type="error" message={error} />}
        {success && <FormMessage type="success" message="Timeline saved successfully!" />}

        {timeline && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-200">
              <strong>Tip:</strong> Once your timeline is saved, you can{' '}
              <a
                href={`/admin/timelines/${timeline.id}/events`}
                className="text-blue-300 underline hover:text-blue-200"
              >
                go to the events page
              </a>
              {' '}to add events to this timeline.
            </p>
          </div>
        )}

        <FormSection title="Timeline Information" icon="timeline" accentColor="timeline" defaultOpen={true}>
          <div>
            <FormLabel htmlFor="world_id" required>
              World
            </FormLabel>
            <FormSelect
              {...register('world_id')}
              options={worldOptions}
              placeholder="Select a world"
              error={errors.world_id?.message}
              disabled={isSubmitting}
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
            <FormLabel htmlFor="description_markdown">
              Description (Markdown)
            </FormLabel>
            <FormTextarea
              {...register('description_markdown')}
              rows={10}
              markdown
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="era" optional>
              Era System
            </FormLabel>
            <FormInput
              {...register('era')}
              placeholder='e.g., "BE, SE" or "Before Era, Current Era, Future Era"'
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional: Define custom era systems for this timeline (comma-separated). For example: "BE, SE" or "Before Era, Current Era, Future Era". Events will use these eras when created.
            </p>
          </div>

          <div>
            <FormLabel htmlFor="date_format" optional>
              Date Format Notation
            </FormLabel>
            <FormInput
              {...register('date_format')}
              placeholder='e.g., "[ μ ] – εγλ 1977"'
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">
              Optional: Specify how dates should be formatted for this timeline (e.g., custom calendar notation)
            </p>
          </div>
        </FormSection>

        <div className="flex gap-4 pt-4">
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
          {timeline ? (
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
              Create Timeline
            </FormButton>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
