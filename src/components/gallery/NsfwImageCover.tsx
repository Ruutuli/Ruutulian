'use client';

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';

interface NsfwImageCoverProps {
  nsfw: boolean;
  children: ReactNode;
  className?: string;
  /** Reset reveal when the image identity changes (e.g. lightbox navigation). */
  resetKey?: string | number;
}

export function NsfwImageCover({ nsfw, children, className, resetKey }: NsfwImageCoverProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [resetKey]);

  const handleReveal = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRevealed(true);
  }, []);

  if (!nsfw || revealed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative min-h-0 min-w-0 overflow-hidden ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleReveal}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-950 border-0 cursor-pointer px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 focus-visible:ring-inset"
        aria-label="Confirm you want to view NSFW content"
      >
        <span className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
          <i className="fas fa-eye-slash text-[10px]" aria-hidden />
          NSFW
        </span>
        <p className="text-sm text-gray-300 text-center max-w-[16rem] leading-snug">
          This artwork is marked sensitive. Only continue if you&apos;re okay viewing it.
        </p>
        <span className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-500">
          I&apos;m OK to view this
        </span>
      </button>
    </div>
  );
}
