-- Run once against an existing database that was created before header_color / automation.
ALTER TABLE lists ADD COLUMN IF NOT EXISTS header_color VARCHAR(32);
ALTER TABLE lists ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{}';
