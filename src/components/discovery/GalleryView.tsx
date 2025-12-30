'use client';

import { useState } from 'react';
import type { OC } from '@/types/oc';
import { OCCard } from '@/components/oc/OCCard';

interface GalleryViewProps {
  ocs: OC[];
  className?: string;
}

export function GalleryView({ ocs, className = '' }: GalleryViewProps) {
  const [selectedOC, setSelectedOC] = useState<OC | null>(null);

  if (ocs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No characters found.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {ocs.map((oc) => (
          <div key={oc.id} className="transform transition-transform hover:scale-105">
            <OCCard oc={oc} />
          </div>
        ))}
      </div>
    </div>
  );
}


