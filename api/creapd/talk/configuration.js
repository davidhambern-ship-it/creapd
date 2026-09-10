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

function cleanNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function json(value) {
  return JSON.stringify(value ?? {});
}

function withLegacyAliases(row) {
  if (!row) return row;
  return {
    ...row,
    topics: JSON.stringify(row.topics || []),
    research_sources: JSON.stringify(row.research_sources || []),
    ai_automation: JSON.stringify(row.ai_automation || []),
    vo_requirements: JSON.stringify(row.vo_requirements || {}),
    created_date: row.created_at || null,
    updated_date: row.updated_at || null,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'talk_configuration_write_failed').slice(0, 220),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({ ok: false, service: 'creapd-talk', error: 'database_not_configured' });
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
      return response.status(400).json({ ok: false, service: 'creapd-talk', error: 'production_name_required' });
    }
    if (!showDate || !/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
      return response.status(400).json({ ok: false, service: 'creapd-talk', error: 'valid_show_date_required' });
    }

    let existing = null;
    if (requestedId) {
      [existing] = await sql`
        SELECT * FROM creapd.talk_production_configurations
        WHERE id = ${configurationId} AND owner_user_id = ${ownerUserId}
        LIMIT 1
      `;
      if (!existing) {
        return response.status(404).json({ ok: false, service: 'creapd-talk', error: 'configuration_not_found' });
      }
    }

    const hostName = cleanString(body.host_name);
    const coHostName = cleanString(body.co_host_name);
    const showStartTime = cleanString(body.show_start_time, '12:00');
    const liveOrRecorded = ['live', 'recorded'].includes(body.live_or_recorded) ? body.live_or_recorded : 'live';
    const stationName = cleanString(body.station_name);
    const showDescription = cleanString(body.show_description);
    const showFormat = cleanString(body.show_format, 'Interview Show');
    const totalShowRuntime = Math.max(1, cleanNumber(body.total_show_runtime, 60));
    const talkSegmentRuntime = Math.max(0, cleanNumber(body.talk_segment_runtime, 45));
    const commercialSponsorRuntime = Math.max(0, cleanNumber(body.commercial_sponsor_runtime, 8));
    const introRuntime = Math.max(0, cleanNumber(body.intro_runtime, 2));
    const outroRuntime = Math.max(0, cleanNumber(body.outro_runtime, 2));
    const topics = normalizeArray(body.topics, []);
    const researchSources = normalizeArray(body.research_sources, []);
    const showTone = cleanString(body.show_tone, 'Conversational');
    const guestDetails = cleanString(body.guest_details);
    const aiAutomation = normalizeArray(body.ai_automation, []);
    const voRequirements = normalizeObject(body.vo_requirements, {});

    let saved;
    if (existing) {
      [saved] = await sql`
        UPDATE creapd.talk_production_configurations
        SET
          production_name = ${productionName},
          host_name = ${hostName},
          co_host_name = ${coHostName},
          show_date = ${showDate}::date,
          show_start_time = ${showStartTime},
          live_or_recorded = ${liveOrRecorded},
          station_name = ${stationName},
          show_description = ${showDescription},
          show_format = ${showFormat},
          total_show_runtime = ${totalShowRuntime},
          talk_segment_runtime = ${talkSegmentRuntime},
          commercial_sponsor_runtime = ${commercialSponsorRuntime},
          intro_runtime = ${introRuntime},
          outro_runtime = ${outroRuntime},
          topics = ${JSON.stringify(topics)}::jsonb,
          research_sources = ${JSON.stringify(researchSources)}::jsonb,
          show_tone = ${showTone},
          guest_details = ${guestDetails},
          ai_automation = ${JSON.stringify(aiAutomation)}::jsonb,
          vo_requirements = ${JSON.stringify(voRequirements)}::jsonb,
          status = 'configuring',
          is_default = true,
          updated_at = now()
        WHERE id = ${configurationId} AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;
    } else {
      [saved] = await sql`
        INSERT INTO creapd.talk_production_configurations (
          id, owner_user_id, production_name, host_name, co_host_name, show_date,
          show_start_time, live_or_recorded, station_name, show_description, show_format,
          total_show_runtime, talk_segment_runtime, commercial_sponsor_runtime, intro_runtime,
          outro_runtime, topics, research_sources, show_tone, guest_details, ai_automation,
          vo_requirements, status, is_default, created_by_id, created_by_email, source_system,
          source_payload, created_at, updated_at
        ) VALUES (
          ${configurationId}, ${ownerUserId}, ${productionName}, ${hostName}, ${coHostName}, ${showDate}::date,
          ${showStartTime}, ${liveOrRecorded}, ${stationName}, ${showDescription}, ${showFormat},
          ${totalShowRuntime}, ${talkSegmentRuntime}, ${commercialSponsorRuntime}, ${introRuntime},
          ${outroRuntime}, ${JSON.stringify(topics)}::jsonb, ${JSON.stringify(researchSources)}::jsonb,
          ${showTone}, ${guestDetails}, ${JSON.stringify(aiAutomation)}::jsonb, ${JSON.stringify(voRequirements)}::jsonb,
          'configuring', true, ${ownerUserId}, ${user.email || null}, 'creapd-vercel', '{}'::jsonb, now(), now()
        )
        RETURNING *
      `;
    }

    let showId = saved.show_id || null;
    let episodeId = saved.episode_id || null;

    if (!showId) {
      showId = randomUUID();
      await sql`
        INSERT INTO creapd.shows (
          id, owner_user_id, production_profile, title, description, status,
          brand_config, format_config, settings, source_system, source_entity_type,
          source_entity_id, source_payload, created_at, updated_at
        ) VALUES (
          ${showId}, ${ownerUserId}, 'talk', ${productionName}, ${showDescription}, 'active',
          '{}'::jsonb, ${json({ show_format: showFormat, show_tone: showTone })}::jsonb,
          ${json({ station_name: stationName, live_or_recorded: liveOrRecorded })}::jsonb,
          'creapd-vercel', 'TalkShowConfiguration', ${configurationId}, '{}'::jsonb, now(), now()
        )
      `;
    } else {
      await sql`
        UPDATE creapd.shows
        SET title = ${productionName}, description = ${showDescription},
            format_config = ${json({ show_format: showFormat, show_tone: showTone })}::jsonb,
            settings = ${json({ station_name: stationName, live_or_recorded: liveOrRecorded })}::jsonb,
            updated_at = now()
        WHERE id = ${showId} AND owner_user_id = ${ownerUserId}
      `;
    }

    if (!episodeId) {
      episodeId = randomUUID();
      await sql`
        INSERT INTO creapd.episodes (
          id, owner_user_id, production_profile, show_id, title, description, status,
          scheduled_at, settings, source_system, source_entity_type, source_entity_id,
          source_payload, created_at, updated_at
        ) VALUES (
          ${episodeId}, ${ownerUserId}, 'talk', ${showId}, ${`${productionName} — ${showDate}`}, ${showDescription},
          'draft', ${`${showDate}T${showStartTime || '12:00'}:00`}::timestamptz,
          ${json({ total_show_runtime: totalShowRuntime, talk_segment_runtime: talkSegmentRuntime })}::jsonb,
          'creapd-vercel', 'TalkProductionConfiguration', ${configurationId}, '{}'::jsonb, now(), now()
        )
      `;
    } else {
      await sql`
        UPDATE creapd.episodes
        SET show_id = ${showId}, title = ${`${productionName} — ${showDate}`}, description = ${showDescription},
            scheduled_at = ${`${showDate}T${showStartTime || '12:00'}:00`}::timestamptz,
            settings = ${json({ total_show_runtime: totalShowRuntime, talk_segment_runtime: talkSegmentRuntime })}::jsonb,
            updated_at = now()
        WHERE id = ${episodeId} AND owner_user_id = ${ownerUserId}
      `;
    }

    [saved] = await sql`
      UPDATE creapd.talk_production_configurations
      SET show_id = ${showId}, episode_id = ${episodeId}, updated_at = now()
      WHERE id = ${configurationId} AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;

    await sql`
      UPDATE creapd.talk_production_configurations
      SET is_default = false, updated_at = now()
      WHERE owner_user_id = ${ownerUserId} AND id <> ${configurationId} AND is_default = true
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-talk',
      source: 'neon',
      data_authority: 'neon',
      created: !requestedId,
      configuration: withLegacyAliases(saved),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status)) {
      return response.status(error.status).json({ ok: false, service: 'creapd-talk', error: error.code || 'authentication_required' });
    }
    console.error('[CREAPD TALK CONFIGURATION]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-talk',
      error: 'talk_configuration_write_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
