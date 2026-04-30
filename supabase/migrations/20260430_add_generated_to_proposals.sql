ALTER TABLE proposal_requests
  ADD COLUMN IF NOT EXISTS generated_url  TEXT,
  ADD COLUMN IF NOT EXISTS generated_at   TIMESTAMPTZ;
