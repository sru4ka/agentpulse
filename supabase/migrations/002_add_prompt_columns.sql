-- Add prompt replay columns to events table
-- (Optional: the app stores prompt data in the metadata JSONB column,
-- but dedicated columns enable faster queries and indexing)
--
-- Run this in Supabase SQL Editor if you want dedicated columns:

ALTER TABLE events ADD COLUMN IF NOT EXISTS prompt_messages JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS response_text TEXT;

-- Add unique constraint on agents to prevent duplicate names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_user_name ON agents(user_id, name);
