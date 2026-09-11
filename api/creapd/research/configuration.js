import { randomUUID } from 'node:crypto';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

function cleanString(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === '' ? fallback : text;
}

function cleanNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  if (typeof value === 'object') return value;
  return fallback;
}

function serializeJson(value, fallback) {
  return JSON.stringify(normalizeJson(value, fallback));
}

function withBase44Aliases(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_configuration_write_failed').slice(0, 180),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'database_not_configured',
    });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const requestedId = cleanString(body.id);
    const configurationId = requestedId || randomUUID();

    const productionName = cleanString(body.production_name);
    const showDate = cleanString(body.show_date);

    if (!productionName) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research',
        error: 'production_name_required',
      });
    }

    if (!showDate || !/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research',
        error: 'valid_show_date_required',
      });
    }

    if (requestedId) {
      const [existing] = await sql`
        SELECT id
        FROM creapd.research_production_configurations
        WHERE id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
        LIMIT 1
      `;

      if (!existing) {
        return response.status(404).json({
          ok: false,
          service: 'creapd-research',
          error: 'configuration_not_found',
        });
      }
    }

    const hostName = cleanString(body.host_name);
    const coHostName = cleanString(body.co_host_name);
    const showStartTime = cleanString(body.show_start_time);
    const liveOrRecorded = cleanString(body.live_or_recorded, 'recorded');
    const stationName = cleanString(body.station_name);
    const showDescription = cleanString(body.show_description);
    const totalShowRuntime = cleanNumber(body.total_show_runtime);
    const researchDepth = cleanString(body.research_depth, 'standard');
    const targetAudience = cleanString(body.target_audience, 'General Public');
    const tone = cleanString(body.tone, 'educational');
    const readingStyle = cleanString(body.reading_style, 'documentary');
    const factCheckRequired = cleanBoolean(body.fact_check_required, true);
    const citationRequired = cleanBoolean(body.citation_required, true);
    const maxPointsPerTopic = Math.max(1, Math.trunc(cleanNumber(body.max_points_per_topic, 10)));

    const sourceDomains = serializeJson(body.source_domains, []);
    const researchMethodology = serializeJson(body.research_methodology, []);
    const preferredModels = serializeJson(body.preferred_models, []);
    const blockedTopics = serializeJson(body.blocked_topics, []);
    const mustInclude = serializeJson(body.must_include, []);
    const voRequirements = serializeJson(body.vo_requirements, {});

    let savedConfiguration;

    if (requestedId) {
      [savedConfiguration] = await sql`
        UPDATE creapd.research_production_configurations
        SET
          production_name = ${productionName},
          host_name = ${hostName},
          co_host_name = ${coHostName},
          show_date = ${showDate}::date,
          show_start_time = ${showStartTime},
          live_or_recorded = ${liveOrRecorded},
          station_name = ${stationName},
          show_description = ${showDescription},
          total_show_runtime = ${totalShowRuntime},
          research_depth = ${researchDepth},
          source_domains = ${sourceDomains}::jsonb,
          research_methodology = ${researchMethodology}::jsonb,
          target_audience = ${targetAudience},
          tone = ${tone},
          reading_style = ${readingStyle},
          preferred_models = ${preferredModels}::jsonb,
          blocked_topics = ${blockedTopics}::jsonb,
          must_include = ${mustInclude}::jsonb,
          fact_check_required = ${factCheckRequired},
          citation_required = ${citationRequired},
          max_points_per_topic = ${maxPointsPerTopic},
          vo_requirements = ${voRequirements}::jsonb,
          status = 'ready',
          is_default = true,
          updated_at = now()
        WHERE id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;
    } else {
      [savedConfiguration] = await sql`
        INSERT INTO creapd.research_production_configurations (
          id,
          owner_user_id,
          production_name,
          host_name,
          co_host_name,
          show_date,
          show_start_time,
          live_or_recorded,
          station_name,
          show_description,
          total_show_runtime,
          research_depth,
          source_domains,
          research_methodology,
          target_audience,
          tone,
          reading_style,
          preferred_models,
          blocked_topics,
          must_include,
          fact_check_required,
          citation_required,
          max_points_per_topic,
          vo_requirements,
          status,
          is_default,
          created_by_id,
          created_by_email,
          source_system,
          created_at,
          updated_at
        ) VALUES (
          ${configurationId},
          ${ownerUserId},
          ${productionName},
          ${hostName},
          ${coHostName},
          ${showDate}::date,
          ${showStartTime},
          ${liveOrRecorded},
          ${stationName},
          ${showDescription},
          ${totalShowRuntime},
          ${researchDepth},
          ${sourceDomains}::jsonb,
          ${researchMethodology}::jsonb,
          ${targetAudience},
          ${tone},
          ${readingStyle},
          ${preferredModels}::jsonb,
          ${blockedTopics}::jsonb,
          ${mustInclude}::jsonb,
          ${factCheckRequired},
          ${citationRequired},
          ${maxPointsPerTopic},
          ${voRequirements}::jsonb,
          'ready',
          true,
          ${ownerUserId},
          ${user.email || null},
          'creapd',
          now(),
          now()
        )
        RETURNING *
      `;
    }

    // The newly saved configuration is already usable before this cleanup runs.
    // If cleanup were ever to fail, the app may briefly have multiple defaults,
    // which is safer than clearing the previous default before the save succeeds.
    await sql`
      UPDATE creapd.research_production_configurations
      SET is_default = false, updated_at = now()
      WHERE owner_user_id = ${ownerUserId}
        AND id <> ${configurationId}
        AND is_default = true
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      data_authority: 'neon',
      created: !requestedId,
      configuration: withBase44Aliases(savedConfiguration),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-research',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD RESEARCH CONFIGURATION WRITE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_configuration_write_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
