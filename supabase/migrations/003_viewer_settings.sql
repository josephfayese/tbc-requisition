-- 003_viewer_settings.sql
-- Group dashboard access control stored in settings table

INSERT INTO settings (key, value) VALUES ('viewer_passcode', 'ZION26') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('viewer_open', 'false') ON CONFLICT (key) DO NOTHING;
