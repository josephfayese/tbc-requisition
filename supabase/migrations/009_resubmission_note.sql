-- Add resubmission_note column so initiators can explain changes when resubmitting a rejected item
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS resubmission_note TEXT;
