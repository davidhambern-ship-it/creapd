function clean(value) {
  return String(value ?? '').trim();
}

function withDates(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at || null,
    updated_date: row.updated_at || null,
  };
}

function withSegmentAliases(row) {
  if (!row) return row;
  return withDates({ ...row, order: row.order_index });
}

export async function readTalkLiveState(sql, ownerUserId, requestedConfigurationId = null) {
  const ownerId = String(ownerUserId || '').trim();
  if (!ownerId) throw new Error('owner_user_id_required');

  const requestedId = clean(requestedConfigurationId);
  let configuration = null;

  if (requestedId) {
    [configuration] = await sql`
      SELECT id, owner_user_id, production_name, host_name, show_format,
             station_name, status, updated_at
      FROM creapd.talk_production_configurations
      WHERE id = ${requestedId}
        AND owner_user_id = ${ownerId}
      LIMIT 1
    `;
  } else {
    [configuration] = await sql`
      SELECT id, owner_user_id, production_name, host_name, show_format,
             station_name, status, updated_at
      FROM creapd.talk_production_configurations
      WHERE owner_user_id = ${ownerId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
  }

  if (!configuration) {
    return {
      configuration: null,
      topics: [],
      segments: [],
      session: null,
      live_state: true,
    };
  }

  const configId = configuration.id;
  const [topics, segments, sessions] = await Promise.all([
    sql`
      SELECT id, configuration_id, topic_name, display_order, status, updated_at
      FROM creapd.talk_topics
      WHERE configuration_id = ${configId}
        AND owner_user_id = ${ownerId}
      ORDER BY display_order ASC, created_at ASC
    `,
    sql`
      SELECT id, configuration_id, order_index, segment_type, title, duration_seconds,
             start_time, end_time, notes, status, runtime_status, actual_start_at,
             actual_end_at, actual_duration_seconds, clip_marker_count, obs_scene,
             overlay_payload, updated_at
      FROM creapd.talk_segments
      WHERE configuration_id = ${configId}
        AND owner_user_id = ${ownerId}
      ORDER BY order_index ASC, created_at ASC
    `,
    sql`
      SELECT id, configuration_id, status, active_segment_id, started_at, ended_at,
             paused_at, elapsed_seconds, obs_connection_status, updated_at
      FROM creapd.talk_sessions
      WHERE configuration_id = ${configId}
        AND owner_user_id = ${ownerId}
      ORDER BY updated_at DESC
      LIMIT 1
    `,
  ]);

  return {
    configuration: withDates(configuration),
    topics: (topics || []).map(withDates),
    segments: (segments || []).map(withSegmentAliases),
    session: sessions?.[0] ? withDates(sessions[0]) : null,
    live_state: true,
  };
}
