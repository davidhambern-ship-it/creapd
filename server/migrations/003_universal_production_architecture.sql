BEGIN;

CREATE TABLE IF NOT EXISTS creapd.production_profiles (
  key text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  description text,
  route_path text,
  icon_key text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO creapd.production_profiles
  (key, name, short_name, description, route_path, icon_key, sort_order)
VALUES
  ('news', 'News Production', 'News', 'Daily news briefings, breaking news, story queues, teleprompter scripts, and broadcast production packages.', '/news/dashboard', 'newspaper', 10),
  ('research', 'Research Production', 'Research', 'Deep research investigations, multi-model synthesized packages, and evidence-based production assets from any topic.', '/research/dashboard', 'flask-conical', 20),
  ('talk', 'Talk Production', 'Talk', 'Talk shows, interview programs, panel discussions, and conversation-driven content.', '/talk/dashboard', 'mic-2', 30),
  ('sports', 'Sports Production', 'Sports', 'Game previews, recaps, scoreboard updates, athlete interviews, and sports commentary shows.', '/sports/dashboard', 'trophy', 40),
  ('music', 'Music Production', 'Music', 'Radio shows, music shows, playlist-based livestreams, countdown shows, and artist spotlights.', '/music/configure', 'music', 50),
  ('cooking', 'Cooking Production', 'Cooking', 'Recipe shows, cooking tutorials, ingredient spotlights, and culinary entertainment programs.', '/cooking/dashboard', 'chef-hat', 60),
  ('spiritual', 'Spiritual Production', 'Spiritual', 'Sermons, Bible studies, devotionals, worship services, prayer meetings, and faith-based content for any tradition.', '/spiritual/dashboard', 'church', 70),
  ('cosmo', 'Cosmo Production', 'Cosmo', 'Health & beauty shows, skincare tutorials, wellness programs, product reviews, and cosmetic education content.', '/cosmo/dashboard', 'brush', 80)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS creapd.shows (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  production_profile text NOT NULL REFERENCES creapd.production_profiles(key) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  brand_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  format_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system text NOT NULL DEFAULT 'creapd',
  source_entity_type text,
  source_entity_id text,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shows_owner_idx ON creapd.shows (owner_user_id);
CREATE INDEX IF NOT EXISTS shows_profile_idx ON creapd.shows (production_profile);
CREATE INDEX IF NOT EXISTS shows_owner_profile_idx ON creapd.shows (owner_user_id, production_profile);
CREATE INDEX IF NOT EXISTS shows_status_idx ON creapd.shows (status);
CREATE UNIQUE INDEX IF NOT EXISTS shows_source_entity_uidx
  ON creapd.shows (source_system, source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS creapd.episodes (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  production_profile text NOT NULL REFERENCES creapd.production_profiles(key) ON DELETE RESTRICT,
  show_id text REFERENCES creapd.shows(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  episode_number integer,
  scheduled_at timestamptz,
  published_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system text NOT NULL DEFAULT 'creapd',
  source_entity_type text,
  source_entity_id text,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS episodes_owner_idx ON creapd.episodes (owner_user_id);
CREATE INDEX IF NOT EXISTS episodes_profile_idx ON creapd.episodes (production_profile);
CREATE INDEX IF NOT EXISTS episodes_show_idx ON creapd.episodes (show_id);
CREATE INDEX IF NOT EXISTS episodes_owner_profile_idx ON creapd.episodes (owner_user_id, production_profile);
CREATE INDEX IF NOT EXISTS episodes_status_idx ON creapd.episodes (status);
CREATE INDEX IF NOT EXISTS episodes_scheduled_idx ON creapd.episodes (scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS episodes_source_entity_uidx
  ON creapd.episodes (source_system, source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL;

ALTER TABLE creapd.production_packages
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS show_id text,
  ADD COLUMN IF NOT EXISTS episode_id text;

ALTER TABLE creapd.production_packages
  ADD CONSTRAINT production_packages_profile_fk FOREIGN KEY (production_profile) REFERENCES creapd.production_profiles(key) ON DELETE RESTRICT,
  ADD CONSTRAINT production_packages_owner_fk FOREIGN KEY (owner_user_id) REFERENCES creapd.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT production_packages_show_fk FOREIGN KEY (show_id) REFERENCES creapd.shows(id) ON DELETE SET NULL,
  ADD CONSTRAINT production_packages_episode_fk FOREIGN KEY (episode_id) REFERENCES creapd.episodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS production_packages_profile_idx ON creapd.production_packages (production_profile);
CREATE INDEX IF NOT EXISTS production_packages_show_idx ON creapd.production_packages (show_id);
CREATE INDEX IF NOT EXISTS production_packages_episode_idx ON creapd.production_packages (episode_id);
CREATE INDEX IF NOT EXISTS production_packages_episode_status_idx ON creapd.production_packages (episode_id, status);

CREATE TABLE IF NOT EXISTS creapd.presentations (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE RESTRICT,
  production_profile text NOT NULL REFERENCES creapd.production_profiles(key) ON DELETE RESTRICT,
  show_id text REFERENCES creapd.shows(id) ON DELETE SET NULL,
  episode_id text REFERENCES creapd.episodes(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  presentation_mode text NOT NULL DEFAULT 'standard',
  director_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_system text NOT NULL DEFAULT 'creapd',
  source_entity_type text,
  source_entity_id text,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  source_created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS presentations_owner_idx ON creapd.presentations (owner_user_id);
CREATE INDEX IF NOT EXISTS presentations_profile_idx ON creapd.presentations (production_profile);
CREATE INDEX IF NOT EXISTS presentations_show_idx ON creapd.presentations (show_id);
CREATE INDEX IF NOT EXISTS presentations_episode_idx ON creapd.presentations (episode_id);
CREATE INDEX IF NOT EXISTS presentations_status_idx ON creapd.presentations (status);
CREATE UNIQUE INDEX IF NOT EXISTS presentations_source_entity_uidx
  ON creapd.presentations (source_system, source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS creapd.presentation_packages (
  presentation_id text NOT NULL REFERENCES creapd.presentations(id) ON DELETE CASCADE,
  production_package_id text NOT NULL REFERENCES creapd.production_packages(id) ON DELETE RESTRICT,
  position integer NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'content',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (presentation_id, production_package_id)
);

CREATE INDEX IF NOT EXISTS presentation_packages_package_idx
  ON creapd.presentation_packages (production_package_id);
CREATE INDEX IF NOT EXISTS presentation_packages_order_idx
  ON creapd.presentation_packages (presentation_id, position);

INSERT INTO creapd.schema_migrations (version, description)
SELECT '003', 'Universal CREAPD production architecture: profiles, shows, episodes, packages, and presentations'
WHERE NOT EXISTS (
  SELECT 1 FROM creapd.schema_migrations WHERE version = '003'
);

COMMIT;
