'use client';

import { useMemo, useState } from 'react';
import type { BrainstormCategory } from '@/lib/brainstorm/load-options';

interface BrainstormResourcesProps {
  categories: BrainstormCategory[];
}

export function BrainstormResources({ categories }: BrainstormResourcesProps) {
  const [selectedKey, setSelectedKey] = useState<string>(categories[0]?.key ?? '');
  const [search, setSearch] = useState('');

  const selectedCategory = categories.find((category) => category.key === selectedKey) ?? categories[0];

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return [];

    const query = search.trim().toLowerCase();
    if (!query) return selectedCategory.items;

    return selectedCategory.items.filter((item) => item.toLowerCase().includes(query));
  }, [selectedCategory, search]);

  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="wiki-card p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${selectedCategory?.label.toLowerCase() ?? 'options'}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/80 border border-gray-600 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <p className="text-sm text-gray-400 whitespace-nowrap">
            {filteredItems.length} of {selectedCategory?.items.length ?? 0} in category
            <span className="hidden sm:inline"> · {totalItems} total</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 shrink-0">
          <div className="wiki-card p-3 lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide px-2 mb-3">
              Categories
            </h2>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
              {categories.map((category) => {
                const isActive = category.key === selectedKey;

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(category.key);
                      setSearch('');
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left whitespace-nowrap transition-colors shrink-0 lg:shrink lg:w-full ${
                      isActive
                        ? 'bg-purple-500/20 text-gray-100 border border-purple-500/40'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
                    }`}
                  >
                    <i className={`${category.icon} ${category.iconColor} w-4 text-center`}></i>
                    <span className="text-sm font-medium flex-1">{category.label}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{category.items.length}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="wiki-card p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              {selectedCategory && (
                <>
                  <div className="p-2.5 bg-gray-800 rounded-xl">
                    <i className={`${selectedCategory.icon} ${selectedCategory.iconColor} text-xl`}></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-100">{selectedCategory.label}</h2>
                    <p className="text-sm text-gray-400">
                      Browse ideas for {selectedCategory.label.toLowerCase()}
                    </p>
                  </div>
                </>
              )}
            </div>

            {filteredItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 bg-gray-800/80 border border-gray-700/80 rounded-lg text-sm text-gray-200 hover:border-purple-500/50 hover:bg-gray-800 transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-search text-3xl mb-3 opacity-50"></i>
                <p>No matches for &ldquo;{search}&rdquo;</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
