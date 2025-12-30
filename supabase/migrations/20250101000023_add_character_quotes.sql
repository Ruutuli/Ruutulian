-- Create character_quotes table
CREATE TABLE IF NOT EXISTS character_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_character_quotes_oc_id ON character_quotes(oc_id);

-- Add comments for documentation
COMMENT ON TABLE character_quotes IS 'Stores memorable quotes for characters';
COMMENT ON COLUMN character_quotes.oc_id IS 'Reference to the character';
COMMENT ON COLUMN character_quotes.quote_text IS 'The quote text';
COMMENT ON COLUMN character_quotes.context IS 'Optional context about when/where the quote was said';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_character_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_character_quotes_updated_at
  BEFORE UPDATE ON character_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_character_quotes_updated_at();

