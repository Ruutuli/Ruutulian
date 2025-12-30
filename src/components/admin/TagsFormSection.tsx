'use client';

import { useState, useEffect } from 'react';
import { FormSection } from './forms/FormSection';
import { TagsInput } from '@/components/content/TagsInput';
import { createClient } from '@/lib/supabase/client';
import { ensurePredefinedTags } from '@/lib/tags/predefinedTags';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface TagsFormSectionProps {
  ocId: string;
  currentTags: Tag[];
}

export function TagsFormSection({ ocId, currentTags: initialTags }: TagsFormSectionProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      // Ensure predefined tags exist in database
      await ensurePredefinedTags(supabase);

      // Fetch all tags
      const { data: allTags } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      // Fetch character's current tags
      const { data: charTags } = await supabase
        .from('character_tags')
        .select('tag_id, tags(*)')
        .eq('oc_id', ocId);

      if (allTags) {
        setAvailableTags(allTags);
      }

      if (charTags) {
        const tags = charTags.map(ct => ct.tags).filter(Boolean) as Tag[];
        setSelectedTags(tags);
      }

      setLoading(false);
    }

    if (ocId) {
      fetchData();
    }
  }, [ocId, supabase]);

  const handleTagsChange = async (tags: Tag[]) => {
    setSelectedTags(tags);

    // Update database
    const tagIds = tags.map(t => t.id);
    
    // Delete all current tags
    await supabase
      .from('character_tags')
      .delete()
      .eq('oc_id', ocId);

    // Insert new tags
    if (tagIds.length > 0) {
      await supabase
        .from('character_tags')
        .insert(tagIds.map(tagId => ({ oc_id: ocId, tag_id: tagId })));
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag | null> => {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      return null;
    }

    if (data) {
      setAvailableTags([...availableTags, data]);
      return data;
    }

    return null;
  };

  if (loading) {
    return (
      <FormSection title="Tags" icon="tag" accentColor="content" defaultOpen={false}>
        <p className="text-gray-400">Loading tags...</p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Tags" icon="tag" accentColor="content" defaultOpen={false}>
      <TagsInput
        selectedTags={selectedTags}
        availableTags={availableTags}
        onTagsChange={handleTagsChange}
        onCreateTag={handleCreateTag}
        placeholder="Add tags to categorize this character..."
      />
    </FormSection>
  );
}

