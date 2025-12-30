-- Create writing_prompts table
CREATE TABLE IF NOT EXISTS writing_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  requires_two_characters BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_writing_prompts_category ON writing_prompts(category);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_requires_two_characters ON writing_prompts(requires_two_characters);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_is_active ON writing_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_writing_prompts_created_at ON writing_prompts(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE writing_prompts IS 'Stores writing prompt templates for the prompt generator';
COMMENT ON COLUMN writing_prompts.category IS 'Category of the writing prompt (e.g., First Meeting, Trust & Reliance)';
COMMENT ON COLUMN writing_prompts.prompt_text IS 'The prompt text with placeholders like {character1} and {character2}';
COMMENT ON COLUMN writing_prompts.requires_two_characters IS 'Whether this prompt requires two characters (true) or is single-character (false)';
COMMENT ON COLUMN writing_prompts.is_active IS 'Whether this prompt is active and should be shown in the generator';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_writing_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_writing_prompts_updated_at
  BEFORE UPDATE ON writing_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_writing_prompts_updated_at();

-- Enable Row Level Security
ALTER TABLE writing_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read active prompts
DROP POLICY IF EXISTS "Public can read active writing prompts" ON writing_prompts;
CREATE POLICY "Public can read active writing prompts"
  ON writing_prompts
  FOR SELECT
  TO public
  USING (is_active = true);

