-- Wonderful — InsForge schema
-- Apply with:  npx @insforge/cli db query "$(cat docs/insforge-schema.sql)"
-- (or paste into the InsForge dashboard SQL editor)
--
-- Demo-friendly RLS: anonymous players can record runs/memories so the game is
-- always playable. When a player signs in, their user_id is stamped on rows and
-- they additionally own them. Tighten the anon policies before any real launch.

-- ---------------------------------------------------------------------------
-- agent_memories : every decision an agent makes, persisted across sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id   TEXT NOT NULL,
  content    TEXT NOT NULL,
  importance REAL NOT NULL DEFAULT 0.5,
  turn       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_memories" ON agent_memories
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone_can_read_memories" ON agent_memories
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS agent_memories_agent_idx ON agent_memories (agent_id);

-- ---------------------------------------------------------------------------
-- agent_runs : summary of a completed game — powers the leaderboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name     TEXT NOT NULL,
  agent_role     TEXT NOT NULL,
  level          INTEGER NOT NULL DEFAULT 1,
  xp             INTEGER NOT NULL DEFAULT 0,
  turns          INTEGER NOT NULL DEFAULT 0,
  final_strategy TEXT,
  score          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_runs" ON agent_runs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone_can_read_runs" ON agent_runs
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS agent_runs_score_idx ON agent_runs (score DESC);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON agent_memories, agent_runs TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- summoned_agents : characters created on the Summon screen, persisted so a
-- player's party survives a reload and follows them across sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS summoned_agents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id   TEXT NOT NULL UNIQUE,   -- one current row per character (enables upsert)
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  level      INTEGER NOT NULL DEFAULT 1,
  xp         INTEGER NOT NULL DEFAULT 0,
  strategy   TEXT,
  model_url  TEXT,                    -- InsForge-stored .glb URL for the 3D character
  snapshot   JSONB,                   -- full Agent object, so restore is lossless
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE summoned_agents ENABLE ROW LEVEL SECURITY;

-- Upsert-on-agent_id needs INSERT + UPDATE for anon (so re-saving a character —
-- e.g. once its model attaches — updates the row instead of duplicating it).
CREATE POLICY "anyone_can_insert_agents" ON summoned_agents
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone_can_read_agents" ON summoned_agents
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone_can_update_agents" ON summoned_agents
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS summoned_agents_agent_idx ON summoned_agents (agent_id);

-- ---------------------------------------------------------------------------
-- chat_messages : in-game Claude chat transcript, persisted across sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_chat" ON chat_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone_can_read_chat" ON chat_messages
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages (created_at);

GRANT SELECT, INSERT, UPDATE ON summoned_agents TO anon, authenticated;
GRANT SELECT, INSERT ON chat_messages TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for Meshy .glb character models
-- Create via CLI instead of SQL:
--   npx @insforge/cli storage create-bucket characters --public
-- ---------------------------------------------------------------------------
