// Predefined tags that should exist in the database
// These match the tags seeded in the migration

export interface PredefinedTag {
  name: string;
  description: string;
  color: string;
}

export const PREDEFINED_TAGS: PredefinedTag[] = [
  // Character Types
  { name: 'Protagonist', description: 'Main character or hero', color: '#3B82F6' },
  { name: 'Antagonist', description: 'Villain or opposing force', color: '#EF4444' },
  { name: 'Supporting Character', description: 'Secondary character', color: '#8B5CF6' },
  { name: 'Side Character', description: 'Minor character', color: '#6B7280' },
  { name: 'Cameo', description: 'Brief appearance', color: '#9CA3AF' },
  
  // Personality Traits
  { name: 'Heroic', description: 'Displays heroic qualities', color: '#10B981' },
  { name: 'Villainous', description: 'Displays villainous qualities', color: '#DC2626' },
  { name: 'Anti-Hero', description: 'Morally ambiguous hero', color: '#F59E0B' },
  { name: 'Comic Relief', description: 'Provides humor', color: '#F97316' },
  { name: 'Tragic', description: 'Tragic backstory or fate', color: '#7C3AED' },
  { name: 'Optimistic', description: 'Positive outlook', color: '#FBBF24' },
  { name: 'Pessimistic', description: 'Negative outlook', color: '#6B7280' },
  { name: 'Sarcastic', description: 'Uses sarcasm', color: '#8B5CF6' },
  { name: 'Serious', description: 'Serious demeanor', color: '#4B5563' },
  { name: 'Playful', description: 'Playful personality', color: '#EC4899' },
  
  // Role/Function
  { name: 'Mentor', description: 'Guides others', color: '#6366F1' },
  { name: 'Student', description: 'Learns from others', color: '#14B8A6' },
  { name: 'Leader', description: 'Takes charge', color: '#F59E0B' },
  { name: 'Follower', description: 'Follows others', color: '#6B7280' },
  { name: 'Loner', description: 'Prefers solitude', color: '#4B5563' },
  { name: 'Team Player', description: 'Works well in groups', color: '#10B981' },
  { name: 'Rebel', description: 'Challenges authority', color: '#EF4444' },
  { name: 'Loyal', description: 'Shows loyalty', color: '#3B82F6' },
  { name: 'Betrayer', description: 'Betrays others', color: '#DC2626' },
  
  // Relationships
  { name: 'Love Interest', description: 'Romantic interest', color: '#EC4899' },
  { name: 'Best Friend', description: 'Close friend', color: '#8B5CF6' },
  { name: 'Rival', description: 'Competes with others', color: '#F59E0B' },
  { name: 'Enemy', description: 'Hostile relationship', color: '#EF4444' },
  { name: 'Family', description: 'Family member', color: '#10B981' },
  { name: 'Ally', description: 'Supports others', color: '#3B82F6' },
  
  // Power/Ability
  { name: 'Powerful', description: 'Has significant power', color: '#F59E0B' },
  { name: 'Weak', description: 'Lacks power', color: '#6B7280' },
  { name: 'Magical', description: 'Uses magic', color: '#8B5CF6' },
  { name: 'Non-Magical', description: 'No magic abilities', color: '#4B5563' },
  { name: 'Supernatural', description: 'Supernatural abilities', color: '#7C3AED' },
  { name: 'Human', description: 'Regular human', color: '#6B7280' },
  
  // Development
  { name: 'Character Growth', description: 'Shows development', color: '#10B981' },
  { name: 'Static Character', description: 'Little to no change', color: '#6B7280' },
  { name: 'Complex', description: 'Multi-dimensional', color: '#6366F1' },
  { name: 'Simple', description: 'Straightforward character', color: '#9CA3AF' },
  
  // Story Role
  { name: 'Main Character', description: 'Central to story', color: '#3B82F6' },
  { name: 'Plot Device', description: 'Drives plot forward', color: '#8B5CF6' },
  { name: 'Red Herring', description: 'Misleading character', color: '#F59E0B' },
  { name: 'Sacrifice', description: 'Sacrifices for others', color: '#EF4444' },
  { name: 'Survivor', description: 'Survives hardships', color: '#10B981' },
  
  // Emotional
  { name: 'Emotional', description: 'Shows strong emotions', color: '#EC4899' },
  { name: 'Stoic', description: 'Shows little emotion', color: '#4B5563' },
  { name: 'Vulnerable', description: 'Shows vulnerability', color: '#8B5CF6' },
  { name: 'Strong', description: 'Emotionally strong', color: '#10B981' },
  
  // Background
  { name: 'Orphan', description: 'Lost parents', color: '#7C3AED' },
  { name: 'Noble', description: 'High social status', color: '#F59E0B' },
  { name: 'Commoner', description: 'Low social status', color: '#6B7280' },
  { name: 'Outcast', description: 'Rejected by society', color: '#EF4444' },
  { name: 'Chosen One', description: 'Destined for greatness', color: '#3B82F6' },
  
  // Combat
  { name: 'Warrior', description: 'Fights in combat', color: '#EF4444' },
  { name: 'Pacifist', description: 'Avoids violence', color: '#10B981' },
  { name: 'Strategist', description: 'Plans ahead', color: '#6366F1' },
  { name: 'Berserker', description: 'Fights recklessly', color: '#DC2626' },
  
  // Intelligence
  { name: 'Genius', description: 'Highly intelligent', color: '#3B82F6' },
  { name: 'Average', description: 'Normal intelligence', color: '#6B7280' },
  { name: 'Naive', description: 'Lacks experience', color: '#FBBF24' },
  { name: 'Wise', description: 'Shows wisdom', color: '#8B5CF6' },
  
  // Morality
  { name: 'Good', description: 'Moral character', color: '#10B981' },
  { name: 'Evil', description: 'Immoral character', color: '#DC2626' },
  { name: 'Neutral', description: 'Moral ambiguity', color: '#6B7280' },
  { name: 'Redeemed', description: 'Changed for better', color: '#3B82F6' },
  { name: 'Corrupted', description: 'Changed for worse', color: '#EF4444' },
];

/**
 * Ensures all predefined tags exist in the database
 * Creates any missing tags
 */
export async function ensurePredefinedTags(supabase: any): Promise<void> {
  try {
    // Fetch all existing tags
    const { data: existingTags } = await supabase
      .from('tags')
      .select('name');

    const existingTagNames = new Set(
      existingTags?.map((tag: { name: string }) => tag.name.toLowerCase()) || []
    );

    // Find tags that don't exist
    const tagsToCreate = PREDEFINED_TAGS.filter(
      tag => !existingTagNames.has(tag.name.toLowerCase())
    );

    // Create missing tags
    if (tagsToCreate.length > 0) {
      const { error } = await supabase
        .from('tags')
        .insert(
          tagsToCreate.map(tag => ({
            name: tag.name,
            description: tag.description,
            color: tag.color,
          }))
        );

      if (error) {
        console.error('Error creating predefined tags:', error);
      }
    }
  } catch (error) {
    console.error('Error ensuring predefined tags:', error);
  }
}


