'use client';

import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import type { WorldFieldDefinition } from '@/types/oc';
import { validateFieldValue } from './worldFields';
import { FormAutocomplete } from '@/components/admin/forms/FormAutocomplete';
import { FormTextarea } from '@/components/admin/forms/FormTextarea';

interface DynamicFieldProps {
  fieldDef: WorldFieldDefinition;
  fieldPath: string;
  disabled?: boolean;
  error?: string;
}

/**
 * Renders a single dynamic field based on its type
 */
export function DynamicField({ fieldDef, fieldPath, disabled = false, error }: DynamicFieldProps) {
  const { register, formState, control } = useFormContext();
  const errorMessage = formState.errors[fieldPath]?.message;
  const fieldError = error || (typeof errorMessage === 'string' ? errorMessage : undefined);

  switch (fieldDef.type) {
    case 'text':
      // If field has options, use autocomplete with custom values allowed
      if (fieldDef.options) {
        return (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {fieldDef.label}
              {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {fieldDef.description && (
              <p className="text-xs text-gray-400 mb-1">{fieldDef.description}</p>
            )}
            <Controller
              name={fieldPath}
              control={control}
              render={({ field: controllerField }) => (
                <FormAutocomplete
                  {...controllerField}
                  optionsSource={fieldDef.options}
                  allowCustom={true}
                  placeholder={`Type ${fieldDef.label.toLowerCase()}...`}
                  disabled={disabled}
                  error={fieldError}
                />
              )}
            />
            {fieldError && <p className="mt-1 text-sm text-red-400">{String(fieldError)}</p>}
          </div>
        );
      }
      // Multiline textarea for fields with multiline enabled
      if (fieldDef.multiline) {
        return (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {fieldDef.label}
              {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {fieldDef.description && (
              <p className="text-xs text-gray-400 mb-1">{fieldDef.description}</p>
            )}
            <FormTextarea
              {...register(fieldPath)}
              disabled={disabled}
              rows={4}
              placeholder={`Enter ${fieldDef.label.toLowerCase()}...`}
              error={fieldError}
            />
            {fieldError && <p className="mt-1 text-sm text-red-400">{String(fieldError)}</p>}
          </div>
        );
      }
      // Regular text input for fields without options and without multiline
      return (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {fieldDef.label}
            {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {fieldDef.description && (
            <p className="text-xs text-gray-400 mb-1">{fieldDef.description}</p>
          )}
          <input
            type="text"
            {...register(fieldPath)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          {fieldError && <p className="mt-1 text-sm text-red-400">{String(fieldError)}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {fieldDef.label}
            {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {fieldDef.description && (
            <p className="text-xs text-gray-400 mb-1">{fieldDef.description}</p>
          )}
          <input
            type="number"
            {...register(fieldPath, { valueAsNumber: true })}
            disabled={disabled}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          {fieldError && <p className="mt-1 text-sm text-red-400">{String(fieldError)}</p>}
        </div>
      );

    case 'array':
      return <DynamicFieldArray fieldDef={fieldDef} fieldPath={fieldPath} disabled={disabled} error={error} />;

    default:
      return null;
  }
}

/**
 * Renders an array-type field with add/remove functionality
 */
function DynamicFieldArray({ fieldDef, fieldPath, disabled = false, error }: DynamicFieldProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldPath,
  });

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {fieldDef.label}
        {fieldDef.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {fieldDef.description && (
        <p className="text-xs text-gray-400 mb-1">{fieldDef.description}</p>
      )}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`${fieldPath}.${index}`)}
              disabled={disabled}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append('')}
          disabled={disabled}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 disabled:opacity-50"
        >
          Add Item
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}


