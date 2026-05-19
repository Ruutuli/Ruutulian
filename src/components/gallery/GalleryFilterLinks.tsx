'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { GalleryCharacterFacet } from '@/lib/gallery/get-public-facets';
import { getSeriesPillStyle } from '@/lib/gallery/series-pill-styles';

function characterFilterAriaLabel(c: GalleryCharacterFacet): string {
  const seriesPart = c.series ? `, ${c.series}` : '';
  return `${c.name}${seriesPart} (${c.count} artworks)`;
}

function seriesColorKey(c: GalleryCharacterFacet): string {
  return c.seriesSlug ?? c.series ?? c.slug;
}

function CharacterFilterPill({
  href,
  active,
  character,
  dashed,
}: {
  href: string;
  active: boolean;
  character: GalleryCharacterFacet;
  dashed?: boolean;
}) {
  const style = getSeriesPillStyle(seriesColorKey(character), {
    primary: character.primaryColor,
    accent: character.accentColor,
    active,
  });

  const pillStyle: CSSProperties = {
    borderColor: style.borderColor,
    backgroundColor: style.backgroundColor,
    boxShadow: style.activeRing,
  };

  return (
    <Link
      href={href}
      style={pillStyle}
      className={`group flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
        dashed ? 'border-dashed' : ''
      }`}
      aria-label={characterFilterAriaLabel(character)}
    >
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block truncate text-sm font-semibold" style={{ color: style.nameColor }}>
          {character.name}
        </span>
        {character.series ? (
          <span className="mt-0.5 block truncate text-xs">
            <span className="text-gray-500/90" aria-hidden>
              |
            </span>{' '}
            <span style={{ color: style.seriesColor }}>{character.series}</span>
          </span>
        ) : (
          <span className="mt-0.5 block truncate text-xs text-gray-500">No series</span>
        )}
      </span>
      <span
        className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums"
        style={{
          color: style.countColor,
          backgroundColor: active ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.25)',
        }}
        aria-hidden
      >
        {character.count}
      </span>
    </Link>
  );
}

interface GalleryFilterLinksProps {
  tags: string[];
  characters: GalleryCharacterFacet[];
  activeTag: string;
  activeCharacter: string;
  className?: string;
}

const tagInactiveClass =
  'border-gray-600/70 text-gray-200 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-800/60 hover:text-gray-50';

