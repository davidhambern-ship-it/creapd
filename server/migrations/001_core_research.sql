-- CREAPD backend migration 001
-- Core identity bridge + Research Production Profile persistence.
--
-- Design rules for the Base44 -> Neon transition:
-- 1. Preserve existing Base44 IDs as primary keys so relationships survive import.
-- 2. Keep workflow/status fields as TEXT during migration. Live Base44 data contains
--    historical values that no longer satisfy the exported JSON schemas.
-- 3. Upgrade JSON-encoded strings to native JSONB in Postgres.
-- 4. Retain source metadata and the original payload for migration auditability.
-- 5. Do not add cross-table foreign keys until imported legacy relationships have
--    been validated. Indexes provide efficient lookups during the transition.

CREATE SCHEMA IF NOT EXISTS creapd;

CREATE TABLE IF NOT EXISTS creapd.schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creapd.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  source_system TEXT NOT NULL DEFAULT 'creapd',
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON creapd.users (LOWER(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS creapd.research_production_configurations (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  production_name TEXT NOT NULL,
  host_name TEXT,
  co_host_name TEXT,
  show_date DATE NOT NULL,
  show_start_time TEXT,
  live_or_recorded TEXT,
  station_name TEXT,
  show_description TEXT,
  total_show_runtime NUMERIC,
  research_depth TEXT,
  source_domains JSONB,
  research_methodology JSONB,
  target_audience TEXT,
  tone TEXT,
  reading_style TEXT,
  preferred_models JSONB,
  blocked_topics JSONB,
  must_include JSONB,
  fact_check_required BOOLEAN NOT NULL DEFAULT TRUE,
  citation_required BOOLEAN NOT NULL DEFAULT TRUE,
  max_points_per_topic INTEGER NOT NULL DEFAULT 10,
  vo_requirements JSONB,
  status TEXT NOT NULL DEFAULT 'configuring',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_id TEXT,
  created_by_email TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'creapd',
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_config_owner_idx
  ON creapd.research_production_configurations (owner_user_id);
CREATE INDEX IF NOT EXISTS research_config_status_idx
  ON creapd.research_production_configurations (status);
CREATE INDEX IF NOT EXISTS research_config_updated_idx
  ON creapd.research_production_configurations (updated_at DESC);

CREATE TABLE IF NOT EXISTS creapd.research_topics (
  id TEXT PRIMARY KEY,
  configuration_id TEXT NOT NULL,
  owner_user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  research_query TEXT,
  category TEXT,
  tags TEXT,
  priority TEXT NOT NULL DEFAULT 'standard',
  source_domains JSONB,
  research_depth TEXT NOT NULL DEFAULT 'standard',
  dossier_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  pipeline_stage TEXT NOT NULL DEFAULT 'idle',
  point_count INTEGER NOT NULL DEFAULT 0,
  approved_point_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  sources_count INTEGER NOT NULL DEFAULT 0,
  executive_summary TEXT,
  research_started_at TIMESTAMPTZ,
  research_completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  archived_date TIMESTAMPTZ,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_id TEXT,
  created_by_email TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'creapd',
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_topics_config_idx
  ON creapd.research_topics (configuration_id);
CREATE INDEX IF NOT EXISTS research_topics_owner_idx
  ON creapd.research_topics (owner_user_id);
CREATE INDEX IF NOT EXISTS research_topics_status_idx
  ON creapd.research_topics (status);
CREATE INDEX IF NOT EXISTS research_topics_pipeline_idx
  ON creapd.research_topics (pipeline_stage);
CREATE INDEX IF NOT EXISTS research_topics_updated_idx
  ON creapd.research_topics (updated_at DESC);

CREATE TABLE IF NOT EXISTS creapd.research_dossiers (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  article_id TEXT,
  topic_id TEXT,
  research_query TEXT NOT NULL,
  executive_summary TEXT,
  key_facts JSONB,
  context_and_background TEXT,
  key_people JSONB,
  key_organizations JSONB,
  timeline JSONB,
  counter_arguments JSONB,
  data_and_statistics JSONB,
  sources JSONB,
  coverage_angles JSONB,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'researching',
  error_message TEXT,
  discovery_raw_data JSONB,
  organization_structure JSONB,
  critical_analysis_report JSONB,
  debate_potential_score NUMERIC NOT NULL DEFAULT 0,
  claim_confidence_scores JSONB,
  role_assignments JSONB,
  orchestration_metadata JSONB,
  created_by_id TEXT,
  created_by_email TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'creapd',
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_dossiers_topic_idx
  ON creapd.research_dossiers (topic_id);
CREATE INDEX IF NOT EXISTS research_dossiers_article_idx
  ON creapd.research_dossiers (article_id);
CREATE INDEX IF NOT EXISTS research_dossiers_status_idx
  ON creapd.research_dossiers (status);
CREATE INDEX IF NOT EXISTS research_dossiers_updated_idx
  ON creapd.research_dossiers (updated_at DESC);

CREATE TABLE IF NOT EXISTS creapd.research_points (
  id TEXT PRIMARY KEY,
  configuration_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  owner_user_id TEXT,
  topic_title TEXT,
  title TEXT NOT NULL,
  content TEXT,
  point_type TEXT NOT NULL DEFAULT 'finding',
  key_facts JSONB,
  sources JSONB,
  significance TEXT,
  suggested_angle TEXT,
  suggested_segment TEXT,
  priority_score NUMERIC NOT NULL DEFAULT 5,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  package_id TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  archived_date TIMESTAMPTZ,
  created_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_id TEXT,
  created_by_email TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'creapd',
  source_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_points_config_idx
  ON creapd.research_points (configuration_id);
CREATE INDEX IF NOT EXISTS research_points_topic_idx
  ON creapd.research_points (topic_id);
CREATE INDEX IF NOT EXISTS research_points_status_idx
  ON creapd.research_points (status);
CREATE INDEX IF NOT EXISTS research_points_package_idx
  ON creapd.research_points (package_id);
CREATE INDEX IF NOT EXISTS research_points_topic_order_idx
  ON creapd.research_points (topic_id, display_order);

CREATE TABLE IF NOT EXISTS creapd.import_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_system TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  source_id TEXT NOT NULL,
  destination_table TEXT NOT NULL,
  destination_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_system, entity_name, source_id)
);

INSERT INTO creapd.schema_migrations (version, description)
VALUES ('001', 'Core identity bridge and Research Production Profile persistence')
ON CONFLICT (version) DO NOTHING;
