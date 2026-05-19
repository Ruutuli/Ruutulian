/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';

interface CharacterOpt {
  slug: string;
  name: string;
  count: number;
}

function characterFilterAriaLabel(c: CharacterOpt): string {
  return `${c.name} (${c.count})`;
}

function CharacterFilterLabel({ name, count, active }: { name: string; count: number; active?: boolean }) {
  return (
    <>
      <span className="truncate max-w-[10.5rem] sm:max-w-[12rem]">{name}</span>
      <span
        className={`tabular-nums shrink-0 ${active ? 'text-pink-300/75' : 'text-gray-500 font-normal'}`}
        aria-hidden
      >
        ({count})
      </span>
    </>
  );
}

interface GalleryFilterLinksProps {
  tags: string[];
  characters: CharacterOpt[];
  activeTag: string;
  activeCharacter: string;
  className?: string;
}

const pillInactiveClass =
  'border-gray-600/70 text-gray-200 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-800/60 hover:text-gray-50';

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
      className={`inline-flex items-center gap-1 text-xs font-medium leading-snug px-3 py-1.5 rounded-full border transition-colors ${
        active ? activeClass : pillInactiveClass
      }`}
    >
      {children}
    </Link>
  );
}

function FilterPillList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-gray-700/45 bg-gray-950/35 p-2.5 flex flex-wrap gap-2 overflow-y-auto scrollbar-thin ${className}`}
    >
      {children}
    </div>
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
      return characters;
    }

    return characters
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
      .filter((s) => s.score >= 0.35)
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
      .map((s) => s.c);
  }, [characters, levenshteinDistance, normalizedCharacterName, normalizedSearch]);

  const tagActiveClass = 'border-purple-500/70 text-purple-100 bg-purple-950/50 shadow-sm shadow-purple-950/40';
  const charActiveClass = 'border-pink-500/70 text-pink-100 bg-pink-950/40 shadow-sm shadow-pink-950/30';

  return (
    <aside className={`wiki-card p-4 lg:p-5 space-y-5 ${className}`}>
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
            className="flex w-full items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5 py-0.5 hover:text-gray-300"
            aria-expanded={tagsExpanded}
          >
            <span>Tags</span>
            <i className={`fas fa-chevron-${tagsExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {tagsExpanded ? (
            <FilterPillList className="max-h-40">
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
            </FilterPillList>
          ) : null}
        </section>
      ) : null}

      {characters.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setCharactersExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5 py-0.5 hover:text-gray-300"
            aria-expanded={charactersExpanded}
          >
            <span>Characters</span>
            <i className={`fas fa-chevron-${charactersExpanded ? 'up' : 'down'} text-[10px]`} aria-hidden />
          </button>
          {charactersExpanded ? (
            <div className="space-y-2.5">
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
                  placeholder="Search characters…"
                  onChange={(e) => setCharacterSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (!bestSuggestion) return;
                    e.preventDefault();
                    window.location.href = buildHref({ character: bestSuggestion.slug, tag: activeTag });
                  }}
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg border border-gray-600 bg-gray-950/50 text-gray-100 placeholder:text-gray-500 shadow-inner shadow-black/20 focus:outline-none focus:ring-2 focus:ring-pink-500/60 focus:border-pink-500/40"
                />
              </div>
              <FilterPillList className="max-h-[min(32rem,60vh)]">
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
                    className="inline-flex items-center gap-1 text-xs font-medium leading-snug px-3 py-1.5 rounded-full border border-dashed border-pink-500/55 text-pink-200 bg-pink-950/25 hover:bg-pink-950/45 transition-colors"
                    aria-label={`Is this ${characterFilterAriaLabel(bestSuggestion!)}?`}
                  >
                    <CharacterFilterLabel
                      name={bestSuggestion!.name}
                      count={bestSuggestion!.count}
                      active
                    />
                    <span className="shrink-0 text-pink-300/90">?</span>
                  </Link>
                ) : null}
                {filteredCharacters.map((c) => (
                  <FilterPill
                    key={c.slug}
                    href={buildHref({ character: c.slug, tag: activeTag })}
                    active={activeCharacter === c.slug}
                    activeClass={charActiveClass}
                  >
                    <CharacterFilterLabel
                      name={c.name}
                      count={c.count}
                      active={activeCharacter === c.slug}
                    />
                  </FilterPill>
                ))}
              </FilterPillList>
              {normalizedSearch && filteredCharacters.length === 0 ? (
                <p className="text-xs text-gray-500 px-0.5">No characters match that search.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
