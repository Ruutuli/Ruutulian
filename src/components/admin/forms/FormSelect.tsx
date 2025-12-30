'use client';

import React, { useMemo } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  register?: UseFormRegisterReturn;
  error?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  optionsSource?: string;
  allowCustom?: boolean;
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({
    register,
    error,
    helpText,
    options,
    optionsSource,
    allowCustom = false,
    placeholder = 'Select an option',
    className = '',
    disabled,
    children,
    ...props
  }, ref) => {
    const baseClasses = 'w-full px-4 py-2.5 bg-gray-900/60 border border-gray-500/60 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/70 focus:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    // Fetch options from database first, fallback to generated file
    // The hook already handles the fallback, so we can use it directly
    const { options: dbOptions } = useDropdownOptions(optionsSource);

    // Get options: use provided options, then database/generated file from hook
    const selectOptions = useMemo(() => {
      if (options) {
        return options;
      }
      if (optionsSource) {
        // Hook already provides database options or fallback to generated file
        return dbOptions.map((value) => ({
          value,
          label: value,
        }));
      }
      return [];
    }, [options, optionsSource, dbOptions]);

    // Extract ref from register if it exists, otherwise use the forwarded ref
    const { ref: registerRef, ...registerProps } = register || {};
    const selectRef = registerRef || ref;

    return (
      <div className="relative">
        <select
          {...registerProps}
          {...props}
          ref={selectRef}
          disabled={disabled}
          className={`${baseClasses} appearance-none pr-10 ${className}`}
        >
          {placeholder && (
            <option value="" className="bg-gray-800">
              {placeholder}
            </option>
          )}
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-400 font-medium">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1.5 text-xs text-gray-400/80">{helpText}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

