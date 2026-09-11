import { createHash, randomBytes, randomUUID } from 'node:crypto';

const AGENT_ACTIONS = new Set([
  'obs_bridge_agent_poll',
  'obs_bridge_agent_complete',
]);

const USER_COMMANDS = new Set([
  'set_scene',
  'refresh_state',
  'start_recording',
  'stop_recording',
  'pause_recording',
  'resume_recording',
  'show_lower_third',
  'clear_overlay',
]);

const OVERLAY_POSITIONS = new Set([
  'bottom_left',
  'bottom_center',
  'bottom_right',
  'top_left',
  'top_center',
  'top_right',
]);

const AGENT_HEARTBEAT_WRITE_MS = 6000;
const BRIDGE_ONLINE_WINDOW_MS = 15000;

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanNullable(value) {
  const text = clean(value);
  return text || null;
}

function makeError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function tokenHash(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function json(value) {
  return JSON.stringify(value ?? {});
}

function normalizeScenes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(scene => clean(typeof scene === 'string' ? scene : scene?.sceneName || scene?.name))
    .filter(Boolean)
    .slice(0, 100);
}

function bridgeIsOnline(row) {
  if (!row?.last_seen_at) return false;
  const lastSeen = new Date(row.last_seen_at).getTime();
  return Number.isFinite(lastSeen) && Date.now() - lastSeen < BRIDGE_ONLINE_WINDOW_MS;
}

