'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Fanfic } from '@/types/oc';

interface Chapter {
  chapter_number: number;
  title: string | null;
}

interface ChapterNavigationProps {
  fanfic: Pick<Fanfic, 'id' | 'title' | 'slug'>;
  currentChapterNumber: number;
  allChapters: Chapter[];
  previousChapter: number | null;
  nextChapter: number | null;
}

export function ChapterNavigation({
  fanfic,
  currentChapterNumber,
  allChapters,
  previousChapter,
  nextChapter,
}: ChapterNavigationProps) {
  const router = useRouter();

  const handleChapterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chapterNum = parseInt(e.target.value, 10);
    if (!isNaN(chapterNum)) {
      router.push(`/fanfics/${fanfic.slug}/chapters/${chapterNum}`);
    }
  };

  return (
    <div className="wiki-card p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Chapter Button */}
        <div className="flex-1">
          {previousChapter ? (
            <Link
              href={`/fanfics/${fanfic.slug}/chapters/${previousChapter}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors w-full sm:w-auto justify-center sm:justify-start"
            >
              <i className="fas fa-chevron-left"></i>
              <span>Previous Chapter</span>
            </Link>
          ) : (
            <div className="px-4 py-2 text-gray-500 text-center sm:text-left cursor-not-allowed">
              No Previous Chapter
            </div>
          )}
        </div>

        {/* Chapter Selector Dropdown */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <label htmlFor="chapter-select" className="text-sm text-gray-400 whitespace-nowrap">
            Chapter:
          </label>
          <select
            id="chapter-select"
            value={currentChapterNumber}
            onChange={handleChapterSelect}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 sm:flex-initial min-w-[150px]"
          >
            {allChapters.map((chapter) => (
              <option key={chapter.chapter_number} value={chapter.chapter_number}>
                {chapter.chapter_number}
                {chapter.title ? ` - ${chapter.title}` : ''}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400 whitespace-nowrap">
            of {allChapters.length}
          </span>
        </div>

        {/* Next Chapter Button */}
        <div className="flex-1 flex justify-end">
          {nextChapter ? (
            <Link
              href={`/fanfics/${fanfic.slug}/chapters/${nextChapter}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors w-full sm:w-auto justify-center sm:justify-end"
            >
              <span>Next Chapter</span>
              <i className="fas fa-chevron-right"></i>
            </Link>
          ) : (
            <div className="px-4 py-2 text-gray-500 text-center sm:text-right cursor-not-allowed w-full sm:w-auto">
              No Next Chapter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

