-- Agent configuration key-value store
CREATE TABLE IF NOT EXISTS agent_config (
  id          TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read config
CREATE POLICY "authenticated_read_agent_config"
  ON agent_config FOR SELECT
  TO authenticated
  USING (true);

-- Seed the default system prompt (run once; subsequent updates go through the API)
-- INSERT INTO agent_config (id, value) VALUES ('system_prompt', '') ON CONFLICT DO NOTHING;
