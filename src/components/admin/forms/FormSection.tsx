'use client';

import React, { useState } from 'react';
import { getSectionIcon, type SectionIconName } from '@/lib/utils/formIcons';
import { getSectionAccent } from '@/lib/styles/formStyles';

interface FormSectionProps {
  title: string;
  icon?: SectionIconName | string;
  accentColor?: 'core-identity' | 'visual-identity' | 'basic-information' | 'appearance' | 'relationships' | 'personality-traits' | 'content' | 'metadata' | 'settings' | 'timeline' | 'lore' | string;
  defaultOpen?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  icon,
  accentColor,
  defaultOpen = true,
  description,
  children,
  className = '',
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Determine icon to use
  const iconName = icon || title.toLowerCase().replace(/\s+/g, '-');
  const faIcon = getSectionIcon(iconName);

  // Get accent colors
  const accent = accentColor ? getSectionAccent(accentColor) : getSectionAccent(title);

  return (
    <div className={`border ${accent.border} rounded-lg overflow-hidden bg-gray-800/30 shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 md:px-5 md:py-3.5 bg-gradient-to-r ${accent.from} ${accent.to} ${accent.hoverFrom} ${accent.hoverTo} transition-all flex items-center justify-between text-left border-b border-gray-600/50`}
      >
        <h3 className="text-base md:text-lg font-semibold text-gray-50 flex items-center gap-2 md:gap-3">
          <i className={`fas ${faIcon} text-gray-300 text-sm md:text-base`} aria-hidden="true"></i>
          <span className="truncate">{title}</span>
        </h3>
        <svg
          className={`w-4 h-4 md:w-5 md:h-5 text-gray-300 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 md:p-5 space-y-4 md:space-y-5 bg-gray-800/20">
          {description && (
            <div className="mb-4 pb-3 border-b border-gray-700/50">
              <p className="text-sm text-gray-300 italic leading-relaxed">{description}</p>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

