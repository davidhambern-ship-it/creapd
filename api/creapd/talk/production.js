import { randomUUID } from 'node:crypto';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { runTalkBuild } from '../../../server/talkEngine.js';

export const config = {
  maxDuration: 60,
};

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
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

function withTopicAliases(row) {
  return row ? withDates(row) : row;
}

function withResearchAliases(row) {
  if (!row) return row;
  return withDates({
    ...row,
    date: row.research_date || null,
  });
}

function withGuestAliases(row) {
  return row ? withDates(row) : row;
}

function withSegmentAliases(row) {
  if (!row) return row;
  return withDates({
    ...row,
    order: row.order_index,
  });
}

function withAssetAliases(row) {
  return row ? withDates(row) : row;
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'talk_production_request_failed').slice(0, 240),
  };
}

function success(response, action, payload = {}) {
  return response.status(200).json({
    ok: true,
    service: 'creapd-talk',
    action,
    source: 'neon',
    data_authority: 'neon',
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

async function readTalkProduction(sql, ownerUserId, requestedConfigurationId) {
  let configuration = null;
  const requestedId = clean(requestedConfigurationId);

  if (requestedId) {
    [configuration] = await sql`
      SELECT * FROM creapd.talk_production_configurations
      WHERE id = ${requestedId} AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `;
  } else {
    [configuration] = await sql`
      SELECT * FROM creapd.talk_production_configurations
      WHERE owner_user_id = ${ownerUserId}
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
    sql`SELECT * FROM creapd.talk_topics WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY display_order ASC, created_at ASC`,
    sql`SELECT * FROM creapd.talk_research_items WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.talk_guests WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.talk_segments WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY order_index ASC, created_at ASC`,
    sql`SELECT * FROM creapd.talk_assets WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.production_packages WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} AND production_profile = 'talk' ORDER BY updated_at DESC`,
    sql`SELECT * FROM creapd.talk_sessions WHERE configuration_id = ${configId} AND owner_user_id = ${ownerUserId} ORDER BY updated_at DESC LIMIT 1`,
  ]);

  return {
    configuration: withConfigAliases(configuration),
    topics: (topics || []).map(withTopicAliases),
    research: (research || []).map(withResearchAliases),
    guests: (guests || []).map(withGuestAliases),
    segments: (segments || []).map(withSegmentAliases),
    assets: (assets || []).map(withAssetAliases),
    packages: (packages || []).map(withDates),
    session: sessions?.[0] ? withDates(sessions[0]) : null,
  };
}

async function requireOwnedConfiguration(sql, ownerUserId, configurationId) {
  const configId = clean(configurationId);
  if (!configId) {
    const error = new Error('configuration_id_required');
    error.code = 'configuration_id_required';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT * FROM creapd.talk_production_configurations
    WHERE id = ${configId} AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;
  if (!configuration) {
    const error = new Error('Talk configuration not found');
    error.code = 'TALK_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return configuration;
}

async function createGuest(sql, ownerUserId, body) {
  const configuration = await requireOwnedConfiguration(sql, ownerUserId, body.configuration_id);
  const guest = body.guest && typeof body.guest === 'object' ? body.guest : body;
  const guestName = clean(guest.guest_name);
  if (!guestName) {
    const error = new Error('guest_name_required');
    error.code = 'guest_name_required';
    error.status = 400;
    throw error;
  }

  const [created] = await sql`
    INSERT INTO creapd.talk_guests (
      id, configuration_id, owner_user_id, guest_name, title_role, organization, bio,
      expertise, website_url, social_handle, talking_points, photo_prompt, status,
      availability_status, guest_source, source_system, source_payload
    ) VALUES (
      ${randomUUID()}, ${configuration.id}, ${ownerUserId}, ${guestName}, ${clean(guest.title_role)},
      ${clean(guest.organization)}, ${clean(guest.bio)}, ${clean(guest.expertise)}, ${clean(guest.website_url)},
      ${clean(guest.social_handle)}, ${clean(guest.talking_points)}, ${clean(guest.photo_prompt)},
      ${['pending', 'confirmed', 'cancelled'].includes(guest.status) ? guest.status : 'pending'},
      ${clean(guest.availability_status, 'manual')}, 'manual', 'creapd-vercel', '{}'::jsonb
    ) RETURNING *
  `;
  return withGuestAliases(created);
}

async function updateGuest(sql, ownerUserId, body) {
  const guestId = clean(body.guest_id || body.id);
  if (!guestId) {
    const error = new Error('guest_id_required');
    error.code = 'guest_id_required';
    error.status = 400;
    throw error;
  }
  const [existing] = await sql`
    SELECT * FROM creapd.talk_guests WHERE id = ${guestId} AND owner_user_id = ${ownerUserId} LIMIT 1
  `;
  if (!existing) {
    const error = new Error('Guest not found');
    error.code = 'TALK_GUEST_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  const patch = body.guest && typeof body.guest === 'object' ? body.guest : body.patch || {};
  const status = ['pending', 'confirmed', 'cancelled'].includes(patch.status) ? patch.status : existing.status;
  const [updated] = await sql`
    UPDATE creapd.talk_guests SET
      guest_name = ${clean(patch.guest_name, existing.guest_name)},
      title_role = ${patch.title_role !== undefined ? clean(patch.title_role) : existing.title_role},
      organization = ${patch.organization !== undefined ? clean(patch.organization) : existing.organization},
      bio = ${patch.bio !== undefined ? clean(patch.bio) : existing.bio},
      expertise = ${patch.expertise !== undefined ? clean(patch.expertise) : existing.expertise},
      website_url = ${patch.website_url !== undefined ? clean(patch.website_url) : existing.website_url},
      social_handle = ${patch.social_handle !== undefined ? clean(patch.social_handle) : existing.social_handle},
      talking_points = ${patch.talking_points !== undefined ? clean(patch.talking_points) : existing.talking_points},
      photo_prompt = ${patch.photo_prompt !== undefined ? clean(patch.photo_prompt) : existing.photo_prompt},
      status = ${status},
      availability_status = ${patch.availability_status !== undefined ? clean(patch.availability_status, existing.availability_status) : existing.availability_status},
      updated_at = now()
    WHERE id = ${guestId} AND owner_user_id = ${ownerUserId}
    RETURNING *
  `;
  return withGuestAliases(updated);
}

async function createSessionEvent(sql, ownerUserId, body) {
  const sessionId = clean(body.session_id);
  const eventType = clean(body.event_type);
  const allowedEvents = new Set([
    'session_start', 'session_pause', 'session_resume', 'session_end',
    'segment_start', 'segment_end', 'transition', 'clip_marker',
    'obs_command', 'overlay_command',
  ]);
  if (!sessionId || !allowedEvents.has(eventType)) {
    const error = new Error('valid_session_id_and_event_type_required');
    error.code = 'valid_session_id_and_event_type_required';
    error.status = 400;
    throw error;
  }

  const [session] = await sql`
    SELECT * FROM creapd.talk_sessions WHERE id = ${sessionId} AND owner_user_id = ${ownerUserId} LIMIT 1
  `;
  if (!session) {
    const error = new Error('Talk session not found');
    error.code = 'TALK_SESSION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const segmentId = clean(body.segment_id) || null;
  if (segmentId) {
    const [segment] = await sql`
      SELECT id FROM creapd.talk_segments
      WHERE id = ${segmentId} AND configuration_id = ${session.configuration_id} AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `;
    if (!segment) {
      const error = new Error('Talk segment not found');
      error.code = 'TALK_SEGMENT_NOT_FOUND';
      error.status = 404;
      throw error;
    }
  }

  if (eventType === 'session_start') {
    await sql`UPDATE creapd.talk_sessions SET status = 'live', started_at = COALESCE(started_at, now()), paused_at = NULL, updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'session_pause') {
    await sql`UPDATE creapd.talk_sessions SET status = 'paused', paused_at = now(), updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'session_resume') {
    await sql`UPDATE creapd.talk_sessions SET status = 'live', paused_at = NULL, updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'session_end') {
    await sql`UPDATE creapd.talk_sessions SET status = 'complete', ended_at = now(), active_segment_id = NULL, updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'segment_start' && segmentId) {
    await sql`UPDATE creapd.talk_segments SET runtime_status = 'live', actual_start_at = COALESCE(actual_start_at, now()), actual_end_at = NULL, updated_at = now() WHERE id = ${segmentId} AND owner_user_id = ${ownerUserId}`;
    await sql`UPDATE creapd.talk_sessions SET active_segment_id = ${segmentId}, status = 'live', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'segment_end' && segmentId) {
    await sql`UPDATE creapd.talk_segments SET runtime_status = 'complete', actual_end_at = now(), actual_duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - actual_start_at))), updated_at = now() WHERE id = ${segmentId} AND owner_user_id = ${ownerUserId}`;
    await sql`UPDATE creapd.talk_sessions SET active_segment_id = NULL, updated_at = now() WHERE id = ${sessionId}`;
  } else if (eventType === 'clip_marker' && segmentId) {
    await sql`UPDATE creapd.talk_segments SET clip_marker_count = clip_marker_count + 1, updated_at = now() WHERE id = ${segmentId} AND owner_user_id = ${ownerUserId}`;
  }

  const [event] = await sql`
    INSERT INTO creapd.talk_events (
      id, session_id, configuration_id, owner_user_id, segment_id, event_type, payload
    ) VALUES (
      ${randomUUID()}, ${sessionId}, ${session.configuration_id}, ${ownerUserId}, ${segmentId},
      ${eventType}, ${JSON.stringify(body.payload || {})}::jsonb
    ) RETURNING *
  `;
  return withDates(event);
}

async function handlePost(request, response, sql, ownerUserId, ownerEmail) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const action = clean(body.action);
  if (!action) return response.status(400).json({ ok: false, error: 'action_required' });

  switch (action) {
    case 'build':
    case 'refresh': {
      const result = await runTalkBuild({
        sql,
        ownerUserId,
        ownerEmail,
        configurationId: body.configuration_id,
      });
      return success(response, action, { result });
    }

    case 'set_topic_status': {
      const topicId = clean(body.topic_id);
      const status = clean(body.status);
      if (!topicId || !['suggested', 'ready', 'approved', 'removed'].includes(status)) {
        return response.status(400).json({ ok: false, error: 'valid_topic_id_and_status_required' });
      }
      const [topic] = await sql`
        UPDATE creapd.talk_topics SET status = ${status}, updated_at = now()
        WHERE id = ${topicId} AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;
      if (!topic) return response.status(404).json({ ok: false, error: 'TALK_TOPIC_NOT_FOUND' });
      return success(response, action, { topic: withTopicAliases(topic) });
    }

    case 'create_guest': {
      const guest = await createGuest(sql, ownerUserId, body);
      return success(response, action, { guest });
    }

    case 'update_guest': {
      const guest = await updateGuest(sql, ownerUserId, body);
      return success(response, action, { guest });
    }

    case 'delete_guest': {
      const guestId = clean(body.guest_id || body.id);
      if (!guestId) return response.status(400).json({ ok: false, error: 'guest_id_required' });
      const deleted = await sql`DELETE FROM creapd.talk_guests WHERE id = ${guestId} AND owner_user_id = ${ownerUserId} RETURNING id`;
      if (!deleted.length) return response.status(404).json({ ok: false, error: 'TALK_GUEST_NOT_FOUND' });
      return success(response, action, { guest_id: guestId, deleted: true });
    }

    case 'set_asset_status': {
      const assetId = clean(body.asset_id);
      const status = clean(body.status);
      if (!assetId || !['ready', 'approved'].includes(status)) {
        return response.status(400).json({ ok: false, error: 'valid_asset_id_and_status_required' });
      }
      const [asset] = await sql`
        UPDATE creapd.talk_assets SET status = ${status}, updated_at = now()
        WHERE id = ${assetId} AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;
      if (!asset) return response.status(404).json({ ok: false, error: 'TALK_ASSET_NOT_FOUND' });
      return success(response, action, { asset: withAssetAliases(asset) });
    }

    case 'set_segment_status': {
      const segmentId = clean(body.segment_id);
      const status = clean(body.status);
      if (!segmentId || !['ready', 'approved'].includes(status)) {
        return response.status(400).json({ ok: false, error: 'valid_segment_id_and_status_required' });
      }
      const [segment] = await sql`
        UPDATE creapd.talk_segments SET status = ${status}, updated_at = now()
        WHERE id = ${segmentId} AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;
      if (!segment) return response.status(404).json({ ok: false, error: 'TALK_SEGMENT_NOT_FOUND' });
      return success(response, action, { segment: withSegmentAliases(segment) });
    }

    case 'start_session': {
      const configuration = await requireOwnedConfiguration(sql, ownerUserId, body.configuration_id);
      let [session] = await sql`
        SELECT * FROM creapd.talk_sessions
        WHERE configuration_id = ${configuration.id} AND owner_user_id = ${ownerUserId}
        ORDER BY updated_at DESC LIMIT 1
      `;
      if (!session) {
        [session] = await sql`
          INSERT INTO creapd.talk_sessions (
            id, configuration_id, owner_user_id, episode_id, status, started_at, host_view_state
          ) VALUES (
            ${randomUUID()}, ${configuration.id}, ${ownerUserId}, ${configuration.episode_id || null}, 'live', now(), '{}'::jsonb
          ) RETURNING *
        `;
      } else {
        [session] = await sql`
          UPDATE creapd.talk_sessions
          SET status = 'live', started_at = COALESCE(started_at, now()), ended_at = NULL, paused_at = NULL, updated_at = now()
          WHERE id = ${session.id} AND owner_user_id = ${ownerUserId}
          RETURNING *
        `;
      }
      await sql`
        INSERT INTO creapd.talk_events (id, session_id, configuration_id, owner_user_id, event_type, payload)
        VALUES (${randomUUID()}, ${session.id}, ${configuration.id}, ${ownerUserId}, 'session_start', '{}'::jsonb)
      `;
      return success(response, action, { session: withDates(session) });
    }

    case 'session_event': {
      const event = await createSessionEvent(sql, ownerUserId, body);
      return success(response, action, { event });
    }

    default:
      return response.status(400).json({ ok: false, error: 'unsupported_action' });
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!hasDatabaseConfig()) {
    return response.status(503).json({ ok: false, service: 'creapd-talk', error: 'database_not_configured' });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);

    if (request.method === 'POST') {
      return await handlePost(request, response, sql, ownerUserId, user.email || null);
    }

    const data = await readTalkProduction(sql, ownerUserId, request.query?.configuration_id);
    return success(response, 'read', data);
  } catch (error) {
    const status = Number(error?.status || 0);
    if ([400, 401, 403, 404, 409].includes(status)) {
      return response.status(status).json({
        ok: false,
        service: 'creapd-talk',
        error: error.code || 'talk_request_failed',
        diagnostic: safeError(error),
        timestamp: new Date().toISOString(),
      });
    }
    console.error('[CREAPD TALK PRODUCTION]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-talk',
      error: 'talk_production_request_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
