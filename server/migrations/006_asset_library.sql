BEGIN;

CREATE TABLE IF NOT EXISTS creapd.image_assets (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES creapd.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  asset_type text NOT NULL DEFAULT 'image',
  image_type text NOT NULL DEFAULT 'uploaded',
  source_prompt text,
  associated_production_id text,
  associated_production_title text,
  associated_story_id text,
  associated_story_title text,
  associated_brand_id text,
  associated_brand_name text,
  associated_show_id text,
  associated_show_name text,
  tags text,
  approval_status text NOT NULL DEFAULT 'pending',
  version_number integer NOT NULL DEFAULT 1,
  is_favorite boolean NOT NULL DEFAULT false,
  file_format text NOT NULL DEFAULT 'other',
  duration numeric,
  width integer,
  height integer,
  notes text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_assets_owner_created_idx
  ON creapd.image_assets (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS image_assets_owner_type_idx
  ON creapd.image_assets (owner_user_id, asset_type, image_type);
CREATE INDEX IF NOT EXISTS image_assets_owner_status_idx
  ON creapd.image_assets (owner_user_id, approval_status);
CREATE INDEX IF NOT EXISTS image_assets_owner_favorite_idx
  ON creapd.image_assets (owner_user_id, is_favorite)
  WHERE is_favorite = true;

CREATE TABLE IF NOT EXISTS creapd.asset_registry (
  id text PRIMARY KEY,
  asset_id text NOT NULL UNIQUE,
  owner_user_id text REFERENCES creapd.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  resource_type text NOT NULL,
  format text,
  category text,
  subcategory text,
  keywords text,
  tags text,
  provider text,
  provider_resource_id text,
  source_url text,
  connector_id text,
  license text NOT NULL DEFAULT 'unknown',
  license_url text,
  commercial_use boolean NOT NULL DEFAULT false,
  modification_allowed boolean NOT NULL DEFAULT false,
  redistribution_allowed boolean NOT NULL DEFAULT false,
  attribution_required boolean NOT NULL DEFAULT false,
  attribution_text text,
  cc_variant text NOT NULL DEFAULT 'n/a',
  download_status text NOT NULL DEFAULT 'not_downloaded',
  cached boolean NOT NULL DEFAULT false,
  cached_file_url text,
  cached_at timestamptz,
  content_hash text,
  verified boolean NOT NULL DEFAULT false,
  last_verified timestamptz,
  confidence numeric NOT NULL DEFAULT 0,
  qa_status text NOT NULL DEFAULT 'not_reviewed',
  preview_url text,
  thumbnail_url text,
  preview_generated boolean NOT NULL DEFAULT false,
  health_status text NOT NULL DEFAULT 'unknown',
  last_checked timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_deprecated boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  version_number integer NOT NULL DEFAULT 1,
  production_profiles text,
  acquisition_method text,
  cost numeric NOT NULL DEFAULT 0,
  metadata text,
  source_system text NOT NULL DEFAULT 'creapd',
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_registry_owner_created_idx
  ON creapd.asset_registry (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS asset_registry_type_idx
  ON creapd.asset_registry (resource_type);
CREATE INDEX IF NOT EXISTS asset_registry_license_idx
  ON creapd.asset_registry (license);
CREATE INDEX IF NOT EXISTS asset_registry_health_idx
  ON creapd.asset_registry (health_status);
CREATE INDEX IF NOT EXISTS asset_registry_active_idx
  ON creapd.asset_registry (is_active, is_deprecated);
CREATE UNIQUE INDEX IF NOT EXISTS asset_registry_source_url_uidx
  ON creapd.asset_registry (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';
CREATE UNIQUE INDEX IF NOT EXISTS asset_registry_provider_resource_uidx
  ON creapd.asset_registry (provider, provider_resource_id)
  WHERE provider IS NOT NULL AND provider_resource_id IS NOT NULL;

INSERT INTO creapd.schema_migrations (version, description)
SELECT '006', 'Owned ImageAsset and KAAE Asset Registry library'
WHERE NOT EXISTS (
  SELECT 1 FROM creapd.schema_migrations WHERE version = '006'
);

COMMIT;
