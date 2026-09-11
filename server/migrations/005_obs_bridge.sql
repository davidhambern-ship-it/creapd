BEGIN;

CREATE TABLE IF NOT EXISTS creapd.obs_bridges (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Studio OBS',
  token_hash text NOT NULL UNIQUE,
  token_hint text,
  status text NOT NULL DEFAULT 'pairing',
  obs_connected boolean NOT NULL DEFAULT false,
  obs_endpoint text,
  obs_studio_version text,
  obs_websocket_version text,
  current_scene text,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  last_error text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS obs_bridges_owner_idx
  ON creapd.obs_bridges (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS obs_bridges_active_idx
  ON creapd.obs_bridges (owner_user_id, revoked_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS obs_bridges_last_seen_idx
  ON creapd.obs_bridges (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS creapd.obs_commands (
  id text PRIMARY KEY,
  bridge_id text NOT NULL REFERENCES creapd.obs_bridges(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  session_type text,
  session_id text,
  command_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS obs_commands_bridge_queue_idx
  ON creapd.obs_commands (bridge_id, status, requested_at ASC);
CREATE INDEX IF NOT EXISTS obs_commands_owner_idx
  ON creapd.obs_commands (owner_user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS obs_commands_session_idx
  ON creapd.obs_commands (session_type, session_id, requested_at DESC);

INSERT INTO creapd.schema_migrations (version, description)
SELECT '005', 'Owned local OBS bridge pairing, heartbeat, scene state, and command queue'
WHERE NOT EXISTS (
  SELECT 1 FROM creapd.schema_migrations WHERE version = '005'
);

COMMIT;
