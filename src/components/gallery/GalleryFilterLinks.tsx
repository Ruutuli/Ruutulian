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
          {characters.map((c) => (
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
