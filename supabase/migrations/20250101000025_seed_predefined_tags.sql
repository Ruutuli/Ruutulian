-- Seed predefined tags for character categorization
-- These tags will be available as dropdown options

INSERT INTO tags (name, description, color) VALUES
  -- Character Types
  ('Protagonist', 'Main character or hero', '#3B82F6'),
  ('Antagonist', 'Villain or opposing force', '#EF4444'),
  ('Supporting Character', 'Secondary character', '#8B5CF6'),
  ('Side Character', 'Minor character', '#6B7280'),
  ('Cameo', 'Brief appearance', '#9CA3AF'),
  
  -- Personality Traits
  ('Heroic', 'Displays heroic qualities', '#10B981'),
  ('Villainous', 'Displays villainous qualities', '#DC2626'),
  ('Anti-Hero', 'Morally ambiguous hero', '#F59E0B'),
  ('Comic Relief', 'Provides humor', '#F97316'),
  ('Tragic', 'Tragic backstory or fate', '#7C3AED'),
  ('Optimistic', 'Positive outlook', '#FBBF24'),
  ('Pessimistic', 'Negative outlook', '#6B7280'),
  ('Sarcastic', 'Uses sarcasm', '#8B5CF6'),
  ('Serious', 'Serious demeanor', '#4B5563'),
  ('Playful', 'Playful personality', '#EC4899'),
  
  -- Role/Function
  ('Mentor', 'Guides others', '#6366F1'),
  ('Student', 'Learns from others', '#14B8A6'),
  ('Leader', 'Takes charge', '#F59E0B'),
  ('Follower', 'Follows others', '#6B7280'),
  ('Loner', 'Prefers solitude', '#4B5563'),
  ('Team Player', 'Works well in groups', '#10B981'),
  ('Rebel', 'Challenges authority', '#EF4444'),
  ('Loyal', 'Shows loyalty', '#3B82F6'),
  ('Betrayer', 'Betrays others', '#DC2626'),
  
  -- Relationships
  ('Love Interest', 'Romantic interest', '#EC4899'),
  ('Best Friend', 'Close friend', '#8B5CF6'),
  ('Rival', 'Competes with others', '#F59E0B'),
  ('Enemy', 'Hostile relationship', '#EF4444'),
  ('Family', 'Family member', '#10B981'),
  ('Ally', 'Supports others', '#3B82F6'),
  
  -- Power/Ability
  ('Powerful', 'Has significant power', '#F59E0B'),
  ('Weak', 'Lacks power', '#6B7280'),
  ('Magical', 'Uses magic', '#8B5CF6'),
  ('Non-Magical', 'No magic abilities', '#4B5563'),
  ('Supernatural', 'Supernatural abilities', '#7C3AED'),
  ('Human', 'Regular human', '#6B7280'),
  
  -- Development
  ('Character Growth', 'Shows development', '#10B981'),
  ('Static Character', 'Little to no change', '#6B7280'),
  ('Complex', 'Multi-dimensional', '#6366F1'),
  ('Simple', 'Straightforward character', '#9CA3AF'),
  
  -- Story Role
  ('Main Character', 'Central to story', '#3B82F6'),
  ('Plot Device', 'Drives plot forward', '#8B5CF6'),
  ('Red Herring', 'Misleading character', '#F59E0B'),
  ('Sacrifice', 'Sacrifices for others', '#EF4444'),
  ('Survivor', 'Survives hardships', '#10B981'),
  
  -- Emotional
  ('Emotional', 'Shows strong emotions', '#EC4899'),
  ('Stoic', 'Shows little emotion', '#4B5563'),
  ('Vulnerable', 'Shows vulnerability', '#8B5CF6'),
  ('Strong', 'Emotionally strong', '#10B981'),
  
  -- Background
  ('Orphan', 'Lost parents', '#7C3AED'),
  ('Noble', 'High social status', '#F59E0B'),
  ('Commoner', 'Low social status', '#6B7280'),
  ('Outcast', 'Rejected by society', '#EF4444'),
  ('Chosen One', 'Destined for greatness', '#3B82F6'),
  
  -- Combat
  ('Warrior', 'Fights in combat', '#EF4444'),
  ('Pacifist', 'Avoids violence', '#10B981'),
  ('Strategist', 'Plans ahead', '#6366F1'),
  ('Berserker', 'Fights recklessly', '#DC2626'),
  
  -- Intelligence
  ('Genius', 'Highly intelligent', '#3B82F6'),
  ('Average', 'Normal intelligence', '#6B7280'),
  ('Naive', 'Lacks experience', '#FBBF24'),
  ('Wise', 'Shows wisdom', '#8B5CF6'),
  
  -- Morality
  ('Good', 'Moral character', '#10B981'),
  ('Evil', 'Immoral character', '#DC2626'),
  ('Neutral', 'Moral ambiguity', '#6B7280'),
  ('Redeemed', 'Changed for better', '#3B82F6'),
  ('Corrupted', 'Changed for worse', '#EF4444')
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE tags IS 'Tag definitions for categorizing characters. Includes predefined tags and user-created tags.';

