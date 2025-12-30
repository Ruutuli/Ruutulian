'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Fanfic, World, OC, Tag, StoryAlias } from '@/types/oc';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { slugify } from '@/lib/utils/slugify';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { FormAutocomplete } from './forms/FormAutocomplete';
import { optionalString, optionalUrl, optionalUuid } from '@/lib/utils/zodSchemas';
import { createClient } from '@/lib/supabase/client';
import { TagsInput } from '@/components/content/TagsInput';
import { StoryAliasSelector } from './StoryAliasSelector';

const fanficSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  summary: optionalString,
  rating: z.enum(['G', 'PG', 'PG-13', 'R', 'M', 'Not Rated']).optional().nullable(),
  alternative_titles: z.array(z.string()).optional().nullable(),
  author: optionalString,
  world_id: z.string().uuid('Invalid world'),
  story_alias_id: optionalUuid,
  external_link: optionalUrl,
  is_public: z.boolean(),
  characters: z.array(z.object({
    oc_id: z.string().uuid().optional().nullable(),
    name: optionalString,
  })).optional().nullable(),
  relationships: z.array(z.object({
    relationship_text: z.string().min(1, 'Relationship text is required'),
    relationship_type: z.enum(['romantic', 'platonic', 'other']).optional().nullable(),
  })).optional().nullable(),
  tag_ids: z.array(z.string()).optional().nullable(),
});

type FanficFormData = z.infer<typeof fanficSchema>;

interface FanficFormProps {
  fanfic?: Fanfic;
}

const RATING_OPTIONS = [
  { value: '', label: 'Not Rated' },
  { value: 'G', label: 'G' },
  { value: 'PG', label: 'PG' },
  { value: 'PG-13', label: 'PG-13' },
  { value: 'R', label: 'R' },
  { value: 'M', label: 'M' },
  { value: 'Not Rated', label: 'Not Rated' },
];

