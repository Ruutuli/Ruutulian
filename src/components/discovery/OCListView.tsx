'use client';

import { useState } from 'react';
import type { OC } from '@/types/oc';
import { OCCard } from '@/components/oc/OCCard';
import { GalleryView } from './GalleryView';
import { ViewToggle } from './ViewToggle';

interface OCListViewProps {
  ocs: OC[];
}

export function OCListView({ ocs }: OCListViewProps) {
  const [view, setView] = useState<'list' | 'gallery'>('list');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          {ocs.length} character{ocs.length !== 1 ? 's' : ''} found
        </p>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {ocs.map((oc) => (
            <OCCard key={oc.id} oc={oc} />
          ))}
        </div>
      ) : (
        <GalleryView ocs={ocs} />
      )}
    </div>
  );
}


