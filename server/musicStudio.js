import { randomUUID } from 'node:crypto';
import {
  runMusicBuild,
  regenerateMusicSection,
  regenerateRejectedMusicMaterials,
  generateMusicTop10,
  fetchYoutubeMetadata,
  refreshMusicPlaylistYoutubeMetadata,
  generateMusicStructured,
} from './musicEngine.js';

function clean(value, fallback = '') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function nullable(value) {
  const result = clean(value);
  return result || null;
}

function normalizeDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function boolean(value, fallback = false) {
  return value === undefined || value === null ? fallback : Boolean(value);
}

function parseArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {}
  }
  return fallback;
}

function parseObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {}
  }
  return fallback;
}

function withDates(row) {
  if (!row) return row;
  return { ...row, created_date: row.created_at || null, updated_date: row.updated_at || null };
}

function withConfigAliases(row) {
  if (!row) return row;
  return withDates({
    ...row,
    show_date: normalizeDateOnly(row.show_date),
    genres: JSON.stringify(parseArray(row.genres, [])),
    moods: JSON.stringify(parseArray(row.moods, [])),
    music_topics: JSON.stringify(parseArray(row.music_topics, [])),
    research_sources: JSON.stringify(parseArray(row.research_sources, [])),
    pacing_rules: JSON.stringify(parseObject(row.pacing_rules, {})),
    ai_automation: JSON.stringify(parseArray(row.ai_automation, [])),
    vo_requirements: JSON.stringify(parseObject(row.vo_requirements, {})),
    production_plan: JSON.stringify(parseObject(row.production_plan, {})),
    build_log: JSON.stringify(parseArray(row.build_log, [])),
  });
}

function withOrder(row) {
  if (!row) return row;
  return withDates({ ...row, order: row.order_index });
}

function withResearchAliases(row) {
  if (!row) return row;
  return withDates({ ...row, date: row.research_date || null });
}

