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

  if (!nsfw) {
    return <div className={className}>{children}</div>;
  }

  const hidden = !revealed;

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        className={
          hidden
            ? 'blur-2xl scale-105 select-none pointer-events-none brightness-75'
            : undefined
        }
        aria-hidden={hidden}
      >
        {children}
      </div>
      {hidden ? (
        <button
          type="button"
          onClick={handleReveal}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-950/85 backdrop-blur-sm border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 focus-visible:ring-inset"
          aria-label="Show NSFW content"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
            <i className="fas fa-eye-slash text-[10px]" aria-hidden />
            NSFW
          </span>
          <span className="text-sm text-gray-300 px-4 text-center">Click to show</span>
        </button>
      ) : null}
    </div>
  );
}
