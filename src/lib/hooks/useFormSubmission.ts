import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type React from 'react';

interface UseFormSubmissionOptions<T> {
  /**
   * Base API route (e.g., '/api/admin/ocs' or '/api/admin/worlds')
   */
  apiRoute: string;
  /**
   * Entity being edited (if editing) or undefined (if creating)
   */
  entity?: { id: string };
  /**
   * Route to navigate to after successful submission
   * Can be a function that receives the response data and returns a route
   */
  successRoute: string | ((responseData: any, isUpdate: boolean) => string);
  /**
   * Optional function to transform data before sending
   */
  transformData?: (data: T) => any;
  /**
   * Optional success message
   */
  successMessage?: string;
  /**
   * Whether to show success message with delay before navigation
   */
  showSuccessMessage?: boolean;
  /**
   * Delay in ms before navigation (only used if showSuccessMessage is true)
   */
  successDelay?: number;
  /**
   * Optional callback after successful submission (before navigation)
   * Receives the response data and whether this was an update (true) or create (false)
   * If this callback returns false, navigation will be skipped
   */
  onSuccess?: (responseData: any, isUpdate: boolean) => void | Promise<void> | boolean | Promise<boolean>;
  /**
   * Optional callback on error
   */
  onError?: (error: Error) => void;
  /**
   * Optional ref to control whether to navigate after save
   * If provided, navigation will only happen if ref.current is true
   */
  shouldNavigateRef?: React.MutableRefObject<boolean>;
}

interface UseFormSubmissionResult<T> {
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  submit: (data: T) => Promise<any>;
  clearError: () => void;
  clearSuccess: () => void;
}

/**
 * Hook to handle form submission with common patterns:
 * - Loading state management
 * - Error/success state handling
 * - API call with proper error handling
 * - Router navigation after success
 * 
 * Used across all admin forms to reduce duplication.
 */
export function useFormSubmission<T = any>(
  options: UseFormSubmissionOptions<T>
): UseFormSubmissionResult<T> {
  const {
    apiRoute,
    entity,
    successRoute,
    transformData,
    successMessage,
    showSuccessMessage = false,
    successDelay = 1000,
    onSuccess,
    onError,
    shouldNavigateRef,
  } = options;

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (data: T) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const url = entity ? `${apiRoute}/${entity.id}` : apiRoute;
      const method = entity ? 'PUT' : 'POST';

      // Transform data if transform function provided
      const requestData = transformData ? transformData(data) : data;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Failed to save: ${response.statusText}`,
        }));
        throw new Error(errorData.error || `Failed to save: ${response.statusText}`);
      }

      // Parse response (some routes return data, some don't)
      const responseData = await response.json().catch(() => null);

      setSuccess(true);
      const isUpdate = !!entity;

      // Call onSuccess callback if provided
      let shouldNavigate = true;
      if (onSuccess) {
        const result = await onSuccess(responseData, isUpdate);
        // If onSuccess returns false, skip navigation
        if (result === false) {
          shouldNavigate = false;
        }
      }

      // Check shouldNavigateRef if provided and determine route
      let navigateToRoute = null;
      if (shouldNavigateRef) {
        shouldNavigate = shouldNavigateRef.current;
        // If shouldNavigateRef is true and we're updating, navigate to list (parent route)
        // Otherwise use the normal successRoute
        if (shouldNavigateRef.current && isUpdate) {
          // Determine the normal route first
          const normalRoute = typeof successRoute === 'function' 
            ? successRoute(responseData, isUpdate)
            : successRoute;
          // If route contains an ID (like /admin/worlds/123), go to parent (/admin/worlds)
          const routeParts = normalRoute.split('/');
          if (routeParts.length > 3) {
            // Check if last part looks like a UUID or ID
            const lastPart = routeParts[routeParts.length - 1];
            if (lastPart.match(/^[0-9a-f-]{36}$/i) || lastPart.match(/^\d+$/)) {
              // It's a UUID or numeric ID, go to parent
              navigateToRoute = routeParts.slice(0, -1).join('/');
            } else {
              navigateToRoute = normalRoute;
            }
          } else {
            navigateToRoute = normalRoute;
          }
        }
        // Reset the ref after checking
        shouldNavigateRef.current = false;
      }

      // Only navigate if shouldNavigate is true
      if (shouldNavigate) {
        // Determine the route to navigate to
        const route = navigateToRoute || (typeof successRoute === 'function' 
          ? successRoute(responseData, isUpdate)
          : successRoute);

        if (showSuccessMessage) {
          // Wait before navigating to show success message
          setTimeout(() => {
            setIsSubmitting(false);
            router.push(route);
            router.refresh();
          }, successDelay);
        } else {
          // Navigate immediately
          setIsSubmitting(false);
          router.push(route);
          router.refresh();
        }
      } else {
        // Don't navigate, just refresh the current page
        setIsSubmitting(false);
        router.refresh();
      }

      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save. Please try again.');
      setError(error.message);
      setIsSubmitting(false);
      
      // Call onError callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccess(false);

  return {
    isSubmitting,
    error,
    success,
    submit,
    clearError,
    clearSuccess,
  };
}

