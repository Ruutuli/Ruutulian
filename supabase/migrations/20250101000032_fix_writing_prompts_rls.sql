-- Add RLS policies for writing_prompts table if they don't exist
ALTER TABLE writing_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read active prompts
DROP POLICY IF EXISTS "Public can read active writing prompts" ON writing_prompts;
CREATE POLICY "Public can read active writing prompts"
  ON writing_prompts
  FOR SELECT
  TO public
  USING (is_active = true);

