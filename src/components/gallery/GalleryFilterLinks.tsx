/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';

interface CharacterOpt {
  slug: string;
  name: string;
}

interface GalleryFilterLinksProps {
  tags: string[];
  characters: CharacterOpt[];
  activeTag: string;
  activeCharacter: string;
  className?: string;
}

function FilterPill({
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
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? activeClass
          : 'border-gray-600/80 text-gray-300 bg-gray-900/40 hover:border-gray-500 hover:text-gray-100'
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
      .replace(/[^\w\s]/g, ' ')
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

  const normalizedCharacterName = (c: CharacterOpt) =>
    c.name
      .replace(/[_-]+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

  const suggestions = useMemo(() => {
    const q = normalizedSearch;
    if (!q || q.length < 2) return [];

    const scored = characters.map((c) => {
      const cand = normalizedCharacterName(c);
      if (!cand) return { c, score: 0 };
      if (cand.includes(q)) return { c, score: 1 };
      if (q.includes(cand) && cand.length >= Math.max(3, q.length - 3)) return { c, score: 0.75 };
      const dist = levenshteinDistance(q, cand);
      const maxLen = Math.max(q.length, cand.length) || 1;
      const similarity = 1 - dist / maxLen;
      return { c, score: similarity };
    });

    scored.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
    return scored.filter((s) => s.score >= 0.35).slice(0, 3);
  }, [characters, normalizedSearch]);

  const bestSuggestion = suggestions[0]?.c;
  const shouldSuggest = Boolean(bestSuggestion) && bestSuggestion!.slug !== activeCharacter;

  const filteredCharacters = useMemo(() => {
    const q = normalizedSearch;
    if (!q) {
      const initialTop = characters.slice(0, 24);
      if (activeCharacter) {
        const active = characters.find((c) => c.slug === activeCharacter);
        if (active && !initialTop.some((c) => c.slug === active.slug)) {
          return [active, ...initialTop];
        }
      }
      return initialTop;
    }

    const scored = characters
      .map((c) => {
        const cand = normalizedCharacterName(c);
        if (!cand) return { c, score: 0 };
        if (cand.includes(q)) return { c, score: 1 };
        if (q.includes(cand) && cand.length >= Math.max(3, q.length - 3)) return { c, score: 0.75 };
        const dist = levenshteinDistance(q, cand);
        const maxLen = Math.max(q.length, cand.length) || 1;
        const similarity = 1 - dist / maxLen;
        return { c, score: similarity };
      })
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));

    const top = scored
      .filter((s) => s.score >= 0.35)
      .slice(0, 24)
      .map((s) => s.c);

    if (activeCharacter) {
      const active = characters.find((c) => c.slug === activeCharacter);
      if (active && !top.some((c) => c.slug === active.slug)) {
        top.unshift(active);
      }
    }

    return top;
  }, [activeCharacter, characters, levenshteinDistance, normalizedCharacterName, normalizedSearch]);

  const tagActiveClass = 'border-purple-500/70 text-purple-100 bg-purple-950/50 shadow-sm shadow-purple-950/40';
  const charActiveClass = 'border-pink-500/70 text-pink-100 bg-pink-950/40 shadow-sm shadow-pink-950/30';

  return (
    <aside className={`wiki-card p-4 lg:p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/50 pb-3">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <i className="fas fa-filter text-purple-400 text-xs" aria-hidden />
          Filters
        </h2>
        {hasFilters ? (
          <Link
            href="/gallery"
            className="text-xs text-purple-400 hover:text-pink-300 transition-colors whitespace-nowrap"
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
            className="flex w-full items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 hover:text-gray-300"
            aria-expanded={tagsExpanded}
          >
            <span>Tags</span>
            <i className={`fas fa-chevron-${tagsExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {tagsExpanded ? (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
              <FilterPill
                href={buildHref({ tag: '', character: activeCharacter })}
                active={!activeTag}
                activeClass={tagActiveClass}
              >
                All
              </FilterPill>
              {tags.map((t) => (
                <FilterPill
                  key={t}
                  href={buildHref({ tag: t, character: activeCharacter })}
                  active={activeTag === t}
                  activeClass={tagActiveClass}
                >
                  {t}
                </FilterPill>
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
            className="flex w-full items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 hover:text-gray-300"
            aria-expanded={charactersExpanded}
          >
            <span>Characters</span>
            <i className={`fas fa-chevron-${charactersExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {charactersExpanded ? (
            <div className="space-y-2">
              <label className="sr-only" htmlFor="gallery-character-search">
                Search characters
              </label>
              <div className="relative">
                <i
                  className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none"
                  aria-hidden
                />
                <input
                  id="gallery-character-search"
                  type="search"
                  inputMode="search"
                  value={characterSearch}
                  placeholder="Search characters…"
                  onChange={(e) => setCharacterSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (!bestSuggestion) return;
                    e.preventDefault();
                    window.location.href = buildHref({ character: bestSuggestion.slug, tag: activeTag });
                  }}
                  className="w-full text-xs pl-7 pr-2 py-2 rounded-lg border border-gray-600/80 bg-gray-900/60 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/80 focus:border-pink-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                <FilterPill
                  href={buildHref({ character: '', tag: activeTag })}
                  active={!activeCharacter}
                  activeClass={charActiveClass}
                >
                  All
                </FilterPill>
                {shouldSuggest ? (
                  <Link
                    href={buildHref({ character: bestSuggestion!.slug, tag: activeTag })}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-pink-500/50 text-pink-200 bg-pink-950/20 hover:bg-pink-950/40 transition-colors"
                    aria-label={`Is this ${bestSuggestion!.name}?`}
                  >
                    {bestSuggestion!.name}?
                  </Link>
                ) : null}
                {filteredCharacters.map((c) => (
                  <FilterPill
                    key={c.slug}
                    href={buildHref({ character: c.slug, tag: activeTag })}
                    active={activeCharacter === c.slug}
                    activeClass={charActiveClass}
                  >
                    {c.name}
                  </FilterPill>
                ))}
              </div>
              {normalizedSearch && filteredCharacters.length === 0 ? (
                <p className="text-xs text-gray-500">No characters match that search.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
