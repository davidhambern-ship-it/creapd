BEGIN;

CREATE SCHEMA IF NOT EXISTS creapd;

CREATE TABLE IF NOT EXISTS creapd.artist_profiles (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  public_name text,
  bio_summary text,
  artistic_message text,
  interview_style text NOT NULL DEFAULT 'conversational',
  source_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  knowledge jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS artist_profiles_owner_unique
  ON creapd.artist_profiles (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.artist_catalog_tracks (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES creapd.artist_profiles(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  album text,
  release_year text,
  description text,
  lyrics text,
  source_type text NOT NULL DEFAULT 'manual',
  source_url text,
  audio_url text,
  artwork_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_catalog_owner_idx
  ON creapd.artist_catalog_tracks (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS artist_catalog_profile_idx
  ON creapd.artist_catalog_tracks (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS creapd.artist_interview_sessions (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES creapd.artist_profiles(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  configuration_id text REFERENCES creapd.music_production_configurations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  current_question text,
  summary text,
  question_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_interview_sessions_owner_idx
  ON creapd.artist_interview_sessions (owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS creapd.artist_interview_turns (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES creapd.artist_interview_sessions(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  answer_text text,
  audio_url text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artist_interview_turns_session_idx
  ON creapd.artist_interview_turns (session_id, sequence ASC);

INSERT INTO creapd.schema_migrations (version, description)
VALUES ('008', 'Artist Show profiles, catalog, and recorded CREAPr interviews')
ON CONFLICT (version) DO NOTHING;

COMMIT;
