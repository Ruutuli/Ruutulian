'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { World, WorldFieldDefinitions, WorldStoryData } from '@/types/oc';
import { useFormSubmission } from '@/lib/hooks/useFormSubmission';
import { slugify } from '@/lib/utils/slugify';
import { WorldFieldsSection } from './WorldFieldsSection';
import { getWorldFieldDefinitions } from '@/lib/fields/worldFields';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { StoryAliasManager } from './StoryAliasManager';
import { WorldStorySwitcher } from './WorldStorySwitcher';
import { optionalString, optionalUrl } from '@/lib/utils/zodSchemas';
import { autoCreateWorldFieldOptions } from '@/lib/utils/autoCreateOptions';

const worldSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  series_type: z.enum(['canon', 'original']),
  summary: z.string().min(1, 'Summary is required'),
  description_markdown: optionalString,
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  header_image_url: optionalUrl,
  icon_url: optionalUrl,
  is_public: z.boolean(),
  // Additional world fields
  genre: optionalString,
  setting: optionalString,
  lore: optionalString,
  the_world_society: optionalString,
  culture: optionalString,
  politics: optionalString,
  technology: optionalString,
  environment: optionalString,
  races_species: optionalString,
  power_systems: optionalString,
  religion: optionalString,
  government: optionalString,
  important_factions: optionalString,
  notable_figures: optionalString,
  languages: optionalString,
  trade_economy: optionalString,
  travel_transport: optionalString,
  themes: optionalString,
  inspirations: optionalString,
  current_era_status: optionalString,
  notes: optionalString,
  // New world information fields
  canon_status: optionalString,
  timeline_era: optionalString,
  power_source: optionalString,
  central_conflicts: optionalString,
  world_rules_limitations: optionalString,
  oc_integration_notes: optionalString,
  // Section image URLs
  overview_image_url: optionalUrl,
  society_culture_image_url: optionalUrl,
  world_building_image_url: optionalUrl,
  economy_systems_image_url: optionalUrl,
  additional_info_image_url: optionalUrl,
  history_image_url: optionalUrl,
  // History field
  history: optionalString,
  // World field system (definitions - read-only in this form)
  world_fields: z.any().optional(),
  // Modular fields for world field system values
  modular_fields: z.any().optional(),
});

type WorldFormData = z.infer<typeof worldSchema>;

interface WorldFormProps {
  world?: World;
}

