-- Create writing_prompt_responses table
CREATE TABLE IF NOT EXISTS writing_prompt_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ocs(id) ON DELETE CASCADE,
  other_oc_id UUID REFERENCES ocs(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_writing_prompt_responses_oc_id ON writing_prompt_responses(oc_id);
CREATE INDEX IF NOT EXISTS idx_writing_prompt_responses_other_oc_id ON writing_prompt_responses(other_oc_id);
CREATE INDEX IF NOT EXISTS idx_writing_prompt_responses_created_at ON writing_prompt_responses(oc_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE writing_prompt_responses IS 'Stores responses to writing prompts generated for characters';
COMMENT ON COLUMN writing_prompt_responses.oc_id IS 'Primary character the response is associated with';
COMMENT ON COLUMN writing_prompt_responses.other_oc_id IS 'Optional second character involved in the prompt';
COMMENT ON COLUMN writing_prompt_responses.category IS 'Category of the writing prompt (e.g., First Meeting, Trust & Reliance)';
COMMENT ON COLUMN writing_prompt_responses.prompt_text IS 'The full prompt text';
COMMENT ON COLUMN writing_prompt_responses.response_text IS 'The user''s response/answer to the prompt';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_writing_prompt_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_writing_prompt_responses_updated_at
  BEFORE UPDATE ON writing_prompt_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_writing_prompt_responses_updated_at();

