'use client';

import type { WorldFieldDefinition } from '@/types/oc';
import { DynamicField } from '@/lib/fields/fieldRenderer';
import { FormSection } from './forms/FormSection';

interface WorldFieldsSectionProps {
  fieldDefinitions: WorldFieldDefinition[];
  fieldPrefix?: string;
  disabled?: boolean;
  title?: string;
  defaultOpen?: boolean;
  accentColor?: string;
}

/**
 * Renders a section of world custom fields in a form
 * Integrates with react-hook-form
 */
export function WorldFieldsSection({
  fieldDefinitions,
  fieldPrefix = 'modular_fields',
  disabled = false,
  title = 'World Custom Fields',
  defaultOpen = false,
  accentColor = 'content',
}: WorldFieldsSectionProps) {
  if (fieldDefinitions.length === 0) {
    return null;
  }

  return (
    <FormSection title={title} accentColor={accentColor} defaultOpen={defaultOpen}>
      <div className="space-y-4">
        {fieldDefinitions.map((fieldDef) => {
          const fieldPath = `${fieldPrefix}.${fieldDef.key}`;
          return (
            <DynamicField
              key={fieldDef.key}
              fieldDef={fieldDef}
              fieldPath={fieldPath}
              disabled={disabled}
            />
          );
        })}
      </div>
    </FormSection>
  );
}

