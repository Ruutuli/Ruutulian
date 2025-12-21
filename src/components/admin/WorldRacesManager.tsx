'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WorldRace } from '@/types/oc';
import { FormButton } from './forms/FormButton';
import { FormMessage } from './forms/FormMessage';
import { FormLabel } from './forms/FormLabel';
import { FormInput } from './forms/FormInput';
import { FormTextarea } from './forms/FormTextarea';

interface WorldRacesManagerProps {
  worldId?: string | null;
  storyAliasId?: string | null;
  draftRaces?: Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'>[];
  onDraftRacesChange?: (races: Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'>[]) => void;
}

export function WorldRacesManager({ worldId, storyAliasId, draftRaces, onDraftRacesChange }: WorldRacesManagerProps) {
  const isDraftMode = !worldId;
  const [races, setRaces] = useState<WorldRace[]>([]);
  const [draftRacesState, setDraftRacesState] = useState<Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'>[]>(
    draftRaces || []
  );
  const [isLoading, setIsLoading] = useState(!isDraftMode);
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
    info: '',
    picture_url: '',
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchRaces = useCallback(async () => {
    if (!worldId || isDraftMode) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      let query = supabase
        .from('world_races')
        .select('*')
        .eq('world_id', worldId)
        .order('position', { ascending: true });

      if (storyAliasId) {
        query = query.eq('story_alias_id', storyAliasId);
      } else {
        query = query.is('story_alias_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch races');
      }

      setRaces(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load races');
    } finally {
      setIsLoading(false);
    }
  }, [worldId, storyAliasId, isDraftMode]);

  useEffect(() => {
    if (worldId && !isDraftMode) {
      fetchRaces();
    } else {
      setIsLoading(false);
    }
  }, [worldId, storyAliasId, fetchRaces, isDraftMode]);

  // Sync draft races with parent
  useEffect(() => {
    if (isDraftMode && onDraftRacesChange) {
      onDraftRacesChange(draftRacesState);
    }
  }, [draftRacesState, isDraftMode, onDraftRacesChange]);

  // Initialize draft races from props
  useEffect(() => {
    if (isDraftMode && draftRaces) {
      setDraftRacesState(draftRaces);
    }
  }, [isDraftMode, draftRaces]);

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      if (isDraftMode) {
        // Draft mode: add to local state
        const nextPosition = draftRacesState.length > 0 
          ? Math.max(...draftRacesState.map(r => r.position)) + 1 
          : 0;

        const newRace: Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'> = {
          story_alias_id: storyAliasId || null,
          name: formData.name.trim(),
          info: formData.info.trim() || null,
          picture_url: formData.picture_url.trim() || null,
          position: nextPosition,
        };

        const updatedRaces = [...draftRacesState, newRace];
        setDraftRacesState(updatedRaces);
        if (onDraftRacesChange) {
          onDraftRacesChange(updatedRaces);
        }

