'use client';

import { useState, useEffect } from 'react';
import type { FanficChapter } from '@/types/oc';
import { FormButton } from './forms/FormButton';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormTextarea } from './forms/FormTextarea';
import { FormMessage } from './forms/FormMessage';
import { getGoogleDriveImageUrls } from '@/lib/utils/googleDriveImage';
import { logger } from '@/lib/logger';

interface FanficChaptersManagerProps {
  fanficId: string;
}

type ChapterEditState = {
  title: string;
  content: string;
  image_url: string;
  is_published: boolean;
};

// Simple image preview component for URLs
function ImagePreview({ url, maxHeight = '200px' }: { url: string; maxHeight?: string }) {
  const [imageError, setImageError] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    setImageError(false);
    setCurrentUrlIndex(0);
    try {
      const urlObj = new URL(url);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      setIsValidUrl(isValid);
      
      if (isValid) {
        if (url.includes('drive.google.com')) {
          const urls = getGoogleDriveImageUrls(url);
          setImageUrls(urls);
        } else {
          setImageUrls([url]);
        }
      } else {
        setImageUrls([]);
      }
    } catch {
      setIsValidUrl(false);
      setImageUrls([]);
    }
  }, [url]);

  if (!url || !isValidUrl || imageUrls.length === 0) {
    return null;
  }

  const currentUrl = imageUrls[currentUrlIndex];

  const handleError = () => {
    if (currentUrlIndex < imageUrls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1);
      setImageError(false);
    } else {
      setImageError(true);
    }
  };

  const handleLoad = () => {
    setImageError(false);
  };

  return (
    <div className="mt-2">
      <img
        src={currentUrl}
        alt="Preview"
        className="rounded-lg border border-gray-600/60 max-w-full"
        style={{ maxHeight }}
        onError={handleError}
        onLoad={handleLoad}
      />
      {imageError && (
        <p className="text-sm text-red-400 mt-1">Failed to load image. Please check the URL.</p>
      )}
    </div>
  );
}

