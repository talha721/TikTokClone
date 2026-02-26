-- Add parent_id to comments table for nested replies
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;

-- Index for fast lookup of replies by parent
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
