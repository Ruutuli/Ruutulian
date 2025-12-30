'use client';

import { useState, useEffect } from 'react';
import { FormSection } from './forms/FormSection';
import { FormLabel } from './forms/FormLabel';
import { FormSelect } from './forms/FormSelect';
import { FormTextarea } from './forms/FormTextarea';
import { FormButton } from './forms/FormButton';
import { createClient } from '@/lib/supabase/client';

interface DevelopmentLogEntry {
  id: string;
  change_type: string;
  notes: string;
  created_at: string;
}

interface DevelopmentLogFormSectionProps {
  ocId: string;
}

const changeTypes = [
  { value: 'personality', label: 'Personality' },
  { value: 'appearance', label: 'Appearance' },
  { value: 'backstory', label: 'Backstory' },
  { value: 'stats', label: 'Stats' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'abilities', label: 'Abilities' },
  { value: 'other', label: 'Other' },
];

export function DevelopmentLogFormSection({ ocId }: DevelopmentLogFormSectionProps) {
  const [entries, setEntries] = useState<DevelopmentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState({ change_type: 'other', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchEntries() {
      const { data } = await supabase
        .from('character_development_log')
        .select('*')
        .eq('oc_id', ocId)
        .order('created_at', { ascending: false });
      
      if (data) {
        setEntries(data);
      }
      setLoading(false);
    }

    if (ocId) {
      fetchEntries();
    }
  }, [ocId, supabase]);

  const handleAddEntry = async () => {
    if (!newEntry.notes.trim()) return;

    setIsSaving(true);
    const { data, error } = await supabase
      .from('character_development_log')
      .insert({
        oc_id: ocId,
        change_type: newEntry.change_type,
        notes: newEntry.notes,
      })
      .select()
      .single();

    if (!error && data) {
      setEntries([data, ...entries]);
      setNewEntry({ change_type: 'other', notes: '' });
    }
    setIsSaving(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('character_development_log')
      .delete()
      .eq('id', entryId);

    if (!error) {
      setEntries(entries.filter(e => e.id !== entryId));
    }
  };

  if (loading) {
    return (
      <FormSection title="Development Log" icon="history" accentColor="content" defaultOpen={false}>
        <p className="text-gray-400">Loading development log...</p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Development Log" icon="history" accentColor="content" defaultOpen={false}>
      <div className="space-y-4">
        {/* Existing Entries */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-600/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600/20 text-purple-300 border border-purple-500/30">
                        {changeTypes.find(t => t.value === entry.change_type)?.label || entry.change_type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm">{entry.notes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete entry"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Entry */}
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
          <FormLabel htmlFor="new-log-type">Change Type</FormLabel>
          <FormSelect
            id="new-log-type"
            value={newEntry.change_type}
            onChange={(e) => setNewEntry({ ...newEntry, change_type: e.target.value })}
            className="mb-3"
          >
            {changeTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </FormSelect>
          <FormLabel htmlFor="new-log-notes">Notes</FormLabel>
          <FormTextarea
            id="new-log-notes"
            value={newEntry.notes}
            onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
            placeholder="Describe the change..."
            rows={4}
            className="mb-3"
          />
          <FormButton
            type="button"
            variant="secondary"
            onClick={handleAddEntry}
            disabled={isSaving || !newEntry.notes.trim()}
            isLoading={isSaving}
          >
            <i className="fas fa-plus mr-2"></i>
            Add Entry
          </FormButton>
        </div>
      </div>
    </FormSection>
  );
}