export function WorldForm({ world }: WorldFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get story alias from URL query parameter
  const initialStoryAliasId = useMemo(() => {
    const storyParam = searchParams?.get('story');
    if (!storyParam || !world) return null;
    
    // Find story alias by slug
    const storyAlias = world.story_aliases?.find(sa => sa.slug === storyParam);
    return storyAlias?.id || null;
  }, [searchParams, world]);
  
  const [selectedStoryAliasId, setSelectedStoryAliasId] = useState<string | null>(initialStoryAliasId);
  const [storyData, setStoryData] = useState<WorldStoryData | null>(null);
  const [isLoadingStoryData, setIsLoadingStoryData] = useState(false);
  
  // Get field definitions from world for display
  const fieldDefinitions = getWorldFieldDefinitions(world || null);
  
  // Load story-specific data when story alias changes
  const loadStoryData = useCallback(async () => {
    if (!world || !selectedStoryAliasId) {
      setStoryData(null);
      return;
    }

    setIsLoadingStoryData(true);
    try {
      const response = await fetch(
        `/api/admin/worlds/${world.id}/story-data?story_alias_id=${selectedStoryAliasId}`
      );
      const data = await response.json();
      
      if (response.ok && data) {
        setStoryData(data);
      } else {
        setStoryData(null);
      }
    } catch (error) {
      console.error('Error loading story data:', error);
      setStoryData(null);
    } finally {
      setIsLoadingStoryData(false);
    }
  }, [world, selectedStoryAliasId]);

  useEffect(() => {
    loadStoryData();
  }, [loadStoryData]);

  // Update URL when story alias changes
  useEffect(() => {
    if (!world || !selectedStoryAliasId) {
      // Remove story param if base world selected
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('story');
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
      return;
    }

    // Update URL with story alias slug
    const storyAlias = world.story_aliases?.find(sa => sa.id === selectedStoryAliasId);
    if (storyAlias) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('story', storyAlias.slug);
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
    }
  }, [selectedStoryAliasId, world, router]);
  
  const baseSubmit = useFormSubmission<WorldFormData>({
    apiRoute: '/api/admin/worlds',
    entity: world,
    successRoute: world ? `/admin/worlds/${world.id}` : '/admin/worlds',
    showSuccessMessage: true,
    successMessage: 'World saved successfully!',
    transformData: (data) => {
      // Clean up empty strings and convert to null for optional fields
      return {
        name: data.name,
        slug: data.slug,
        series_type: data.series_type,
        summary: data.summary,
        primary_color: data.primary_color,
        accent_color: data.accent_color,
        is_public: data.is_public,
        header_image_url: data.header_image_url || null,
        icon_url: data.icon_url || null,
        description_markdown: data.description_markdown || null,
        genre: data.genre || null,
        setting: data.setting || null,
        lore: data.lore || null,
        the_world_society: data.the_world_society || null,
        culture: data.culture || null,
        politics: data.politics || null,
        technology: data.technology || null,
        environment: data.environment || null,
        races_species: data.races_species || null,
        power_systems: data.power_systems || null,
        religion: data.religion || null,
        government: data.government || null,
        important_factions: data.important_factions || null,
        notable_figures: data.notable_figures || null,
        languages: data.languages || null,
        trade_economy: data.trade_economy || null,
        travel_transport: data.travel_transport || null,
        themes: data.themes || null,
        inspirations: data.inspirations || null,
        current_era_status: data.current_era_status || null,
        notes: data.notes || null,
        canon_status: data.canon_status || null,
        timeline_era: data.timeline_era || null,
        power_source: data.power_source || null,
        central_conflicts: data.central_conflicts || null,
        world_rules_limitations: data.world_rules_limitations || null,
        oc_integration_notes: data.oc_integration_notes || null,
        overview_image_url: data.overview_image_url || null,
        society_culture_image_url: data.society_culture_image_url || null,
        world_building_image_url: data.world_building_image_url || null,
        economy_systems_image_url: data.economy_systems_image_url || null,
        additional_info_image_url: data.additional_info_image_url || null,
        history_image_url: data.history_image_url || null,
        history: data.history || null,
        world_fields: world?.world_fields || null,
      };
    },
  });


  // Helper to convert null to empty string for form defaults
  const getDefaultValue = (value: string | null | undefined): string => {
    return value ?? '';
  };

  // Merge base world data with story-specific data
  const mergedWorldData = useMemo(() => {
    if (!world) return null;
    
    // If story data exists, merge it with base world (story data overrides)
    if (storyData) {
      return {
        ...world,
        setting: storyData.setting ?? world.setting,
        lore: storyData.lore ?? world.lore,
        the_world_society: storyData.the_world_society ?? world.the_world_society,
        culture: storyData.culture ?? world.culture,
        politics: storyData.politics ?? world.politics,
        technology: storyData.technology ?? world.technology,
        environment: storyData.environment ?? world.environment,
        races_species: storyData.races_species ?? world.races_species,
        power_systems: storyData.power_systems ?? world.power_systems,
        religion: storyData.religion ?? world.religion,
        government: storyData.government ?? world.government,
        important_factions: storyData.important_factions ?? world.important_factions,
        notable_figures: storyData.notable_figures ?? world.notable_figures,
        languages: storyData.languages ?? world.languages,
        trade_economy: storyData.trade_economy ?? world.trade_economy,
        travel_transport: storyData.travel_transport ?? world.travel_transport,
        themes: storyData.themes ?? world.themes,
        inspirations: storyData.inspirations ?? world.inspirations,
        current_era_status: storyData.current_era_status ?? world.current_era_status,
        notes: storyData.notes ?? world.notes,
        canon_status: storyData.canon_status ?? world.canon_status,
        timeline_era: storyData.timeline_era ?? world.timeline_era,
        power_source: storyData.power_source ?? world.power_source,
        central_conflicts: storyData.central_conflicts ?? world.central_conflicts,
        world_rules_limitations: storyData.world_rules_limitations ?? world.world_rules_limitations,
        oc_integration_notes: storyData.oc_integration_notes ?? world.oc_integration_notes,
        overview_image_url: storyData.overview_image_url ?? world.overview_image_url,
        society_culture_image_url: storyData.society_culture_image_url ?? world.society_culture_image_url,
        world_building_image_url: storyData.world_building_image_url ?? world.world_building_image_url,
        economy_systems_image_url: storyData.economy_systems_image_url ?? world.economy_systems_image_url,
        additional_info_image_url: storyData.additional_info_image_url ?? world.additional_info_image_url,
        history_image_url: storyData.history_image_url ?? world.history_image_url,
        history: storyData.history ?? world.history,
        modular_fields: storyData.modular_fields ?? world.modular_fields,
      };
    }
    
    return world;
  }, [world, storyData]);

  const methods = useForm<WorldFormData>({
    resolver: zodResolver(worldSchema),
    defaultValues: mergedWorldData ? {
      name: mergedWorldData.name || '',
      slug: mergedWorldData.slug || '',
      series_type: mergedWorldData.series_type || 'original',
      summary: mergedWorldData.summary || '',
      description_markdown: getDefaultValue(mergedWorldData.description_markdown),
      primary_color: mergedWorldData.primary_color || '#64748b',
      accent_color: mergedWorldData.accent_color || '#94a3b8',
        header_image_url: getDefaultValue(mergedWorldData.header_image_url),
        icon_url: getDefaultValue(mergedWorldData.icon_url),
        is_public: mergedWorldData.is_public ?? true,
      genre: getDefaultValue(mergedWorldData.genre),
      setting: getDefaultValue(mergedWorldData.setting),
      lore: getDefaultValue(mergedWorldData.lore),
      the_world_society: getDefaultValue(mergedWorldData.the_world_society),
      culture: getDefaultValue(mergedWorldData.culture),
      politics: getDefaultValue(mergedWorldData.politics),
      technology: getDefaultValue(mergedWorldData.technology),
      environment: getDefaultValue(mergedWorldData.environment),
      races_species: getDefaultValue(mergedWorldData.races_species),
      power_systems: getDefaultValue(mergedWorldData.power_systems),
      religion: getDefaultValue(mergedWorldData.religion),
      government: getDefaultValue(mergedWorldData.government),
      important_factions: getDefaultValue(mergedWorldData.important_factions),
      notable_figures: getDefaultValue(mergedWorldData.notable_figures),
      languages: getDefaultValue(mergedWorldData.languages),
      trade_economy: getDefaultValue(mergedWorldData.trade_economy),
      travel_transport: getDefaultValue(mergedWorldData.travel_transport),
      themes: getDefaultValue(mergedWorldData.themes),
      inspirations: getDefaultValue(mergedWorldData.inspirations),
      current_era_status: getDefaultValue(mergedWorldData.current_era_status),
      notes: getDefaultValue(mergedWorldData.notes),
      canon_status: getDefaultValue(mergedWorldData.canon_status),
      timeline_era: getDefaultValue(mergedWorldData.timeline_era),
      power_source: getDefaultValue(mergedWorldData.power_source),
        central_conflicts: getDefaultValue(mergedWorldData.central_conflicts),
        world_rules_limitations: getDefaultValue(mergedWorldData.world_rules_limitations),
        oc_integration_notes: getDefaultValue(mergedWorldData.oc_integration_notes),
        overview_image_url: getDefaultValue(mergedWorldData.overview_image_url),
        society_culture_image_url: getDefaultValue(mergedWorldData.society_culture_image_url),
        world_building_image_url: getDefaultValue(mergedWorldData.world_building_image_url),
        economy_systems_image_url: getDefaultValue(mergedWorldData.economy_systems_image_url),
        additional_info_image_url: getDefaultValue(mergedWorldData.additional_info_image_url),
        history_image_url: getDefaultValue(mergedWorldData.history_image_url),
        history: getDefaultValue(mergedWorldData.history),
        world_fields: mergedWorldData.world_fields || undefined,
    } : {
      name: '',
      slug: '',
      series_type: 'original',
      summary: '',
      description_markdown: '',
      primary_color: '#64748b',
      accent_color: '#94a3b8',
        header_image_url: '',
        icon_url: '',
        is_public: true,
      genre: '',
      setting: '',
      lore: '',
      the_world_society: '',
      culture: '',
      politics: '',
      technology: '',
      environment: '',
      races_species: '',
      power_systems: '',
      religion: '',
      government: '',
      important_factions: '',
      notable_figures: '',
      languages: '',
      trade_economy: '',
      travel_transport: '',
      themes: '',
      inspirations: '',
      current_era_status: '',
      notes: '',
      canon_status: '',
      timeline_era: '',
      power_source: '',
      central_conflicts: '',
      world_rules_limitations: '',
      oc_integration_notes: '',
      overview_image_url: '',
      society_culture_image_url: '',
      world_building_image_url: '',
      economy_systems_image_url: '',
      additional_info_image_url: '',
      history_image_url: '',
      history: '',
      world_fields: undefined,
    },
  });

  const { register, handleSubmit, formState: { errors, isDirty }, setValue, watch, trigger, reset } = methods;
  const nameValue = watch('name');

  // Update form when story data loads
  useEffect(() => {
    if (mergedWorldData) {
      reset({
        name: mergedWorldData.name || '',
        slug: mergedWorldData.slug || '',
        series_type: mergedWorldData.series_type || 'original',
        summary: mergedWorldData.summary || '',
        description_markdown: getDefaultValue(mergedWorldData.description_markdown),
        primary_color: mergedWorldData.primary_color || '#64748b',
        accent_color: mergedWorldData.accent_color || '#94a3b8',
        header_image_url: getDefaultValue(mergedWorldData.header_image_url),
        icon_url: getDefaultValue(mergedWorldData.icon_url),
        is_public: mergedWorldData.is_public ?? true,
        genre: getDefaultValue(mergedWorldData.genre),
        setting: getDefaultValue(mergedWorldData.setting),
        lore: getDefaultValue(mergedWorldData.lore),
        the_world_society: getDefaultValue(mergedWorldData.the_world_society),
        culture: getDefaultValue(mergedWorldData.culture),
        politics: getDefaultValue(mergedWorldData.politics),
        technology: getDefaultValue(mergedWorldData.technology),
        environment: getDefaultValue(mergedWorldData.environment),
        races_species: getDefaultValue(mergedWorldData.races_species),
        power_systems: getDefaultValue(mergedWorldData.power_systems),
        religion: getDefaultValue(mergedWorldData.religion),
        government: getDefaultValue(mergedWorldData.government),
        important_factions: getDefaultValue(mergedWorldData.important_factions),
        notable_figures: getDefaultValue(mergedWorldData.notable_figures),
        languages: getDefaultValue(mergedWorldData.languages),
        trade_economy: getDefaultValue(mergedWorldData.trade_economy),
        travel_transport: getDefaultValue(mergedWorldData.travel_transport),
        themes: getDefaultValue(mergedWorldData.themes),
        inspirations: getDefaultValue(mergedWorldData.inspirations),
        current_era_status: getDefaultValue(mergedWorldData.current_era_status),
        notes: getDefaultValue(mergedWorldData.notes),
        canon_status: getDefaultValue(mergedWorldData.canon_status),
        timeline_era: getDefaultValue(mergedWorldData.timeline_era),
        power_source: getDefaultValue(mergedWorldData.power_source),
        central_conflicts: getDefaultValue(mergedWorldData.central_conflicts),
        world_rules_limitations: getDefaultValue(mergedWorldData.world_rules_limitations),
        oc_integration_notes: getDefaultValue(mergedWorldData.oc_integration_notes),
        overview_image_url: getDefaultValue(mergedWorldData.overview_image_url),
        society_culture_image_url: getDefaultValue(mergedWorldData.society_culture_image_url),
        world_building_image_url: getDefaultValue(mergedWorldData.world_building_image_url),
        economy_systems_image_url: getDefaultValue(mergedWorldData.economy_systems_image_url),
        additional_info_image_url: getDefaultValue(mergedWorldData.additional_info_image_url),
        history_image_url: getDefaultValue(mergedWorldData.history_image_url),
        history: getDefaultValue(mergedWorldData.history),
        world_fields: mergedWorldData.world_fields || undefined,
      });
    }
  }, [mergedWorldData, reset]);

  useEffect(() => {
    if (!world && nameValue) {
      const slug = slugify(nameValue);
      setValue('slug', slug);
    }
  }, [nameValue, world, setValue]);


  // Unsaved changes protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const [customError, setCustomError] = useState<string | null>(null);
  const [customSuccess, setCustomSuccess] = useState(false);
  const [isCustomSubmitting, setIsCustomSubmitting] = useState(false);

  const onSubmit = async (data: WorldFormData) => {
    // Auto-create dropdown options for custom values before form submission
    try {
      // Create options for world custom fields
      if (world && data.modular_fields) {
        const worldFieldDefinitions = fieldDefinitions;
        const fieldsWithOptions = worldFieldDefinitions.filter(f => f.options);
        if (fieldsWithOptions.length > 0) {
          await autoCreateWorldFieldOptions(data.modular_fields, fieldsWithOptions);
        }
      }
    } catch (error) {
      // Log but don't block form submission if option creation fails
      console.warn('[WorldForm] Failed to auto-create some options:', error);
    }

    if (world && selectedStoryAliasId) {
      // Custom handling for story data
      setIsCustomSubmitting(true);
      setCustomError(null);
      setCustomSuccess(false);
      
      try {
        const storyDataPayload = {
          story_alias_id: selectedStoryAliasId,
          setting: data.setting || null,
          lore: data.lore || null,
          the_world_society: data.the_world_society || null,
          culture: data.culture || null,
          politics: data.politics || null,
          technology: data.technology || null,
          environment: data.environment || null,
          races_species: data.races_species || null,
          power_systems: data.power_systems || null,
          religion: data.religion || null,
          government: data.government || null,
          important_factions: data.important_factions || null,
          notable_figures: data.notable_figures || null,
          languages: data.languages || null,
          trade_economy: data.trade_economy || null,
          travel_transport: data.travel_transport || null,
          themes: data.themes || null,
          inspirations: data.inspirations || null,
          current_era_status: data.current_era_status || null,
          notes: data.notes || null,
          canon_status: data.canon_status || null,
          timeline_era: data.timeline_era || null,
          power_source: data.power_source || null,
          central_conflicts: data.central_conflicts || null,
          world_rules_limitations: data.world_rules_limitations || null,
          oc_integration_notes: data.oc_integration_notes || null,
          overview_image_url: data.overview_image_url || null,
          society_culture_image_url: data.society_culture_image_url || null,
          world_building_image_url: data.world_building_image_url || null,
          economy_systems_image_url: data.economy_systems_image_url || null,
          additional_info_image_url: data.additional_info_image_url || null,
          history_image_url: data.history_image_url || null,
          history: data.history || null,
          modular_fields: data.modular_fields || {},
        };

        const response = await fetch(`/api/admin/worlds/${world.id}/story-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storyDataPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `Failed to save: ${response.statusText}`,
          }));
          throw new Error(errorData.error || `Failed to save: ${response.statusText}`);
        }

        setCustomSuccess(true);
        // Reload story data and refresh
        await loadStoryData();
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } catch (err) {
        setCustomError(err instanceof Error ? err.message : 'Failed to save story data');
      } finally {
        setIsCustomSubmitting(false);
      }
    } else {
      // Use base submit for world updates
      await baseSubmit.submit(data);
    }
  };

  const isSubmitting = isCustomSubmitting || baseSubmit.isSubmitting;
  const error = customError || baseSubmit.error;
  const success = customSuccess || baseSubmit.success;

  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    router.back();
  }, [isDirty, router]);


  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 w-full">
      {error && <FormMessage type="error" message={error} />}
      {Object.keys(errors).length > 0 && (
        <FormMessage
          type="warning"
          message={`Please fix the following errors: ${Object.entries(errors).map(([field, error]) => {
            const errorMessage = error && typeof error === 'object' && 'message' in error 
              ? String(error.message) 
              : 'Invalid value';
            return `${field}: ${errorMessage}`;
          }).join(', ')}`}
        />
      )}
      {success && <FormMessage type="success" message={selectedStoryAliasId ? 'Story world data saved successfully!' : 'World saved successfully!'} />}
      
      {world && world.series_type === 'canon' && (
        <WorldStorySwitcher
          worldId={world.id}
          worldIsCanon={world.series_type === 'canon'}
          selectedStoryAliasId={selectedStoryAliasId}
          onStoryAliasChange={setSelectedStoryAliasId}
          disabled={isSubmitting || isLoadingStoryData}
        />
      )}
      
      {isLoadingStoryData && (
        <div className="text-sm text-gray-400 mb-4">Loading story data...</div>
      )}

      <FormSection 
        title="Core Identity" 
        icon="core-identity" 
        accentColor="core-identity" 
        defaultOpen={true}
        description="Basic identifying information about your world. Name, slug, and series type are required and cannot be changed after creation for canon worlds."
      >
        {selectedStoryAliasId && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded text-sm text-amber-300">
            <strong>Note:</strong> Core identity fields (name, slug, colors, images) are shared across all story versions. 
            Only content fields below can be customized per story.
          </div>
        )}
        <div>
          <FormLabel htmlFor="name" required>
            Name
          </FormLabel>
          <FormInput
            {...register('name')}
            error={errors.name?.message}
            placeholder="The name of your world (e.g., 'Naruto Universe', 'My Original Fantasy World')"
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
            placeholder="URL-friendly version of the name (auto-generated from name, cannot be changed after creation)"
            disabled={isSubmitting || !!world}
          />
        </div>

        <div>
          <FormLabel htmlFor="series_type" required>
            Series Type
          </FormLabel>
          <FormSelect
            {...register('series_type')}
            options={[
              { value: 'canon', label: 'Canon' },
              { value: 'original', label: 'Original' },
            ]}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="canon_status">
            Canon Status
          </FormLabel>
          <FormInput
            {...register('canon_status')}
            placeholder="e.g., Canon, Semi-Canon, AU, OC-Only, Headcanon Expansion"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="summary" required>
            Summary
          </FormLabel>
          <FormTextarea
            {...register('summary')}
            rows={3}
            error={errors.summary?.message}
            placeholder="A brief 1-2 paragraph elevator pitch describing your world. What is this world about?"
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
            placeholder="Full detailed description of your world. Supports Markdown formatting. This is the main content that appears on the world's page."
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection 
        title="Visual Identity" 
        icon="visual-identity" 
        accentColor="visual-identity" 
        defaultOpen={true}
        description="Colors and images that represent your world visually. These appear in world cards, headers, and throughout the site to give your world a distinct visual identity."
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="primary_color" required>
              Primary Color
            </FormLabel>
            <input
              type="color"
              {...register('primary_color')}
              disabled={isSubmitting}
              className="w-full h-12 border border-gray-500/60 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <FormInput
              type="text"
              {...register('primary_color')}
              disabled={isSubmitting}
              className="mt-2"
            />
          </div>

          <div>
            <FormLabel htmlFor="accent_color" required>
              Accent Color
            </FormLabel>
            <input
              type="color"
              {...register('accent_color')}
              disabled={isSubmitting}
              className="w-full h-12 border border-gray-500/60 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <FormInput
              type="text"
              {...register('accent_color')}
              disabled={isSubmitting}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <FormLabel htmlFor="header_image_url">
            Header Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('header_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="icon_url">
            Icon URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('icon_url')}
            placeholder="https://example.com/icon.png"
            disabled={isSubmitting}
          />
        </div>
      </FormSection>

      <FormSection 
        title="Overview" 
        icon="overview" 
        accentColor="overview" 
        defaultOpen={false}
        description="High-level information about your world: genre, time period, physical setting, and foundational lore. This gives readers a quick understanding of what your world is about."
      >
        <div>
          <FormLabel htmlFor="genre">
            Genre
          </FormLabel>
          <FormInput
            {...register('genre')}
            placeholder="e.g., Fantasy, Sci-Fi, Modern, Historical, Adventure, Romance"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="timeline_era">
            Timeline / Era
          </FormLabel>
          <FormInput
            {...register('timeline_era')}
            placeholder="e.g., Ancient, Modern, Post-Apocalyptic, Mythic Age, Pre-Canon/During Canon/Post-Canon"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="setting">
            Setting
          </FormLabel>
          <FormTextarea
            {...register('setting')}
            rows={3}
            placeholder="Physical location and environment. Where does the story take place? Describe geography, climate, and notable locations."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="lore">
            Lore
          </FormLabel>
          <FormTextarea
            {...register('lore')}
            rows={5}
            placeholder="Deep history, myths, cosmology, and foundational stories. The rich background that shapes everything else."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="overview_image_url">
            Overview Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('overview_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the Overview section</p>
        </div>
      </FormSection>

      <FormSection 
        title="Society & Culture" 
        icon="society-culture" 
        accentColor="society-culture" 
        defaultOpen={false}
        description="The social fabric of your world: how people live, organize themselves, govern, worship, and interact. Includes society structure, culture, politics, religion, government, technology level, and environment."
      >
        <div>
          <FormLabel htmlFor="the_world_society">
            The World Society
          </FormLabel>
          <FormTextarea
            {...register('the_world_society')}
            rows={3}
            placeholder="Overall structure and organization of society. How do people live together? Social classes, hierarchies, or social systems."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="culture">
            Culture
          </FormLabel>
          <FormTextarea
            {...register('culture')}
            rows={3}
            placeholder="Cultural practices, traditions, customs, arts, values, and ways of life. What makes this world's culture unique?"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="politics">
            Politics
          </FormLabel>
          <FormTextarea
            {...register('politics')}
            rows={3}
            placeholder="Political landscape, power structures, alliances, conflicts, and how decisions are made."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="religion">
            Religion
          </FormLabel>
          <FormTextarea
            {...register('religion')}
            rows={3}
            placeholder="Religious beliefs, practices, deities, spiritual systems, and how faith shapes the world."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="government">
            Government
          </FormLabel>
          <FormTextarea
            {...register('government')}
            rows={3}
            placeholder="Governing systems, laws, leadership structures, and how authority is organized and exercised."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="technology">
            Technology
          </FormLabel>
          <FormTextarea
            {...register('technology')}
            rows={3}
            placeholder="Technological level and capabilities. What tools, machines, or systems exist? How advanced is the technology?"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="environment">
            Environment
          </FormLabel>
          <FormTextarea
            {...register('environment')}
            rows={3}
            placeholder="Natural environment, climate, ecosystems, and how the physical world affects life."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="society_culture_image_url">
            Society & Culture Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('society_culture_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the Society & Culture section</p>
        </div>
      </FormSection>

      <FormSection 
        title="World Building" 
        icon="world-building" 
        accentColor="world-building" 
        defaultOpen={false}
        description="Core world mechanics and important elements: races/species, power systems, factions, notable figures, conflicts, world rules, and guidance for OC integration. Essential for understanding how the world works and what characters can do."
      >
        <div>
          <FormLabel htmlFor="races_species">
            Races/Species
          </FormLabel>
          <FormTextarea
            {...register('races_species')}
            rows={3}
            placeholder="Different races, species, or types of beings that exist. Describe their characteristics, relationships, and roles."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="power_systems">
            Power Systems
          </FormLabel>
          <FormTextarea
            {...register('power_systems')}
            rows={3}
            placeholder="How power, abilities, or magic work. Describe the mechanics, rules, and how characters gain or use power."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="power_source">
            Power Source
          </FormLabel>
          <FormInput
            {...register('power_source')}
            placeholder="e.g., Spiritual, Magical, Technological, Biological, Divine, Hybrid"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="important_factions">
            Important Factions
          </FormLabel>
          <FormTextarea
            {...register('important_factions')}
            rows={3}
            placeholder="Major groups, organizations, or factions. Nations, guilds, clans, or other organized groups that play significant roles."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="notable_figures">
            Notable Figures
          </FormLabel>
          <FormTextarea
            {...register('notable_figures')}
            rows={3}
            placeholder="Important historical or current figures. Leaders, heroes, villains, or other significant individuals who shape the world."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="central_conflicts">
            Central Conflicts
          </FormLabel>
          <FormTextarea
            {...register('central_conflicts')}
            rows={3}
            placeholder="Major ongoing conflicts, tensions, or threats. Ongoing wars, political tensions, cosmic threats, cultural clashes. What drives the narrative tension? What are the stakes?"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="world_rules_limitations">
            World Rules & Limitations
          </FormLabel>
          <FormTextarea
            {...register('world_rules_limitations')}
            rows={3}
            placeholder="Hard rules and limitations. What can't be done? What are the costs, taboos, or absolute limits? Essential for roleplay consistency."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="oc_integration_notes">
            OC Integration Notes
          </FormLabel>
          <FormTextarea
            {...register('oc_integration_notes')}
            rows={3}
            placeholder="Guidance for creating OCs. How do OCs typically enter this world? What are power scaling expectations? What are common roles? Prevents future confusion."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="world_building_image_url">
            World Building Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('world_building_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the World Building section</p>
        </div>
      </FormSection>

      <FormSection 
        title="Economy & Systems" 
        icon="economy-systems" 
        accentColor="economy-systems" 
        defaultOpen={false}
        description="Practical systems that keep the world running: languages spoken, trade networks, economic structures, and methods of travel and transportation."
      >
        <div>
          <FormLabel htmlFor="languages">
            Languages
          </FormLabel>
          <FormInput
            {...register('languages')}
            placeholder="e.g., Common, Elvish, Japanese, English, or list multiple languages spoken"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="trade_economy">
            Trade & Economy
          </FormLabel>
          <FormTextarea
            {...register('trade_economy')}
            rows={3}
            placeholder="Economic systems, trade networks, currency, commerce, and how resources flow through the world."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="travel_transport">
            Travel & Transport
          </FormLabel>
          <FormTextarea
            {...register('travel_transport')}
            rows={3}
            placeholder="Methods of travel and transportation. How do people and goods move around? Ships, teleportation, vehicles, etc."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="economy_systems_image_url">
            Economy & Systems Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('economy_systems_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the Economy & Systems section</p>
        </div>
      </FormSection>

      <FormSection 
        title="Additional Information" 
        icon="additional-information" 
        accentColor="additional-information" 
        defaultOpen={false}
        description="Supplementary details: thematic elements, creative inspirations, current state of the world, and any additional notes. Useful for context and behind-the-scenes information."
      >
        <div>
          <FormLabel htmlFor="themes">
            Themes
          </FormLabel>
          <FormTextarea
            {...register('themes')}
            rows={3}
            placeholder="Thematic elements and underlying messages. What themes does this world explore? (e.g., friendship, sacrifice, power, redemption)"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="inspirations">
            Inspirations
          </FormLabel>
          <FormTextarea
            {...register('inspirations')}
            rows={3}
            placeholder="What inspired this world? Media, real-world events, other stories, or concepts that influenced your worldbuilding."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="current_era_status">
            Current Era Status
          </FormLabel>
          <FormTextarea
            {...register('current_era_status')}
            rows={3}
            placeholder="The current state of the world at the time your stories take place. What's happening now? What's the world's condition?"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="notes">
            Notes
          </FormLabel>
          <FormTextarea
            {...register('notes')}
            rows={3}
            placeholder="Any additional notes, behind-the-scenes information, or reminders that don't fit in other categories."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="additional_info_image_url">
            Additional Information Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('additional_info_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the Additional Information section</p>
        </div>
      </FormSection>

      <FormSection 
        title="History" 
        icon="history" 
        accentColor="history" 
        defaultOpen={false}
        description="Detailed history and background of the world. Major events, historical periods, and how the world came to be what it is today."
      >
        <div>
          <FormLabel htmlFor="history">
            History
          </FormLabel>
          <FormTextarea
            {...register('history')}
            rows={10}
            markdown
            placeholder="Detailed history and background of the world. Describe major historical events, periods, and how the world evolved over time."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <FormLabel htmlFor="history_image_url">
            History Section Image URL
          </FormLabel>
          <FormInput
            type="url"
            {...register('history_image_url')}
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">Optional image to display with the History section</p>
        </div>
      </FormSection>

      <FormSection 
        title="Settings" 
        icon="settings" 
        accentColor="settings" 
        defaultOpen={true}
        description="Visibility settings for your world. Public worlds are visible to everyone, while private worlds are only visible to you."
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('is_public')}
            disabled={isSubmitting}
            className="h-4 w-4 text-purple-500 focus:ring-purple-500 border-gray-500 rounded bg-gray-800/60 disabled:opacity-50 cursor-pointer"
          />
          <label className="ml-2 block text-sm text-gray-200">
            Public (visible to everyone)
          </label>
        </div>
      </FormSection>

      {world && (
        <FormSection 
          title="Story Aliases" 
          icon="story-aliases" 
          accentColor="story-aliases" 
          defaultOpen={false}
          description="For canon worlds, create different story versions (AUs, alternate timelines, etc.). Each story alias can have its own world content while sharing the same core identity. Original worlds don't need story aliases."
        >
          <StoryAliasManager
            worldId={world.id}
            worldIsCanon={world.series_type === 'canon'}
          />
        </FormSection>
      )}

      {fieldDefinitions.length > 0 && (
        <WorldFieldsSection
          fieldDefinitions={fieldDefinitions}
          fieldPrefix="modular_fields"
          disabled={isSubmitting}
          title="World Custom Fields"
          defaultOpen={false}
          accentColor="content"
        />
      )}


      {/* Form Actions */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t-2 border-gray-600/50 bg-gray-800/30 rounded-lg p-5">
        <div className="text-sm text-gray-200">
          {isDirty && !isSubmitting && (
            <span className="flex items-center text-amber-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              You have unsaved changes
            </span>
          )}
          {isSubmitting && (
            <span className="flex items-center text-purple-300">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </FormButton>
          <FormButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || isLoadingStoryData}
          >
            {selectedStoryAliasId 
              ? 'Save Story World Data' 
              : world 
                ? 'Update World' 
                : 'Create World'}
          </FormButton>
        </div>
      </div>
      </form>
    </FormProvider>
  );
}
