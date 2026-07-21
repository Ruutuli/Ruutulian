type WorldThemeSource =
  | { primary_color?: string | null; accent_color?: string | null }
  | null
  | undefined;

export function getWorldTheme(world: WorldThemeSource) {
  if (!world) {
    return {
      primary: '#64748b',
      accent: '#94a3b8',
    };
  }

  return {
    primary: world.primary_color || '#64748b',
    accent: world.accent_color || '#94a3b8',
  };
}

export function applyWorldThemeStyles(world: WorldThemeSource) {
  const theme = getWorldTheme(world);
  return {
    '--world-primary': theme.primary,
    '--world-accent': theme.accent,
  } as React.CSSProperties;
}
