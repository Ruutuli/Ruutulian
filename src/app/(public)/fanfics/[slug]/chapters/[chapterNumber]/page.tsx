import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { Markdown } from '@/lib/utils/markdown';
import { formatLastUpdated } from '@/lib/utils/dateFormat';
import { getSiteConfig } from '@/lib/config/site-config';
import { ChapterNavigation } from '@/components/fanfic/ChapterNavigation';
import type { Fanfic, FanficChapter } from '@/types/oc';
import {
  convertGoogleDriveUrl,
  getProxyUrl,
  shouldUseUnoptimizedImage,
} from '@/lib/utils/googleDriveImage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapterNumber: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = await createClient();

  const chapterNum = parseInt(resolvedParams.chapterNumber, 10);
  if (isNaN(chapterNum)) {
    return { title: 'Chapter Not Found' };
  }

  const { data: fanfic } = await supabase
    .from('fanfics')
    .select('id, title, slug')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (!fanfic) {
    return { title: 'Chapter Not Found' };
  }

  const { data: chapter } = await supabase
    .from('fanfic_chapters')
    .select('id, chapter_number, title, content')
    .eq('fanfic_id', fanfic.id)
    .eq('chapter_number', chapterNum)
    .eq('is_published', true)
    .single();

  if (!chapter) {
    return { title: 'Chapter Not Found' };
  }

  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const chapterTitle = chapter.title || `Chapter ${chapterNum}`;
  const title = `${chapterTitle} - ${fanfic.title}`;
  const url = `${baseUrl}/fanfics/${resolvedParams.slug}/chapters/${chapterNum}`;
  const description = chapter.content
    ? chapter.content.substring(0, 155).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim() + (chapter.content.length > 155 ? '...' : '')
    : `${chapterTitle} from ${fanfic.title}`;

  return {
    title,
    description,
    keywords: [fanfic.title, chapterTitle, 'fanfiction', 'chapter', config.websiteName].filter(Boolean),
    openGraph: {
      title: `${title} | ${config.websiteName}`,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${config.websiteName}`,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export const revalidate = 300;

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterNumber: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const chapterNum = parseInt(resolvedParams.chapterNumber, 10);
  if (isNaN(chapterNum) || chapterNum < 1) {
    notFound();
  }

  // Fetch fanfic
  const { data: fanficData, error: fanficError } = await supabase
    .from('fanfics')
    .select('id, title, slug, is_public')
    .eq('slug', resolvedParams.slug)
    .eq('is_public', true)
    .single();

  if (fanficError || !fanficData) {
    notFound();
  }

  // Fetch all published chapters for navigation
  const { data: allChapters } = await supabase
    .from('fanfic_chapters')
    .select('id, chapter_number, title, is_published')
    .eq('fanfic_id', fanficData.id)
    .eq('is_published', true)
    .order('chapter_number', { ascending: true });

  if (!allChapters || allChapters.length === 0) {
    notFound();
  }

  // Find current chapter
  const currentChapterData = allChapters.find(ch => ch.chapter_number === chapterNum);
  if (!currentChapterData) {
    // Redirect to first chapter if requested chapter doesn't exist
    redirect(`/fanfics/${resolvedParams.slug}/chapters/${allChapters[0].chapter_number}`);
  }

  // Fetch full chapter content
  const { data: chapterData, error: chapterError } = await supabase
    .from('fanfic_chapters')
    .select('*')
    .eq('id', currentChapterData.id)
    .single();

  if (chapterError || !chapterData) {
    notFound();
  }

  const chapter: FanficChapter = {
    id: chapterData.id,
    fanfic_id: fanficData.id,
    chapter_number: chapterData.chapter_number,
    title: chapterData.title || null,
    content: chapterData.content || null,
    word_count: chapterData.word_count || null,
    image_url: chapterData.image_url || null,
    is_published: chapterData.is_published,
    published_at: chapterData.published_at || null,
    created_at: chapterData.created_at,
    updated_at: chapterData.updated_at,
  };

  // Find previous and next chapters
  const currentIndex = allChapters.findIndex(ch => ch.chapter_number === chapterNum);
  const previousChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  const fanfic: Pick<Fanfic, 'id' | 'title' | 'slug'> = {
    id: fanficData.id,
    title: fanficData.title,
    slug: fanficData.slug,
  };

  return (
    <div>
      <PageHeader
        title={`${fanfic.title} - Chapter ${chapterNum}`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fanfics', href: '/fanfics' },
          { label: fanfic.title, href: `/fanfics/${fanfic.slug}` },
          { label: `Chapter ${chapterNum}` },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navigation Controls */}
        <div className="mb-8">
          <ChapterNavigation
            fanfic={fanfic}
            currentChapterNumber={chapterNum}
            allChapters={allChapters.map(ch => ({
              chapter_number: ch.chapter_number,
              title: ch.title || null,
            }))}
            previousChapter={previousChapter ? previousChapter.chapter_number : null}
            nextChapter={nextChapter ? nextChapter.chapter_number : null}
          />
        </div>

        {/* Chapter Content */}
        <article className="wiki-card p-8 md:p-12 rounded-xl">
          {/* Chapter Header */}
          <div className="mb-8 pb-6 border-b-2 border-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <Link
                href={`/fanfics/${fanfic.slug}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors group"
              >
                <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                Back to {fanfic.title}
              </Link>
              {chapter.updated_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="fas fa-clock"></i>
                  <span>Updated: {formatLastUpdated(chapter.updated_at)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/20 text-purple-300 text-lg font-bold border-2 border-purple-500/50">
                {chapterNum}
              </span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-100 leading-tight">
                  {chapter.title || `Chapter ${chapterNum}`}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <i className="fas fa-book"></i>
                    Chapter {chapterNum}
                  </span>
                  {chapter.word_count && (
                    <span className="flex items-center gap-1">
                      <i className="fas fa-font"></i>
                      {chapter.word_count.toLocaleString()} words
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Image */}
          {chapter.image_url && (
            <div className="mb-10 rounded-xl overflow-hidden shadow-2xl">
              <div className="relative w-full h-[150px] md:h-[200px]">
                <Image
                  src={
                    chapter.image_url.includes('drive.google.com')
                      ? getProxyUrl(chapter.image_url)
                      : convertGoogleDriveUrl(chapter.image_url)
                  }
                  alt={chapter.title || `Chapter ${chapterNum}`}
                  fill
                  sizes="100vw"
                  className="object-cover object-center"
                  unoptimized={shouldUseUnoptimizedImage(
                    chapter.image_url.includes('drive.google.com')
                      ? getProxyUrl(chapter.image_url)
                      : convertGoogleDriveUrl(chapter.image_url)
                  )}
                />
              </div>
            </div>
          )}

          {/* Chapter Body */}
          {chapter.content ? (
            <div className="prose prose-invert prose-lg md:prose-xl max-w-none text-gray-200 leading-relaxed">
              <Markdown content={chapter.content} />
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <i className="fas fa-book-open text-4xl mb-4 text-gray-600"></i>
              <p className="text-lg">This chapter has no content yet.</p>
            </div>
          )}
        </article>

        {/* Bottom Navigation */}
        <div className="mt-10 mb-8">
          <ChapterNavigation
            fanfic={fanfic}
            currentChapterNumber={chapterNum}
            allChapters={allChapters.map(ch => ({
              chapter_number: ch.chapter_number,
              title: ch.title || null,
            }))}
            previousChapter={previousChapter ? previousChapter.chapter_number : null}
            nextChapter={nextChapter ? nextChapter.chapter_number : null}
          />
        </div>
      </div>
    </div>
  );
}

