BEGIN;

CREATE TABLE IF NOT EXISTS creapd.music_production_configurations (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  show_id text REFERENCES creapd.shows(id) ON DELETE SET NULL,
  episode_id text REFERENCES creapd.episodes(id) ON DELETE SET NULL,
  production_name text NOT NULL,
  host_name text,
  co_host_name text,
  show_date date NOT NULL,
  show_start_time text NOT NULL DEFAULT '06:00',
  production_format text NOT NULL DEFAULT 'radio',
  station_name text,
  show_description text,
  total_show_runtime numeric NOT NULL DEFAULT 90,
  required_music_runtime numeric NOT NULL DEFAULT 45,
  talk_segment_runtime numeric NOT NULL DEFAULT 30,
  commercial_sponsor_runtime numeric NOT NULL DEFAULT 8,
  intro_runtime numeric NOT NULL DEFAULT 2,
  outro_runtime numeric NOT NULL DEFAULT 2,
  genres jsonb NOT NULL DEFAULT '[]'::jsonb,
  moods jsonb NOT NULL DEFAULT '[]'::jsonb,
  show_tone text NOT NULL DEFAULT 'Professional',
  music_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  must_play_songs text,
  blocked_songs text,
  blocked_artists text,
  recently_played_songs text,
  max_songs_per_artist integer NOT NULL DEFAULT 2,
  min_artist_variety boolean NOT NULL DEFAULT true,
  include_indie boolean NOT NULL DEFAULT true,
  include_local boolean NOT NULL DEFAULT false,
  include_new_releases boolean NOT NULL DEFAULT true,
  include_throwbacks boolean NOT NULL DEFAULT false,
  clean_only boolean NOT NULL DEFAULT false,
  explicit_allowed boolean NOT NULL DEFAULT false,
  preferred_eras text,
  playlist_energy_flow text NOT NULL DEFAULT 'Build Energy Gradually',
  pacing_rules jsonb NOT NULL DEFAULT '{"max_sequential_songs":4,"min_talk_break_frequency":1}'::jsonb,
  ai_automation jsonb NOT NULL DEFAULT '["Auto Research","Auto Build Playlist","Auto Develop","Auto Assemble Packet"]'::jsonb,
  vo_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  production_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  build_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  build_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'configuring',
  is_default boolean NOT NULL DEFAULT false,
  created_by_email text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS music_config_owner_idx ON creapd.music_production_configurations (owner_user_id);
CREATE INDEX IF NOT EXISTS music_config_owner_default_idx ON creapd.music_production_configurations (owner_user_id, is_default, updated_at DESC);
CREATE INDEX IF NOT EXISTS music_config_status_idx ON creapd.music_production_configurations (owner_user_id, status);

CREATE TABLE IF NOT EXISTS creapd.music_playlist_items (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  order_index integer NOT NULL DEFAULT 0,
  song_title text NOT NULL,
  artist text NOT NULL,
  length_seconds numeric NOT NULL DEFAULT 180,
  genre text,
  mood text,
  era_year text,
  album text,
  release_year text,
  reason_selected text,
  status text NOT NULL DEFAULT 'suggested',
  note text,
  intro_generated boolean NOT NULL DEFAULT false,
  artist_fact_generated boolean NOT NULL DEFAULT false,
  youtube_video_id text,
  thumbnail_url text,
  channel_name text,
  source text NOT NULL DEFAULT 'ai_generated',
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_playlist_config_idx ON creapd.music_playlist_items (configuration_id, order_index);
CREATE INDEX IF NOT EXISTS music_playlist_owner_idx ON creapd.music_playlist_items (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.music_topics (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  topic_name text NOT NULL,
  generated_summary text,
  talking_points text,
  sources text,
  suggested_placement text,
  status text NOT NULL DEFAULT 'ready',
  added_to_rundown boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_topics_config_idx ON creapd.music_topics (configuration_id, display_order);
CREATE INDEX IF NOT EXISTS music_topics_owner_idx ON creapd.music_topics (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.music_research_items (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  source text,
  category text,
  summary text,
  url text,
  suggested_angle text,
  research_date date,
  relevance text NOT NULL DEFAULT 'medium',
  added_to_rundown boolean NOT NULL DEFAULT false,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_research_config_idx ON creapd.music_research_items (configuration_id, created_at);
CREATE INDEX IF NOT EXISTS music_research_owner_idx ON creapd.music_research_items (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.music_rundown_items (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  order_index integer NOT NULL DEFAULT 0,
  segment_type text NOT NULL DEFAULT 'talk_break',
  title text,
  script_content text,
  start_time text,
  duration_seconds numeric NOT NULL DEFAULT 0,
  end_time text,
  notes text,
  status text NOT NULL DEFAULT 'planned',
  associated_song_id text REFERENCES creapd.music_playlist_items(id) ON DELETE SET NULL,
  associated_song_title text,
  associated_topic text,
  audio_url text,
  audio_provider text NOT NULL DEFAULT 'native',
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_rundown_config_idx ON creapd.music_rundown_items (configuration_id, order_index);
CREATE INDEX IF NOT EXISTS music_rundown_owner_idx ON creapd.music_rundown_items (owner_user_id);

CREATE TABLE IF NOT EXISTS creapd.music_assets (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  asset_type text NOT NULL,
  title text,
  content text,
  associated_song_id text REFERENCES creapd.music_playlist_items(id) ON DELETE SET NULL,
  associated_song_title text,
  associated_topic text,
  status text NOT NULL DEFAULT 'ready',
  generated_image_url text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_assets_config_idx ON creapd.music_assets (configuration_id, created_at);
CREATE INDEX IF NOT EXISTS music_assets_owner_idx ON creapd.music_assets (owner_user_id);
CREATE INDEX IF NOT EXISTS music_assets_type_idx ON creapd.music_assets (configuration_id, asset_type);

CREATE TABLE IF NOT EXISTS creapd.music_top10_items (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES creapd.music_production_configurations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  youtube_video_id text NOT NULL,
  thumbnail_url text,
  channel_name text,
  locked boolean NOT NULL DEFAULT false,
  note text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_top10_config_idx ON creapd.music_top10_items (configuration_id, order_index);
CREATE INDEX IF NOT EXISTS music_top10_owner_idx ON creapd.music_top10_items (owner_user_id);

INSERT INTO creapd.schema_migrations (version, description)
SELECT '007', 'Owned Music Studio configuration, playlist, research, topics, assets, Top 10, and rundown persistence'
WHERE NOT EXISTS (SELECT 1 FROM creapd.schema_migrations WHERE version = '007');

COMMIT;
