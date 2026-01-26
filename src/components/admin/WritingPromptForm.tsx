'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { logger } from '@/lib/logger';

const promptSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  prompt_text: z.string().min(1, 'Prompt text is required'),
  requires_two_characters: z.boolean(),
  is_active: z.boolean(),
});

type PromptFormData = z.infer<typeof promptSchema>;

interface WritingPrompt {
  id: string;
  category: string;
  prompt_text: string;
  requires_two_characters: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WritingPromptFormProps {
  prompt?: WritingPrompt;
}

const commonCategories = [
  'First Meeting',
  'Trust & Reliance',
  'Conflict & Betrayal',
  'Forced Proximity',
  'Secrets & Revelations',
  'Emotional Moments',
  'Competition',
  'Growth & Change',
  'Identity & Role Reversal',
  'Choices & Endings',
  'Character Development',
  'Internal Struggles',
  'Abilities & Skills',
  'Relationships',
  'Goals & Dreams',
  'Daily Life',
  'Personality',
  'Backstory',
];

export function WritingPromptForm({ prompt }: WritingPromptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredCategories, setFilteredCategories] = useState(commonCategories);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: prompt
      ? {
          category: prompt.category,
          prompt_text: prompt.prompt_text,
          requires_two_characters: prompt.requires_two_characters,
          is_active: prompt.is_active,
        }
      : {
          category: '',
          prompt_text: '',
          requires_two_characters: false,
          is_active: true,
        },
  });

  const requiresTwoCharacters = watch('requires_two_characters');
  const category = watch('category');
  const categoryRegister = register('category');

  // Filter categories based on input
  useEffect(() => {
    if (category) {
      const filtered = commonCategories.filter(cat =>
        cat.toLowerCase().includes(category.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(commonCategories);
    }
    setHighlightedIndex(-1);
  }, [category]);

  // Merge register ref with our custom ref
  const mergedCategoryRef = useCallback((node: HTMLInputElement | null) => {
    categoryRegister.ref(node);
    (categoryInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
  }, [categoryRegister]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryChange = (value: string) => {
    setValue('category', value, { shouldValidate: true });
    setShowSuggestions(true);
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setValue('category', selectedCategory, { shouldValidate: true });
    setShowSuggestions(false);
    categoryInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions && filteredCategories.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setShowSuggestions(true);
        return;
      }
    }

    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredCategories.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredCategories[highlightedIndex]) {
            handleCategorySelect(filteredCategories[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    }
  };

  const onSubmit = async (data: PromptFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const url = prompt
        ? `/api/admin/writing-prompts/${prompt.id}`
        : '/api/admin/writing-prompts';
      const method = prompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save prompt');
      }

      setSuccess(true);
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      navigateTimeoutRef.current = window.setTimeout(() => {
        router.push('/admin/writing-prompts');
        navigateTimeoutRef.current = null;
      }, 1000);
    } catch (err: any) {
      logger.error('Component', 'WritingPromptForm: Error saving prompt', err);
      setError(err.message || 'Failed to save prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Category">
        <FormLabel htmlFor="category">Category *</FormLabel>
        <div className="space-y-2">
          <div className="relative">
            <FormInput
              {...categoryRegister}
              ref={mergedCategoryRef}
              placeholder="Type to search or select a category"
              disabled={isSubmitting}
              onChange={(e) => {
                categoryRegister.onChange(e);
                handleCategoryChange(e.target.value);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="category-suggestions"
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `category-option-${highlightedIndex}`
                  : undefined
              }
            />
            {showSuggestions && filteredCategories.length > 0 && (
              <div
                ref={suggestionsRef}
                id="category-suggestions"
                role="listbox"
                className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-auto"
              >
                {filteredCategories.map((cat, index) => (
                  <button
                    key={cat}
                    id={`category-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onClick={() => handleCategorySelect(cat)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      highlightedIndex === index
                        ? 'bg-purple-600/30 text-purple-200'
                        : 'text-gray-200 hover:bg-gray-700/50'
                    } ${
                      index === 0 ? 'rounded-t-lg' : ''
                    } ${
                      index === filteredCategories.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex-1">{cat}</span>
                      {category.toLowerCase() === cat.toLowerCase() && (
                        <svg
                          className="w-4 h-4 text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && filteredCategories.length === 0 && category && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4"
              >
                <p className="text-sm text-gray-400">
                  No matching categories found. You can enter a custom category.
                </p>
              </div>
            )}
          </div>
          {errors.category && (
            <FormMessage type="error" message={errors.category.message || ''} />
          )}
          <div className="text-sm text-gray-400">
            <span className="font-medium">Available categories:</span>{' '}
            <span className="text-gray-500">
              {commonCategories.slice(0, 6).join(', ')}
              {commonCategories.length > 6 && ` +${commonCategories.length - 6} more`}
            </span>
          </div>
        </div>
      </FormSection>

      <FormSection title="Prompt Text">
        <FormLabel htmlFor="prompt_text">Prompt Text *</FormLabel>
        <div className="space-y-2">
          <FormTextarea
            {...register('prompt_text')}
            placeholder="Enter the prompt text. Use {character1} and {character2} as placeholders for character names."
            rows={4}
            disabled={isSubmitting}
          />
          {errors.prompt_text && (
            <FormMessage type="error" message={errors.prompt_text.message || ''} />
          )}
          <div className="text-sm text-gray-400">
            <p className="mb-1">Placeholders:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="bg-gray-800 px-1 py-0.5 rounded">&#123;character1&#125;</code> - First character name</li>
              {requiresTwoCharacters && (
                <li><code className="bg-gray-800 px-1 py-0.5 rounded">&#123;character2&#125;</code> - Second character name</li>
              )}
            </ul>
          </div>
        </div>
      </FormSection>

      <FormSection title="Prompt Type">
        <FormLabel htmlFor="requires_two_characters">Prompt Type *</FormLabel>
        <div className="space-y-2">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="false"
                checked={!requiresTwoCharacters}
                onChange={() => setValue('requires_two_characters', false)}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                disabled={isSubmitting}
              />
              <span className="text-gray-300">Single Character</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="true"
                checked={requiresTwoCharacters}
                onChange={() => setValue('requires_two_characters', true)}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                disabled={isSubmitting}
              />
              <span className="text-gray-300">Two Characters</span>
            </label>
          </div>
          {errors.requires_two_characters && (
            <FormMessage type="error" message={errors.requires_two_characters.message || ''} />
          )}
        </div>
      </FormSection>

      <FormSection title="Status">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('is_active')}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
            disabled={isSubmitting}
          />
          <span className="text-gray-300">Active (show in generator)</span>
        </label>
      </FormSection>

      {error && <FormMessage type="error" message={error} />}
      {success && (
        <FormMessage
          type="success"
          message={`Prompt ${prompt ? 'updated' : 'created'} successfully! Redirecting...`}
        />
      )}

      <div className="flex gap-4">
        <FormButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
        >
          {isSubmitting ? 'Saving...' : prompt ? 'Update Prompt' : 'Create Prompt'}
        </FormButton>
        <FormButton
          type="button"
          onClick={() => router.push('/admin/writing-prompts')}
          disabled={isSubmitting}
          variant="secondary"
        >
          Cancel
        </FormButton>
      </div>
    </form>
  );
}

