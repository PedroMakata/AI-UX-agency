-- Add is_global flag to files table for global file visibility
ALTER TABLE files ADD COLUMN is_global BOOLEAN DEFAULT FALSE;

-- Make project_id nullable for global files
ALTER TABLE files ALTER COLUMN project_id DROP NOT NULL;

-- Add index for efficient global file queries
CREATE INDEX idx_files_is_global ON files(is_global) WHERE is_global = TRUE;

-- Add composite index for project + global file lookups
CREATE INDEX idx_files_project_or_global ON files(project_id, is_global);
