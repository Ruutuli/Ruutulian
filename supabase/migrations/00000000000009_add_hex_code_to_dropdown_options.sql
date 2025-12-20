-- Add hex_code column to dropdown_options table for storing color hex codes
-- This allows colors to be stored in the database with their hex values

ALTER TABLE dropdown_options 
ADD COLUMN IF NOT EXISTS hex_code text;

-- Add comment
COMMENT ON COLUMN dropdown_options.hex_code IS 'Optional hex color code (e.g., #FF5733) for color-related options like eye_color, hair_color, skin_tone';

-- Create index on hex_code for color lookups
CREATE INDEX IF NOT EXISTS idx_dropdown_options_hex_code ON dropdown_options(hex_code) WHERE hex_code IS NOT NULL;










