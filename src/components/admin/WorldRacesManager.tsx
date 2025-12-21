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
  worldId: string;
  storyAliasId?: string | null;
}

export function WorldRacesManager({ worldId, storyAliasId }: WorldRacesManagerProps) {
  const [races, setRaces] = useState<WorldRace[]>([]);
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
    info: '',
    picture_url: '',
    lifespan_development: '',
    appearance_dress: '',
  });

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchRaces = useCallback(async () => {
    if (!worldId) return;

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
  }, [worldId, storyAliasId]);

  useEffect(() => {
    if (worldId) {
      fetchRaces();
    } else {
      setIsLoading(false);
    }
  }, [worldId, storyAliasId, fetchRaces]);

  async function handleCreate() {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      // Get the next position
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
          lifespan_development: formData.lifespan_development.trim() || null,
          appearance_dress: formData.appearance_dress.trim() || null,
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
        picture_url: '', 
        lifespan_development: '', 
        appearance_dress: '' 
      });
      setSuccess('Race created successfully!');
      await fetchRaces();
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
      const response = await fetch(`/api/admin/world-races/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          info: formData.info.trim() || null,
          picture_url: formData.picture_url.trim() || null,
          lifespan_development: formData.lifespan_development.trim() || null,
          appearance_dress: formData.appearance_dress.trim() || null,
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
        picture_url: '', 
        lifespan_development: '', 
        appearance_dress: '' 
      });
      setSuccess('Race updated successfully!');
      await fetchRaces();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete race');
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleMoveUp(id: string) {
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

  function startEdit(race: WorldRace) {
    setEditingId(race.id);
    setFormData({
      name: race.name,
      info: race.info || '',
      picture_url: race.picture_url || '',
      lifespan_development: race.lifespan_development || '',
      appearance_dress: race.appearance_dress || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({ 
      name: '', 
      info: '', 
      picture_url: '', 
      lifespan_development: '', 
      appearance_dress: '' 
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
                rows={3}
                placeholder="General information about this race"
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
            <div>
              <FormLabel htmlFor="race-lifespan">⏳ Lifespan & Development</FormLabel>
              <FormTextarea
                id="race-lifespan"
                value={formData.lifespan_development}
                onChange={(e) => setFormData({ ...formData, lifespan_development: e.target.value })}
                rows={3}
                placeholder="Information about lifespan, aging, growth stages, etc."
                disabled={isCreating}
              />
            </div>
            <div>
              <FormLabel htmlFor="race-appearance">👁️ Appearance & Dress</FormLabel>
              <FormTextarea
                id="race-appearance"
                value={formData.appearance_dress}
                onChange={(e) => setFormData({ ...formData, appearance_dress: e.target.value })}
                rows={3}
                placeholder="Physical appearance, typical clothing, cultural attire, etc."
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
                rows={3}
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
            <div>
              <FormLabel htmlFor="edit-race-lifespan">⏳ Lifespan & Development</FormLabel>
              <FormTextarea
                id="edit-race-lifespan"
                value={formData.lifespan_development}
                onChange={(e) => setFormData({ ...formData, lifespan_development: e.target.value })}
                rows={3}
                disabled={isUpdating}
              />
            </div>
            <div>
              <FormLabel htmlFor="edit-race-appearance">👁️ Appearance & Dress</FormLabel>
              <FormTextarea
                id="edit-race-appearance"
                value={formData.appearance_dress}
                onChange={(e) => setFormData({ ...formData, appearance_dress: e.target.value })}
                rows={3}
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
      {races.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Existing Races</h4>
          {races.map((race, index) => (
            <RaceItem
              key={race.id}
              race={race}
              isEditing={editingId === race.id}
              isDeleting={isDeleting === race.id}
              canMoveUp={index > 0}
              canMoveDown={index < races.length - 1}
              onEdit={() => startEdit(race)}
              onDelete={() => setDeleteConfirmId(race.id)}
              onMoveUp={() => handleMoveUp(race.id)}
              onMoveDown={() => handleMoveDown(race.id)}
              deleteConfirmId={deleteConfirmId}
              onConfirmDelete={() => handleDelete(race.id)}
              onCancelDelete={() => setDeleteConfirmId(null)}
            />
          ))}
        </div>
      )}

      {races.length === 0 && !editingId && (
        <div className="text-sm text-gray-400 italic">No races created yet.</div>
      )}
    </div>
  );
}

interface RaceItemProps {
  race: WorldRace;
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
            <div className="text-sm text-gray-400 mt-1">{race.info}</div>
          )}
          {race.picture_url && (
            <div className="text-xs text-gray-500 mt-1">
              <a href={race.picture_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                View Image
              </a>
            </div>
          )}
          {(race.lifespan_development || race.appearance_dress) && (
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              {race.lifespan_development && (
                <div><strong>Lifespan & Development:</strong> {race.lifespan_development}</div>
              )}
              {race.appearance_dress && (
                <div><strong>Appearance & Dress:</strong> {race.appearance_dress}</div>
              )}
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