function fail(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function requireConfig(sql, ownerUserId, configurationId) {
  const id = clean(configurationId);
  if (!id) throw fail('configuration_id_required', 'configuration_id_required');
  const [row] = await sql`
    SELECT * FROM creapd.music_production_configurations
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)}
    LIMIT 1
  `;
  if (!row) throw fail('Music configuration not found', 'MUSIC_CONFIGURATION_NOT_FOUND', 404);
  return row;
}

export async function readMusicStudio(sql, ownerUserId, requestedConfigurationId = null) {
  const ownerId = String(ownerUserId);
  let configuration = null;
  const requestedId = clean(requestedConfigurationId);
  if (requestedId) {
    [configuration] = await sql`
      SELECT * FROM creapd.music_production_configurations
      WHERE id=${requestedId} AND owner_user_id=${ownerId}
      LIMIT 1
    `;
  } else {
    [configuration] = await sql`
      SELECT * FROM creapd.music_production_configurations
      WHERE owner_user_id=${ownerId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
  }

  if (!configuration) {
    return { configuration: null, playlist: [], topics: [], research: [], rundown: [], assets: [], top10: [] };
  }

  const id = configuration.id;
  const [playlist, topics, research, rundown, assets, top10] = await Promise.all([
    sql`SELECT * FROM creapd.music_playlist_items WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY order_index ASC, created_at ASC`,
    sql`SELECT * FROM creapd.music_topics WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY display_order ASC, created_at ASC`,
    sql`SELECT * FROM creapd.music_research_items WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.music_rundown_items WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY order_index ASC, created_at ASC`,
    sql`SELECT * FROM creapd.music_assets WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.music_top10_items WHERE configuration_id=${id} AND owner_user_id=${ownerId} ORDER BY order_index ASC, created_at ASC`,
  ]);

  return {
    configuration: withConfigAliases(configuration),
    playlist: playlist.map(withOrder),
    topics: topics.map(withDates),
    research: research.map(withResearchAliases),
    rundown: rundown.map(withOrder),
    assets: assets.map(withDates),
    top10: top10.map(withOrder),
  };
}

export async function readMusicStatus(sql, ownerUserId, requestedConfigurationId = null) {
  const ownerId = String(ownerUserId);
  const requestedId = clean(requestedConfigurationId);
  let configuration = null;

  if (requestedId) {
    [configuration] = await sql`
      SELECT id, production_name, show_date, status, is_default, build_log, build_metadata, created_at, updated_at
      FROM creapd.music_production_configurations
      WHERE id=${requestedId} AND owner_user_id=${ownerId}
      LIMIT 1
    `;
  } else {
    [configuration] = await sql`
      SELECT id, production_name, show_date, status, is_default, build_log, build_metadata, created_at, updated_at
      FROM creapd.music_production_configurations
      WHERE owner_user_id=${ownerId}
      ORDER BY is_default DESC, updated_at DESC
      LIMIT 1
    `;
  }

  return {
    configuration: configuration ? withConfigAliases(configuration) : null,
  };
}

export async function listMusicConfigurations(sql, ownerUserId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const rows = await sql`
    SELECT * FROM creapd.music_production_configurations
    WHERE owner_user_id=${String(ownerUserId)}
    ORDER BY show_date DESC, updated_at DESC
    LIMIT ${safeLimit}
  `;
  return rows.map(withConfigAliases);
}

export async function saveMusicConfiguration({ sql, ownerUserId, ownerEmail, input = {} }) {
  const ownerId = String(ownerUserId);
  const requestedId = clean(input.id);
  const id = requestedId || randomUUID();
  let existing = null;
  if (requestedId) {
    [existing] = await sql`SELECT * FROM creapd.music_production_configurations WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
    if (!existing) throw fail('Music configuration not found', 'MUSIC_CONFIGURATION_NOT_FOUND', 404);
  }

  const merged = { ...(existing || {}), ...input };
  const productionName = clean(merged.production_name);
  const showDate = normalizeDateOnly(merged.show_date);
  if (!productionName) throw fail('Production name is required', 'production_name_required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) throw fail('A valid show date is required', 'valid_show_date_required');

  const values = {
    production_name: productionName,
    host_name: nullable(merged.host_name),
    co_host_name: nullable(merged.co_host_name),
    show_date: showDate,
    show_start_time: clean(merged.show_start_time, '06:00'),
    production_format: ['live','radio'].includes(merged.production_format) ? merged.production_format : 'radio',
    station_name: nullable(merged.station_name),
    show_description: nullable(merged.show_description),
    total_show_runtime: Math.max(15, number(merged.total_show_runtime, 90)),
    required_music_runtime: Math.max(0, number(merged.required_music_runtime, 45)),
    talk_segment_runtime: Math.max(0, number(merged.talk_segment_runtime, 30)),
    commercial_sponsor_runtime: Math.max(0, number(merged.commercial_sponsor_runtime, 8)),
    intro_runtime: Math.max(0, number(merged.intro_runtime, 2)),
    outro_runtime: Math.max(0, number(merged.outro_runtime, 2)),
    genres: parseArray(merged.genres, []),
    moods: parseArray(merged.moods, []),
    show_tone: clean(merged.show_tone, 'Professional'),
    music_topics: parseArray(merged.music_topics, []),
    research_sources: parseArray(merged.research_sources, []),
    must_play_songs: nullable(merged.must_play_songs),
    blocked_songs: nullable(merged.blocked_songs),
    blocked_artists: nullable(merged.blocked_artists),
    recently_played_songs: nullable(merged.recently_played_songs),
    max_songs_per_artist: Math.max(1, Math.round(number(merged.max_songs_per_artist, 2))),
    min_artist_variety: boolean(merged.min_artist_variety, true),
    include_indie: boolean(merged.include_indie, true),
    include_local: boolean(merged.include_local, false),
    include_new_releases: boolean(merged.include_new_releases, true),
    include_throwbacks: boolean(merged.include_throwbacks, false),
    clean_only: boolean(merged.clean_only, false),
    explicit_allowed: boolean(merged.explicit_allowed, false),
    preferred_eras: nullable(merged.preferred_eras),
    playlist_energy_flow: clean(merged.playlist_energy_flow, 'Build Energy Gradually'),
    pacing_rules: parseObject(merged.pacing_rules, { max_sequential_songs: 4, min_talk_break_frequency: 1 }),
    ai_automation: parseArray(merged.ai_automation, ['Auto Research','Auto Build Playlist','Auto Develop','Auto Assemble Packet']),
    vo_requirements: parseObject(merged.vo_requirements, {}),
    production_plan: parseObject(merged.production_plan, {}),
    build_log: parseArray(merged.build_log, []),
    status: clean(merged.status, 'configuring'),
    is_default: boolean(merged.is_default, false),
  };

  if (values.is_default) {
    await sql`UPDATE creapd.music_production_configurations SET is_default=false, updated_at=now() WHERE owner_user_id=${ownerId} AND id<>${id}`;
  }

  let row;
  if (existing) {
    [row] = await sql`
      UPDATE creapd.music_production_configurations SET
        production_name=${values.production_name}, host_name=${values.host_name}, co_host_name=${values.co_host_name},
        show_date=${values.show_date}, show_start_time=${values.show_start_time}, production_format=${values.production_format},
        station_name=${values.station_name}, show_description=${values.show_description}, total_show_runtime=${values.total_show_runtime},
        required_music_runtime=${values.required_music_runtime}, talk_segment_runtime=${values.talk_segment_runtime},
        commercial_sponsor_runtime=${values.commercial_sponsor_runtime}, intro_runtime=${values.intro_runtime}, outro_runtime=${values.outro_runtime},
        genres=${JSON.stringify(values.genres)}::jsonb, moods=${JSON.stringify(values.moods)}::jsonb, show_tone=${values.show_tone},
        music_topics=${JSON.stringify(values.music_topics)}::jsonb, research_sources=${JSON.stringify(values.research_sources)}::jsonb,
        must_play_songs=${values.must_play_songs}, blocked_songs=${values.blocked_songs}, blocked_artists=${values.blocked_artists},
        recently_played_songs=${values.recently_played_songs}, max_songs_per_artist=${values.max_songs_per_artist},
        min_artist_variety=${values.min_artist_variety}, include_indie=${values.include_indie}, include_local=${values.include_local},
        include_new_releases=${values.include_new_releases}, include_throwbacks=${values.include_throwbacks}, clean_only=${values.clean_only},
        explicit_allowed=${values.explicit_allowed}, preferred_eras=${values.preferred_eras}, playlist_energy_flow=${values.playlist_energy_flow},
        pacing_rules=${JSON.stringify(values.pacing_rules)}::jsonb, ai_automation=${JSON.stringify(values.ai_automation)}::jsonb,
        vo_requirements=${JSON.stringify(values.vo_requirements)}::jsonb, production_plan=${JSON.stringify(values.production_plan)}::jsonb,
        build_log=${JSON.stringify(values.build_log)}::jsonb, status=${values.status}, is_default=${values.is_default}, updated_at=now()
      WHERE id=${id} AND owner_user_id=${ownerId}
      RETURNING *
    `;
  } else {
    [row] = await sql`
      INSERT INTO creapd.music_production_configurations (
        id, owner_user_id, production_name, host_name, co_host_name, show_date, show_start_time, production_format,
        station_name, show_description, total_show_runtime, required_music_runtime, talk_segment_runtime,
        commercial_sponsor_runtime, intro_runtime, outro_runtime, genres, moods, show_tone, music_topics, research_sources,
        must_play_songs, blocked_songs, blocked_artists, recently_played_songs, max_songs_per_artist,
        min_artist_variety, include_indie, include_local, include_new_releases, include_throwbacks, clean_only, explicit_allowed,
        preferred_eras, playlist_energy_flow, pacing_rules, ai_automation, vo_requirements, production_plan, build_log,
        status, is_default, created_by_email
      ) VALUES (
        ${id}, ${ownerId}, ${values.production_name}, ${values.host_name}, ${values.co_host_name}, ${values.show_date},
        ${values.show_start_time}, ${values.production_format}, ${values.station_name}, ${values.show_description},
        ${values.total_show_runtime}, ${values.required_music_runtime}, ${values.talk_segment_runtime}, ${values.commercial_sponsor_runtime},
        ${values.intro_runtime}, ${values.outro_runtime}, ${JSON.stringify(values.genres)}::jsonb, ${JSON.stringify(values.moods)}::jsonb,
        ${values.show_tone}, ${JSON.stringify(values.music_topics)}::jsonb, ${JSON.stringify(values.research_sources)}::jsonb,
        ${values.must_play_songs}, ${values.blocked_songs}, ${values.blocked_artists}, ${values.recently_played_songs},
        ${values.max_songs_per_artist}, ${values.min_artist_variety}, ${values.include_indie}, ${values.include_local},
        ${values.include_new_releases}, ${values.include_throwbacks}, ${values.clean_only}, ${values.explicit_allowed},
        ${values.preferred_eras}, ${values.playlist_energy_flow}, ${JSON.stringify(values.pacing_rules)}::jsonb,
        ${JSON.stringify(values.ai_automation)}::jsonb, ${JSON.stringify(values.vo_requirements)}::jsonb,
        ${JSON.stringify(values.production_plan)}::jsonb, ${JSON.stringify(values.build_log)}::jsonb,
        ${values.status}, ${values.is_default}, ${ownerEmail || null}
      ) RETURNING *
    `;
  }
  return withConfigAliases(row);
}

async function createPlaylistItem(sql, ownerUserId, input) {
  await requireConfig(sql, ownerUserId, input.configuration_id);
  const [row] = await sql`
    INSERT INTO creapd.music_playlist_items (
      id, configuration_id, owner_user_id, order_index, song_title, artist, length_seconds,
      genre, mood, era_year, album, release_year, reason_selected, status, note,
      intro_generated, artist_fact_generated, youtube_video_id, thumbnail_url, channel_name, source
    ) VALUES (
      ${randomUUID()}, ${input.configuration_id}, ${String(ownerUserId)}, ${Math.round(number(input.order, 0))},
      ${clean(input.song_title, 'Unknown')}, ${clean(input.artist, 'Unknown')}, ${Math.max(1, number(input.length_seconds, 180))},
      ${nullable(input.genre)}, ${nullable(input.mood)}, ${nullable(input.era_year)}, ${nullable(input.album)},
      ${nullable(input.release_year)}, ${nullable(input.reason_selected)}, ${clean(input.status, 'suggested')},
      ${nullable(input.note)}, ${boolean(input.intro_generated, false)}, ${boolean(input.artist_fact_generated, false)},
      ${nullable(input.youtube_video_id)}, ${nullable(input.thumbnail_url)}, ${nullable(input.channel_name)}, ${clean(input.source, 'user_selected')}
    ) RETURNING *
  `;
  return withOrder(row);
}

async function updatePlaylistItem(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_playlist_items WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Playlist item not found', 'MUSIC_PLAYLIST_ITEM_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_playlist_items SET
      order_index=${Math.round(number(p.order ?? p.order_index, old.order_index))}, song_title=${clean(p.song_title, old.song_title)},
      artist=${clean(p.artist, old.artist)}, length_seconds=${Math.max(1, number(p.length_seconds, old.length_seconds))},
      genre=${nullable(p.genre)}, mood=${nullable(p.mood)}, era_year=${nullable(p.era_year)}, album=${nullable(p.album)},
      release_year=${nullable(p.release_year)}, reason_selected=${nullable(p.reason_selected)}, status=${clean(p.status, old.status)},
      note=${nullable(p.note)}, intro_generated=${boolean(p.intro_generated, old.intro_generated)},
      artist_fact_generated=${boolean(p.artist_fact_generated, old.artist_fact_generated)}, youtube_video_id=${nullable(p.youtube_video_id)},
      thumbnail_url=${nullable(p.thumbnail_url)}, channel_name=${nullable(p.channel_name)}, source=${clean(p.source, old.source)}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withOrder(row);
}

async function createRundownItem(sql, ownerUserId, input) {
  await requireConfig(sql, ownerUserId, input.configuration_id);
  const [row] = await sql`
    INSERT INTO creapd.music_rundown_items (
      id, configuration_id, owner_user_id, order_index, segment_type, title, script_content,
      start_time, duration_seconds, end_time, notes, status, associated_song_id,
      associated_song_title, associated_topic, audio_url, audio_provider
    ) VALUES (
      ${randomUUID()}, ${input.configuration_id}, ${String(ownerUserId)}, ${Math.round(number(input.order, 0))},
      ${clean(input.segment_type, 'talk_break')}, ${nullable(input.title)}, ${nullable(input.script_content)},
      ${nullable(input.start_time)}, ${Math.max(0, number(input.duration_seconds, 60))}, ${nullable(input.end_time)},
      ${nullable(input.notes)}, ${clean(input.status, 'planned')}, ${nullable(input.associated_song_id)},
      ${nullable(input.associated_song_title)}, ${nullable(input.associated_topic)}, ${nullable(input.audio_url)},
      ${clean(input.audio_provider, 'native')}
    ) RETURNING *
  `;
  return withOrder(row);
}

async function updateRundownItem(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_rundown_items WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Rundown item not found', 'MUSIC_RUNDOWN_ITEM_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_rundown_items SET
      order_index=${Math.round(number(p.order ?? p.order_index, old.order_index))}, segment_type=${clean(p.segment_type, old.segment_type)},
      title=${nullable(p.title)}, script_content=${nullable(p.script_content)}, start_time=${nullable(p.start_time)},
      duration_seconds=${Math.max(0, number(p.duration_seconds, old.duration_seconds))}, end_time=${nullable(p.end_time)},
      notes=${nullable(p.notes)}, status=${clean(p.status, old.status)}, associated_song_id=${nullable(p.associated_song_id)},
      associated_song_title=${nullable(p.associated_song_title)}, associated_topic=${nullable(p.associated_topic)},
      audio_url=${nullable(p.audio_url)}, audio_provider=${clean(p.audio_provider, old.audio_provider || 'native')}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withOrder(row);
}

async function createTop10Item(sql, ownerUserId, input) {
  await requireConfig(sql, ownerUserId, input.configuration_id);
  const videoId = clean(input.youtube_video_id);
  if (!videoId) throw fail('youtube_video_id is required', 'YOUTUBE_VIDEO_ID_REQUIRED');
  const [row] = await sql`
    INSERT INTO creapd.music_top10_items (
      id, configuration_id, owner_user_id, order_index, title, youtube_video_id, thumbnail_url, channel_name, locked, note
    ) VALUES (
      ${randomUUID()}, ${input.configuration_id}, ${String(ownerUserId)}, ${Math.round(number(input.order, 0))},
      ${clean(input.title, 'Untitled')}, ${videoId}, ${nullable(input.thumbnail_url)},
      ${nullable(input.channel_name)}, ${boolean(input.locked, false)}, ${nullable(input.note)}
    ) RETURNING *
  `;
  return withOrder(row);
}

async function updateTop10Item(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_top10_items WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Top 10 item not found', 'MUSIC_TOP10_ITEM_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_top10_items SET
      order_index=${Math.round(number(p.order ?? p.order_index, old.order_index))}, title=${clean(p.title, old.title)},
      youtube_video_id=${clean(p.youtube_video_id, old.youtube_video_id)}, thumbnail_url=${nullable(p.thumbnail_url)},
      channel_name=${nullable(p.channel_name)}, locked=${boolean(p.locked, old.locked)}, note=${nullable(p.note)}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withOrder(row);
}

async function updateAsset(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_assets WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Music asset not found', 'MUSIC_ASSET_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_assets SET asset_type=${clean(p.asset_type, old.asset_type)}, title=${nullable(p.title)},
      content=${nullable(p.content)}, associated_song_id=${nullable(p.associated_song_id)},
      associated_song_title=${nullable(p.associated_song_title)}, associated_topic=${nullable(p.associated_topic)},
      status=${clean(p.status, old.status)}, generated_image_url=${nullable(p.generated_image_url)}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withDates(row);
}

async function updateTopic(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_topics WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Music topic not found', 'MUSIC_TOPIC_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_topics SET topic_name=${clean(p.topic_name, old.topic_name)}, generated_summary=${nullable(p.generated_summary)},
      talking_points=${nullable(p.talking_points)}, sources=${nullable(p.sources)}, suggested_placement=${nullable(p.suggested_placement)},
      status=${clean(p.status, old.status)}, added_to_rundown=${boolean(p.added_to_rundown, old.added_to_rundown)},
      display_order=${Math.round(number(p.display_order, old.display_order))}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withDates(row);
}

async function updateResearch(sql, ownerUserId, id, patch) {
  const [old] = await sql`SELECT * FROM creapd.music_research_items WHERE id=${id} AND owner_user_id=${String(ownerUserId)} LIMIT 1`;
  if (!old) throw fail('Music research item not found', 'MUSIC_RESEARCH_NOT_FOUND', 404);
  const p = { ...old, ...patch };
  const [row] = await sql`
    UPDATE creapd.music_research_items SET title=${clean(p.title, old.title)}, source=${nullable(p.source)}, category=${nullable(p.category)},
      summary=${nullable(p.summary)}, url=${nullable(p.url)}, suggested_angle=${nullable(p.suggested_angle)},
      research_date=${nullable(p.date ?? p.research_date)}, relevance=${clean(p.relevance, old.relevance)},
      added_to_rundown=${boolean(p.added_to_rundown, old.added_to_rundown)}, updated_at=now()
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)} RETURNING *
  `;
  return withResearchAliases(row);
}

async function getMusicProductionBundle(sql, ownerUserId, configurationId) {
  const ownerId = String(ownerUserId);
  const requestedId = clean(configurationId);
  let config = null;

  if (requestedId) {
    [config] = await sql`
      SELECT * FROM creapd.music_production_configurations
      WHERE id=${requestedId} AND owner_user_id=${ownerId}
      LIMIT 1
    `;
  } else {
    [config] = await sql`
      SELECT * FROM creapd.music_production_configurations
      WHERE owner_user_id=${ownerId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
  }

  if (!config) {
    return {
      configuration: null,
      playlist: [],
      topics: [],
      research: [],
      rundown: [],
      assets: [],
    };
  }

  const configId = config.id;
  const [playlist, topics, research, rundown, assets] = await Promise.all([
    sql`
      SELECT * FROM creapd.music_playlist_items
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY order_index ASC
    `,
    sql`
      SELECT * FROM creapd.music_topics
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY display_order ASC, created_at ASC
    `,
    sql`
      SELECT * FROM creapd.music_research_items
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY research_date DESC NULLS LAST, created_at DESC
    `,
    sql`
      SELECT * FROM creapd.music_rundown_items
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY order_index ASC
    `,
    sql`
      SELECT * FROM creapd.music_assets
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY created_at ASC
    `,
  ]);

  return {
    configuration: withConfigAliases(config),
    playlist: playlist.map(withOrder),
    topics: topics.map(withDates),
    research: research.map(withResearchAliases),
    rundown: rundown.map(withOrder),
    assets: assets.map(withDates),
  };
}

async function entityGet(sql, ownerUserId, entity, id) {
  const ownerId = String(ownerUserId);
  let row = null;
  if (entity === 'MusicProductionConfiguration') [row] = await sql`SELECT * FROM creapd.music_production_configurations WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'PlaylistItem') [row] = await sql`SELECT * FROM creapd.music_playlist_items WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'MusicTopic') [row] = await sql`SELECT * FROM creapd.music_topics WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'MusicResearchItem') [row] = await sql`SELECT * FROM creapd.music_research_items WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'ShowRundownItem') [row] = await sql`SELECT * FROM creapd.music_rundown_items WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'MusicAsset') [row] = await sql`SELECT * FROM creapd.music_assets WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else if (entity === 'Top10Item') [row] = await sql`SELECT * FROM creapd.music_top10_items WHERE id=${id} AND owner_user_id=${ownerId} LIMIT 1`;
  else throw fail(`Unsupported Music entity ${entity}`, 'MUSIC_ENTITY_UNSUPPORTED');
  if (!row) throw fail(`${entity} not found`, 'MUSIC_ENTITY_NOT_FOUND', 404);
  if (entity === 'MusicProductionConfiguration') return withConfigAliases(row);
  if (['PlaylistItem','ShowRundownItem','Top10Item'].includes(entity)) return withOrder(row);
  if (entity === 'MusicResearchItem') return withResearchAliases(row);
  return withDates(row);
}

async function entityCreate(sql, ownerUserId, entity, input) {
  if (entity === 'PlaylistItem') return createPlaylistItem(sql, ownerUserId, input);
  if (entity === 'ShowRundownItem') return createRundownItem(sql, ownerUserId, input);
  if (entity === 'Top10Item') return createTop10Item(sql, ownerUserId, input);
  throw fail(`Create not supported for ${entity}`, 'MUSIC_ENTITY_CREATE_UNSUPPORTED');
}

async function resolveMusicConfigurationForUpdate(sql, ownerUserId, ownerEmail, id, patch = {}) {
  const ownerId = String(ownerUserId);
  const requestedId = clean(id);

  if (requestedId) {
    const [exact] = await sql`
      SELECT c.*
      FROM creapd.music_production_configurations c
      WHERE c.id=${requestedId} AND c.owner_user_id=${ownerId}
      LIMIT 1
    `;
    if (exact) return exact;

    if (ownerEmail) {
      const [bridged] = await sql`
        SELECT c.*
        FROM creapd.music_production_configurations c
        LEFT JOIN creapd.users u ON u.id=c.owner_user_id
        WHERE c.id=${requestedId}
          AND (
            lower(COALESCE(c.created_by_email, ''))=lower(${ownerEmail})
            OR lower(COALESCE(u.email, ''))=lower(${ownerEmail})
          )
        LIMIT 1
      `;
      if (bridged) {
        // The same authenticated person can arrive through a different auth ID
        // during migration. Adopt the Music record into the current canonical
        // user so every later build/read uses one owner consistently.
        await sql`UPDATE creapd.music_playlist_items SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        await sql`UPDATE creapd.music_topics SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        await sql`UPDATE creapd.music_research_items SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        await sql`UPDATE creapd.music_rundown_items SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        await sql`UPDATE creapd.music_assets SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        await sql`UPDATE creapd.music_top10_items SET owner_user_id=${ownerId} WHERE configuration_id=${bridged.id}`;
        const [adopted] = await sql`
          UPDATE creapd.music_production_configurations
          SET owner_user_id=${ownerId}, updated_at=now()
          WHERE id=${bridged.id}
          RETURNING *
        `;
        return adopted;
      }
    }
  }

  const productionName = clean(patch.production_name);
  const showDate = normalizeDateOnly(patch.show_date);
  if (productionName && /^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
    const [matching] = await sql`
      SELECT *
      FROM creapd.music_production_configurations
      WHERE owner_user_id=${ownerId}
        AND production_name=${productionName}
        AND show_date=${showDate}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (matching) return matching;
  }

  return null;
}

async function syncMusicReviewStatus(sql, ownerUserId, configurationId) {
  const ownerId = String(ownerUserId);
  const configId = clean(configurationId);
  if (!configId) return 'in_review';

  const [playlistCounts] = await sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE lower(status) IN ('approved','locked'))::int AS approved
    FROM creapd.music_playlist_items
    WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
  `;

  const [segmentCounts] = await sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE lower(status) IN ('approved','locked'))::int AS approved
    FROM creapd.music_rundown_items
    WHERE configuration_id=${configId}
      AND owner_user_id=${ownerId}
      AND lower(segment_type) <> 'song'
  `;

  const total = number(playlistCounts?.total, 0) + number(segmentCounts?.total, 0);
  const approved = number(playlistCounts?.approved, 0) + number(segmentCounts?.approved, 0);
  const nextStatus = total > 0 && approved === total ? 'approved' : 'in_review';

  await sql`
    UPDATE creapd.music_production_configurations
    SET status=${nextStatus}, updated_at=now()
    WHERE id=${configId}
      AND owner_user_id=${ownerId}
      AND status NOT IN ('building','refreshing','planning')
  `;

  return nextStatus;
}

async function entityUpdate(sql, ownerUserId, entity, id, patch, ownerEmail) {
  if (entity === 'MusicProductionConfiguration') {
    const existing = await resolveMusicConfigurationForUpdate(sql, ownerUserId, ownerEmail, id, patch);
    if (!existing) throw fail('Music configuration not found', 'MUSIC_CONFIGURATION_NOT_FOUND', 404);
    return saveMusicConfiguration({
      sql,
      ownerUserId,
      ownerEmail,
      input: { ...existing, ...patch, id: existing.id },
    });
  }
  if (entity === 'PlaylistItem') {
    const row = await updatePlaylistItem(sql, ownerUserId, id, patch);
    await syncMusicReviewStatus(sql, ownerUserId, row.configuration_id);
    return row;
  }
  if (entity === 'MusicTopic') return updateTopic(sql, ownerUserId, id, patch);
  if (entity === 'MusicResearchItem') return updateResearch(sql, ownerUserId, id, patch);
  if (entity === 'ShowRundownItem') {
    const row = await updateRundownItem(sql, ownerUserId, id, patch);
    await syncMusicReviewStatus(sql, ownerUserId, row.configuration_id);
    return row;
  }
  if (entity === 'MusicAsset') return updateAsset(sql, ownerUserId, id, patch);
  if (entity === 'Top10Item') return updateTop10Item(sql, ownerUserId, id, patch);
  throw fail(`Update not supported for ${entity}`, 'MUSIC_ENTITY_UPDATE_UNSUPPORTED');
}

async function entityDelete(sql, ownerUserId, entity, id) {
  const ownerId = String(ownerUserId);
  let rows = [];
  if (entity === 'PlaylistItem') rows = await sql`DELETE FROM creapd.music_playlist_items WHERE id=${id} AND owner_user_id=${ownerId} RETURNING id`;
  else if (entity === 'ShowRundownItem') rows = await sql`DELETE FROM creapd.music_rundown_items WHERE id=${id} AND owner_user_id=${ownerId} RETURNING id`;
  else if (entity === 'Top10Item') rows = await sql`DELETE FROM creapd.music_top10_items WHERE id=${id} AND owner_user_id=${ownerId} RETURNING id`;
  else throw fail(`Delete not supported for ${entity}`, 'MUSIC_ENTITY_DELETE_UNSUPPORTED');
  if (!rows.length) throw fail(`${entity} not found`, 'MUSIC_ENTITY_NOT_FOUND', 404);
  return { id, deleted: true };
}

async function entityBulkUpdate(sql, ownerUserId, entity, rows, ownerEmail) {
  const updated = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = clean(row.id);
    if (!id) continue;
    const { id: _id, ...patch } = row;
    updated.push(await entityUpdate(sql, ownerUserId, entity, id, patch, ownerEmail));
  }
  return updated;
}

function pipelineFromConfig(config) {
  const log = parseArray(config?.build_log, []);
  const stageState = (names) => {
    const entries = log.filter(entry => names.some(name => entry.stage === name || String(entry.stage || '').includes(name)));
    if (entries.some(e => e.status === 'failed' || e.success === false)) return 'pending';
    if (entries.some(e => e.status === 'complete' || e.status === 'skipped' || e.success === true)) return 'approved';
    return 'pending';
  };
  const pipeline = {
    id: `music:${config.id}`,
    production_profile: 'music',
    configuration_id: config.id,
    production_name: config.production_name,
    discovery_status: stageState(['planning']),
    knowledge_status: stageState(['research']),
    blueprint_status: stageState(['playlist','topics']),
    production_status: stageState(['assets','top10']),
    assembly_status: stageState(['rundown']),
    pipeline_status: ['ready','in_review','approved'].includes(config.status) ? 'completed' : config.status === 'failed' ? 'failed' : 'in_progress',
  };
  const statuses = ['discovery','knowledge','blueprint','production','assembly'].map(k => pipeline[`${k}_status`]);
  pipeline.pipeline_progress = Math.round((statuses.filter(s => s === 'approved' || s === 'skipped').length / statuses.length) * 100);
  pipeline.current_department = ['discovery','knowledge','blueprint','production','assembly'].find(k => pipeline[`${k}_status`] === 'pending') || 'assembly';
  return pipeline;
}

export async function runMusicStudioAction({ sql, ownerUserId, ownerEmail, action, body = {} }) {
  switch (action) {
    case 'music_save_configuration':
      return { configuration: await saveMusicConfiguration({ sql, ownerUserId, ownerEmail, input: body.configuration || body }) };
    case 'music_list_configurations':
      return { configurations: await listMusicConfigurations(sql, ownerUserId, body.limit) };
    case 'music_get_bundle':
      return await getMusicProductionBundle(sql, ownerUserId, body.configuration_id);
    case 'music_build':
      return { result: await runMusicBuild({ sql, ownerUserId, configurationId: body.configuration_id }) };
    case 'music_regenerate_section':
      return { result: await regenerateMusicSection({ sql, ownerUserId, configurationId: body.configuration_id, section: body.section }) };
    case 'music_regenerate_rejected':
      return { result: await regenerateRejectedMusicMaterials({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
        kind: body.kind || 'all',
      }) };
    case 'music_generate_top10':
      return { top10: await generateMusicTop10({ sql, ownerUserId, configurationId: body.configuration_id, preserveLocked: true }) };
    case 'music_fetch_youtube_metadata':
      return await fetchYoutubeMetadata(body.url, { requireRadioSafe: body.require_radio_safe === true });
    case 'music_refresh_youtube_metadata':
      return { result: await refreshMusicPlaylistYoutubeMetadata({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
      }) };
    case 'music_generate_structured':
      return { result: await generateMusicStructured({ prompt: body.prompt, schema: body.schema, schemaName: body.schema_name, maxOutputTokens: body.max_output_tokens }) };
    case 'music_entity_get':
      return { item: await entityGet(sql, ownerUserId, body.entity, body.id) };
    case 'music_entity_create':
      return { item: await entityCreate(sql, ownerUserId, body.entity, body.item || {}) };
    case 'music_entity_update':
      return { item: await entityUpdate(sql, ownerUserId, body.entity, body.id, body.patch || {}, ownerEmail) };
    case 'music_entity_delete':
      return await entityDelete(sql, ownerUserId, body.entity, body.id);
    case 'music_entity_bulk_update':
      return { items: await entityBulkUpdate(sql, ownerUserId, body.entity, body.items || [], ownerEmail) };
    case 'music_department_pipeline': {
      const config = await requireConfig(sql, ownerUserId, body.configuration_id);
      return { pipeline: pipelineFromConfig(withConfigAliases(config)) };
    }
    default:
      throw fail(`Unsupported Music action: ${action}`, 'MUSIC_ACTION_UNSUPPORTED');
  }
}