function publicBridge(row) {
  if (!row) return null;
  const online = bridgeIsOnline(row);
  const connected = Boolean(online && row.obs_connected && !row.revoked_at);
  return {
    id: row.id,
    name: row.name,
    token_hint: row.token_hint || null,
    status: row.revoked_at
      ? 'revoked'
      : connected
        ? 'connected'
        : online
          ? 'bridge_online'
          : row.status === 'pairing'
            ? 'pairing'
            : 'offline',
    online,
    connected,
    obs_endpoint: row.obs_endpoint || null,
    obs_studio_version: row.obs_studio_version || null,
    obs_websocket_version: row.obs_websocket_version || null,
    current_scene: row.current_scene || null,
    scenes: Array.isArray(row.scenes) ? row.scenes : [],
    capabilities: row.capabilities && typeof row.capabilities === 'object' ? row.capabilities : {},
    last_seen_at: row.last_seen_at || null,
    last_error: row.last_error || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function findOwnedBridge(sql, ownerUserId, requestedBridgeId = null) {
  const ownerId = String(ownerUserId || '').trim();
  const bridgeId = clean(requestedBridgeId);
  let rows;
  if (bridgeId) {
    rows = await sql`
      SELECT id, owner_user_id, name, token_hint, status, obs_connected,
             obs_endpoint, obs_studio_version, obs_websocket_version, current_scene,
             scenes, capabilities, last_seen_at, last_error, revoked_at, created_at, updated_at
      FROM creapd.obs_bridges
      WHERE id = ${bridgeId}
        AND owner_user_id = ${ownerId}
        AND revoked_at IS NULL
      LIMIT 1
    `;
  } else {
    rows = await sql`
      SELECT id, owner_user_id, name, token_hint, status, obs_connected,
             obs_endpoint, obs_studio_version, obs_websocket_version, current_scene,
             scenes, capabilities, last_seen_at, last_error, revoked_at, created_at, updated_at
      FROM creapd.obs_bridges
      WHERE owner_user_id = ${ownerId}
        AND revoked_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `;
  }
  return rows?.[0] || null;
}

async function requireAgentBridge(sql, bridgeToken) {
  const token = clean(bridgeToken);
  if (!token) throw makeError('Bridge token is required', 'OBS_BRIDGE_TOKEN_REQUIRED', 401);
  const hash = tokenHash(token);
  const [bridge] = await sql`
    SELECT id, owner_user_id, status, obs_connected, obs_endpoint,
           obs_studio_version, obs_websocket_version, current_scene, scenes,
           capabilities, last_seen_at, last_error, revoked_at
    FROM creapd.obs_bridges
    WHERE token_hash = ${hash}
      AND revoked_at IS NULL
    LIMIT 1
  `;
  if (!bridge) throw makeError('Bridge token is invalid or revoked', 'OBS_BRIDGE_TOKEN_INVALID', 401);
  return bridge;
}

async function createOrRotateBridge(sql, ownerUserId, name) {
  const ownerId = String(ownerUserId);
  const token = `creapd_obs_${randomBytes(32).toString('base64url')}`;
  const hash = tokenHash(token);
  const hint = token.slice(-6);
  const existing = await findOwnedBridge(sql, ownerId);
  let bridge;

  if (existing) {
    [bridge] = await sql`
      UPDATE creapd.obs_bridges
      SET token_hash = ${hash}, token_hint = ${hint}, name = ${clean(name, existing.name || 'Studio OBS')},
          status = 'pairing', obs_connected = false, last_error = NULL, updated_at = now()
      WHERE id = ${existing.id} AND owner_user_id = ${ownerId}
      RETURNING *
    `;
  } else {
    [bridge] = await sql`
      INSERT INTO creapd.obs_bridges (
        id, owner_user_id, name, token_hash, token_hint, status
      ) VALUES (
        ${randomUUID()}, ${ownerId}, ${clean(name, 'Studio OBS')}, ${hash}, ${hint}, 'pairing'
      )
      RETURNING *
    `;
  }

  return {
    bridge: publicBridge(bridge),
    bridge_token: token,
    token_shown_once: true,
  };
}

async function saveTalkSegmentScene(sql, ownerUserId, body) {
  const ownerId = String(ownerUserId || '').trim();
  const segmentId = clean(body.segment_id);
  if (!segmentId) throw makeError('segment_id is required', 'OBS_SEGMENT_ID_REQUIRED');

  const [existing] = await sql`
    SELECT id, configuration_id
    FROM creapd.talk_segments
    WHERE id = ${segmentId}
      AND owner_user_id = ${ownerId}
    LIMIT 1
  `;
  if (!existing) throw makeError('Talk segment not found', 'TALK_SEGMENT_NOT_FOUND', 404);

  const requestedConfigurationId = clean(body.configuration_id);
  if (requestedConfigurationId && requestedConfigurationId !== existing.configuration_id) {
    throw makeError('Talk segment does not belong to this production', 'OBS_SEGMENT_CONFIGURATION_MISMATCH', 409);
  }

  const sceneName = cleanNullable(body.scene_name);
  if (sceneName && sceneName.length > 160) {
    throw makeError('OBS scene name is too long', 'OBS_SCENE_NAME_TOO_LONG');
  }

  const [segment] = await sql`
    UPDATE creapd.talk_segments
    SET obs_scene = ${sceneName}, updated_at = now()
    WHERE id = ${segmentId}
      AND owner_user_id = ${ownerId}
    RETURNING *
  `;

  return {
    segment: {
      ...segment,
      order: segment.order_index,
      created_date: segment.created_at || null,
      updated_date: segment.updated_at || null,
    },
    mapping_saved: true,
  };
}

async function enqueueCommand(sql, ownerUserId, body) {
  const ownerId = String(ownerUserId);
  const bridge = await findOwnedBridge(sql, ownerId, body.bridge_id);
  if (!bridge) throw makeError('OBS bridge not found', 'OBS_BRIDGE_NOT_FOUND', 404);

  const commandType = clean(body.command_type);
  if (!USER_COMMANDS.has(commandType)) {
    throw makeError('Unsupported OBS command', 'OBS_COMMAND_UNSUPPORTED');
  }

  let payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
    ? { ...body.payload }
    : {};

  if (commandType === 'set_scene' && !clean(payload.scene_name)) {
    throw makeError('scene_name is required', 'OBS_SCENE_NAME_REQUIRED');
  }

  if (commandType === 'show_lower_third') {
    const title = clean(payload.title);
    if (!title) throw makeError('Lower-third title is required', 'OBS_LOWER_THIRD_TITLE_REQUIRED');
    const requestedPosition = clean(payload.position, 'bottom_left').toLowerCase();
    payload = {
      title: title.slice(0, 120),
      subtitle: clean(payload.subtitle).slice(0, 180),
      label: clean(payload.label, 'CREAPD LIVE').slice(0, 40),
      position: OVERLAY_POSITIONS.has(requestedPosition) ? requestedPosition : 'bottom_left',
    };
  }

  const [command] = await sql`
    INSERT INTO creapd.obs_commands (
      id, bridge_id, owner_user_id, session_type, session_id, command_type, payload, status
    ) VALUES (
      ${randomUUID()}, ${bridge.id}, ${ownerId}, ${cleanNullable(body.session_type)}, ${cleanNullable(body.session_id)},
      ${commandType}, ${json(payload)}::jsonb, 'pending'
    )
    RETURNING id, bridge_id, command_type, payload, status, requested_at
  `;

  return {
    command: {
      id: command.id,
      bridge_id: command.bridge_id,
      command_type: command.command_type,
      payload: command.payload || {},
      status: command.status,
      requested_at: command.requested_at,
    },
  };
}

export function isObsBridgeAgentAction(action) {
  return AGENT_ACTIONS.has(clean(action));
}

export async function runObsBridgeUserAction({ sql, ownerUserId, action, body = {} }) {
  switch (action) {
    case 'obs_bridge_get': {
      const bridge = await findOwnedBridge(sql, ownerUserId, body.bridge_id);
      return { bridge: publicBridge(bridge) };
    }

    case 'obs_bridge_create':
      return createOrRotateBridge(sql, ownerUserId, body.name);

    case 'obs_bridge_revoke': {
      const bridge = await findOwnedBridge(sql, ownerUserId, body.bridge_id);
      if (!bridge) throw makeError('OBS bridge not found', 'OBS_BRIDGE_NOT_FOUND', 404);
      const [revoked] = await sql`
        UPDATE creapd.obs_bridges
        SET revoked_at = now(), status = 'revoked', obs_connected = false, updated_at = now()
        WHERE id = ${bridge.id} AND owner_user_id = ${String(ownerUserId)}
        RETURNING *
      `;
      return { bridge: publicBridge(revoked), revoked: true };
    }

    case 'obs_segment_scene_save':
      return saveTalkSegmentScene(sql, ownerUserId, body);

    case 'obs_command_enqueue':
      return enqueueCommand(sql, ownerUserId, body);

    default:
      throw makeError('Unsupported OBS bridge action', 'OBS_BRIDGE_ACTION_UNSUPPORTED');
  }
}

function jsonEqual(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function heartbeatNeedsWrite(bridge, body, normalized) {
  const lastSeen = bridge?.last_seen_at ? new Date(bridge.last_seen_at).getTime() : NaN;
  const heartbeatDue = !Number.isFinite(lastSeen) || Date.now() - lastSeen >= AGENT_HEARTBEAT_WRITE_MS;
  if (heartbeatDue) return true;

  if (Boolean(bridge.obs_connected) !== normalized.obsConnected) return true;
  if (normalized.currentScene && normalized.currentScene !== cleanNullable(bridge.current_scene)) return true;
  if (normalized.endpoint && normalized.endpoint !== cleanNullable(bridge.obs_endpoint)) return true;
  if (normalized.studioVersion && normalized.studioVersion !== cleanNullable(bridge.obs_studio_version)) return true;
  if (normalized.websocketVersion && normalized.websocketVersion !== cleanNullable(bridge.obs_websocket_version)) return true;
  if (normalized.lastError !== cleanNullable(bridge.last_error)) return true;
  if (normalized.scenes.length > 0 && !jsonEqual(normalized.scenes, bridge.scenes || [])) return true;
  if (Object.keys(normalized.capabilities).length > 0 && !jsonEqual(normalized.capabilities, bridge.capabilities || {})) return true;

  return false;
}

async function updateBridgeHeartbeat(sql, bridge, body) {
  const normalized = {
    obsConnected: Boolean(body.obs_connected),
    scenes: normalizeScenes(body.scenes),
    currentScene: cleanNullable(body.current_scene),
    endpoint: cleanNullable(body.obs_endpoint),
    studioVersion: cleanNullable(body.obs_studio_version),
    websocketVersion: cleanNullable(body.obs_websocket_version),
    lastError: Boolean(body.obs_connected) ? null : cleanNullable(body.last_error),
    capabilities: body.capabilities && typeof body.capabilities === 'object' && !Array.isArray(body.capabilities)
      ? body.capabilities
      : {},
  };

  if (!heartbeatNeedsWrite(bridge, body, normalized)) {
    return false;
  }

  const connectionStatus = normalized.obsConnected ? 'connected' : 'bridge_online';
  await sql`
    UPDATE creapd.obs_bridges
    SET status = ${connectionStatus},
        obs_connected = ${normalized.obsConnected},
        obs_endpoint = COALESCE(${normalized.endpoint}, obs_endpoint),
        obs_studio_version = COALESCE(${normalized.studioVersion}, obs_studio_version),
        obs_websocket_version = COALESCE(${normalized.websocketVersion}, obs_websocket_version),
        current_scene = COALESCE(${normalized.currentScene}, current_scene),
        scenes = CASE WHEN ${normalized.scenes.length} > 0 THEN ${JSON.stringify(normalized.scenes)}::jsonb ELSE scenes END,
        capabilities = CASE WHEN ${Object.keys(normalized.capabilities).length} > 0 THEN ${JSON.stringify(normalized.capabilities)}::jsonb ELSE capabilities END,
        last_seen_at = now(),
        last_error = ${normalized.lastError},
        updated_at = now()
    WHERE id = ${bridge.id}
      AND revoked_at IS NULL
  `;

  await sql`
    UPDATE creapd.talk_sessions
    SET obs_connection_status = ${connectionStatus}, updated_at = now()
    WHERE owner_user_id = ${bridge.owner_user_id}
      AND status IN ('live', 'paused')
      AND obs_connection_status IS DISTINCT FROM ${connectionStatus}
  `;

  return true;
}

async function pollBridge(sql, body) {
  const bridge = await requireAgentBridge(sql, body.bridge_token);
  const heartbeatWritten = await updateBridgeHeartbeat(sql, bridge, body);

  const commands = await sql`
    WITH picked AS (
      SELECT id
      FROM creapd.obs_commands
      WHERE bridge_id = ${bridge.id}
        AND (
          status = 'pending'
          OR (status = 'claimed' AND claimed_at < now() - interval '15 seconds')
        )
      ORDER BY requested_at ASC
      LIMIT 5
      FOR UPDATE SKIP LOCKED
    )
    UPDATE creapd.obs_commands command
    SET status = 'claimed', claimed_at = now(), updated_at = now()
    FROM picked
    WHERE command.id = picked.id
    RETURNING command.id, command.command_type, command.payload,
              command.session_type, command.session_id, command.requested_at
  `;

  return {
    heartbeat_written: heartbeatWritten,
    commands: (commands || []).map(command => ({
      id: command.id,
      command_type: command.command_type,
      payload: command.payload || {},
      session_type: command.session_type || null,
      session_id: command.session_id || null,
      requested_at: command.requested_at,
    })),
  };
}

async function completeCommand(sql, body) {
  const bridge = await requireAgentBridge(sql, body.bridge_token);
  const commandId = clean(body.command_id);
  if (!commandId) throw makeError('command_id is required', 'OBS_COMMAND_ID_REQUIRED');

  const succeeded = body.success !== false;
  const result = body.result && typeof body.result === 'object' && !Array.isArray(body.result)
    ? body.result
    : {};
  const errorText = succeeded ? null : cleanNullable(body.error || 'OBS command failed');

  const [command] = await sql`
    UPDATE creapd.obs_commands
    SET status = ${succeeded ? 'completed' : 'failed'},
        completed_at = now(), result = ${JSON.stringify(result)}::jsonb,
        error = ${errorText}, updated_at = now()
    WHERE id = ${commandId}
      AND bridge_id = ${bridge.id}
      AND owner_user_id = ${bridge.owner_user_id}
    RETURNING id, status, command_type, result, error, completed_at
  `;
  if (!command) throw makeError('OBS command not found', 'OBS_COMMAND_NOT_FOUND', 404);

  const resultingScene = cleanNullable(result.current_scene);
  if (succeeded && resultingScene) {
    await sql`
      UPDATE creapd.obs_bridges
      SET current_scene = ${resultingScene}, last_error = NULL, updated_at = now()
      WHERE id = ${bridge.id}
    `;
  } else if (!succeeded && errorText) {
    await sql`
      UPDATE creapd.obs_bridges
      SET last_error = ${errorText}, updated_at = now()
      WHERE id = ${bridge.id}
    `;
  }

  return {
    command: {
      id: command.id,
      status: command.status,
      command_type: command.command_type,
      result: command.result || {},
      error: command.error || null,
      completed_at: command.completed_at,
    },
  };
}

export async function runObsBridgeAgentAction({ sql, action, body = {} }) {
  switch (action) {
    case 'obs_bridge_agent_poll':
      return pollBridge(sql, body);
    case 'obs_bridge_agent_complete':
      return completeCommand(sql, body);
    default:
      throw makeError('Unsupported OBS bridge agent action', 'OBS_BRIDGE_AGENT_ACTION_UNSUPPORTED');
  }
}
