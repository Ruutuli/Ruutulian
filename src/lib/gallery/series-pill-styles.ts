const FALLBACK_PALETTE: { primary: string; accent: string }[] = [
  { primary: '#7c3aed', accent: '#c4b5fd' },
  { primary: '#db2777', accent: '#f9a8d4' },
  { primary: '#0891b2', accent: '#67e8f9' },
  { primary: '#059669', accent: '#6ee7b7' },
  { primary: '#d97706', accent: '#fcd34d' },
  { primary: '#4f46e5', accent: '#a5b4fc' },
  { primary: '#e11d48', accent: '#fda4af' },
  { primary: '#0d9488', accent: '#5eead4' },
];

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(100, 116, 139, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function resolveColors(seriesKey: string, primary?: string | null, accent?: string | null) {
  const p = primary?.trim();
  const a = accent?.trim();
  if (p && a && hexToRgb(p) && hexToRgb(a)) {
    return { primary: p, accent: a };
  }
  return FALLBACK_PALETTE[hashKey(seriesKey) % FALLBACK_PALETTE.length];
}

export type SeriesPillStyle = {
  borderColor: string;
  backgroundColor: string;
  nameColor: string;
  seriesColor: string;
  countColor: string;
  activeRing?: string;
};

export function getSeriesPillStyle(
  seriesKey: string,
  options?: { primary?: string | null; accent?: string | null; active?: boolean }
): SeriesPillStyle {
  const { primary, accent } = resolveColors(seriesKey, options?.primary, options?.accent);
  const active = options?.active ?? false;

  return {
    borderColor: active ? primary : rgba(primary, 0.55),
    backgroundColor: active ? rgba(primary, 0.28) : rgba(primary, 0.12),
    nameColor: active ? '#f8fafc' : '#e2e8f0',
    seriesColor: active ? accent : rgba(accent, 0.92),
    countColor: active ? rgba(accent, 0.95) : 'rgba(148, 163, 184, 0.9)',
    activeRing: active ? `0 0 0 1px ${rgba(primary, 0.45)}` : undefined,
  };
}