export function FanficForm({ fanfic }: FanficFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const shouldNavigateAfterSaveRef = useRef(false);
  
  const [worlds, setWorlds] = useState<World[]>([]);
  const [ocs, setOCs] = useState<OC[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      // Load worlds
      const { data: worldsData } = await supabase
        .from('worlds')
        .select('*')
        .order('name');
      if (worldsData) setWorlds(worldsData);

      // Load OCs
      const { data: ocsData } = await supabase
        .from('ocs')
        .select('id, name, slug, world_id')
        .order('name');
      if (ocsData) setOCs(ocsData);


      // Load tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (tagsData) setAvailableTags(tagsData);

      // If editing, load existing data
      if (fanfic) {
        // Load existing tags
        const { data: fanficTagsData } = await supabase
          .from('fanfic_tags')
          .select('tag:tags(*)')
          .eq('fanfic_id', fanfic.id);
        if (fanficTagsData) {
          const tags = fanficTagsData
            .flatMap(ft => ft.tag ? (Array.isArray(ft.tag) ? ft.tag : [ft.tag]) : [])
            .filter((tag): tag is Tag => tag !== null && tag !== undefined);
          setSelectedTags(tags);
        }
      }

      setIsLoading(false);
    }

    loadData();
  }, [fanfic, supabase]);

  const defaultValues: Partial<FanficFormData> = fanfic ? {
    title: fanfic.title,
    slug: fanfic.slug,
    summary: fanfic.summary || '',
    rating: fanfic.rating || null,
    alternative_titles: fanfic.alternative_titles || [],
    author: fanfic.author || '',
    world_id: fanfic.world_id,
    story_alias_id: fanfic.story_alias_id || null,
    external_link: fanfic.external_link || '',
    is_public: fanfic.is_public,
    characters: fanfic.characters?.map(c => ({
      oc_id: c.oc_id || null,
      name: c.name || null,
    })) || [],
    relationships: fanfic.relationships?.map(r => ({
      relationship_text: r.relationship_text,
      relationship_type: r.relationship_type || null,
    })) || [],
    tag_ids: selectedTags.map(t => t.id),
  } : {
    title: '',
    slug: '',
    summary: '',
    rating: null,
    alternative_titles: [],
    author: '',
    world_id: '',
    story_alias_id: null,
    external_link: '',
    is_public: false,
    characters: [],
    relationships: [],
    tag_ids: [],
  };

  const methods = useForm<FanficFormData>({
    resolver: zodResolver(fanficSchema),
    defaultValues,
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, control } = methods;
  const watchedTitle = watch('title');
  const watchedSlug = watch('slug');
  const watchedWorldId = watch('world_id');
  const watchedStoryAliasId = watch('story_alias_id');

  // Track if user has manually edited the slug
  const slugManuallyEditedRef = useRef(false);
  
  // Auto-generate slug from title, world, and story alias (only for new fanfics)
  useEffect(() => {
    if (!fanfic && watchedTitle && watchedTitle.trim()) {
      const generateSlug = async () => {
        try {
          const titleSlug = slugify(watchedTitle.trim());
          if (!titleSlug) return; // Don't generate slug if title becomes empty after slugification
          
          let slugParts = [titleSlug];
          
          if (watchedWorldId && worlds.length > 0) {
            const selectedWorld = worlds.find(w => w.id === watchedWorldId);
            if (selectedWorld && selectedWorld.slug) {
              slugParts.push(selectedWorld.slug);
            }
          }
          
          if (watchedStoryAliasId && watchedWorldId) {
            try {
              // Fetch story alias slug
              const { data, error } = await supabase
                .from('story_aliases')
                .select('slug')
                .eq('id', watchedStoryAliasId)
                .single();
              
              if (!error && data && data.slug) {
                slugParts.push(data.slug);
              }
            } catch (err) {
              console.error('Error fetching story alias slug:', err);
              // Continue without story alias slug if fetch fails
            }
          }
          
          const newSlug = slugParts.filter(part => part && part.trim()).join('-');
          
          // Only update if slug hasn't been manually edited
          if (!slugManuallyEditedRef.current) {
            setValue('slug', newSlug, { shouldDirty: false });
          }
        } catch (err) {
          console.error('Error generating slug:', err);
        }
      };
      
      generateSlug();
    }
  }, [watchedTitle, watchedWorldId, watchedStoryAliasId, fanfic, setValue, worlds, supabase]);

  // Track manual slug edits
  useEffect(() => {
    if (watchedSlug && !fanfic) {
      const titleSlug = watchedTitle ? slugify(watchedTitle.trim()) : '';
      const expectedSlug = titleSlug ? (watchedWorldId && worlds.length > 0 ? `${titleSlug}-${worlds.find(w => w.id === watchedWorldId)?.slug || ''}` : titleSlug) : '';
      
      // If slug doesn't match expected pattern, user has manually edited it
      if (watchedSlug !== expectedSlug && watchedSlug !== titleSlug) {
        slugManuallyEditedRef.current = true;
      }
    }
  }, [watchedSlug, watchedTitle, watchedWorldId, fanfic, worlds]);

  // Reset manual edit flag when title changes significantly
  useEffect(() => {
    if (!fanfic && watchedTitle) {
      slugManuallyEditedRef.current = false;
    }
  }, [watchedTitle, fanfic]);

  // Clear story alias when world changes (only for new fanfics)
  // StoryAliasSelector will handle filtering, but we clear it when world changes
  // to ensure the selected alias matches the new world
  const prevWorldIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!fanfic && watchedWorldId && prevWorldIdRef.current && prevWorldIdRef.current !== watchedWorldId) {
      setValue('story_alias_id', null, { shouldDirty: false });
    }
    prevWorldIdRef.current = watchedWorldId || null;
  }, [watchedWorldId, fanfic, setValue]);

  const { fields: altTitleFields, append: appendAltTitle, remove: removeAltTitle } = useFieldArray({
    control,
    name: 'alternative_titles',
  });

  const { fields: characterFields, append: appendCharacter, remove: removeCharacter } = useFieldArray({
    control,
    name: 'characters',
  });

  const { fields: relationshipFields, append: appendRelationship, remove: removeRelationship } = useFieldArray({
    control,
    name: 'relationships',
  });

  const transformData = useCallback((data: FanficFormData) => {
    return {
      title: data.title,
      slug: data.slug,
      summary: data.summary || null,
      rating: data.rating || null,
      alternative_titles: data.alternative_titles?.filter(Boolean) || null,
      author: data.author || null,
      world_id: data.world_id,
      story_alias_id: data.story_alias_id || null,
      external_link: data.external_link || null,
      is_public: data.is_public,
      characters: data.characters || [],
      relationships: data.relationships || [],
      tag_ids: selectedTags.map(t => t.id),
    };
  }, [selectedTags]);

  const { submit, error, success, isSubmitting } = useFormSubmission({
    apiRoute: '/api/admin/fanfics',
    entity: fanfic,
    successRoute: (data: any) => `/admin/fanfics/${data.id}`,
    transformData,
    shouldNavigateRef: shouldNavigateAfterSaveRef,
  });

  const onSubmit = async (data: FanficFormData) => {
    await submit(data);
  };

  const worldOptions = worlds.map(w => ({ value: w.id, label: w.name }));
  const ocOptionsForAutocomplete = ocs.map(oc => oc.name);

  if (isLoading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <FormMessage type="error" message={error} />}
        {success && <FormMessage type="success" message="Fanfic saved successfully!" />}

        <FormSection title="Basic Information" icon="book" accentColor="purple" defaultOpen={true}>
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
            <FormLabel htmlFor="slug" required>
              Slug
            </FormLabel>
            <FormInput
              {...register('slug')}
              error={errors.slug?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="summary">
              Summary
            </FormLabel>
            <FormTextarea
              {...register('summary')}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="rating">
              Rating
            </FormLabel>
            <FormSelect
              {...register('rating')}
              options={RATING_OPTIONS}
              error={errors.rating?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FormLabel htmlFor="alternative_titles">
              Alternative Titles
            </FormLabel>
            <div className="space-y-2">
              {altTitleFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormInput
                    {...register(`alternative_titles.${index}`)}
                    disabled={isSubmitting}
                    className="flex-1"
                  />
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => removeAltTitle(index)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </FormButton>
                </div>
              ))}
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => appendAltTitle('')}
                disabled={isSubmitting}
              >
                Add Alternative Title
              </FormButton>
            </div>
          </div>

          <div>
            <FormLabel htmlFor="author">
              Author
            </FormLabel>
            <FormInput
              {...register('author')}
              placeholder="Author name (leave empty if you are the author)"
              error={errors.author?.message}
              disabled={isSubmitting}
              helpText="Optional: Enter the author name if you are not the author of this fanfic"
            />
          </div>

          <div>
            <FormLabel htmlFor="external_link">
              External Link (AO3, FF.net, etc.)
            </FormLabel>
            <FormInput
              {...register('external_link')}
              type="url"
              placeholder="https://..."
              error={errors.external_link?.message}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('is_public')}
              id="is_public"
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
            />
            <FormLabel htmlFor="is_public">
              Make this fanfic public
            </FormLabel>
          </div>
        </FormSection>

        <FormSection title="World & Story" icon="globe" accentColor="purple" defaultOpen={true}>
          <div>
            <FormLabel htmlFor="world_id" required>
              World/Fandom
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
        </FormSection>

        <FormSection title="Characters" icon="user" accentColor="purple" defaultOpen={true}>
          <p className="text-sm text-gray-400 mb-4">
            Add characters featured in this fanfic. You can select from existing characters or add custom names.
          </p>
          <div className="space-y-4">
            {characterFields.map((field, index) => {
              const characterValue = watch(`characters.${index}`);
              
              return (
                <div key={field.id} className="border border-gray-700 rounded p-4 space-y-3">
                  <div>
                    <FormLabel htmlFor={`characters.${index}`}>
                      Character Name
                    </FormLabel>
                    <Controller
                      name={`characters.${index}`}
                      control={control}
                      render={({ field: controllerField }) => {
                        // Get display value: use name if custom, or OC name if linked
                        const displayValue = controllerField.value?.name || 
                          (controllerField.value?.oc_id ? ocs.find(oc => oc.id === controllerField.value.oc_id)?.name : '') || '';
                        
                        return (
                          <>
                            <FormAutocomplete
                              options={ocOptionsForAutocomplete}
                              placeholder="Type character name or select from list"
                              allowCustom={true}
                              value={displayValue}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                const selectedOC = ocs.find(oc => oc.name === inputValue);
                                
                                // Update the field with either oc_id (if found) or name (if custom)
                                if (selectedOC) {
                                  controllerField.onChange({
                                    oc_id: selectedOC.id,
                                    name: null,
                                  });
                                } else {
                                  controllerField.onChange({
                                    oc_id: null,
                                    name: inputValue,
                                  });
                                }
                              }}
                              error={errors.characters?.[index]?.name?.message}
                              disabled={isSubmitting}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              {controllerField.value?.oc_id ? '✓ Linked to existing character' : controllerField.value?.name ? '✓ Custom character name' : ''}
                            </p>
                          </>
                        );
                      }}
                    />
                  </div>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => removeCharacter(index)}
                    disabled={isSubmitting}
                  >
                    Remove Character
                  </FormButton>
                </div>
              );
            })}
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => appendCharacter({ oc_id: null, name: null })}
              disabled={isSubmitting}
            >
              Add Character
            </FormButton>
          </div>
        </FormSection>

        <FormSection title="Relationships & Pairings" icon="heart" accentColor="pink" defaultOpen={true}>
          <p className="text-sm text-gray-400 mb-4">
            Add relationships and pairings in this fanfic (e.g., "Character A/Character B" for romantic, "Character A & Character B" for platonic).
          </p>
          <div className="space-y-4">
            {relationshipFields.map((field, index) => (
              <div key={field.id} className="border border-gray-700 rounded p-4 space-y-3">
                <div>
                  <FormLabel htmlFor={`relationships.${index}.relationship_text`} required>
                    Relationship/Pairing
                  </FormLabel>
                  <FormInput
                    {...register(`relationships.${index}.relationship_text`)}
                    placeholder="e.g., Character A/Character B or Character A & Character B"
                    error={errors.relationships?.[index]?.relationship_text?.message}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <FormLabel htmlFor={`relationships.${index}.relationship_type`}>
                    Type
                  </FormLabel>
                  <FormSelect
                    {...register(`relationships.${index}.relationship_type`)}
                    options={[
                      { value: '', label: 'Other' },
                      { value: 'romantic', label: 'Romantic' },
                      { value: 'platonic', label: 'Platonic' },
                      { value: 'other', label: 'Other' },
                    ]}
                    error={errors.relationships?.[index]?.relationship_type?.message}
                    disabled={isSubmitting}
                  />
                </div>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => removeRelationship(index)}
                  disabled={isSubmitting}
                >
                  Remove Relationship
                </FormButton>
              </div>
            ))}
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => appendRelationship({ relationship_text: '', relationship_type: null })}
              disabled={isSubmitting}
            >
              Add Relationship/Pairing
            </FormButton>
          </div>
        </FormSection>

        <FormSection title="Tags" icon="tag" accentColor="purple" defaultOpen={true}>
          <TagsInput
            selectedTags={selectedTags}
            availableTags={availableTags}
            onTagsChange={setSelectedTags}
            onCreateTag={async (name) => {
              const { data, error } = await supabase
                .from('tags')
                .insert({ name })
                .select()
                .single();
              if (error || !data) return null;
              setAvailableTags([...availableTags, data]);
              return data;
            }}
            placeholder="Add tags to categorize this fanfic..."
            disabled={isSubmitting}
          />
        </FormSection>

        <div className="flex gap-4">
          <FormButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {fanfic ? 'Update Fanfic' : 'Create Fanfic'}
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/fanfics')}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
        </div>
      </form>
    </FormProvider>
  );
}