        setFormData({ 
          name: '', 
          info: '', 
          picture_url: ''
        });
        setSuccess('Race added!');
      } else {
        // Normal mode: create via API
        const nextPosition = races.length > 0 
          ? Math.max(...races.map(r => r.position)) + 1 
          : 0;

        const response = await fetch('/api/admin/world-races', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            world_id: worldId,
            story_alias_id: storyAliasId || null,
            name: formData.name.trim(),
            info: formData.info.trim() || null,
            picture_url: formData.picture_url.trim() || null,
            position: nextPosition,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create race');
        }

        setFormData({ 
          name: '', 
          info: '', 
          picture_url: ''
        });
        setSuccess('Race created successfully!');
        await fetchRaces();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create race');
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

    try {
      if (isDraftMode) {
        // Draft mode: update in local state
        const index = draftRacesState.findIndex((r, i) => i.toString() === id);
        if (index !== -1) {
          const updatedRaces = [...draftRacesState];
          updatedRaces[index] = {
            ...updatedRaces[index],
            name: formData.name.trim(),
            info: formData.info.trim() || null,
            picture_url: formData.picture_url.trim() || null,
          };
          setDraftRacesState(updatedRaces);
          if (onDraftRacesChange) {
            onDraftRacesChange(updatedRaces);
          }
          setEditingId(null);
          setFormData({ 
            name: '', 
            info: '', 
            picture_url: ''
          });
          setSuccess('Race updated!');
        }
      } else {
        // Normal mode: update via API
        const response = await fetch(`/api/admin/world-races/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            info: formData.info.trim() || null,
            picture_url: formData.picture_url.trim() || null,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update race');
        }

        setEditingId(null);
        setFormData({ 
          name: '', 
          info: '', 
          picture_url: ''
        });
        setSuccess('Race updated successfully!');
        await fetchRaces();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update race');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      if (isDraftMode) {
        // Draft mode: remove from local state
        const index = draftRacesState.findIndex((r, i) => i.toString() === id);
        if (index !== -1) {
          const updatedRaces = draftRacesState.filter((_, i) => i !== index);
          setDraftRacesState(updatedRaces);
          if (onDraftRacesChange) {
            onDraftRacesChange(updatedRaces);
          }
          setDeleteConfirmId(null);
          setSuccess('Race removed!');
        }
      } else {
        // Normal mode: delete via API
        const response = await fetch(`/api/admin/world-races/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete race');
        }

        setDeleteConfirmId(null);
        setSuccess('Race deleted successfully!');
        await fetchRaces();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete race');
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleMoveUp(id: string) {
    if (isDraftMode) {
      const index = parseInt(id);
      if (index <= 0) return;
      const updatedRaces = [...draftRacesState];
      [updatedRaces[index - 1], updatedRaces[index]] = [updatedRaces[index], updatedRaces[index - 1]];
      // Update positions
      updatedRaces.forEach((r, i) => { r.position = i; });
      setDraftRacesState(updatedRaces);
      if (onDraftRacesChange) {
        onDraftRacesChange(updatedRaces);
      }
      return;
    }

    const race = races.find(r => r.id === id);
    if (!race || race.position === 0) return;

    const prevRace = races.find(r => r.position === race.position - 1);
    if (!prevRace) return;

    try {
      // Swap positions
      await Promise.all([
        fetch(`/api/admin/world-races/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: prevRace.position }),
        }),
        fetch(`/api/admin/world-races/${prevRace.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: race.position }),
        }),
      ]);

      await fetchRaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder race');
    }
  }

  async function handleMoveDown(id: string) {
    if (isDraftMode) {
      const index = parseInt(id);
      if (index >= draftRacesState.length - 1) return;
      const updatedRaces = [...draftRacesState];
      [updatedRaces[index], updatedRaces[index + 1]] = [updatedRaces[index + 1], updatedRaces[index]];
      // Update positions
      updatedRaces.forEach((r, i) => { r.position = i; });
      setDraftRacesState(updatedRaces);
      if (onDraftRacesChange) {
        onDraftRacesChange(updatedRaces);
      }
      return;
    }

    const race = races.find(r => r.id === id);
    if (!race) return;

    const nextRace = races.find(r => r.position === race.position + 1);
    if (!nextRace) return;

    try {
      // Swap positions
      await Promise.all([
        fetch(`/api/admin/world-races/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: nextRace.position }),
        }),
        fetch(`/api/admin/world-races/${nextRace.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: race.position }),
        }),
      ]);

      await fetchRaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder race');
    }
  }

  function startEdit(race: WorldRace | Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'>, index?: number) {
    const editId = isDraftMode && index !== undefined ? index.toString() : (race as WorldRace).id;
    setEditingId(editId);
    setFormData({
      name: race.name,
      info: race.info || '',
      picture_url: race.picture_url || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({ 
      name: '', 
      info: '', 
      picture_url: ''
    });
  }

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading races...</div>;
  }

  return (
    <div className="space-y-4">
      {error && <FormMessage type="error" message={error} />}
      {success && <FormMessage type="success" message={success} />}

      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Races & Species</h3>
        <p className="text-sm text-gray-400 mb-4">
          Manage the races and species that exist in this world. Each race can have detailed information about their characteristics.
        </p>
      </div>

      {/* Create Form */}
      {!editingId && (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Create New Race</h4>
          <div className="space-y-3">
            <div>
              <FormLabel htmlFor="race-name">
                Name <span className="text-red-400">*</span>
              </FormLabel>
              <FormInput
                id="race-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Humans, Elves, Dragons"
                disabled={isCreating}
              />
            </div>
            <div>
              <FormLabel htmlFor="race-info">Info</FormLabel>
              <FormTextarea
                id="race-info"
                value={formData.info}
                onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                rows={6}
                placeholder="General information about this race. Include details about lifespan, development, appearance, dress, and any other relevant characteristics."
                disabled={isCreating}
              />
            </div>
            <div>
              <FormLabel htmlFor="race-picture">Picture URL</FormLabel>
              <FormInput
                id="race-picture"
                type="url"
                value={formData.picture_url}
                onChange={(e) => setFormData({ ...formData, picture_url: e.target.value })}
                placeholder="https://example.com/race-image.jpg"
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
              Create Race
            </FormButton>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Edit Race</h4>
          <div className="space-y-3">
            <div>
              <FormLabel htmlFor="edit-race-name">
                Name <span className="text-red-400">*</span>
              </FormLabel>
              <FormInput
                id="edit-race-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isUpdating}
              />
            </div>
            <div>
              <FormLabel htmlFor="edit-race-info">Info</FormLabel>
              <FormTextarea
                id="edit-race-info"
                value={formData.info}
                onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                rows={6}
                placeholder="General information about this race. Include details about lifespan, development, appearance, dress, and any other relevant characteristics."
                disabled={isUpdating}
              />
            </div>
            <div>
              <FormLabel htmlFor="edit-race-picture">Picture URL</FormLabel>
              <FormInput
                id="edit-race-picture"
                type="url"
                value={formData.picture_url}
                onChange={(e) => setFormData({ ...formData, picture_url: e.target.value })}
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

      {/* List of Races */}
      {(() => {
        const displayRaces = isDraftMode ? draftRacesState : races;
        return displayRaces.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Existing Races</h4>
            {displayRaces.map((race, index) => {
              const raceId = isDraftMode ? index.toString() : (race as WorldRace).id;
              return (
                <RaceItem
                  key={raceId}
                  race={race}
                  isEditing={editingId === raceId}
                  isDeleting={isDeleting === raceId}
                  canMoveUp={index > 0}
                  canMoveDown={index < displayRaces.length - 1}
                  onEdit={() => startEdit(race, index)}
                  onDelete={() => setDeleteConfirmId(raceId)}
                  onMoveUp={() => handleMoveUp(raceId)}
                  onMoveDown={() => handleMoveDown(raceId)}
                  deleteConfirmId={deleteConfirmId}
                  onConfirmDelete={() => handleDelete(raceId)}
                  onCancelDelete={() => setDeleteConfirmId(null)}
                />
              );
            })}
          </div>
        ) : null;
      })()}

      {(() => {
        const displayRaces = isDraftMode ? draftRacesState : races;
        return displayRaces.length === 0 && !editingId ? (
          <div className="text-sm text-gray-400 italic">No races created yet.</div>
        ) : null;
      })()}
    </div>
  );
}

interface RaceItemProps {
  race: WorldRace | Omit<WorldRace, 'id' | 'world_id' | 'created_at' | 'updated_at'>;
  isEditing: boolean;
  isDeleting: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  deleteConfirmId: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function RaceItem({
  race,
  isEditing,
  isDeleting,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: RaceItemProps) {
  if (isEditing) {
    return null; // Edit form is shown separately
  }

  const showDeleteConfirm = deleteConfirmId === race.id;

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-gray-200">{race.name}</div>
          {race.info && (
            <div className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">{race.info}</div>
          )}
          {race.picture_url && (
            <div className="text-xs text-gray-500 mt-1">
              <a href={race.picture_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                View Image
              </a>
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          {!showDeleteConfirm ? (
            <>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move down"
              >
                ↓
              </button>
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
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

