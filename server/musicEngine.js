import { randomUUID } from 'node:crypto';
import { generateStructuredGatewayResponse, configuredProvider } from './aiGateway.js';

const PLAYLIST_SCHEMA = {
  type: 'object',
  required: ['playlist'],
  properties: {
    playlist: {
      type: 'array',
      items: {
        type: 'object',
        required: ['song_title', 'artist'],
        properties: {
          song_title: { type: 'string' },
          artist: { type: 'string' },
          length_seconds: { type: 'number' },
          genre: { type: 'string' },
          mood: { type: 'string' },
          era_year: { type: 'string' },
          reason_selected: { type: 'string' },
        },
      },
    },
  },
};

const TOPICS_SCHEMA = {
  type: 'object',
  required: ['topics'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['topic_name', 'generated_summary'],
        properties: {
          topic_name: { type: 'string' },
          generated_summary: { type: 'string' },
          talking_points: { type: 'string' },
          sources: { type: 'string' },
          suggested_placement: { type: 'string' },
        },
      },
    },
  },
};

const ASSETS_SCHEMA = {
  type: 'object',
  required: ['assets'],
  properties: {
    assets: {
      type: 'array',
      items: {
        type: 'object',
        required: ['asset_type', 'title', 'content'],
        properties: {
          asset_type: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          associated_song_title: { type: 'string' },
          associated_topic: { type: 'string' },
        },
      },
    },
  },
};

const TOP10_SCHEMA = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['song_title', 'artist'],
        properties: {
          song_title: { type: 'string' },
          artist: { type: 'string' },
          rank_reason: { type: 'string' },
        },
      },
    },
  },
};

const RUNDOWN_SCHEMA = {
  type: 'object',
  required: ['rundown'],
  properties: {
    rundown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order: { type: 'number' },
          segment_type: { type: 'string' },
          title: { type: 'string' },
          script_content: { type: 'string' },
          associated_song_title: { type: 'string' },
          associated_topic: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
};

const VALID_ASSET_TYPES = new Set([
  'host_banter', 'song_intro', 'song_outro', 'artist_bio', 'artist_fact',
  'music_trivia', 'tour_dates', 'concert_news', 'topic_talking_points',
  'sponsor_read', 'station_id', 'audience_prompt', 'social_caption',
  'hashtag', 'thumbnail_prompt', 'ai_image', 'video_prompt', 'production_notes',
]);

function text(value, fallback = '') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function array(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {}
  }
  return fallback;
}

function object(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {}
  }
  return fallback;
}

