-- Add Notion sync columns to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Index for fast lookup by Notion page ID
CREATE INDEX IF NOT EXISTS idx_notes_notion_page_id ON notes(notion_page_id);
