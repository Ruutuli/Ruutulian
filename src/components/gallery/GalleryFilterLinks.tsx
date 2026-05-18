/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useMemo, useState } from 'react';
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
}

export function GalleryFilterLinks({
  tags,
  characters,
  activeTag,
  activeCharacter,
}: GalleryFilterLinksProps) {
  const [characterSearch, setCharacterSearch] = useState('');

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
    // If the user typed a filename, strip extension-ish parts and replace separators.
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

      // Substring match gets a strong score (covers "filename contains character name" cases).
      if (cand.includes(q)) return { c, score: 1 };
      if (q.includes(cand) && cand.length >= Math.max(3, q.length - 3)) return { c, score: 0.75 };

      const dist = levenshteinDistance(q, cand);
      const maxLen = Math.max(q.length, cand.length) || 1;
      const similarity = 1 - dist / maxLen; // 0..1
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
      const initialTop = characters.slice(0, 18);
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
        const similarity = 1 - dist / maxLen; // 0..1
        return { c, score: similarity };
      })
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));

    const top = scored
      .filter((s) => s.score >= 0.35)
      .slice(0, 18)
      .map((s) => s.c);

    // Keep the currently active selection visible even if it's not in the top matches.
    if (activeCharacter) {
      const active = characters.find((c) => c.slug === activeCharacter);
      if (active && !top.some((c) => c.slug === active.slug)) {
        top.unshift(active);
      }
    }

    return top;
  }, [activeCharacter, characters, levenshteinDistance, normalizedCharacterName, normalizedSearch]);

  return (
    <div className="wiki-card p-4 mb-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-400 mr-2">Tags:</span>
        <Link
          href={buildHref({ tag: '', character: activeCharacter })}
          className={`text-xs px-2 py-1 rounded border ${
            !activeTag
              ? 'border-purple-500 text-purple-200 bg-purple-950/40'
              : 'border-gray-600 text-gray-300 hover:border-gray-500'
          }`}
        >
          All
        </Link>
        {tags.map((t) => (
          <Link
            key={t}
            href={buildHref({ tag: t, character: activeCharacter })}
            className={`text-xs px-2 py-1 rounded border ${
              activeTag === t
                ? 'border-purple-500 text-purple-200 bg-purple-950/40'
                : 'border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {characters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400 mr-2">Characters:</span>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="gallery-character-search">
              Search characters
            </label>
            <input
              id="gallery-character-search"
              type="search"
              inputMode="search"
              value={characterSearch}
              placeholder="Type to search..."
              onChange={(e) => setCharacterSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (!bestSuggestion) return;
                e.preventDefault();
                window.location.href = buildHref({ character: bestSuggestion.slug, tag: activeTag });
              }}
              className="text-xs px-2 py-1 rounded border border-gray-600 bg-gray-900 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 w-[12rem]"
            />
          </div>
          <Link
            href={buildHref({ character: '', tag: activeTag })}
            className={`text-xs px-2 py-1 rounded border ${
              !activeCharacter
                ? 'border-pink-500 text-pink-200 bg-pink-950/30'
                : 'border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            All
          </Link>
          {shouldSuggest ? (
            <Link
              href={buildHref({ character: bestSuggestion!.slug, tag: activeTag })}
              className="text-xs text-pink-200 hover:text-purple-200 underline"
              aria-label={`Is this ${bestSuggestion!.name}?`}
            >
              Is this {bestSuggestion!.name}?
            </Link>
          ) : null}
          {filteredCharacters.map((c) => (
            <Link
              key={c.slug}
              href={buildHref({ character: c.slug, tag: activeTag })}
              className={`text-xs px-2 py-1 rounded border ${
                activeCharacter === c.slug
                  ? 'border-pink-500 text-pink-200 bg-pink-950/30'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {hasFilters ? (
        <div>
          <Link href="/gallery" className="text-xs text-purple-400 hover:text-pink-400 underline">
            Clear filters
          </Link>
        </div>
      ) : null}
    </div>
  );
}
