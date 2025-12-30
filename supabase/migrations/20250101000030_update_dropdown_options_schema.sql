-- Update dropdown_options table schema to match expected structure
-- Rename 'value' column to 'option' and add 'hex_code' column

-- Add hex_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dropdown_options' AND column_name = 'hex_code'
  ) THEN
    ALTER TABLE dropdown_options ADD COLUMN hex_code TEXT NULL;
  END IF;
END $$;

-- Rename 'value' column to 'option' if it exists and 'option' doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dropdown_options' AND column_name = 'value'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dropdown_options' AND column_name = 'option'
  ) THEN
    ALTER TABLE dropdown_options RENAME COLUMN value TO option;
  END IF;
END $$;

-- Update unique constraint to use 'option' instead of 'value' if needed
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dropdown_options_field_value_key'
  ) THEN
    ALTER TABLE dropdown_options DROP CONSTRAINT dropdown_options_field_value_key;
  END IF;
  
  -- Add new constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dropdown_options_field_option_key'
  ) THEN
    ALTER TABLE dropdown_options ADD CONSTRAINT dropdown_options_field_option_key UNIQUE (field, option);
  END IF;
END $$;

-- Create index on hex_code if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_dropdown_options_hex_code 
  ON dropdown_options(hex_code) 
  WHERE hex_code IS NOT NULL;