function num(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function safeJson(value) {
  return JSON.stringify(value ?? null);
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlTag(block, tag) {
  const match = String(block || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseTimeToSeconds(value) {
  const [h, m] = text(value, '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 3600 + (Number.isFinite(m) ? m : 0) * 60;
}

function formatSecondsToTime(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600) % 24;
  const m = Math.floor((safe % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function extractVideoId(value) {
  const input = text(value);
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function structured(prompt, schema, schemaName, maxOutputTokens = 5000) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await generateStructuredGatewayResponse({
        prompt: attempt === 0 ? prompt : `${prompt}\n\nRETRY NOTE: Return complete valid JSON matching the schema. Be concise enough to finish every requested array item.`,
        schema,
        schemaName,
        webSearch: false,
        maxOutputTokens,
        timeoutMs: 55000,
      });
    } catch (error) {
      lastError = error;
      console.warn(`[MUSIC ENGINE] ${schemaName} attempt ${attempt + 1} failed`, error?.code || error?.message);
    }
  }
  throw lastError || new Error(`${schemaName} generation failed`);
}

async function requireConfig(sql, ownerUserId, configurationId) {
  const id = text(configurationId);
  if (!id) {
    const error = new Error('configuration_id_required');
    error.code = 'configuration_id_required';
    error.status = 400;
    throw error;
  }
  const [config] = await sql`
    SELECT * FROM creapd.music_production_configurations
    WHERE id=${id} AND owner_user_id=${String(ownerUserId)}
    LIMIT 1
  `;
  if (!config) {
    const error = new Error('Music configuration not found');
    error.code = 'MUSIC_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return config;
}

async function appendStage(sql, ownerUserId, configurationId, buildLog, stage, status, extra = {}) {
  const entry = { stage, status, timestamp: new Date().toISOString(), ...extra };
  buildLog.push(entry);
  await sql`
    UPDATE creapd.music_production_configurations
    SET build_log=${safeJson(buildLog)}::jsonb, updated_at=now()
    WHERE id=${configurationId} AND owner_user_id=${String(ownerUserId)}
  `;
  return entry;
}

async function updateBuildFailure(sql, ownerUserId, configurationId, buildLog, error) {
  const failure = {
    stage: 'pipeline',
    status: 'failed',
    success: false,
    error: text(error?.message, 'Music build failed').slice(0, 600),
    code: error?.code || null,
    timestamp: new Date().toISOString(),
  };
  buildLog.push(failure);
  await sql`
    UPDATE creapd.music_production_configurations
    SET status='failed', build_log=${safeJson(buildLog)}::jsonb,
        build_metadata=${safeJson({
          provider: configuredProvider(),
          error: failure.error,
          error_code: failure.code,
          failed_at: failure.timestamp,
        })}::jsonb,
        updated_at=now()
    WHERE id=${configurationId} AND owner_user_id=${String(ownerUserId)}
  `;
}

async function validateYoutubeVideo(videoId) {
  if (!videoId) return null;
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      video_id: videoId,
      title: text(payload?.title),
      thumbnail_url: text(payload?.thumbnail_url, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`),
      channel_name: text(payload?.author_name),
    };
  } catch {
    return null;
  }
}

async function searchYoutubeVideo(songTitle, artist, usedIds = new Set()) {
  try {
    const query = encodeURIComponent(`${songTitle} ${artist} official music video`);
    const response = await fetch(`https://www.youtube.com/results?search_query=${query}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const ids = [];
    const regex = /"videoId":"([A-Za-z0-9_-]{11})"/g;
    let match;
    while ((match = regex.exec(html)) !== null && ids.length < 8) {
      if (!ids.includes(match[1]) && !usedIds.has(match[1])) ids.push(match[1]);
    }
    for (const id of ids.slice(0, 5)) {
      const meta = await validateYoutubeVideo(id);
      if (meta) return meta;
    }
  } catch {}
  return null;
}

export async function fetchYoutubeMetadata(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    const error = new Error('Could not extract a valid YouTube video ID from the provided URL');
    error.code = 'YOUTUBE_VIDEO_ID_INVALID';
    error.status = 400;
    throw error;
  }
  const metadata = await validateYoutubeVideo(videoId);
  if (!metadata) {
    const error = new Error('YouTube video not found or is private');
    error.code = 'YOUTUBE_VIDEO_NOT_FOUND';
    error.status = 404;
    throw error;
  }
  return metadata;
}

async function fetchMusicNews(config) {
  const genres = array(config.genres, []);
  const topics = array(config.music_topics, []);
  const queryParts = ['music', ...genres.slice(0, 2), ...topics.slice(0, 2)];
  const query = encodeURIComponent(queryParts.filter(Boolean).join(' '));
  try {
    const response = await fetch(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`, {
      headers: { 'User-Agent': 'CREAPD Music Studio/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    return itemBlocks.slice(0, 20).map((block) => {
      const title = xmlTag(block, 'title');
      const url = xmlTag(block, 'link');
      const publishedAt = xmlTag(block, 'pubDate');
      const source = xmlTag(block, 'source');
      const description = xmlTag(block, 'description');
      return { title, url, publishedAt, source, description };
    }).filter(item => item.title);
  } catch (error) {
    console.warn('[MUSIC ENGINE] RSS research unavailable', error?.message);
    return [];
  }
}

async function buildPlaylist({ sql, ownerUserId, config, targetCount }) {
  const year = new Date().getUTCFullYear();
  const genres = array(config.genres, []);
  const moods = array(config.moods, []);
  const prompt = `You are the playlist director for CREAPD Music Studio. Build a real, playable show playlist using real commercially released songs.

SHOW
Name: ${config.production_name}
Host: ${config.host_name || 'Host'}
Format: ${config.production_format || 'radio'}
Genres: ${genres.join(', ') || 'Top 40'}
Moods: ${moods.join(', ') || 'Feel Good'}
Tone: ${config.show_tone || 'Professional'}
Music runtime: ${num(config.required_music_runtime, 45)} minutes
Energy flow: ${config.playlist_energy_flow || 'Build Energy Gradually'}
Must play: ${config.must_play_songs || 'None'}
Blocked songs: ${config.blocked_songs || 'None'}
Blocked artists: ${config.blocked_artists || 'None'}
Recently played / avoid: ${config.recently_played_songs || 'None'}
Max songs per artist: ${num(config.max_songs_per_artist, 2)}
Include indie: ${config.include_indie !== false}
Include local: ${config.include_local === true}
Include new releases: ${config.include_new_releases !== false}
Include throwbacks: ${config.include_throwbacks === true}
Clean only: ${config.clean_only === true}
Explicit allowed: ${config.explicit_allowed === true}
Preferred eras: ${config.preferred_eras || 'Modern/current'}

Return exactly ${targetCount} songs. Prefer releases from ${year - 2}-${year} unless the user requested older eras or throwbacks. Never invent songs or artists. Include realistic song length in seconds and actual/reasonable release year. Respect all blocks and must-play rules.`;
  const result = await structured(prompt, PLAYLIST_SCHEMA, 'creapd_music_playlist_v1', 5000);
  const songs = array(result?.data?.playlist, []).slice(0, targetCount);
  if (songs.length < Math.min(6, targetCount)) throw new Error(`Playlist generation returned only ${songs.length} songs`);

  const rows = await Promise.all(songs.map(async (song, index) => {
    const [row] = await sql`
      INSERT INTO creapd.music_playlist_items (
        id, configuration_id, owner_user_id, order_index, song_title, artist,
        length_seconds, genre, mood, era_year, reason_selected, status, source
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${index},
        ${text(song.song_title, 'Unknown')}, ${text(song.artist, 'Unknown')},
        ${Math.max(60, num(song.length_seconds, 180))}, ${text(song.genre) || null},
        ${text(song.mood) || null}, ${text(song.era_year) || null},
        ${text(song.reason_selected) || null}, 'suggested', 'ai_generated'
      ) RETURNING *
    `;
    return row;
  }));

  const used = new Set();
  await Promise.all(rows.map(async (row) => {
    const metadata = await searchYoutubeVideo(row.song_title, row.artist, used);
    if (!metadata) return;
    used.add(metadata.video_id);
    await sql`
      UPDATE creapd.music_playlist_items
      SET youtube_video_id=${metadata.video_id}, thumbnail_url=${metadata.thumbnail_url},
          channel_name=${metadata.channel_name}, updated_at=now()
      WHERE id=${row.id} AND owner_user_id=${String(ownerUserId)}
    `;
  }));

  return sql`
    SELECT * FROM creapd.music_playlist_items
    WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}
    ORDER BY order_index ASC
  `;
}

async function buildResearch({ sql, ownerUserId, config }) {
  const raw = await fetchMusicNews(config);
  if (!raw.length) return [];
  const digest = raw.slice(0, 16).map((item, index) => `${index + 1}. ${item.title}
Source: ${item.source || 'News source'}
Date: ${item.publishedAt || 'Unknown'}
Summary text: ${item.description || ''}`).join('\n\n');
  const schema = {
    type: 'object', required: ['items'], properties: {
      items: { type: 'array', items: { type: 'object', required: ['source_index', 'summary'], properties: {
        source_index: { type: 'number' }, category: { type: 'string' }, summary: { type: 'string' }, suggested_angle: { type: 'string' }, relevance: { type: 'string' },
      } } },
    },
  };
  const prompt = `You are a music-show research producer. Use ONLY the supplied RSS news items; do not invent facts or URLs. Select up to 12 useful stories for the configured show and summarize each for a host.

SHOW: ${config.production_name}
Genres: ${array(config.genres, []).join(', ')}
Requested topics: ${array(config.music_topics, []).join(', ')}

RSS ITEMS:
${digest}

For each selected item, return its 1-based source_index, a short category, a factual 2-4 sentence summary, a suggested on-air angle, and relevance high/medium/low.`;
  const result = await structured(prompt, schema, 'creapd_music_research_v1', 5000);
  const selected = array(result?.data?.items, []).slice(0, 12);
  const inserted = [];
  for (const item of selected) {
    const sourceIndex = Math.max(1, Math.round(num(item.source_index, 0))) - 1;
    const source = raw[sourceIndex];
    if (!source) continue;
    const parsedDate = source.publishedAt ? new Date(source.publishedAt) : null;
    const date = parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const [row] = await sql`
      INSERT INTO creapd.music_research_items (
        id, configuration_id, owner_user_id, title, source, category, summary, url,
        suggested_angle, research_date, relevance
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${source.title},
        ${source.source || null}, ${text(item.category, 'artist_news')}, ${text(item.summary)},
        ${source.url || null}, ${text(item.suggested_angle) || null}, ${date},
        ${['high','medium','low'].includes(text(item.relevance).toLowerCase()) ? text(item.relevance).toLowerCase() : 'medium'}
      ) RETURNING *
    `;
    inserted.push(row);
  }
  return inserted;
}

async function buildTopics({ sql, ownerUserId, config, research }) {
  const requested = array(config.music_topics, []);
  const researchText = research.slice(0, 12).map((item, i) => `${i + 1}. ${item.title}: ${item.summary}`).join('\n');
  const prompt = `You are the topic producer for a music radio/show production. Create 5-8 strong discussion topics that fit the show and can be used between songs.

SHOW: ${config.production_name}
Tone: ${config.show_tone}
Genres: ${array(config.genres, []).join(', ') || 'General music'}
Requested topic categories: ${requested.join(', ') || 'Artist news, releases, culture, charts'}

CURRENT RSS RESEARCH:
${researchText || 'No fresh RSS items were available. In that case use evergreen music discussion topics and do not claim current facts.'}

Talking points should be newline-separated. When a topic comes from RSS research, put the source title/name in sources. Do not invent source URLs.`;
  const result = await structured(prompt, TOPICS_SCHEMA, 'creapd_music_topics_v1', 5000);
  const topics = array(result?.data?.topics, []).slice(0, 8);
  const rows = [];
  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];
    const [row] = await sql`
      INSERT INTO creapd.music_topics (
        id, configuration_id, owner_user_id, topic_name, generated_summary,
        talking_points, sources, suggested_placement, status, display_order
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${text(topic.topic_name, `Topic ${index + 1}`)},
        ${text(topic.generated_summary)}, ${text(topic.talking_points)}, ${text(topic.sources) || null},
        ${text(topic.suggested_placement) || null}, 'ready', ${index}
      ) RETURNING *
    `;
    rows.push(row);
  }
  return rows;
}

async function buildAssets({ sql, ownerUserId, config, playlist, topics, research }) {
  const playlistText = playlist.slice(0, 15).map((s, i) => `${i + 1}. ${s.song_title} — ${s.artist}`).join('\n');
  const topicsText = topics.slice(0, 8).map((t, i) => `${i + 1}. ${t.topic_name}: ${t.generated_summary}`).join('\n');
  const researchText = research.slice(0, 8).map((r, i) => `${i + 1}. ${r.title}: ${r.summary}`).join('\n');
  const prompt = `You are the production-assets writer for CREAPD Music Studio. Generate practical on-air material for this show.

SHOW: ${config.production_name}
Host: ${config.host_name || 'Host'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}

PLAYLIST:
${playlistText}

TOPICS:
${topicsText || 'None'}

VERIFIED RSS RESEARCH SUMMARIES:
${researchText || 'None'}

Create a useful mix of these asset types: song_intro, song_outro, artist_fact, host_banter, music_trivia, station_id, sponsor_read, social_caption, hashtag, video_prompt, production_notes. For artist facts or current-event material, only use facts supported by the playlist metadata or supplied RSS summaries; otherwise make the asset evergreen. Aim for 12-20 concise assets total.`;
  const result = await structured(prompt, ASSETS_SCHEMA, 'creapd_music_assets_v1', 7000);
  const rawAssets = array(result?.data?.assets, []).slice(0, 24);
  const rows = [];
  for (const asset of rawAssets) {
    const type = text(asset.asset_type, 'host_banter');
    if (!VALID_ASSET_TYPES.has(type)) continue;
    const [row] = await sql`
      INSERT INTO creapd.music_assets (
        id, configuration_id, owner_user_id, asset_type, title, content,
        associated_song_title, associated_topic, status
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${type},
        ${text(asset.title, type.replaceAll('_', ' '))}, ${text(asset.content)},
        ${text(asset.associated_song_title) || null}, ${text(asset.associated_topic) || null}, 'ready'
      ) RETURNING *
    `;
    rows.push(row);
  }
  return rows;
}

export async function generateMusicTop10({ sql, ownerUserId, configurationId, preserveLocked = true }) {
  const config = await requireConfig(sql, ownerUserId, configurationId);
  const playlist = await sql`
    SELECT * FROM creapd.music_playlist_items
    WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}
    ORDER BY order_index ASC
  `;
  const existing = await sql`
    SELECT * FROM creapd.music_top10_items
    WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}
    ORDER BY order_index ASC
  `;
  const locked = preserveLocked ? existing.filter(row => row.locked) : [];
  if (preserveLocked) {
    await sql`DELETE FROM creapd.music_top10_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} AND locked=false`;
  } else {
    await sql`DELETE FROM creapd.music_top10_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
  }
  const remaining = Math.max(0, 10 - locked.length);
  if (!remaining) return locked;

  const exclusions = playlist.map(s => `${s.song_title} — ${s.artist}`).join('\n');
  const lockedText = locked.map(s => s.title).join('\n');
  const year = new Date().getUTCFullYear();
  const prompt = `You are the countdown curator for CREAPD Music Studio. Suggest ${Math.max(remaining * 2, 14)} REAL music-video candidates so the system can independently search and validate them on YouTube.

SHOW: ${config.production_name}
Genres: ${array(config.genres, []).join(', ') || 'Top 40'}
Moods: ${array(config.moods, []).join(', ') || 'Feel Good'}
Preferred eras: ${config.preferred_eras || 'Current'}
Include throwbacks: ${config.include_throwbacks === true}

DO NOT DUPLICATE PLAYLIST SONGS:
${exclusions || 'None'}

ALREADY LOCKED TOP 10 ITEMS:
${lockedText || 'None'}

Return real song_title + artist pairs only. Prefer ${year - 2}-${year} releases unless older eras were requested. Do not return YouTube URLs; CREAPD will search YouTube itself. Include a one-sentence rank_reason.`;
  const result = await structured(prompt, TOP10_SCHEMA, 'creapd_music_top10_v1', 4500);
  const candidates = array(result?.data?.items, []);
  const usedIds = new Set([...locked.map(i => i.youtube_video_id), ...playlist.map(i => i.youtube_video_id)].filter(Boolean));
  const rows = [...locked];
  for (const candidate of candidates) {
    if (rows.length >= 10) break;
    const metadata = await searchYoutubeVideo(candidate.song_title, candidate.artist, usedIds);
    if (!metadata) continue;
    usedIds.add(metadata.video_id);
    const [row] = await sql`
      INSERT INTO creapd.music_top10_items (
        id, configuration_id, owner_user_id, order_index, title, youtube_video_id,
        thumbnail_url, channel_name, locked, note
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${rows.length}, ${metadata.title || `${candidate.song_title} — ${candidate.artist}`},
        ${metadata.video_id}, ${metadata.thumbnail_url}, ${metadata.channel_name}, false, ${text(candidate.rank_reason) || null}
      ) RETURNING *
    `;
    rows.push(row);
  }
  return rows;
}

function buildRundownBlueprint(playlist, topics, config) {
  const pacing = object(config.pacing_rules, { max_sequential_songs: 4, min_talk_break_frequency: 1 });
  const maxSequential = Math.max(1, Math.min(5, Math.round(num(pacing.max_sequential_songs, 4))));
  const introSecs = Math.max(30, Math.round(num(config.intro_runtime, 2) * 60));
  const outroSecs = Math.max(30, Math.round(num(config.outro_runtime, 2) * 60));
  const talkSecs = Math.max(120, Math.round(num(config.talk_segment_runtime, 30) * 60));
  const sponsorSecs = Math.max(0, Math.round(num(config.commercial_sponsor_runtime, 8) * 60));
  const blocks = [];
  for (let i = 0; i < playlist.length; i += maxSequential) blocks.push(playlist.slice(i, i + maxSequential));
  const intervals = Math.max(1, blocks.length - 1);
  const talkPer = Math.max(45, Math.floor(talkSecs / intervals));
  const sponsorPer = sponsorSecs ? Math.max(30, Math.floor(sponsorSecs / Math.max(1, Math.floor(blocks.length / 2)))) : 0;
  const blueprint = [{ segment_type: 'intro', title: 'Show Intro', target_duration: introSecs }];
  let topicIndex = 0;
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    for (const song of blocks[blockIndex]) {
      blueprint.push({ segment_type: 'song', title: song.song_title, associated_song_title: song.song_title, target_duration: Math.max(60, num(song.length_seconds, 180)) });
    }
    if (blockIndex < blocks.length - 1) {
      if (topicIndex < topics.length) {
        blueprint.push({ segment_type: 'topic_segment', title: topics[topicIndex].topic_name, associated_topic: topics[topicIndex].topic_name, target_duration: talkPer });
        topicIndex += 1;
      } else {
        blueprint.push({ segment_type: 'talk_break', title: 'Host Banter', target_duration: talkPer });
      }
      if (sponsorPer && (blockIndex + 1) % 2 === 0) blueprint.push({ segment_type: 'sponsor_break', title: 'Sponsor Break', target_duration: sponsorPer });
      blueprint.push({ segment_type: 'station_id', title: 'Station ID', target_duration: 15 });
    }
  }
  while (topicIndex < topics.length) {
    blueprint.push({ segment_type: 'topic_segment', title: topics[topicIndex].topic_name, associated_topic: topics[topicIndex].topic_name, target_duration: 90 });
    topicIndex += 1;
  }
  blueprint.push({ segment_type: 'outro', title: 'Show Outro', target_duration: outroSecs });
  return blueprint;
}

async function buildRundown({ sql, ownerUserId, config, playlist, topics }) {
  const blueprint = buildRundownBlueprint(playlist, topics, config);
  const blueprintText = blueprint.map((item, index) => `${index + 1}. [${item.segment_type}] ${item.title}${item.associated_song_title ? ` | song=${item.associated_song_title}` : ''}${item.associated_topic ? ` | topic=${item.associated_topic}` : ''} | target=${Math.round(item.target_duration)}s`).join('\n');
  const topicText = topics.map(t => `${t.topic_name}: ${t.generated_summary}\n${t.talking_points}`).join('\n\n');
  const prompt = `You are the rundown/script writer for CREAPD Music Studio. The rundown structure below is LOCKED. Return exactly the same number of items in exactly the same order. Do not add/remove/reorder segments. Write only the host script/notes needed for each item.

SHOW: ${config.production_name}
Host: ${config.host_name || 'Host'}
Co-host: ${config.co_host_name || 'None'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}

LOCKED BLUEPRINT:
${blueprintText}

TOPIC MATERIAL:
${topicText || 'No generated topics'}

SCRIPT RULES:
- Song segments: 1-3 sentence intro/segue mentioning the artist and song title.
- Topic segments: conversational script based only on supplied topic material; target roughly 110-130 spoken words/minute but stay concise.
- Talk breaks: natural host banter without invented current facts.
- Sponsor breaks: generic placeholder ad-read unless show data names a sponsor.
- Station ID: brief ID.
- Intro/outro: polished open/close.
Return rundown array matching the blueprint.`;
  const result = await structured(prompt, RUNDOWN_SCHEMA, 'creapd_music_rundown_v1', 9000);
  const scripts = array(result?.data?.rundown, []);
  let cursor = parseTimeToSeconds(config.show_start_time || '06:00');
  const rows = [];
  for (let index = 0; index < blueprint.length; index += 1) {
    const bp = blueprint[index];
    const generated = scripts[index] || {};
    const script = text(generated.script_content);
    let duration = Math.max(10, num(bp.target_duration, 60));
    if (bp.segment_type !== 'song' && script) duration = Math.max(duration, Math.ceil(script.split(/\s+/).filter(Boolean).length / 2.1));
    const start = formatSecondsToTime(cursor);
    cursor += duration;
    const end = formatSecondsToTime(cursor);
    const matchingSong = bp.associated_song_title ? playlist.find(s => text(s.song_title).toLowerCase() === text(bp.associated_song_title).toLowerCase()) : null;
    const [row] = await sql`
      INSERT INTO creapd.music_rundown_items (
        id, configuration_id, owner_user_id, order_index, segment_type, title,
        script_content, start_time, duration_seconds, end_time, notes, status,
        associated_song_id, associated_song_title, associated_topic
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${index}, ${bp.segment_type},
        ${bp.title}, ${script || null}, ${start}, ${duration}, ${end}, ${text(generated.notes) || null},
        'ready', ${matchingSong?.id || null}, ${bp.associated_song_title || null}, ${bp.associated_topic || null}
      ) RETURNING *
    `;
    rows.push(row);
  }
  return rows;
}

export async function runMusicBuild({ sql, ownerUserId, configurationId, section = null }) {
  const config = await requireConfig(sql, ownerUserId, configurationId);
  const buildLog = section ? array(config.build_log, []) : [];
  try {
    await sql`
      UPDATE creapd.music_production_configurations
      SET status=${section ? 'refreshing' : 'building'}, updated_at=now()
      WHERE id=${config.id} AND owner_user_id=${String(ownerUserId)}
    `;

    const total = Math.max(30, Math.min(180, num(config.total_show_runtime, 90)));
    const musicMinutes = Math.max(15, Math.round(num(config.required_music_runtime, total * 0.5)));
    const targetCount = Math.max(8, Math.min(15, Math.ceil(musicMinutes / 3.5)));
    const plan = {
      production_format: config.production_format || 'radio',
      total_show_runtime: total,
      required_music_runtime: musicMinutes,
      estimated_song_count: targetCount,
      automation_preferences: array(config.ai_automation, []),
      provider: configuredProvider(),
      generated_at: new Date().toISOString(),
    };
    if (!section) {
      await sql`
        UPDATE creapd.music_production_configurations
        SET production_plan=${safeJson(plan)}::jsonb, build_metadata=${safeJson({ provider: configuredProvider(), started_at: new Date().toISOString() })}::jsonb
        WHERE id=${config.id} AND owner_user_id=${String(ownerUserId)}
      `;
      await appendStage(sql, ownerUserId, config.id, buildLog, 'planning', 'complete', { requirements_count: 7 });
    }

    const automation = array(config.ai_automation, ['Auto Research','Auto Build Playlist','Auto Develop','Auto Assemble Packet']);
    const runStage = (name) => !section || section === name;
    let playlist = await sql`SELECT * FROM creapd.music_playlist_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY order_index ASC`;
    let research = await sql`SELECT * FROM creapd.music_research_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY created_at ASC`;
    let topics = await sql`SELECT * FROM creapd.music_topics WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY display_order ASC`;
    let assets = await sql`SELECT * FROM creapd.music_assets WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY created_at ASC`;
    let rundown = await sql`SELECT * FROM creapd.music_rundown_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY order_index ASC`;
    let top10 = await sql`SELECT * FROM creapd.music_top10_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)} ORDER BY order_index ASC`;

    if (runStage('playlist')) {
      if (!section && !automation.includes('Auto Build Playlist')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'playlist', 'skipped', { count: playlist.length });
      } else {
        await sql`DELETE FROM creapd.music_playlist_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        playlist = await buildPlaylist({ sql, ownerUserId, config, targetCount });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'playlist', 'complete', { count: playlist.length, youtube_resolved: playlist.filter(x => x.youtube_video_id).length });
      }
    }

    if (runStage('research')) {
      if (!section && !automation.includes('Auto Research')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'research', 'skipped', { count: research.length });
      } else {
        await sql`DELETE FROM creapd.music_research_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        research = await buildResearch({ sql, ownerUserId, config });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'research', research.length ? 'complete' : 'skipped', { count: research.length, source: 'google_news_rss' });
      }
    }

    if (runStage('topics')) {
      if (!section && !automation.includes('Auto Develop')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'topics', 'skipped', { count: topics.length });
      } else {
        await sql`DELETE FROM creapd.music_topics WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        topics = await buildTopics({ sql, ownerUserId, config, research });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'topics', topics.length ? 'complete' : 'failed', { count: topics.length });
      }
    }

    if (runStage('assets')) {
      if (!section && !automation.includes('Auto Develop')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'assets', 'skipped', { count: assets.length });
      } else {
        await sql`DELETE FROM creapd.music_assets WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        assets = await buildAssets({ sql, ownerUserId, config, playlist, topics, research });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'assets', assets.length ? 'complete' : 'failed', { count: assets.length });
      }
    }

    if (runStage('top10')) {
      top10 = await generateMusicTop10({ sql, ownerUserId, configurationId: config.id, preserveLocked: Boolean(section) });
      await appendStage(sql, ownerUserId, config.id, buildLog, 'top10', top10.length ? 'complete' : 'failed', { count: top10.length });
    } else if (!section) {
      top10 = await generateMusicTop10({ sql, ownerUserId, configurationId: config.id, preserveLocked: false });
      await appendStage(sql, ownerUserId, config.id, buildLog, 'top10', top10.length ? 'complete' : 'failed', { count: top10.length });
    }

    if (runStage('rundown')) {
      if (!section && !automation.includes('Auto Assemble Packet')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'rundown', 'skipped', { count: rundown.length });
      } else {
        if (!playlist.length) throw new Error('Cannot build rundown without a playlist');
        await sql`DELETE FROM creapd.music_rundown_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        rundown = await buildRundown({ sql, ownerUserId, config, playlist, topics });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'rundown', rundown.length ? 'complete' : 'failed', { count: rundown.length });
      }
    }

    await sql`
      UPDATE creapd.music_production_configurations
      SET status='ready', build_log=${safeJson(buildLog)}::jsonb,
          build_metadata=${safeJson({
            provider: configuredProvider(),
            completed_at: new Date().toISOString(),
            playlist_count: playlist.length,
            research_count: research.length,
            topic_count: topics.length,
            asset_count: assets.length,
            top10_count: top10.length,
            rundown_count: rundown.length,
          })}::jsonb,
          updated_at=now()
      WHERE id=${config.id} AND owner_user_id=${String(ownerUserId)}
    `;

    return {
      success: true,
      configuration_id: config.id,
      provider: configuredProvider(),
      section: section || 'all',
      playlist_count: playlist.length,
      research_count: research.length,
      topic_count: topics.length,
      asset_count: assets.length,
      top10_count: top10.length,
      rundown_count: rundown.length,
      build_log: buildLog,
    };
  } catch (error) {
    await updateBuildFailure(sql, ownerUserId, config.id, buildLog, error).catch(() => {});
    throw error;
  }
}

export async function regenerateMusicSection(args) {
  const section = text(args?.section).toLowerCase();
  const valid = new Set(['playlist', 'research', 'topics', 'assets', 'top10', 'rundown']);
  if (!valid.has(section)) {
    const error = new Error(`Invalid Music section: ${section}`);
    error.code = 'MUSIC_SECTION_INVALID';
    error.status = 400;
    throw error;
  }
  return runMusicBuild({ ...args, section });
}

export async function generateMusicStructured({ prompt, schema, schemaName = 'creapd_music_inline_v1', maxOutputTokens = 2500 }) {
  const result = await structured(prompt, schema, schemaName, maxOutputTokens);
  return result.data;
}
