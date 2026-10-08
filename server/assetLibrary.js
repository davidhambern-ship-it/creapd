import { randomUUID } from 'node:crypto';

const IMAGE_ALLOWED_FIELDS = new Set([
  'title','image_url','asset_type','image_type','source_prompt',
  'associated_production_id','associated_production_title',
  'associated_story_id','associated_story_title',
  'associated_brand_id','associated_brand_name',
  'associated_show_id','associated_show_name',
  'tags','approval_status','version_number','is_favorite','file_format',
  'duration','width','height','notes','source_payload',
]);

const REGISTRY_ALLOWED_FIELDS = new Set([
  'asset_id','title','description','resource_type','format','category','subcategory',
  'keywords','tags','provider','provider_resource_id','source_url','connector_id',
  'license','license_url','commercial_use','modification_allowed',
  'redistribution_allowed','attribution_required','attribution_text','cc_variant',
  'download_status','cached','cached_file_url','cached_at','content_hash',
  'verified','last_verified','confidence','qa_status','preview_url','thumbnail_url',
  'preview_generated','health_status','last_checked','is_active','is_deprecated',
  'usage_count','last_used_at','version_number','production_profiles',
  'acquisition_method','cost','metadata','source_payload',
]);

function withAliases(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeLimit(value, fallback = 100, maximum = 250) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function pick(input, allowedFields) {
  const result = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const [key, value] of Object.entries(input)) {
    if (allowedFields.has(key)) result[key] = value;
  }
  return result;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function textValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  const value = patch[key];
  return value === undefined || value === null ? null : String(value);
}

function boolValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  return Boolean(patch[key]);
}

function numberValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  const parsed = Number(patch[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonValue(patch, key) {
  if (!hasOwn(patch, key)) return '{}';
  const value = patch[key];
  if (value === null || value === undefined) return '{}';
  return JSON.stringify(value);
}

export async function listImageAssets({ sql, ownerUserId, limit = 100 }) {
  const rows = await sql`
    SELECT *
    FROM creapd.image_assets
    WHERE owner_user_id = ${String(ownerUserId)}
    ORDER BY created_at DESC
    LIMIT ${safeLimit(limit)}
  `;
  return (rows || []).map(withAliases);
}

export async function createImageAsset({ sql, ownerUserId, asset }) {
  const input = pick(asset, IMAGE_ALLOWED_FIELDS);
  const title = clean(input.title);
  const imageUrl = clean(input.image_url);
  if (!title || !imageUrl) {
    const error = new Error('Image asset title and URL are required');
    error.code = 'IMAGE_ASSET_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [row] = await sql`
    INSERT INTO creapd.image_assets (
      id, owner_user_id, title, image_url, asset_type, image_type, source_prompt,
      associated_production_id, associated_production_title,
      associated_story_id, associated_story_title,
      associated_brand_id, associated_brand_name,
      associated_show_id, associated_show_name,
      tags, approval_status, version_number, is_favorite, file_format,
      duration, width, height, notes, source_system, source_payload
    ) VALUES (
      ${randomUUID()}, ${String(ownerUserId)}, ${title}, ${imageUrl},
      ${clean(input.asset_type, 'image')}, ${clean(input.image_type, 'uploaded')},
      ${textValue(input, 'source_prompt')},
      ${textValue(input, 'associated_production_id')}, ${textValue(input, 'associated_production_title')},
      ${textValue(input, 'associated_story_id')}, ${textValue(input, 'associated_story_title')},
      ${textValue(input, 'associated_brand_id')}, ${textValue(input, 'associated_brand_name')},
      ${textValue(input, 'associated_show_id')}, ${textValue(input, 'associated_show_name')},
      ${textValue(input, 'tags')}, ${clean(input.approval_status, 'pending')},
      ${numberValue(input, 'version_number') || 1}, ${boolValue(input, 'is_favorite') || false},
      ${clean(input.file_format, 'other')}, ${numberValue(input, 'duration')},
      ${numberValue(input, 'width')}, ${numberValue(input, 'height')},
      ${textValue(input, 'notes')}, 'creapd-vercel',
      ${jsonValue(input, 'source_payload')}::jsonb
    )
    RETURNING *
  `;
  return withAliases(row);
}

export async function updateImageAsset({ sql, ownerUserId, assetId, patch }) {
  const input = pick(patch, IMAGE_ALLOWED_FIELDS);
  const [row] = await sql`
    UPDATE creapd.image_assets
    SET
      title = CASE WHEN ${hasOwn(input,'title')} THEN ${textValue(input,'title')} ELSE title END,
      image_url = CASE WHEN ${hasOwn(input,'image_url')} THEN ${textValue(input,'image_url')} ELSE image_url END,
      asset_type = CASE WHEN ${hasOwn(input,'asset_type')} THEN ${textValue(input,'asset_type')} ELSE asset_type END,
      image_type = CASE WHEN ${hasOwn(input,'image_type')} THEN ${textValue(input,'image_type')} ELSE image_type END,
      source_prompt = CASE WHEN ${hasOwn(input,'source_prompt')} THEN ${textValue(input,'source_prompt')} ELSE source_prompt END,
      tags = CASE WHEN ${hasOwn(input,'tags')} THEN ${textValue(input,'tags')} ELSE tags END,
      approval_status = CASE WHEN ${hasOwn(input,'approval_status')} THEN ${textValue(input,'approval_status')} ELSE approval_status END,
      version_number = CASE WHEN ${hasOwn(input,'version_number')} THEN ${numberValue(input,'version_number')} ELSE version_number END,
      is_favorite = CASE WHEN ${hasOwn(input,'is_favorite')} THEN ${boolValue(input,'is_favorite')} ELSE is_favorite END,
      file_format = CASE WHEN ${hasOwn(input,'file_format')} THEN ${textValue(input,'file_format')} ELSE file_format END,
      duration = CASE WHEN ${hasOwn(input,'duration')} THEN ${numberValue(input,'duration')} ELSE duration END,
      width = CASE WHEN ${hasOwn(input,'width')} THEN ${numberValue(input,'width')} ELSE width END,
      height = CASE WHEN ${hasOwn(input,'height')} THEN ${numberValue(input,'height')} ELSE height END,
      notes = CASE WHEN ${hasOwn(input,'notes')} THEN ${textValue(input,'notes')} ELSE notes END,
      source_payload = CASE WHEN ${hasOwn(input,'source_payload')} THEN ${jsonValue(input,'source_payload')}::jsonb ELSE source_payload END,
      updated_at = now()
    WHERE id = ${String(assetId)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;
  if (!row) {
    const error = new Error('Image asset not found');
    error.code = 'IMAGE_ASSET_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return withAliases(row);
}

export async function deleteImageAsset({ sql, ownerUserId, assetId }) {
  const rows = await sql`
    DELETE FROM creapd.image_assets
    WHERE id = ${String(assetId)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING id
  `;
  if (!rows?.length) {
    const error = new Error('Image asset not found');
    error.code = 'IMAGE_ASSET_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return { id: String(assetId), deleted: true };
}

export async function listRegistryAssets({ sql, ownerUserId, limit = 100 }) {
  const rows = await sql`
    SELECT *
    FROM creapd.asset_registry
    WHERE owner_user_id IS NULL OR owner_user_id = ${String(ownerUserId)}
    ORDER BY created_at DESC
    LIMIT ${safeLimit(limit)}
  `;
  return (rows || []).map(withAliases);
}

export async function createRegistryAsset({ sql, ownerUserId, asset }) {
  const input = pick(asset, REGISTRY_ALLOWED_FIELDS);
  const title = clean(input.title);
  const resourceType = clean(input.resource_type);
  if (!title || !resourceType) {
    const error = new Error('Registry asset title and resource type are required');
    error.code = 'ASSET_REGISTRY_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const id = randomUUID();
  const assetId = clean(input.asset_id, id);
  const [row] = await sql`
    INSERT INTO creapd.asset_registry (
      id, asset_id, owner_user_id, title, description, resource_type, format,
      category, subcategory, keywords, tags, provider, provider_resource_id,
      source_url, connector_id, license, license_url, commercial_use,
      modification_allowed, redistribution_allowed, attribution_required,
      attribution_text, cc_variant, download_status, cached, cached_file_url,
      cached_at, content_hash, verified, last_verified, confidence, qa_status,
      preview_url, thumbnail_url, preview_generated, health_status, last_checked,
      is_active, is_deprecated, usage_count, last_used_at, version_number,
      production_profiles, acquisition_method, cost, metadata, source_system,
      source_payload
    ) VALUES (
      ${id}, ${assetId}, ${String(ownerUserId)}, ${title},
      ${textValue(input,'description')}, ${resourceType}, ${textValue(input,'format')},
      ${textValue(input,'category')}, ${textValue(input,'subcategory')},
      ${textValue(input,'keywords')}, ${textValue(input,'tags')},
      ${textValue(input,'provider')}, ${textValue(input,'provider_resource_id')},
      ${textValue(input,'source_url')}, ${textValue(input,'connector_id')},
      ${clean(input.license,'unknown')}, ${textValue(input,'license_url')},
      ${boolValue(input,'commercial_use') || false}, ${boolValue(input,'modification_allowed') || false},
      ${boolValue(input,'redistribution_allowed') || false}, ${boolValue(input,'attribution_required') || false},
      ${textValue(input,'attribution_text')}, ${clean(input.cc_variant,'n/a')},
      ${clean(input.download_status,'not_downloaded')}, ${boolValue(input,'cached') || false},
      ${textValue(input,'cached_file_url')}, ${textValue(input,'cached_at')},
      ${textValue(input,'content_hash')}, ${boolValue(input,'verified') || false},
      ${textValue(input,'last_verified')}, ${numberValue(input,'confidence') || 0},
      ${clean(input.qa_status,'not_reviewed')}, ${textValue(input,'preview_url')},
      ${textValue(input,'thumbnail_url')}, ${boolValue(input,'preview_generated') || false},
      ${clean(input.health_status,'unknown')}, ${textValue(input,'last_checked')},
      ${hasOwn(input,'is_active') ? boolValue(input,'is_active') : true},
      ${boolValue(input,'is_deprecated') || false}, ${numberValue(input,'usage_count') || 0},
      ${textValue(input,'last_used_at')}, ${numberValue(input,'version_number') || 1},
      ${textValue(input,'production_profiles')}, ${textValue(input,'acquisition_method')},
      ${numberValue(input,'cost') || 0}, ${textValue(input,'metadata')},
      'creapd-vercel', ${jsonValue(input,'source_payload')}::jsonb
    )
    RETURNING *
  `;
  return withAliases(row);
}

export async function updateRegistryAsset({ sql, ownerUserId, assetId, patch }) {
  const input = pick(patch, REGISTRY_ALLOWED_FIELDS);
  const [row] = await sql`
    UPDATE creapd.asset_registry
    SET
      title = CASE WHEN ${hasOwn(input,'title')} THEN ${textValue(input,'title')} ELSE title END,
      description = CASE WHEN ${hasOwn(input,'description')} THEN ${textValue(input,'description')} ELSE description END,
      resource_type = CASE WHEN ${hasOwn(input,'resource_type')} THEN ${textValue(input,'resource_type')} ELSE resource_type END,
      format = CASE WHEN ${hasOwn(input,'format')} THEN ${textValue(input,'format')} ELSE format END,
      category = CASE WHEN ${hasOwn(input,'category')} THEN ${textValue(input,'category')} ELSE category END,
      subcategory = CASE WHEN ${hasOwn(input,'subcategory')} THEN ${textValue(input,'subcategory')} ELSE subcategory END,
      keywords = CASE WHEN ${hasOwn(input,'keywords')} THEN ${textValue(input,'keywords')} ELSE keywords END,
      tags = CASE WHEN ${hasOwn(input,'tags')} THEN ${textValue(input,'tags')} ELSE tags END,
      provider = CASE WHEN ${hasOwn(input,'provider')} THEN ${textValue(input,'provider')} ELSE provider END,
      provider_resource_id = CASE WHEN ${hasOwn(input,'provider_resource_id')} THEN ${textValue(input,'provider_resource_id')} ELSE provider_resource_id END,
      source_url = CASE WHEN ${hasOwn(input,'source_url')} THEN ${textValue(input,'source_url')} ELSE source_url END,
      license = CASE WHEN ${hasOwn(input,'license')} THEN ${textValue(input,'license')} ELSE license END,
      license_url = CASE WHEN ${hasOwn(input,'license_url')} THEN ${textValue(input,'license_url')} ELSE license_url END,
      commercial_use = CASE WHEN ${hasOwn(input,'commercial_use')} THEN ${boolValue(input,'commercial_use')} ELSE commercial_use END,
      modification_allowed = CASE WHEN ${hasOwn(input,'modification_allowed')} THEN ${boolValue(input,'modification_allowed')} ELSE modification_allowed END,
      redistribution_allowed = CASE WHEN ${hasOwn(input,'redistribution_allowed')} THEN ${boolValue(input,'redistribution_allowed')} ELSE redistribution_allowed END,
      attribution_required = CASE WHEN ${hasOwn(input,'attribution_required')} THEN ${boolValue(input,'attribution_required')} ELSE attribution_required END,
      attribution_text = CASE WHEN ${hasOwn(input,'attribution_text')} THEN ${textValue(input,'attribution_text')} ELSE attribution_text END,
      cc_variant = CASE WHEN ${hasOwn(input,'cc_variant')} THEN ${textValue(input,'cc_variant')} ELSE cc_variant END,
      download_status = CASE WHEN ${hasOwn(input,'download_status')} THEN ${textValue(input,'download_status')} ELSE download_status END,
      cached = CASE WHEN ${hasOwn(input,'cached')} THEN ${boolValue(input,'cached')} ELSE cached END,
      cached_file_url = CASE WHEN ${hasOwn(input,'cached_file_url')} THEN ${textValue(input,'cached_file_url')} ELSE cached_file_url END,
      verified = CASE WHEN ${hasOwn(input,'verified')} THEN ${boolValue(input,'verified')} ELSE verified END,
      confidence = CASE WHEN ${hasOwn(input,'confidence')} THEN ${numberValue(input,'confidence')} ELSE confidence END,
      qa_status = CASE WHEN ${hasOwn(input,'qa_status')} THEN ${textValue(input,'qa_status')} ELSE qa_status END,
      preview_url = CASE WHEN ${hasOwn(input,'preview_url')} THEN ${textValue(input,'preview_url')} ELSE preview_url END,
      thumbnail_url = CASE WHEN ${hasOwn(input,'thumbnail_url')} THEN ${textValue(input,'thumbnail_url')} ELSE thumbnail_url END,
      health_status = CASE WHEN ${hasOwn(input,'health_status')} THEN ${textValue(input,'health_status')} ELSE health_status END,
      is_active = CASE WHEN ${hasOwn(input,'is_active')} THEN ${boolValue(input,'is_active')} ELSE is_active END,
      is_deprecated = CASE WHEN ${hasOwn(input,'is_deprecated')} THEN ${boolValue(input,'is_deprecated')} ELSE is_deprecated END,
      usage_count = CASE WHEN ${hasOwn(input,'usage_count')} THEN ${numberValue(input,'usage_count')} ELSE usage_count END,
      version_number = CASE WHEN ${hasOwn(input,'version_number')} THEN ${numberValue(input,'version_number')} ELSE version_number END,
      production_profiles = CASE WHEN ${hasOwn(input,'production_profiles')} THEN ${textValue(input,'production_profiles')} ELSE production_profiles END,
      acquisition_method = CASE WHEN ${hasOwn(input,'acquisition_method')} THEN ${textValue(input,'acquisition_method')} ELSE acquisition_method END,
      cost = CASE WHEN ${hasOwn(input,'cost')} THEN ${numberValue(input,'cost')} ELSE cost END,
      metadata = CASE WHEN ${hasOwn(input,'metadata')} THEN ${textValue(input,'metadata')} ELSE metadata END,
      source_payload = CASE WHEN ${hasOwn(input,'source_payload')} THEN ${jsonValue(input,'source_payload')}::jsonb ELSE source_payload END,
      updated_at = now()
    WHERE id = ${String(assetId)}
      AND (owner_user_id IS NULL OR owner_user_id = ${String(ownerUserId)})
    RETURNING *
  `;
  if (!row) {
    const error = new Error('Registry asset not found');
    error.code = 'ASSET_REGISTRY_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return withAliases(row);
}

export async function deleteRegistryAsset({ sql, ownerUserId, assetId }) {
  const rows = await sql`
    DELETE FROM creapd.asset_registry
    WHERE id = ${String(assetId)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING id
  `;
  if (!rows?.length) {
    const error = new Error('Registry asset not found or not owned by this user');
    error.code = 'ASSET_REGISTRY_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return { id: String(assetId), deleted: true };
}