function TagFilterPill({
  href,
  active,
  activeClass,
  children,
}: {
  href: string;
  active: boolean;
  activeClass: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xs font-medium leading-snug px-3 py-1.5 rounded-full border transition-colors ${
        active ? activeClass : tagInactiveClass
      }`}
    >
      {children}
    </Link>
  );
}

export function GalleryFilterLinks({
  tags,
  characters,
  activeTag,
  activeCharacter,
  className = '',
}: GalleryFilterLinksProps) {
  const [characterSearch, setCharacterSearch] = useState('');
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [charactersExpanded, setCharactersExpanded] = useState(true);

  const buildHref = (next: { tag?: string; character?: string }) => {
    const params = new URLSearchParams();
    const tag = next.tag !== undefined ? next.tag : activeTag;
    const character = next.character !== undefined ? next.character : activeCharacter;
    if (tag) params.set('tag', tag);
    if (character) params.set('character', character);
    const q = params.toString();
    return q ? `/gallery?${q}` : '/gallery';
  };

  const hasFilters = Boolean(activeTag || activeCharacter);

  const normalizedSearch = useMemo(() => {
    const raw = characterSearch.trim();
    if (!raw) return '';
    return raw
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/[^\w\s|]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }, [characterSearch]);

  const levenshteinDistance = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const v0 = new Array(b.length + 1).fill(0);
    const v1 = new Array(b.length + 1).fill(0);

    for (let i = 0; i <= b.length; i++) v0[i] = i;

    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
    }
    return v1[b.length];
  };

  const normalizedCharacterHaystack = (c: GalleryCharacterFacet) =>
    [c.name, c.series ?? '']
      .join(' ')
      .replace(/[_-]+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

  const scoreCharacter = (c: GalleryCharacterFacet, q: string) => {
    const cand = normalizedCharacterHaystack(c);
    if (!cand) return 0;
    if (cand.includes(q)) return 1;
    if (q.includes(cand) && cand.length >= Math.max(3, q.length - 3)) return 0.75;
    const dist = levenshteinDistance(q, cand);
    const maxLen = Math.max(q.length, cand.length) || 1;
    return 1 - dist / maxLen;
  };

  const suggestions = useMemo(() => {
    const q = normalizedSearch;
    if (!q || q.length < 2) return [];

    const scored = characters
      .map((c) => ({ c, score: scoreCharacter(c, q) }))
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));

    return scored.filter((s) => s.score >= 0.35).slice(0, 3);
  }, [characters, normalizedSearch]);

  const bestSuggestion = suggestions[0]?.c;
  const shouldSuggest = Boolean(bestSuggestion) && bestSuggestion!.slug !== activeCharacter;

  const filteredCharacters = useMemo(() => {
    const q = normalizedSearch;
    if (!q) return characters;

    return characters
      .map((c) => ({ c, score: scoreCharacter(c, q) }))
      .filter((s) => s.score >= 0.35)
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
      .map((s) => s.c);
  }, [characters, normalizedSearch]);

  const tagActiveClass = 'border-purple-500/70 text-purple-100 bg-purple-950/50 shadow-sm shadow-purple-950/40';

  return (
    <aside
      className={`wiki-card border border-gray-700/60 bg-gradient-to-b from-gray-900/80 to-gray-950/90 p-4 lg:p-5 space-y-5 shadow-lg shadow-black/20 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/50 pb-3">
        <h2 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-950/60 border border-purple-500/30">
            <i className="fas fa-filter text-purple-400 text-xs" aria-hidden />
          </span>
          Filters
        </h2>
        {hasFilters ? (
          <Link
            href="/gallery"
            className="text-xs font-medium text-purple-400 hover:text-pink-300 transition-colors whitespace-nowrap px-2 py-1 rounded-md hover:bg-gray-800/60"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setTagsExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 py-1 hover:text-gray-200 transition-colors"
            aria-expanded={tagsExpanded}
          >
            <span>Tags</span>
            <i className={`fas fa-chevron-${tagsExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {tagsExpanded ? (
            <div className="rounded-xl border border-gray-700/50 bg-gray-950/40 p-2.5 flex flex-wrap gap-2 max-h-40 overflow-y-auto scrollbar-thin">
              <TagFilterPill
                href={buildHref({ tag: '', character: activeCharacter })}
                active={!activeTag}
                activeClass={tagActiveClass}
              >
                All
              </TagFilterPill>
              {tags.map((t) => (
                <TagFilterPill
                  key={t}
                  href={buildHref({ tag: t, character: activeCharacter })}
                  active={activeTag === t}
                  activeClass={tagActiveClass}
                >
                  {t}
                </TagFilterPill>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {characters.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setCharactersExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 py-1 hover:text-gray-200 transition-colors"
            aria-expanded={charactersExpanded}
          >
            <span>Characters</span>
            <i className={`fas fa-chevron-${charactersExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {charactersExpanded ? (
            <div className="space-y-3">
              <label className="sr-only" htmlFor="gallery-character-search">
                Search characters
              </label>
              <div className="relative">
                <i
                  className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none"
                  aria-hidden
                />
                <input
                  id="gallery-character-search"
                  type="search"
                  inputMode="search"
                  value={characterSearch}
                  placeholder="Search name or series…"
                  onChange={(e) => setCharacterSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (!bestSuggestion) return;
                    e.preventDefault();
                    window.location.href = buildHref({ character: bestSuggestion.slug, tag: activeTag });
                  }}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-600/80 bg-gray-950/70 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50"
                />
              </div>
              <div className="rounded-xl border border-gray-700/50 bg-gray-950/30 p-2 space-y-1.5 max-h-[min(32rem,60vh)] overflow-y-auto scrollbar-thin">
                <Link
                  href={buildHref({ character: '', tag: activeTag })}
                  className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    !activeCharacter
                      ? 'border-gray-500/70 bg-gray-800/80 text-gray-100'
                      : 'border-gray-700/60 bg-gray-900/40 text-gray-300 hover:border-gray-500/70 hover:bg-gray-800/50'
                  }`}
                >
                  All characters
                </Link>
                {shouldSuggest ? (
                  <div className="space-y-1">
                    <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-pink-300/80">
                      Did you mean?
                    </p>
                    <CharacterFilterPill
                      href={buildHref({ character: bestSuggestion!.slug, tag: activeTag })}
                      active={false}
                      character={bestSuggestion!}
                      dashed
                    />
                  </motion.div>
                ) : null}
                {filteredCharacters.map((c) => (
                  <CharacterFilterPill
                    key={c.slug}
                    href={buildHref({ character: c.slug, tag: activeTag })}
                    active={activeCharacter === c.slug}
                    character={c}
                  />
                ))}
              </div>
              {normalizedSearch && filteredCharacters.length === 0 ? (
                <p className="text-xs text-gray-500 px-1">No characters match that search.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