export function FanficChaptersManager({ fanficId }: FanficChaptersManagerProps) {
  const [chapters, setChapters] = useState<FanficChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editState, setEditState] = useState<ChapterEditState | null>(null);
  const [savingChapterId, setSavingChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [chapterErrors, setChapterErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadChapters();
  }, [fanficId]);

  async function loadChapters() {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/fanfics/${fanficId}/chapters`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load chapters' }));
        throw new Error(errorData.error || 'Failed to load chapters');
      }
      
      const data = await response.json();
      setChapters(data.chapters || []);
    } catch (err) {
      logger.error('Component', 'FanficChaptersManager: Error loading chapters', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(chapter: FanficChapter) {
    setEditingChapterId(chapter.id);
    setEditState({
      title: chapter.title || '',
      content: chapter.content || '',
      image_url: chapter.image_url || '',
      is_published: chapter.is_published || false,
    });
    setChapterErrors({});
  }

  function cancelEditing() {
    setEditingChapterId(null);
    setEditState(null);
    setChapterErrors({});
  }

  function updateEditState(field: keyof ChapterEditState, value: any) {
    if (editState) {
      setEditState({ ...editState, [field]: value });
      // Clear error for this chapter when user makes changes
      if (chapterErrors[editingChapterId || '']) {
        setChapterErrors({ ...chapterErrors, [editingChapterId || '']: '' });
      }
    }
  }

  async function saveChapter(chapterId: string) {
    if (!editState) return;

    setSavingChapterId(chapterId);
    setError(null);
    setSuccess(null);
    setChapterErrors({ ...chapterErrors, [chapterId]: '' });

    try {
      const response = await fetch(`/api/admin/fanfics/${fanficId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editState.title.trim() || null,
          content: editState.content.trim() || null,
          image_url: editState.image_url.trim() || null,
          is_published: editState.is_published,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save chapter' }));
        const errorMessage = errorData.error || 'Failed to save chapter';
        setChapterErrors({ ...chapterErrors, [chapterId]: errorMessage });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Reload chapters to get the latest data
      await loadChapters();
      
      setEditingChapterId(null);
      setEditState(null);
      setSuccess(`Chapter ${data.chapter?.chapter_number || ''} saved successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving chapter:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save chapter';
      setChapterErrors({ ...chapterErrors, [chapterId]: errorMessage });
    } finally {
      setSavingChapterId(null);
    }
  }

  async function createChapter() {
    setSavingChapterId('new');
    setError(null);
    setSuccess(null);

    try {
      // Get the next chapter number
      const nextChapterNumber = chapters.length > 0
        ? Math.max(...chapters.map(c => c.chapter_number)) + 1
        : 1;

      const response = await fetch(`/api/admin/fanfics/${fanficId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_number: nextChapterNumber,
          title: null,
          content: null,
          image_url: null,
          is_published: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create chapter' }));
        throw new Error(errorData.error || 'Failed to create chapter');
      }

      const data = await response.json();
      
      // Reload chapters
      await loadChapters();
      
      // Start editing the new chapter
      if (data.chapter) {
        startEditing(data.chapter);
        setSuccess('New chapter created! Fill in the details below and click Save.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Error creating chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to create chapter');
    } finally {
      setSavingChapterId(null);
    }
  }

  async function deleteChapter(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    const chapterNum = chapter?.chapter_number || '';
    
    if (!confirm(`Are you sure you want to delete Chapter ${chapterNum}? This action cannot be undone.`)) {
      return;
    }

    setSavingChapterId(chapterId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/fanfics/${fanficId}/chapters/${chapterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete chapter' }));
        throw new Error(errorData.error || 'Failed to delete chapter');
      }

      // Reload chapters
      await loadChapters();
      
      if (editingChapterId === chapterId) {
        cancelEditing();
      }
      setSuccess(`Chapter ${chapterNum} deleted successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete chapter');
    } finally {
      setSavingChapterId(null);
    }
  }

  function getWordCount(content: string | null | undefined): number {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading chapters...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-100 mb-2">Chapters</h2>
          <p className="text-sm text-gray-400">
            {chapters.length === 0 
              ? 'No chapters yet. Create your first chapter to get started.'
              : `${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'} total`
            }
          </p>
        </div>
        <FormButton
          type="button"
          variant="primary"
          onClick={createChapter}
          disabled={savingChapterId === 'new' || editingChapterId !== null}
          isLoading={savingChapterId === 'new'}
        >
          <i className="fas fa-plus mr-2"></i>
          New Chapter
        </FormButton>
      </div>

      {/* Global Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-300">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-300">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {chapters.length === 0 && (
        <div className="text-center py-16 bg-gray-800/40 rounded-xl border-2 border-dashed border-gray-700">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4 text-gray-600">
              <i className="fas fa-book-open"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No chapters yet</h3>
            <p className="text-gray-400 mb-6">
              Start writing your fanfic by creating your first chapter. You can add as many chapters as you need.
            </p>
            <FormButton
              type="button"
              variant="primary"
              onClick={createChapter}
              disabled={savingChapterId === 'new' || editingChapterId !== null}
              isLoading={savingChapterId === 'new'}
            >
              <i className="fas fa-plus mr-2"></i>
              Create First Chapter
            </FormButton>
          </div>
        </div>
      )}

      {/* Chapters List - Compact View */}
      {chapters.length > 0 && (
        <div className="space-y-3">
          {/* Chapter List Header - only show when not editing */}
          {editingChapterId === null && (
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Stats</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
          )}

          {chapters.map((chapter) => {
            const isEditing = editingChapterId === chapter.id;
            const isSaving = savingChapterId === chapter.id;
            const chapterError = chapterErrors[chapter.id];
            const wordCount = getWordCount(chapter.content);

            // Compact view when not editing
            if (!isEditing) {
              return (
                <div
                  key={chapter.id}
                  className="bg-gray-800/60 rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
                >
                  <div className="grid grid-cols-12 gap-4 items-center p-4">
                    {/* Chapter Number */}
                    <div className="col-span-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg font-bold bg-gray-700 text-gray-300">
                        {chapter.chapter_number}
                      </div>
                    </div>
                    
                    {/* Title */}
                    <div className="col-span-4">
                      <h3 className="text-base font-medium text-gray-100 truncate">
                        {chapter.title || `Chapter ${chapter.chapter_number}`}
                      </h3>
                      {chapter.title && (
                        <p className="text-xs text-gray-500 mt-0.5">Chapter {chapter.chapter_number}</p>
                      )}
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-2">
                      {chapter.is_published ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-700/50">
                          <i className="fas fa-check-circle mr-1"></i>
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/50">
                          Draft
                        </span>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="col-span-2 text-sm text-gray-400">
                      {wordCount > 0 ? (
                        <div>
                          <i className="fas fa-font mr-1"></i>
                          {wordCount.toLocaleString()} words
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No content</span>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => startEditing(chapter)}
                        disabled={isSaving || savingChapterId !== null || (editingChapterId !== null && editingChapterId !== chapter.id)}
                        className="text-xs px-3 py-1.5"
                        title={editingChapterId !== null && editingChapterId !== chapter.id ? 'Please finish editing the current chapter first' : ''}
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </FormButton>
                      <button
                        type="button"
                        onClick={() => deleteChapter(chapter.id)}
                        disabled={isSaving || savingChapterId !== null || editingChapterId !== null}
                        className="px-3 py-1.5 text-xs font-medium text-red-300 bg-red-900/20 border border-red-700/50 rounded-lg hover:bg-red-900/30 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={editingChapterId !== null ? 'Cannot delete while editing another chapter' : ''}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // Expanded editing view
            return (
              <div
                key={chapter.id}
                className="bg-gray-800/60 rounded-xl border-2 border-purple-500 shadow-lg shadow-purple-500/20 transition-all"
              >
                {/* Chapter Header */}
                <div className="p-5 border-b border-gray-700/50 bg-gray-800/40 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg bg-purple-600 text-white">
                        {chapter.chapter_number}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-100">
                            {editState?.title || `Chapter ${chapter.chapter_number}`}
                          </h3>
                          {chapter.is_published && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-700/50">
                              <i className="fas fa-check-circle mr-1"></i>
                              Published
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {editingChapterId !== null && (
                            <span className="text-purple-400">
                              <i className="fas fa-info-circle mr-1"></i>
                              Editing mode - other chapters are locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FormButton
                        type="button"
                        variant="primary"
                        onClick={() => saveChapter(chapter.id)}
                        disabled={isSaving}
                        isLoading={isSaving}
                        className="text-sm"
                      >
                        <i className="fas fa-save mr-2"></i>
                        {isSaving ? 'Saving...' : 'Save Chapter'}
                      </FormButton>
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="text-sm"
                      >
                        Cancel
                      </FormButton>
                    </div>
                  </div>
                </div>

                {/* Chapter Content */}
                <div className="p-5">
                  {isEditing && editState ? (
                    <div className="space-y-5">
                      {chapterError && (
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-red-300">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{chapterError}</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <FormLabel htmlFor={`chapter-${chapter.id}-title`}>
                          Chapter Title <span className="text-gray-500 text-xs font-normal">(optional)</span>
                        </FormLabel>
                        <FormInput
                          id={`chapter-${chapter.id}-title`}
                          value={editState.title}
                          onChange={(e) => updateEditState('title', e.target.value)}
                          placeholder="e.g., The Beginning, Prologue, etc."
                          disabled={isSaving}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <FormLabel htmlFor={`chapter-${chapter.id}-image_url`}>
                          Image URL <span className="text-gray-500 text-xs font-normal">(optional)</span>
                        </FormLabel>
                        <FormInput
                          id={`chapter-${chapter.id}-image_url`}
                          value={editState.image_url}
                          onChange={(e) => updateEditState('image_url', e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          disabled={isSaving}
                          className="mt-1"
                        />
                        {editState.image_url && (
                          <ImagePreview url={editState.image_url} maxHeight="300px" />
                        )}
                      </div>

                      <div>
                        <FormLabel htmlFor={`chapter-${chapter.id}-content`}>
                          Chapter Content <span className="text-gray-500 text-xs font-normal">(Markdown supported)</span>
                        </FormLabel>
                        <FormTextarea
                          id={`chapter-${chapter.id}-content`}
                          value={editState.content}
                          onChange={(e) => updateEditState('content', e.target.value)}
                          rows={20}
                          placeholder="Write your chapter content here..."
                          disabled={isSaving}
                          className="mt-1 font-mono text-sm"
                        />
                        {editState.content && (
                          <div className="mt-2 text-xs text-gray-400 flex items-center gap-4">
                            <span>
                              <i className="fas fa-font mr-1"></i>
                              {getWordCount(editState.content).toLocaleString()} words
                            </span>
                            <span>
                              <i className="fas fa-ruler-vertical mr-1"></i>
                              {editState.content.length.toLocaleString()} characters
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-gray-900/40 rounded-lg border border-gray-700">
                        <input
                          type="checkbox"
                          id={`chapter-${chapter.id}-published`}
                          checked={editState.is_published}
                          onChange={(e) => updateEditState('is_published', e.target.checked)}
                          disabled={isSaving}
                          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
                        />
                        <label 
                          htmlFor={`chapter-${chapter.id}-published`}
                          className="text-sm text-gray-300 cursor-pointer flex-1"
                        >
                          <span className="font-medium">Publish this chapter</span>
                          <span className="text-gray-500 ml-2">(Make it visible to the public)</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chapter.title && (
                        <div>
                          <FormLabel>Title</FormLabel>
                          <p className="text-gray-200 mt-1">{chapter.title}</p>
                        </div>
                      )}
                      <div>
                        <FormLabel>Content</FormLabel>
                        <div className="mt-1 text-gray-300 whitespace-pre-wrap bg-gray-900/50 p-4 rounded-lg border border-gray-700 font-mono text-sm max-h-96 overflow-y-auto">
                          {chapter.content ? (
                            <div className="prose prose-invert max-w-none">
                              {chapter.content}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No content yet. Click Edit to add content.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
