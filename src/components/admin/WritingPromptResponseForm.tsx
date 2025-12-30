'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';

const responseSchema = z.object({
  response_text: z.string().min(1, 'Response text is required'),
});

type ResponseFormData = z.infer<typeof responseSchema>;

interface WritingPromptResponse {
  id: string;
  oc_id: string;
  other_oc_id: string | null;
  category: string;
  prompt_text: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  oc?: {
    id: string;
    name: string;
    slug: string;
  };
  other_oc?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface WritingPromptResponseFormProps {
  response: WritingPromptResponse;
}

export function WritingPromptResponseForm({ response }: WritingPromptResponseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      response_text: response.response_text,
    },
  });

  const onSubmit = async (data: ResponseFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const responseData = await fetch(`/api/admin/writing-prompt-responses/${response.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oc_id: response.oc_id,
          other_oc_id: response.other_oc_id,
          category: response.category,
          prompt_text: response.prompt_text,
          response_text: data.response_text.trim(),
        }),
      });

      if (!responseData.ok) {
        const errorData = await responseData.json();
        throw new Error(errorData.error || 'Failed to update response');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/writing-prompt-responses');
      }, 1000);
    } catch (err: any) {
      console.error('Error updating response:', err);
      setError(err.message || 'Failed to update response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Display prompt and character info (read-only) */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/30">
            {response.category}
          </span>
          {response.oc && (
            <span className="text-gray-300 text-sm">
              <i className="fas fa-user text-purple-400 mr-1"></i>
              Character: <span className="font-medium">{response.oc.name}</span>
            </span>
          )}
          {response.other_oc && (
            <span className="text-gray-300 text-sm">
              <i className="fas fa-user text-purple-400 mr-1"></i>
              With: <span className="font-medium">{response.other_oc.name}</span>
            </span>
          )}
        </div>
        <div className="mb-4 p-4 bg-gray-900/50 rounded border border-gray-700/50">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Prompt</div>
          <p className="text-gray-200">{response.prompt_text}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Response">
          <FormLabel htmlFor="response_text">Your Response *</FormLabel>
          <div className="space-y-2">
            <FormTextarea
              {...register('response_text')}
              placeholder="Enter your response to this prompt..."
              rows={12}
              disabled={isSubmitting}
            />
            {errors.response_text && (
              <FormMessage type="error" message={errors.response_text.message || ''} />
            )}
          </div>
        </FormSection>

        {error && <FormMessage type="error" message={error} />}
        {success && (
          <FormMessage type="success" message="Response updated successfully! Redirecting..." />
        )}

        <div className="flex gap-4">
          <FormButton
            type="submit"
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Saving...' : 'Update Response'}
          </FormButton>
          <FormButton
            type="button"
            onClick={() => router.push('/admin/writing-prompt-responses')}
            disabled={isSubmitting}
            variant="secondary"
          >
            Cancel
          </FormButton>
        </div>
      </form>
    </div>
  );
}

