import { randomUUID } from 'node:crypto';
import { runTalkBuild } from './talkEngine.js';

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanNullable(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseArray(value, fallback = []) {
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

function parseObject(value, fallback = {}) {
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

function asJson(value) {
  return JSON.stringify(value ?? {});
}

function withDates(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at || null,
    updated_date: row.updated_at || null,
  };
}

function withConfigAliases(row) {
  if (!row) return row;
  return withDates({
    ...row,
    topics: JSON.stringify(row.topics || []),
    research_sources: JSON.stringify(row.research_sources || []),
    ai_automation: JSON.stringify(row.ai_automation || []),
    vo_requirements: JSON.stringify(row.vo_requirements || {}),
  });
}

function withResearchAliases(row) {
  if (!row) return row;
  return withDates({ ...row, date: row.research_date || null });
}

function withSegmentAliases(row) {
  if (!row) return row;
  return withDates({ ...row, order: row.order_index });
}

function makeError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export async function readTalkStudio(sql, ownerUserId, requestedConfigurationId = null) {
  const ownerId = String(ownerUserId || '').trim();
  const requestedId = clean(requestedConfigurationId);
  let configuration = null;

  if (requestedId) {
    [configuration] = await sql`
      SELECT * FROM creapd.talk_production_configurations
      WHERE id = ${requestedId} AND owner_user_id = ${ownerId}
      LIMIT 1
    `;
  } else {
    [configuration] = await sql`
      SELECT * FROM creapd.talk_production_configurations
      WHERE owner_user_id = ${ownerId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
  }

  if (!configuration) {
    return {
      configuration: null,
      topics: [],
      research: [],
      guests: [],
      segments: [],
      assets: [],
      packages: [],
      session: null,
    };
  }

  const configId = configuration.id;
  const [topics, research, guests, segments, assets, packages, sessions] = await Promise.all([
    sql`SELECT * FROM creapd.talk_topics WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY display_order ASC, created_at ASC`,
    sql`SELECT * FROM creapd.talk_research_items WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.talk_guests WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.talk_segments WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY order_index ASC, created_at ASC`,
    sql`SELECT * FROM creapd.talk_assets WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.production_packages WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} AND production_profile = 'talk' ORDER BY updated_at DESC`,
    sql`SELECT * FROM creapd.talk_sessions WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} ORDER BY updated_at DESC LIMIT 1`,
  ]);

  return {
    configuration: withConfigAliases(configuration),
    topics: (topics || []).map(withDates),
    research: (research || []).map(withResearchAliases),
    guests: (guests || []).map(withDates),
    segments: (segments || []).map(withSegmentAliases),
    assets: (assets || []).map(withDates),
    packages: (packages || []).map(withDates),
    session: sessions?.[0] ? withDates(sessions[0]) : null,
  };
}

async function requireConfiguration(sql, ownerUserId, configurationId) {
  const configId = clean(configurationId);
  if (!configId) throw makeError('configuration_id_required', 'configuration_id_required');

  const [configuration] = await sql`
    SELECT * FROM creapd.talk_production_configurations
    WHERE id = ${configId} AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;
  if (!configuration) throw makeError('Talk configuration not found', 'TALK_CONFIGURATION_NOT_FOUND', 404);
  return configuration;
}

export async function saveTalkConfiguration({ sql, ownerUserId, ownerEmail, input = {} }) {
  const ownerId = String(ownerUserId);
  const requestedId = clean(input.id);
  const configurationId = requestedId || randomUUID();
  const productionName = clean(input.production_name);
  const showDate = clean(input.show_date);

  if (!productionName) throw makeError('Production name is required', 'production_name_required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) throw makeError('A valid show date is required', 'valid_show_date_required');

  let existing = null;
  if (requestedId) {
    [existing] = await sql`
      SELECT * FROM creapd.talk_production_configurations
      WHERE id = ${configurationId} AND owner_user_id = ${ownerId}
      LIMIT 1
    `;
    if (!existing) throw makeError('Talk configuration not found', 'TALK_CONFIGURATION_NOT_FOUND', 404);
  }

  const hostName = cleanNullable(input.host_name);
  const coHostName = cleanNullable(input.co_host_name);
  const showStartTime = clean(input.show_start_time, '12:00');
  const liveOrRecorded = ['live', 'recorded'].includes(input.live_or_recorded) ? input.live_or_recorded : 'live';
  const stationName = cleanNullable(input.station_name);
  const showDescription = cleanNullable(input.show_description);
  const showFormat = clean(input.show_format, 'Interview Show');
  const totalShowRuntime = Math.max(1, cleanNumber(input.total_show_runtime, 60));
  const talkSegmentRuntime = Math.max(0, cleanNumber(input.talk_segment_runtime, 45));
  const commercialSponsorRuntime = Math.max(0, cleanNumber(input.commercial_sponsor_runtime, 8));
  const introRuntime = Math.max(0, cleanNumber(input.intro_runtime, 2));
  const outroRuntime = Math.max(0, cleanNumber(input.outro_runtime, 2));
  const topics = parseArray(input.topics, []);
  const researchSources = parseArray(input.research_sources, []);
  const showTone = clean(input.show_tone, 'Conversational');
  const guestDetails = cleanNullable(input.guest_details);
  const aiAutomation = parseArray(input.ai_automation, []);
  const voRequirements = parseObject(input.vo_requirements, {});

  let saved;
  if (existing) {
    [saved] = await sql`
      UPDATE creapd.talk_production_configurations
      SET production_name = ${productionName}, host_name = ${hostName}, co_host_name = ${coHostName},
          show_date = ${showDate}::date, show_start_time = ${showStartTime}, live_or_recorded = ${liveOrRecorded},
          station_name = ${stationName}, show_description = ${showDescription}, show_format = ${showFormat},
          total_show_runtime = ${totalShowRuntime}, talk_segment_runtime = ${talkSegmentRuntime},
          commercial_sponsor_runtime = ${commercialSponsorRuntime}, intro_runtime = ${introRuntime},
          outro_runtime = ${outroRuntime}, topics = ${JSON.stringify(topics)}::jsonb,
          research_sources = ${JSON.stringify(researchSources)}::jsonb, show_tone = ${showTone},
          guest_details = ${guestDetails}, ai_automation = ${JSON.stringify(aiAutomation)}::jsonb,
          vo_requirements = ${JSON.stringify(voRequirements)}::jsonb, status = 'configuring',
          is_default = true, updated_at = now()
      WHERE id = ${configurationId} AND owner_user_id = ${ownerId}
      RETURNING *
    `;
  } else {
    [saved] = await sql`
      INSERT INTO creapd.talk_production_configurations (
        id, owner_user_id, production_name, host_name, co_host_name, show_date, show_start_time,
        live_or_recorded, station_name, show_description, show_format, total_show_runtime,
        talk_segment_runtime, commercial_sponsor_runtime, intro_runtime, outro_runtime, topics,
        research_sources, show_tone, guest_details, ai_automation, vo_requirements, status,
        is_default, created_by_id, created_by_email, source_system, source_payload
      ) VALUES (
        ${configurationId}, ${ownerId}, ${productionName}, ${hostName}, ${coHostName}, ${showDate}::date,
        ${showStartTime}, ${liveOrRecorded}, ${stationName}, ${showDescription}, ${showFormat},
        ${totalShowRuntime}, ${talkSegmentRuntime}, ${commercialSponsorRuntime}, ${introRuntime}, ${outroRuntime},
        ${JSON.stringify(topics)}::jsonb, ${JSON.stringify(researchSources)}::jsonb, ${showTone}, ${guestDetails},
        ${JSON.stringify(aiAutomation)}::jsonb, ${JSON.stringify(voRequirements)}::jsonb,
        'configuring', true, ${ownerId}, ${ownerEmail || null}, 'creapd-vercel', '{}'::jsonb
      ) RETURNING *
    `;
  }

  let showId = saved.show_id || null;
  let episodeId = saved.episode_id || null;
  const formatConfig = asJson({ show_format: showFormat, show_tone: showTone });
  const showSettings = asJson({ station_name: stationName, live_or_recorded: liveOrRecorded });

  if (!showId) {
    showId = randomUUID();
    await sql`
      INSERT INTO creapd.shows (
        id, owner_user_id, production_profile, title, description, status, brand_config,
        format_config, settings, source_system, source_entity_type, source_entity_id, source_payload
      ) VALUES (
        ${showId}, ${ownerId}, 'talk', ${productionName}, ${showDescription}, 'active', '{}'::jsonb,
        ${formatConfig}::jsonb, ${showSettings}::jsonb, 'creapd-vercel', 'TalkShowConfiguration',
        ${configurationId}, '{}'::jsonb
      )
    `;
  } else {
    await sql`
      UPDATE creapd.shows
      SET title = ${productionName}, description = ${showDescription}, format_config = ${formatConfig}::jsonb,
          settings = ${showSettings}::jsonb, updated_at = now()
      WHERE id = ${showId} AND owner_user_id = ${ownerId}
    `;
  }

  const scheduledAt = `${showDate}T${showStartTime || '12:00'}:00`;
  const episodeSettings = asJson({ total_show_runtime: totalShowRuntime, talk_segment_runtime: talkSegmentRuntime });

  if (!episodeId) {
    episodeId = randomUUID();
    await sql`
      INSERT INTO creapd.episodes (
        id, owner_user_id, production_profile, show_id, title, description, status, scheduled_at,
        settings, source_system, source_entity_type, source_entity_id, source_payload
      ) VALUES (
        ${episodeId}, ${ownerId}, 'talk', ${showId}, ${`${productionName} — ${showDate}`}, ${showDescription},
        'draft', ${scheduledAt}::timestamptz, ${episodeSettings}::jsonb, 'creapd-vercel',
        'TalkProductionConfiguration', ${configurationId}, '{}'::jsonb
      )
    `;
  } else {
    await sql`
      UPDATE creapd.episodes
      SET show_id = ${showId}, title = ${`${productionName} — ${showDate}`}, description = ${showDescription},
          scheduled_at = ${scheduledAt}::timestamptz, settings = ${episodeSettings}::jsonb, updated_at = now()
      WHERE id = ${episodeId} AND owner_user_id = ${ownerId}
    `;
  }

  [saved] = await sql`
    UPDATE creapd.talk_production_configurations
    SET show_id = ${showId}, episode_id = ${episodeId}, updated_at = now()
    WHERE id = ${configurationId} AND owner_user_id = ${ownerId}
    RETURNING *
  `;

  await sql`
    UPDATE creapd.talk_production_configurations
    SET is_default = false, updated_at = now()
    WHERE owner_user_id = ${ownerId} AND id <> ${configurationId} AND is_default = true
  `;

  return { configuration: withConfigAliases(saved), created: !requestedId };
}

async function createGuest(sql, ownerUserId, body) {
  const configuration = await requireConfiguration(sql, ownerUserId, body.configuration_id);
  const guest = body.guest && typeof body.guest === 'object' ? body.guest : body;
  const guestName = clean(guest.guest_name);
  if (!guestName) throw makeError('Guest name is required', 'guest_name_required');

  const [created] = await sql`
    INSERT INTO creapd.talk_guests (
      id, configuration_id, owner_user_id, guest_name, title_role, organization, bio, expertise,
      website_url, social_handle, talking_points, photo_prompt, status, availability_status,
      guest_source, source_system, source_payload
    ) VALUES (
      ${randomUUID()}, ${configuration.id}, ${String(ownerUserId)}, ${guestName}, ${cleanNullable(guest.title_role)},
      ${cleanNullable(guest.organization)}, ${cleanNullable(guest.bio)}, ${cleanNullable(guest.expertise)},
      ${cleanNullable(guest.website_url)}, ${cleanNullable(guest.social_handle)}, ${cleanNullable(guest.talking_points)},
      ${cleanNullable(guest.photo_prompt)}, ${['pending', 'confirmed', 'cancelled'].includes(guest.status) ? guest.status : 'pending'},
      ${clean(guest.availability_status, 'manual')}, 'manual', 'creapd-vercel', '{}'::jsonb
    ) RETURNING *
  `;
  return withDates(created);
}

async function updateGuest(sql, ownerUserId, body) {
  const guestId = clean(body.guest_id || body.id);
  if (!guestId) throw makeError('Guest id is required', 'guest_id_required');
  const [existing] = await sql`SELECT * FROM creapd.talk_guests WHERE id = ${guestId} AND owner_user_id = ${String(ownerUserId)} LIMIT 1`;
  if (!existing) throw makeError('Guest not found', 'TALK_GUEST_NOT_FOUND', 404);
  const patch = body.guest && typeof body.guest === 'object' ? body.guest : body.patch || {};
  const status = ['pending', 'confirmed', 'cancelled'].includes(patch.status) ? patch.status : existing.status;

  const [updated] = await sql`
    UPDATE creapd.talk_guests SET
      guest_name = ${patch.guest_name !== undefined ? clean(patch.guest_name, existing.guest_name) : existing.guest_name},
      title_role = ${patch.title_role !== undefined ? cleanNullable(patch.title_role) : existing.title_role},
      organization = ${patch.organization !== undefined ? cleanNullable(patch.organization) : existing.organization},
      bio = ${patch.bio !== undefined ? cleanNullable(patch.bio) : existing.bio},
      expertise = ${patch.expertise !== undefined ? cleanNullable(patch.expertise) : existing.expertise},
      website_url = ${patch.website_url !== undefined ? cleanNullable(patch.website_url) : existing.website_url},
      social_handle = ${patch.social_handle !== undefined ? cleanNullable(patch.social_handle) : existing.social_handle},
      talking_points = ${patch.talking_points !== undefined ? cleanNullable(patch.talking_points) : existing.talking_points},
      photo_prompt = ${patch.photo_prompt !== undefined ? cleanNullable(patch.photo_prompt) : existing.photo_prompt},
      status = ${status}, updated_at = now()
    WHERE id = ${guestId} AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;
  return withDates(updated);
}

async function recordSessionEvent(sql, ownerUserId, body) {
  const sessionId = clean(body.session_id);
  const eventType = clean(body.event_type);
  const allowed = new Set([
    'session_start', 'session_pause', 'session_resume', 'session_end', 'segment_start',
    'segment_end', 'transition', 'clip_marker', 'obs_command', 'overlay_command',
  ]);
  if (!sessionId || !allowed.has(eventType)) throw makeError('Valid session and event type are required', 'valid_session_id_and_event_type_required');

  const [session] = await sql`SELECT * FROM creapd.talk_sessions WHERE id = ${sessionId} AND owner_user_id = ${String(ownerUserId)} LIMIT 1`;
  if (!session) throw makeError('Talk session not found', 'TALK_SESSION_NOT_FOUND', 404);
  const segmentId = clean(body.segment_id) || null;

  if (segmentId) {
    const [segment] = await sql`
      SELECT id FROM creapd.talk_segments
      WHERE id = ${segmentId} AND configuration_id = ${session.configuration_id} AND owner_user_id = ${String(ownerUserId)}
      LIMIT 1
    `;
    if (!segment) throw makeError('Talk segment not found', 'TALK_SEGMENT_NOT_FOUND', 404);
  }

  if (eventType === 'session_start') {
    await sql`UPDATE creapd.talk_sessions SET status='live', started_at=COALESCE(started_at, now()), paused_at=NULL, updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'session_pause') {
    await sql`UPDATE creapd.talk_sessions SET status='paused', paused_at=now(), updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'session_resume') {
    await sql`UPDATE creapd.talk_sessions SET status='live', paused_at=NULL, updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'session_end') {
    await sql`UPDATE creapd.talk_sessions SET status='complete', ended_at=now(), active_segment_id=NULL, updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'segment_start' && segmentId) {
    await sql`UPDATE creapd.talk_segments SET runtime_status='live', actual_start_at=COALESCE(actual_start_at, now()), actual_end_at=NULL, updated_at=now() WHERE id=${segmentId} AND owner_user_id=${String(ownerUserId)}`;
    await sql`UPDATE creapd.talk_sessions SET active_segment_id=${segmentId}, status='live', started_at=COALESCE(started_at, now()), updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'segment_end' && segmentId) {
    await sql`
      UPDATE creapd.talk_segments
      SET runtime_status='complete', actual_end_at=now(),
          actual_duration_seconds=CASE WHEN actual_start_at IS NULL THEN NULL ELSE GREATEST(0, EXTRACT(EPOCH FROM (now() - actual_start_at))) END,
          updated_at=now()
      WHERE id=${segmentId} AND owner_user_id=${String(ownerUserId)}
    `;
    await sql`UPDATE creapd.talk_sessions SET active_segment_id=NULL, updated_at=now() WHERE id=${sessionId} AND owner_user_id=${String(ownerUserId)}`;
  } else if (eventType === 'clip_marker' && segmentId) {
    await sql`UPDATE creapd.talk_segments SET clip_marker_count=clip_marker_count+1, updated_at=now() WHERE id=${segmentId} AND owner_user_id=${String(ownerUserId)}`;
  }

  const [event] = await sql`
    INSERT INTO creapd.talk_events (id, session_id, configuration_id, owner_user_id, segment_id, event_type, payload)
    VALUES (${randomUUID()}, ${sessionId}, ${session.configuration_id}, ${String(ownerUserId)}, ${segmentId}, ${eventType}, ${JSON.stringify(body.payload || {})}::jsonb)
    RETURNING *
  `;
  return withDates(event);
}

export async function runTalkStudioAction({ sql, ownerUserId, ownerEmail, action, body = {} }) {
  switch (action) {
    case 'talk_save_configuration':
      return saveTalkConfiguration({ sql, ownerUserId, ownerEmail, input: body.configuration || body });

    case 'talk_build':
    case 'talk_refresh': {
      const result = await runTalkBuild({ sql, ownerUserId, ownerEmail, configurationId: body.configuration_id });
      return { result };
    }

    case 'talk_set_topic_status': {
      const topicId = clean(body.topic_id);
      const status = clean(body.status);
      if (!topicId || !['suggested', 'ready', 'approved', 'removed'].includes(status)) throw makeError('Valid topic status is required', 'valid_topic_id_and_status_required');
      const [topic] = await sql`UPDATE creapd.talk_topics SET status=${status}, updated_at=now() WHERE id=${topicId} AND owner_user_id=${String(ownerUserId)} RETURNING *`;
      if (!topic) throw makeError('Talk topic not found', 'TALK_TOPIC_NOT_FOUND', 404);
      return { topic: withDates(topic) };
    }

    case 'talk_create_guest':
      return { guest: await createGuest(sql, ownerUserId, body) };

    case 'talk_update_guest':
      return { guest: await updateGuest(sql, ownerUserId, body) };

    case 'talk_delete_guest': {
      const guestId = clean(body.guest_id || body.id);
      if (!guestId) throw makeError('Guest id is required', 'guest_id_required');
      const deleted = await sql`DELETE FROM creapd.talk_guests WHERE id=${guestId} AND owner_user_id=${String(ownerUserId)} RETURNING id`;
      if (!deleted.length) throw makeError('Talk guest not found', 'TALK_GUEST_NOT_FOUND', 404);
      return { guest_id: guestId, deleted: true };
    }

    case 'talk_set_asset_status': {
      const assetId = clean(body.asset_id);
      const status = clean(body.status);
      if (!assetId || !['ready', 'approved'].includes(status)) throw makeError('Valid asset status is required', 'valid_asset_id_and_status_required');
      const [asset] = await sql`UPDATE creapd.talk_assets SET status=${status}, updated_at=now() WHERE id=${assetId} AND owner_user_id=${String(ownerUserId)} RETURNING *`;
      if (!asset) throw makeError('Talk asset not found', 'TALK_ASSET_NOT_FOUND', 404);
      return { asset: withDates(asset) };
    }

    case 'talk_set_segment_status': {
      const segmentId = clean(body.segment_id);
      const status = clean(body.status);
      if (!segmentId || !['ready', 'approved'].includes(status)) throw makeError('Valid segment status is required', 'valid_segment_id_and_status_required');
      const [segment] = await sql`UPDATE creapd.talk_segments SET status=${status}, updated_at=now() WHERE id=${segmentId} AND owner_user_id=${String(ownerUserId)} RETURNING *`;
      if (!segment) throw makeError('Talk segment not found', 'TALK_SEGMENT_NOT_FOUND', 404);
      return { segment: withSegmentAliases(segment) };
    }

    case 'talk_start_session': {
      const configuration = await requireConfiguration(sql, ownerUserId, body.configuration_id);
      let [session] = await sql`SELECT * FROM creapd.talk_sessions WHERE configuration_id=${configuration.id} AND owner_user_id=${String(ownerUserId)} ORDER BY updated_at DESC LIMIT 1`;
      if (!session) {
        [session] = await sql`
          INSERT INTO creapd.talk_sessions (id, configuration_id, owner_user_id, episode_id, status, started_at, host_view_state)
          VALUES (${randomUUID()}, ${configuration.id}, ${String(ownerUserId)}, ${configuration.episode_id || null}, 'live', now(), '{}'::jsonb)
          RETURNING *
        `;
      } else {
        [session] = await sql`UPDATE creapd.talk_sessions SET status='live', started_at=COALESCE(started_at, now()), ended_at=NULL, paused_at=NULL, updated_at=now() WHERE id=${session.id} AND owner_user_id=${String(ownerUserId)} RETURNING *`;
      }
      await sql`INSERT INTO creapd.talk_events (id, session_id, configuration_id, owner_user_id, event_type, payload) VALUES (${randomUUID()}, ${session.id}, ${configuration.id}, ${String(ownerUserId)}, 'session_start', '{}'::jsonb)`;
      return { session: withDates(session) };
    }

    case 'talk_session_event':
      return { event: await recordSessionEvent(sql, ownerUserId, body) };

    default:
      throw makeError('Unsupported Talk Studio action', 'unsupported_talk_action');
  }
}
