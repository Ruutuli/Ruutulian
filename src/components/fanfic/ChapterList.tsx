'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string | null;
  content: string | null;
  word_count: number | null;
  image_url: string | null;
}

interface ChapterListProps {
  chapters: Chapter[];
  fanficSlug: string;
}

const ITEMS_PER_PAGE = 20;
const COMPACT_ITEMS_PER_PAGE = 50;

export function ChapterList({ chapters, fanficSlug }: ChapterListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chapters based on search
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const query = searchQuery.toLowerCase();
    return chapters.filter(ch => 
      ch.title?.toLowerCase().includes(query) ||
      ch.chapter_number.toString().includes(query) ||
      ch.content?.toLowerCase().includes(query)
    );
  }, [chapters, searchQuery]);

  // Pagination
  const itemsPerPage = viewMode === 'compact' ? COMPACT_ITEMS_PER_PAGE : ITEMS_PER_PAGE;
  const totalPages = Math.ceil(filteredChapters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChapters = filteredChapters.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of chapter list
    document.getElementById('chapter-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (viewMode === 'compact') {
    return (
      <div id="chapter-list" className="wiki-card p-8 rounded-xl">
        {/* Header */}
        <div className="mb-6 pb-4 border-b-2 border-purple-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-100">
              <i className="fas fa-list mr-3 text-purple-400"></i>
              Chapters ({filteredChapters.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
              >
                <i className="fas fa-th mr-2"></i>
                Grid View
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search chapters by title, number, or content..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Compact Chapter List */}
        <div className="space-y-2">
          {paginatedChapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/fanfics/${fanficSlug}/chapters/${chapter.chapter_number}`}
              className="block group"
            >
              <div className="flex items-center gap-4 p-3 bg-gray-800/30 hover:bg-gray-800/60 rounded-lg border border-gray-700/30 hover:border-purple-500/50 transition-all">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-600/20 text-purple-300 text-sm font-bold border border-purple-500/50">
                  {chapter.chapter_number}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-100 group-hover:text-purple-300 transition-colors truncate">
                    {chapter.title || `Chapter ${chapter.chapter_number}`}
                  </h3>
                </div>
                {chapter.word_count && (
                  <span className="flex-shrink-0 text-xs text-gray-500">
                    {chapter.word_count.toLocaleString()} words
                  </span>
                )}
                <i className="fas fa-chevron-right text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0"></i>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredChapters.length)} of {filteredChapters.length} chapters
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                >
                  <i className="fas fa-chevron-left mr-1"></i>
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'text-gray-300 bg-gray-700/50 hover:bg-gray-700 border-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
                >
                  Next
                  <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="chapter-list" className="wiki-card p-8 rounded-xl">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-100">
            <i className="fas fa-list mr-3 text-purple-400"></i>
            Chapters ({filteredChapters.length})
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('compact')}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
            >
              <i className="fas fa-list mr-2"></i>
              Compact View
            </button>
          </div>
        </div>
        
        {/* Search */}
        {chapters.length > 10 && (
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search chapters by title, number, or content..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        )}
      </div>

      {/* Grid Chapter List */}
      <div className="grid gap-4 md:grid-cols-2">
        {paginatedChapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/fanfics/${fanficSlug}/chapters/${chapter.chapter_number}`}
            className="group"
          >
            <div className="relative h-full p-5 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg border border-gray-700/50 hover:border-purple-500/70 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1">
              {/* Chapter Image Thumbnail */}
              {chapter.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden aspect-video">
                  <img
                    src={chapter.image_url}
                    alt={chapter.title || `Chapter ${chapter.chapter_number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/50">
                      {chapter.chapter_number}
                    </span>
                    {chapter.word_count && (
                      <span className="text-xs text-gray-500">
                        {chapter.word_count.toLocaleString()} words
                      </span>
                    )}
                  </div>
                  {chapter.title ? (
                    <h3 className="text-lg font-semibold text-gray-100 mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
                      {chapter.title}
                    </h3>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-100 mb-2 group-hover:text-purple-300 transition-colors">
                      Chapter {chapter.chapter_number}
                    </h3>
                  )}
                  {chapter.content && (
                    <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                      {chapter.content.replace(/[#*`]/g, '').substring(0, 120)}
                      {chapter.content.length > 120 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 pt-1">
                  <i className="fas fa-chevron-right text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"></i>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredChapters.length)} of {filteredChapters.length} chapters
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
              >
                <i className="fas fa-chevron-left mr-1"></i>
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'text-gray-300 bg-gray-700/50 hover:bg-gray-700 border-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600"
              >
                Next
                <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

