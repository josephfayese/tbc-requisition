-- 002_reminders_visibility.sql
-- Per-item justification
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS justification text;

-- Retirement due date (paid_at + 15 days) and reminder tracking
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS retirement_due_at timestamptz;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS retirement_reminder_sent_at timestamptz;

-- Per-item attachment support (nullable — old attachments remain req-level)
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS line_item_id integer references line_items(id);

-- Module visibility setting — controls which roles see which sidebar modules
-- Default: retirement open to all; others keep their current defaults
INSERT INTO settings (key, value)
VALUES (
  'module_visibility',
  '{"retirement":["hod","dg","backup","finance","pastor","chima","admin"],"reconciliation":["finance","chima","admin"],"payments":["chima","admin"],"approve":["dg","finance","pastor","chima","admin"]}'
)
ON CONFLICT (key) DO NOTHING;
