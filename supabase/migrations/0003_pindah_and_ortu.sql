-- Rename nama_ibu to nama_ortu since we merged ayah and ibu
ALTER TABLE balita RENAME COLUMN nama_ibu TO nama_ortu;

-- Drop nama_ayah as it's no longer used
ALTER TABLE balita DROP COLUMN IF EXISTS nama_ayah;

-- Add is_pindah to track moved children
ALTER TABLE balita ADD COLUMN IF NOT EXISTS is_pindah BOOLEAN DEFAULT false;
