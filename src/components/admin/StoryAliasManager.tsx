'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StoryAlias } from '@/types/oc';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { slugify } from '@/lib/utils/slugify';

interface StoryAliasManagerProps {
  worldId: string;
  worldIsCanon: boolean;
}

export function StoryAliasManager({ worldId, worldIsCanon }: StoryAliasManagerProps) {
  const [storyAliases, setStoryAliases] = useState<StoryAlias[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Track if slug was manually edited (so we don't auto-update it)
  const slugManuallyEdited = useRef(false);
  const originalSlug = useRef('');

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchStoryAliases = useCallback(async () => {
    if (!worldId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/story-aliases?world_id=${worldId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch story aliases');
      }

      // API returns data directly (array), not wrapped in { data: ... }
      setStoryAliases(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story aliases');
    } finally {
      setIsLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    if (worldId && worldIsCanon) {
      fetchStoryAliases();
    } else {
      setIsLoading(false);
    }
  }, [worldId, worldIsCanon, fetchStoryAliases]);

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    const slug = formData.slug.trim() || slugify(formData.name);

    try {
      const response = await fetch('/api/admin/story-aliases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          world_id: worldId,
          name: formData.name.trim(),
          slug,
          description: formData.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create story alias');
      }

      setFormData({ name: '', slug: '', description: '' });
      slugManuallyEdited.current = false;
      setSuccess('Story alias created successfully!');
      await fetchStoryAliases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story alias');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    const slug = formData.slug.trim() || slugify(formData.name);

    try {
      const response = await fetch(`/api/admin/story-aliases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug,
          description: formData.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update story alias');
      }

      setEditingId(null);
      setFormData({ name: '', slug: '', description: '' });
      slugManuallyEdited.current = false;
      setSuccess('Story alias updated successfully!');
      await fetchStoryAliases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update story alias');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/story-aliases/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete story alias');
      }

      setDeleteConfirmId(null);
      setSuccess('Story alias deleted successfully!');
      await fetchStoryAliases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete story alias');
    } finally {
      setIsDeleting(null);
    }
  }

  function startEdit(alias: StoryAlias) {
    setEditingId(alias.id);
    setFormData({
      name: alias.name,
      slug: alias.slug,
      description: alias.description || '',
    });
    slugManuallyEdited.current = false;
    originalSlug.current = alias.slug;
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({ name: '', slug: '', description: '' });
    slugManuallyEdited.current = false;
  }

  function handleNameChange(newName: string) {
    setFormData((prev) => {
      const newSlug = slugManuallyEdited.current 
        ? prev.slug 
        : slugify(newName);
      return { ...prev, name: newName, slug: newSlug };
    });
  }

  function handleSlugChange(newSlug: string) {
    slugManuallyEdited.current = true;
    setFormData((prev) => ({ ...prev, slug: slugify(newSlug) }));
  }

  if (!worldIsCanon) {
    return (
      <div className="text-sm text-gray-400">
        Story aliases are only available for canon worlds.
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading story aliases...</div>;
  }

  return (
    <div className="space-y-4">
      {error && <FormMessage type="error" message={error} />}
      {success && <FormMessage type="success" message={success} />}

      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Story Aliases</h3>
        <p className="text-sm text-gray-400 mb-4">
          Create named storylines/continuities for this canon world (e.g., "Red Thread", "House of Cards").
        </p>
      </div>

      {/* Create Form */}
      {!editingId && (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Create New Story Alias</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Roots of The Wild"
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Auto-generated from name"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 mt-1">Slug will be auto-generated from name if left empty</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Brief description of this storyline/continuity"
                disabled={isCreating}
              />
            </div>
            <FormButton
              type="button"
              variant="primary"
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={isCreating || !formData.name.trim()}
            >
              Create Story Alias
            </FormButton>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Edit Story Alias</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isUpdating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isUpdating}
              />
              <p className="text-xs text-gray-500 mt-1">Slug will be auto-generated from name if you haven't manually edited it</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                disabled={isUpdating}
              />
            </div>
            <div className="flex gap-2">
              <FormButton
                type="button"
                variant="primary"
                onClick={() => handleUpdate(editingId)}
                isLoading={isUpdating}
                disabled={isUpdating || !formData.name.trim()}
              >
                Save Changes
              </FormButton>
              <FormButton 
                type="button" 
                variant="secondary" 
                onClick={cancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </FormButton>
            </div>
          </div>
        </div>
      )}

      {/* List of Story Aliases */}
      {storyAliases.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Existing Story Aliases</h4>
          {storyAliases.map((alias) => (
            <StoryAliasItem
              key={alias.id}
              alias={alias}
              isEditing={editingId === alias.id}
              isDeleting={isDeleting === alias.id}
              onEdit={() => startEdit(alias)}
              onDelete={() => setDeleteConfirmId(alias.id)}
              deleteConfirmId={deleteConfirmId}
              onConfirmDelete={() => handleDelete(alias.id)}
              onCancelDelete={() => setDeleteConfirmId(null)}
            />
          ))}
        </div>
      )}

      {storyAliases.length === 0 && !editingId && (
        <div className="text-sm text-gray-400 italic">No story aliases created yet.</div>
      )}
    </div>
  );
}

interface StoryAliasItemProps {
  alias: StoryAlias;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirmId: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function StoryAliasItem({
  alias,
  isEditing,
  isDeleting,
  onEdit,
  onDelete,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: StoryAliasItemProps) {
  const [usageCounts, setUsageCounts] = useState<{ 
    ocs: number; 
    lore: number; 
    events: number; 
    timelines: number;
    storyData: number;
    races: number;
    total: number;
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    async function loadUsage() {
      setLoadingUsage(true);
      const supabase = createClient();
      const [ocsResult, loreResult, eventsResult, timelinesResult, storyDataResult, racesResult] = await Promise.all([
        supabase.from('ocs').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
        supabase.from('world_lore').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
        supabase.from('timeline_events').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
        supabase.from('timelines').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
        supabase.from('world_story_data').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
        supabase.from('world_races').select('id', { count: 'exact', head: true }).eq('story_alias_id', alias.id),
      ]);

      setUsageCounts({
        ocs: ocsResult.count || 0,
        lore: loreResult.count || 0,
        events: eventsResult.count || 0,
        timelines: timelinesResult.count || 0,
        storyData: storyDataResult.count || 0,
        races: racesResult.count || 0,
        total: (ocsResult.count || 0) + (loreResult.count || 0) + (eventsResult.count || 0) + (timelinesResult.count || 0) + (storyDataResult.count || 0) + (racesResult.count || 0),
      });
      setLoadingUsage(false);
    }

    loadUsage();
  }, [alias.id]);

  if (isEditing) {
    return null; // Edit form is shown separately
  }

  const showDeleteConfirm = deleteConfirmId === alias.id;

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-gray-200">{alias.name}</div>
          {alias.description && (
            <div className="text-sm text-gray-400 mt-1">{alias.description}</div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Slug: <code className="bg-gray-900/60 px-1 rounded">{alias.slug}</code>
          </div>
          {loadingUsage ? (
            <div className="text-xs text-gray-500 mt-2">Loading usage...</div>
          ) : usageCounts && usageCounts.total > 0 ? (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>
                Used by: {usageCounts.ocs} OC{usageCounts.ocs !== 1 ? 's' : ''}, {usageCounts.lore} lore entr{usageCounts.lore !== 1 ? 'ies' : 'y'}, {usageCounts.events} event{usageCounts.events !== 1 ? 's' : ''}, {usageCounts.timelines} timeline{usageCounts.timelines !== 1 ? 's' : ''}
              </div>
              {(usageCounts.storyData > 0 || usageCounts.races > 0) && (
                <div className="text-yellow-400 font-medium">
                  ⚠️ Warning: {usageCounts.storyData} world story data and {usageCounts.races} race{usageCounts.races !== 1 ? 's' : ''} will be permanently deleted
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2 ml-4">
          {!showDeleteConfirm ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-1 text-sm bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Delete
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 items-end">
              {usageCounts && usageCounts.total > 0 && (
                <div className="text-xs text-yellow-400 mb-1 text-right max-w-xs">
                  {usageCounts.storyData > 0 || usageCounts.races > 0 ? (
                    <div>⚠️ This will permanently delete {usageCounts.storyData} world story data and {usageCounts.races} race{usageCounts.races !== 1 ? 's' : ''}. Other references will be cleared.</div>
                  ) : (
                    <div>References to this story alias will be cleared from {usageCounts.total} item{usageCounts.total !== 1 ? 's' : ''}.</div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  className="px-3 py-1 text-sm bg-red-700 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

