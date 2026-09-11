BEGIN;

CREATE TABLE IF NOT EXISTS creapd.talk_production_configurations (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  show_id text REFERENCES creapd.shows(id) ON DELETE SET NULL,
  episode_id text REFERENCES creapd.episodes(id) ON DELETE SET NULL,
  production_name text NOT NULL,
  host_name text,
  co_host_name text,
  show_date date NOT NULL,
  show_start_time text,
  live_or_recorded text NOT NULL DEFAULT 'live',
  station_name text,
  show_description text,
  show_format text NOT NULL DEFAULT 'Interview Show',
  total_show_runtime numeric NOT NULL DEFAULT 60,
  talk_segment_runtime numeric NOT NULL DEFAULT 45,
  commercial_sponsor_runtime numeric NOT NULL DEFAULT 8,
  intro_runtime numeric NOT NULL DEFAULT 2,
  outro_runtime numeric NOT NULL DEFAULT 2,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_tone text NOT NULL DEFAULT 'Conversational',
  guest_details text,
  ai_automation jsonb NOT NULL DEFAULT '[]'::jsonb,
  vo_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'configuring',
  is_default boolean NOT NULL DEFAULT false,
  build_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_id text,
  created_by_email text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_config_owner_idx
  ON creapd.talk_production_configurations (owner_user_id);
CREATE INDEX IF NOT EXISTS talk_config_owner_default_idx
  ON creapd.talk_production_configurations (owner_user_id, is_default, updated_at DESC);
CREATE INDEX IF NOT EXISTS talk_config_episode_idx
  ON creapd.talk_production_configurations (episode_id);

CREATE TABLE IF NOT EXISTS creapd.talk_topics (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  topic_name text NOT NULL,
  generated_summary text,
  talking_points text,
  sources text,
  source_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_placement text,
  verification_status text NOT NULL DEFAULT 'unverified',
  verification_notes text,
  counter_perspectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  debate_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready',
  display_order integer NOT NULL DEFAULT 0,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_topics_config_idx ON creapd.talk_topics (configuration_id, display_order);
CREATE INDEX IF NOT EXISTS talk_topics_owner_idx ON creapd.talk_topics (owner_user_id);
CREATE INDEX IF NOT EXISTS talk_topics_status_idx ON creapd.talk_topics (configuration_id, status);

CREATE TABLE IF NOT EXISTS creapd.talk_research_items (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  topic_name text,
  title text NOT NULL,
  source text,
  source_url text,
  category text,
  summary text,
  research_date date,
  relevance text NOT NULL DEFAULT 'medium',
  verification_status text NOT NULL DEFAULT 'unverified',
  verification_notes text,
  confidence_score numeric NOT NULL DEFAULT 0,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_research_config_idx ON creapd.talk_research_items (configuration_id, created_at);
CREATE INDEX IF NOT EXISTS talk_research_owner_idx ON creapd.talk_research_items (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.talk_guests (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  guest_name text NOT NULL,
  title_role text,
  organization text,
  bio text,
  expertise text,
  website_url text,
  social_handle text,
  talking_points text,
  photo_prompt text,
  status text NOT NULL DEFAULT 'pending',
  availability_status text NOT NULL DEFAULT 'manual',
  guest_source text NOT NULL DEFAULT 'manual',
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_guests_config_idx ON creapd.talk_guests (configuration_id, created_at);
CREATE INDEX IF NOT EXISTS talk_guests_owner_idx ON creapd.talk_guests (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.talk_segments (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  order_index integer NOT NULL DEFAULT 0,
  segment_type text NOT NULL DEFAULT 'interview',
  title text,
  duration_seconds numeric NOT NULL DEFAULT 0,
  start_time text,
  end_time text,
  notes text,
  status text NOT NULL DEFAULT 'ready',
  runtime_status text NOT NULL DEFAULT 'queued',
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  actual_duration_seconds numeric,
  clip_marker_count integer NOT NULL DEFAULT 0,
  obs_scene text,
  overlay_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_segments_config_idx ON creapd.talk_segments (configuration_id, order_index);
CREATE INDEX IF NOT EXISTS talk_segments_owner_idx ON creapd.talk_segments (owner_user_id);
CREATE INDEX IF NOT EXISTS talk_segments_runtime_idx ON creapd.talk_segments (configuration_id, runtime_status);

CREATE TABLE IF NOT EXISTS creapd.talk_assets (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  asset_type text NOT NULL,
  title text,
  content text,
  audio_url text,
  associated_topic text,
  status text NOT NULL DEFAULT 'ready',
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_assets_config_idx ON creapd.talk_assets (configuration_id, created_at);
CREATE INDEX IF NOT EXISTS talk_assets_owner_idx ON creapd.talk_assets (owner_user_id);
CREATE INDEX IF NOT EXISTS talk_assets_type_idx ON creapd.talk_assets (configuration_id, asset_type);

CREATE TABLE IF NOT EXISTS creapd.talk_sessions (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  episode_id text REFERENCES creapd.episodes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready',
  active_segment_id text REFERENCES creapd.talk_segments(id) ON DELETE SET NULL,
  started_at timestamptz,
  ended_at timestamptz,
  paused_at timestamptz,
  elapsed_seconds numeric NOT NULL DEFAULT 0,
  obs_connection_status text NOT NULL DEFAULT 'disconnected',
  host_view_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_sessions_config_idx ON creapd.talk_sessions (configuration_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS talk_sessions_owner_idx ON creapd.talk_sessions (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.talk_events (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES creapd.talk_sessions(id) ON DELETE CASCADE,
  configuration_id text NOT NULL REFERENCES creapd.talk_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  segment_id text REFERENCES creapd.talk_segments(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talk_events_session_idx ON creapd.talk_events (session_id, event_at);
CREATE INDEX IF NOT EXISTS talk_events_config_idx ON creapd.talk_events (configuration_id, event_at);
CREATE INDEX IF NOT EXISTS talk_events_type_idx ON creapd.talk_events (configuration_id, event_type);

INSERT INTO creapd.schema_migrations (version, description)
SELECT '004', 'Owned Talk Studio persistence, agent intelligence fields, and live session event foundation'
WHERE NOT EXISTS (
  SELECT 1 FROM creapd.schema_migrations WHERE version = '004'
);

COMMIT;
