-- Notes System Migration
-- Creates tables for project notes with hierarchical structure

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB DEFAULT '[]'::jsonb,
  type TEXT DEFAULT 'page' CHECK (type IN ('page', 'section')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by project
CREATE INDEX idx_notes_project ON notes(project_id);

-- Index for fast lookup of children
CREATE INDEX idx_notes_parent ON notes(parent_id);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies for notes (allowing full access for now, can be restricted later)
CREATE POLICY "Allow all access to notes" ON notes
  FOR ALL USING (true) WITH CHECK (true);
