/**
 * Unified form styling constants
 * Ensures consistent spacing, typography, colors, and states across all forms
 */

export const formStyles = {
  // Spacing
  spacing: {
    sectionGap: 'space-y-6',
    fieldGap: 'space-y-5',
    inputPadding: 'px-4 py-2.5',
    sectionPadding: 'p-5',
    sectionHeaderPadding: 'px-5 py-3.5',
    buttonGap: 'gap-4',
    labelMargin: 'mb-2',
    errorMargin: 'mt-1.5',
  },

  // Typography
  typography: {
    label: 'text-sm font-semibold text-gray-200',
    labelRequired: 'text-red-400',
    labelOptional: 'text-xs font-normal text-gray-400/80',
    input: 'text-gray-50',
    placeholder: 'placeholder-gray-400',
    error: 'text-sm text-red-400 font-medium',
    help: 'text-xs text-gray-400/80',
    sectionTitle: 'text-lg font-semibold text-gray-50',
    markdown: 'font-mono text-sm',
  },

  // Colors - Inputs
  input: {
    bg: 'bg-gray-900/60',
    border: 'border border-gray-500/60',
    borderFocus: 'focus:border-purple-500/50',
    ringFocus: 'focus:ring-2 focus:ring-purple-500/70',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },

  // Colors - Sections
  section: {
    bg: 'bg-gray-800/30',
    border: 'border border-gray-500/50',
    headerBg: 'bg-gradient-to-r from-gray-700/80 to-gray-700/60',
    headerHover: 'hover:from-gray-700 hover:to-gray-600/80',
    headerBorder: 'border-b border-gray-600/50',
    contentBg: 'bg-gray-800/20',
  },

  // Colors - Buttons
  button: {
    primary: {
      bg: 'bg-purple-600',
      hover: 'hover:bg-purple-700',
      text: 'text-white',
      focus: 'focus:ring-2 focus:ring-purple-500/70 focus:ring-offset-2 focus:ring-offset-gray-900',
    },
    secondary: {
      bg: 'bg-gray-700/80',
      hover: 'hover:bg-gray-600/80',
      text: 'text-gray-200',
      focus: 'focus:ring-2 focus:ring-gray-500/70 focus:ring-offset-2 focus:ring-offset-gray-900',
    },
    danger: {
      bg: 'bg-red-600',
      hover: 'hover:bg-red-700',
      text: 'text-white',
    },
  },

  // Colors - Messages
  message: {
    error: {
      bg: 'bg-red-950/80',
      border: 'border-2 border-red-600/70',
      text: 'text-red-100',
    },
    success: {
      bg: 'bg-green-950/80',
      border: 'border-2 border-green-600/70',
      text: 'text-green-100',
    },
    warning: {
      bg: 'bg-yellow-950/80',
      border: 'border-2 border-yellow-600/70',
      text: 'text-yellow-100',
    },
  },

  // Section Color Accents
  sectionAccents: {
    'core-identity': {
      border: 'border-blue-500/50',
      from: 'from-blue-700/80',
      to: 'to-blue-600/60',
      hoverFrom: 'hover:from-blue-700',
      hoverTo: 'hover:to-blue-600/80',
    },
    'visual-identity': {
      border: 'border-purple-500/50',
      from: 'from-purple-700/80',
      to: 'to-purple-600/60',
      hoverFrom: 'hover:from-purple-700',
      hoverTo: 'hover:to-purple-600/80',
    },
    'basic-information': {
      border: 'border-green-500/50',
      from: 'from-green-700/80',
      to: 'to-green-600/60',
      hoverFrom: 'hover:from-green-700',
      hoverTo: 'hover:to-green-600/80',
    },
    overview: {
      border: 'border-teal-500/50',
      from: 'from-teal-700/80',
      to: 'to-teal-600/60',
      hoverFrom: 'hover:from-teal-700',
      hoverTo: 'hover:to-teal-600/80',
    },
    appearance: {
      border: 'border-pink-500/50',
      from: 'from-pink-700/80',
      to: 'to-pink-600/60',
      hoverFrom: 'hover:from-pink-700',
      hoverTo: 'hover:to-pink-600/80',
    },
    relationships: {
      border: 'border-orange-500/50',
      from: 'from-orange-700/80',
      to: 'to-orange-600/60',
      hoverFrom: 'hover:from-orange-700',
      hoverTo: 'hover:to-orange-600/80',
    },
    'personality-traits': {
      border: 'border-indigo-500/50',
      from: 'from-indigo-700/80',
      to: 'to-indigo-600/60',
      hoverFrom: 'hover:from-indigo-700',
      hoverTo: 'hover:to-indigo-600/80',
    },
    content: {
      border: 'border-cyan-500/50',
      from: 'from-cyan-700/80',
      to: 'to-cyan-600/60',
      hoverFrom: 'hover:from-cyan-700',
      hoverTo: 'hover:to-cyan-600/80',
    },
    metadata: {
      border: 'border-gray-500/50',
      from: 'from-gray-700/80',
      to: 'to-gray-600/60',
      hoverFrom: 'hover:from-gray-700',
      hoverTo: 'hover:to-gray-600/80',
    },
    settings: {
      border: 'border-yellow-500/50',
      from: 'from-yellow-700/80',
      to: 'to-yellow-600/60',
      hoverFrom: 'hover:from-yellow-700',
      hoverTo: 'hover:to-yellow-600/80',
    },
    timeline: {
      border: 'border-blue-500/50',
      from: 'from-blue-700/80',
      to: 'to-blue-600/60',
      hoverFrom: 'hover:from-blue-700',
      hoverTo: 'hover:to-blue-600/80',
    },
    lore: {
      border: 'border-fuchsia-500/50',
      from: 'from-fuchsia-700/80',
      to: 'to-fuchsia-600/60',
      hoverFrom: 'hover:from-fuchsia-700',
      hoverTo: 'hover:to-fuchsia-600/80',
    },
    location: {
      border: 'border-lime-500/50',
      from: 'from-lime-700/80',
      to: 'to-lime-600/60',
      hoverFrom: 'hover:from-lime-700',
      hoverTo: 'hover:to-lime-600/80',
    },
    'society-culture': {
      border: 'border-emerald-500/50',
      from: 'from-emerald-700/80',
      to: 'to-emerald-600/60',
      hoverFrom: 'hover:from-emerald-700',
      hoverTo: 'hover:to-emerald-600/80',
    },
    'world-building': {
      border: 'border-violet-500/50',
      from: 'from-violet-700/80',
      to: 'to-violet-600/60',
      hoverFrom: 'hover:from-violet-700',
      hoverTo: 'hover:to-violet-600/80',
    },
    'economy-systems': {
      border: 'border-amber-500/50',
      from: 'from-amber-700/80',
      to: 'to-amber-600/60',
      hoverFrom: 'hover:from-amber-700',
      hoverTo: 'hover:to-amber-600/80',
    },
    'additional-information': {
      border: 'border-indigo-500/50',
      from: 'from-indigo-700/80',
      to: 'to-indigo-600/60',
      hoverFrom: 'hover:from-indigo-700',
      hoverTo: 'hover:to-indigo-600/80',
    },
    'media-preferences': {
      border: 'border-rose-500/50',
      from: 'from-rose-700/80',
      to: 'to-rose-600/60',
      hoverFrom: 'hover:from-rose-700',
      hoverTo: 'hover:to-rose-600/80',
    },
    'identity-background': {
      border: 'border-sky-500/50',
      from: 'from-sky-700/80',
      to: 'to-sky-600/60',
      hoverFrom: 'hover:from-sky-700',
      hoverTo: 'hover:to-sky-600/80',
    },
    'personality-overview': {
      border: 'border-pink-500/50',
      from: 'from-pink-700/80',
      to: 'to-pink-600/60',
      hoverFrom: 'hover:from-pink-700',
      hoverTo: 'hover:to-pink-600/80',
    },
    'personality-metrics': {
      border: 'border-teal-500/50',
      from: 'from-teal-700/80',
      to: 'to-teal-600/60',
      hoverFrom: 'hover:from-teal-700',
      hoverTo: 'hover:to-teal-600/80',
    },
    abilities: {
      border: 'border-purple-500/50',
      from: 'from-purple-700/80',
      to: 'to-purple-600/60',
      hoverFrom: 'hover:from-purple-700',
      hoverTo: 'hover:to-purple-600/80',
    },
    stats: {
      border: 'border-amber-500/50',
      from: 'from-amber-700/80',
      to: 'to-amber-600/60',
      hoverFrom: 'hover:from-amber-700',
      hoverTo: 'hover:to-amber-600/80',
    },
    history: {
      border: 'border-amber-500/50',
      from: 'from-amber-700/80',
      to: 'to-amber-600/60',
      hoverFrom: 'hover:from-amber-700',
      hoverTo: 'hover:to-amber-600/80',
    },
    'preferences-habits': {
      border: 'border-red-500/50',
      from: 'from-red-700/80',
      to: 'to-red-600/60',
      hoverFrom: 'hover:from-red-700',
      hoverTo: 'hover:to-red-600/80',
    },
    media: {
      border: 'border-fuchsia-500/50',
      from: 'from-fuchsia-700/80',
      to: 'to-fuchsia-600/60',
      hoverFrom: 'hover:from-fuchsia-700',
      hoverTo: 'hover:to-fuchsia-600/80',
    },
    trivia: {
      border: 'border-lime-500/50',
      from: 'from-lime-700/80',
      to: 'to-lime-600/60',
      hoverFrom: 'hover:from-lime-700',
      hoverTo: 'hover:to-lime-600/80',
    },
    development: {
      border: 'border-emerald-500/50',
      from: 'from-emerald-700/80',
      to: 'to-emerald-600/60',
      hoverFrom: 'hover:from-emerald-700',
      hoverTo: 'hover:to-emerald-600/80',
    },
    'story-aliases': {
      border: 'border-violet-500/50',
      from: 'from-violet-700/80',
      to: 'to-violet-600/60',
      hoverFrom: 'hover:from-violet-700',
      hoverTo: 'hover:to-violet-600/80',
    },
  },
} as const;

/**
 * Get section accent colors by section name
 */
export function getSectionAccent(sectionName: string) {
  const accentKey = sectionName.toLowerCase().replace(/\s+/g, '-') as keyof typeof formStyles.sectionAccents;
  // Check if key exists, otherwise fall back to metadata
  if (accentKey in formStyles.sectionAccents) {
    return formStyles.sectionAccents[accentKey];
  }
  // Fallback to metadata if key doesn't exist
  return formStyles.sectionAccents.metadata;
}

