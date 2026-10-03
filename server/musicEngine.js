import { randomUUID } from 'node:crypto';
import { generateStructuredGatewayResponse, configuredProvider } from './aiGateway.js';

const DEFAULT_MUSIC_AUTOMATION = [
  'Auto Research',
  'Auto Build Playlist',
  'Auto Develop',
  'Auto Assemble Packet',
];

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

const SCRIPT_REPAIR_SCHEMA = {
  type: 'object',
  required: ['repairs'],
  properties: {
    repairs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['order', 'script_content'],
        properties: {
          order: { type: 'number' },
          script_content: { type: 'string' },
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

function automationPreferences(value) {
  const parsed = array(value, []);
  return parsed.length ? parsed : [...DEFAULT_MUSIC_AUTOMATION];
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

function radioProductionTools(config) {
  const plan = object(config?.production_plan, {});
  const tools = object(plan.production_tools, {});
  const quality = object(tools.quality, {});
  const scripts = object(tools.scripts, {});

  return {
    quality: {
      ground_current_facts: quality.ground_current_facts !== false,
      avoid_repeated_phrasing: quality.avoid_repeated_phrasing !== false,
      keep_show_premise: quality.keep_show_premise !== false,
      require_station_host_name: true,
      require_station_name: quality.require_station_name !== false,
    },
    scripts: {
      intro: object(scripts.intro, {}),
      station_id: object(scripts.station_id, {}),
      topic_segment: object(scripts.topic_segment, {}),
      talk_break: object(scripts.talk_break, {}),
      song_copy: object(scripts.song_copy, {}),
      outro: object(scripts.outro, {}),
    },
  };
}

function producerInstruction(config, key) {
  const rules = radioProductionTools(config);
  return text(rules.scripts?.[key]?.instruction).slice(0, 500);
}

function producerInstructionBlock(config, keys = []) {
  const labels = {
    intro: 'show intro',
    station_id: 'station ID',
    topic_segment: 'topic segment',
    talk_break: 'talk break',
    song_copy: 'song intro/outro copy',
    outro: 'show outro',
  };
  const lines = keys
    .map(key => {
      const instruction = producerInstruction(config, key);
      return instruction ? `- ${labels[key] || key}: ${instruction}` : '';
    })
    .filter(Boolean);

  return lines.length ? `\nPRODUCER OVERRIDES:\n${lines.join('\n')}\n` : '';
}

function stationIdWordRange(config) {
  const settings = radioProductionTools(config).scripts.station_id;
  const rawMin = Math.round(num(settings.min_words, 24));
  const rawMax = Math.round(num(settings.max_words, 38));
  const min = Math.max(8, Math.min(80, rawMin));
  const max = Math.max(min + 2, Math.min(100, rawMax));
  return {
    min,
    max,
    target: Math.round((min + max) / 2),
  };
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

const YOUTUBE_NOISE_WORDS = new Set([
  'official', 'video', 'music', 'audio', 'lyrics', 'lyric', 'visualizer',
  'hd', '4k', 'remastered', 'remaster', 'version', 'explicit', 'clean',
  'feat', 'featuring', 'ft', 'the', 'a', 'an',
]);

function youtubeMatchTokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token && !YOUTUBE_NOISE_WORDS.has(token));
}

function tokenCoverage(requiredTokens, candidateText) {
  if (!requiredTokens.length) return 1;
  const haystack = new Set(youtubeMatchTokens(candidateText));
  const hits = requiredTokens.filter(token => haystack.has(token)).length;
  return hits / requiredTokens.length;
}

function scoreYoutubeMatch(metadata, songTitle, artist, expectedLength = 0) {
  const titleTokens = youtubeMatchTokens(songTitle);
  const artistTokens = youtubeMatchTokens(artist);
  const titleCoverage = tokenCoverage(titleTokens, metadata?.title || '');
  const artistCoverage = tokenCoverage(
    artistTokens,
    `${metadata?.title || ''} ${metadata?.channel_name || ''}`,
  );

  let score = (titleCoverage * 0.68) + (artistCoverage * 0.32);
  const duration = num(metadata?.duration_seconds, 0);
  const expected = num(expectedLength, 0);

  if (duration > 0 && expected > 0) {
    const difference = Math.abs(duration - expected);
    const tolerance = Math.max(75, expected * 0.35);
    if (difference <= tolerance) score += 0.08;
  }

  return { score, titleCoverage, artistCoverage };
}

function parseYoutubeDurationText(value) {
  const raw = String(value || '').trim();
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(raw)) return 0;
  const parts = raw.split(':').map(Number);
  if (parts.some(part => !Number.isFinite(part))) return 0;
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

function extractBalancedJson(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = html.indexOf('{', markerIndex + marker.length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, index + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function youtubeText(node) {
  if (!node) return '';
  if (typeof node.simpleText === 'string') return node.simpleText.trim();
  if (Array.isArray(node.runs)) return node.runs.map(run => String(run?.text || '')).join('').trim();
  return '';
}

function extractYoutubeSearchCandidates(html) {
  const data =
    extractBalancedJson(html, 'var ytInitialData =') ||
    extractBalancedJson(html, 'ytInitialData =');
  if (!data) return [];

  const results = [];
  const stack = [data];
  while (stack.length && results.length < 40) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (node.videoRenderer?.videoId) {
      const renderer = node.videoRenderer;
      results.push({
        video_id: renderer.videoId,
        title: youtubeText(renderer.title),
        channel_name: youtubeText(renderer.ownerText) || youtubeText(renderer.longBylineText),
        duration_seconds: parseYoutubeDurationText(youtubeText(renderer.lengthText)),
      });
    }

    if (Array.isArray(node)) {
      for (let index = node.length - 1; index >= 0; index -= 1) stack.push(node[index]);
    } else {
      for (const value of Object.values(node)) stack.push(value);
    }
  }

  return results;
}

function decodeYoutubeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
    });
}

function normalizeYoutubeChannelUrl(value) {
  const raw = text(value);
  if (!raw) return '';
  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://www.youtube.com/${raw.replace(/^\/+/, '')}`);
  } catch {
    return '';
  }
  if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return '';
  url.hostname = 'www.youtube.com';
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (!url.pathname || url.pathname === '/') return '';
  if (!url.pathname.endsWith('/videos')) url.pathname = `${url.pathname}/videos`;
  return url.toString();
}

function cleanYoutubeDescription(value) {
  return decodeYoutubeEntities(value)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function extractDescriptionLyrics(description) {
  const source = cleanYoutubeDescription(description);
  if (!source) return '';

  const explicit = source.match(/(?:^|\n)\s*(?:lyrics?|song lyrics?)\s*[:\-]?\s*\n([\s\S]{80,})/i);
  if (explicit?.[1]) {
    return explicit[1]
      .split(/\n\s*(?:follow|stream|listen|subscribe|social|credits?|produced by|written by|copyright|©|http)/i)[0]
      .trim()
      .slice(0, 12000);
  }

  const lines = source.split('\n').map(line => line.trim()).filter(Boolean);
  const lyricLike = lines.filter(line =>
    line.length >= 2 &&
    line.length <= 140 &&
    !/^https?:\/\//i.test(line) &&
    !/^(follow|stream|listen|subscribe|available|produced|written|mixed|mastered|copyright|©|#)/i.test(line)
  );
  if (lyricLike.length >= 8 && lyricLike.join(' ').length >= 180) {
    return lyricLike.join('\n').slice(0, 12000);
  }
  return '';
}

function youtubeCaptionTextFromXml(xml) {
  return decodeYoutubeEntities(
    [...String(xml || '').matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)]
      .map(match => match[1].replace(/<[^>]+>/g, ' '))
      .join(' ')
  ).replace(/\s+/g, ' ').trim();
}

async function fetchYoutubeCaptionTranscript(playerResponse) {
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || !tracks.length) return '';

  const preferred =
    tracks.find(track => /^en(?:-|$)/i.test(String(track?.languageCode || ''))) ||
    tracks[0];
  const baseUrl = text(preferred?.baseUrl);
  if (!baseUrl) return '';

  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return '';
    const transcript = youtubeCaptionTextFromXml(await response.text());
    return transcript.slice(0, 12000);
  } catch {
    return '';
  }
}

async function fetchArtistYoutubeVideoDetails(videoId, hint = {}) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const player =
      extractBalancedJson(html, 'var ytInitialPlayerResponse =') ||
      extractBalancedJson(html, 'ytInitialPlayerResponse =');

    const details = player?.videoDetails || {};
    const micro = player?.microformat?.playerMicroformatRenderer || {};
    const description = cleanYoutubeDescription(details.shortDescription || '');
    const descriptionLyrics = extractDescriptionLyrics(description);
    const captionTranscript = descriptionLyrics ? '' : await fetchYoutubeCaptionTranscript(player);

    return {
      video_id: videoId,
      title: text(details.title, hint.title || ''),
      channel_name: text(details.author, hint.channel_name || ''),
      channel_id: text(details.channelId),
      duration_seconds: num(details.lengthSeconds, hint.duration_seconds || 0),
      description,
      lyrics: descriptionLyrics || captionTranscript,
      lyrics_source: descriptionLyrics ? 'youtube_description' : captionTranscript ? 'youtube_captions' : null,
      published_at: text(micro.publishDate || micro.uploadDate),
      thumbnail_url: text(
        details?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url,
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      ),
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch {
    return null;
  }
}

function likelyArtistMusicUpload(video = {}) {
  const title = String(video.title || '').toLowerCase();
  const duration = num(video.duration_seconds, 0);
  if (duration > 0 && (duration < 60 || duration > 1200)) return false;
  if (/\b(shorts?|trailer|teaser|behind the scenes|interview|podcast|reaction|vlog|live stream|livestream)\b/i.test(title)) return false;
  return true;
}

export async function scanArtistYoutubeChannel(channelUrl, options = {}) {
  const normalized = normalizeYoutubeChannelUrl(channelUrl);
  if (!normalized) {
    const error = new Error('Enter a valid YouTube channel URL or @handle URL.');
    error.code = 'ARTIST_YOUTUBE_CHANNEL_INVALID';
    error.status = 400;
    throw error;
  }

  let html = '';
  try {
    const response = await fetch(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const error = new Error(`YouTube returned HTTP ${response.status} for this channel.`);
      error.code = 'ARTIST_YOUTUBE_CHANNEL_UNAVAILABLE';
      error.status = response.status === 404 ? 404 : 502;
      throw error;
    }
    html = await response.text();
  } catch (error) {
    if (error?.code) throw error;
    const wrapped = new Error('CREAPD could not reach this YouTube channel.');
    wrapped.code = 'ARTIST_YOUTUBE_CHANNEL_UNAVAILABLE';
    wrapped.status = 502;
    throw wrapped;
  }

  const discovered = extractYoutubeSearchCandidates(html);
  const unique = [];
  const seen = new Set();
  for (const item of discovered) {
    if (!item?.video_id || seen.has(item.video_id)) continue;
    seen.add(item.video_id);
    unique.push(item);
    if (unique.length >= Math.max(1, Math.min(36, num(options.limit, 24)))) break;
  }

  if (!unique.length) {
    const error = new Error('No public videos were found on that YouTube channel page.');
    error.code = 'ARTIST_YOUTUBE_NO_VIDEOS';
    error.status = 404;
    throw error;
  }

  const details = (await Promise.all(
    unique.map(item => fetchArtistYoutubeVideoDetails(item.video_id, item))
  )).filter(Boolean);

  return {
    channel_url: normalized.replace(/\/videos\/?$/, ''),
    scanned_count: details.length,
    videos: details.map(video => ({
      ...video,
      likely_music: likelyArtistMusicUpload(video),
    })),
  };
}

function classifyRadioSafeYoutubeSource(metadata = {}) {
  const title = String(metadata?.title || '').toLowerCase();
  const channel = String(metadata?.channel_name || '').toLowerCase();

  const blocked = [
    /\bofficial music video\b/,
    /\bmusic video\b/,
    /\bofficial video\b/,
    /\bofficial mv\b/,
    /\blive performance\b/,
    /\blive at\b/,
    /\blive from\b/,
    /\blive session\b/,
    /\bconcert\b/,
    /\bkaraoke\b/,
    /\breaction\b/,
    /\bcover version\b/,
    /\btrailer\b/,
    /\bteaser\b/,
    /\bbehind the scenes\b/,
    /\bshorts?\b/,
    /\bsnippet\b/,
    /\bpreview\b/,
    /\bclip\b/,
    /\bdance performance\b/,
    /\bperformance video\b/,
  ];
  if (blocked.some(pattern => pattern.test(title))) return null;

  if (/\blyric(?:s)?\b/.test(title)) return 'lyric_video';
  if (/\bvisuali[sz]er\b/.test(title)) return 'visualizer';
  if (/\bofficial audio\b/.test(title) || /\baudio only\b/.test(title) || /\baudio\b/.test(title)) return 'audio_track';

  // YouTube Music/Topic uploads often use only the exact song title with no
  // "audio" label. Those are continuous full-track sources and are valid for radio.
  if (/\btopic\b/.test(channel) || /- topic$/.test(channel)) return 'audio_track';

  return null;
}

function isRadioSafeYoutubeSource(metadata) {
  return Boolean(classifyRadioSafeYoutubeSource(metadata));
}

async function fetchYoutubeDuration(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match =
      html.match(/"lengthSeconds":"(\d+)"/) ||
      html.match(/"approxDurationMs":"(\d+)"/) ||
      html.match(/"lengthSeconds":(\d+)/);
    if (!match) return null;
    const raw = Number(match[1]);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return match[0].includes('approxDurationMs') ? Math.round(raw / 1000) : Math.round(raw);
  } catch {
    return null;
  }
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function normalizedIdentity(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scriptSimilarity(a, b) {
  const left = new Set(normalizedIdentity(a).split(' ').filter(Boolean));
  const right = new Set(normalizedIdentity(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function stationIdIsValid(script, config, previousScript = '', avoidScripts = []) {
  const copy = text(script);
  if (!copy) return false;

  const rules = radioProductionTools(config);
  const normalizedCopy = normalizedIdentity(copy);
  const hostName = normalizedIdentity(config.host_name);
  const stationName = normalizedIdentity(config.station_name);
  const words = stationIdWordRange(config);
  const wordCount = countWords(copy);

  if (rules.quality.require_station_host_name && hostName && !normalizedCopy.includes(hostName)) return false;
  if (hostName && /\b(with\s+)?your\s+host\b/i.test(copy)) return false;
  if (rules.quality.require_station_name && stationName && !normalizedCopy.includes(stationName)) return false;
  if (wordCount < words.min || wordCount > words.max) return false;

  if (rules.quality.avoid_repeated_phrasing) {
    const variation = text(rules.scripts.station_id?.variation, 'high').toLowerCase();
    const similarityLimit = variation === 'low' ? 0.88 : variation === 'medium' ? 0.78 : 0.68;
    if (previousScript && scriptSimilarity(copy, previousScript) >= similarityLimit) return false;
    if (avoidScripts.some(existing => scriptSimilarity(copy, existing) >= similarityLimit)) return false;
  }

  return true;
}

function fallbackStationId(config, previousScript = '') {
  const host = text(config.host_name);
  const station = text(config.station_name);
  const show = text(config.production_name, 'this show');
  const identity = [
    station ? `You're tuned to ${station}.` : '',
    host ? `${host} is on the mic for ${show}.` : `You're listening to ${show}.`,
  ].filter(Boolean).join(' ');

  const variants = [
    `${identity} Keep it right here—more music and more of the show are coming up next.`,
    `${identity} Stay locked in; the next stretch of music is lined up and ready to go.`,
    `${identity} Don't touch that dial. We're keeping the music moving and the show rolling.`,
    `${identity} You're in the right place. More music is on deck, so keep it right here.`,
  ];

  const hash = [...String(previousScript || show)].reduce((sum, ch) => ((sum * 31) + ch.charCodeAt(0)) >>> 0, 7);
  return variants[hash % variants.length];
}

async function generateStationIdReplacement({ config, previousScript = '', avoidScripts = [] }) {
  const rules = radioProductionTools(config);
  const words = stationIdWordRange(config);
  const customInstruction = producerInstruction(config, 'station_id');
  const prompt = `Write ONE fresh radio Station ID.

SHOW IDENTITY
Show title: ${config.production_name}
Station: ${config.station_name || 'Not supplied'}
Host name: ${config.host_name || 'Not supplied'}
Co-host: ${config.co_host_name || 'None'}
Tone: ${config.show_tone || 'Professional'}

HARD RULES
- If a host name is supplied, you MUST say the exact host name "${config.host_name}" in the Station ID.
- NEVER substitute phrases such as "your host", "with your host", "our host", or "the host" for the configured host name.
- Keep it to ${words.min}-${words.max} spoken words.
- Make it sound like a real radio liner/ID, not an explanation.
- Do not invent slogans, frequencies, cities, call letters, sponsors, awards, or facts that were not configured.
- Make the wording materially different from the rejected/current version: change the opening, sentence structure, and closing.
${rules.quality.require_station_name && config.station_name ? `- The station name "${config.station_name}" is required.` : '- Station name mention is optional for this show.'}
${customInstruction ? `- Producer instruction: ${customInstruction}` : ''}

REJECTED/CURRENT VERSION TO AVOID:
${previousScript || '(none)'}

OTHER STATION IDS IN THIS SHOW TO AVOID COPYING:
${avoidScripts.length ? avoidScripts.join('\n---\n') : '(none)'}

Return one repair with order=1 and script_content containing only the new Station ID.`;

  try {
    const result = await structured(prompt, SCRIPT_REPAIR_SCHEMA, 'creapd_music_station_id_replacement_v2', 1200);
    const candidate = text(array(result?.data?.repairs, [])[0]?.script_content);
    if (stationIdIsValid(candidate, config, previousScript, avoidScripts)) return candidate;
  } catch {}

  return fallbackStationId(config, previousScript);
}

function spokenWordRange(seconds, segmentType, config = null) {
  if (segmentType === 'station_id') return config ? stationIdWordRange(config) : { min: 24, target: 30, max: 38 };
  const safeSeconds = Math.max(10, num(seconds, 60));
  // Native speech runs at ~0.95 rate. 140-150 WPM keeps generated copy close
  // to the configured segment runtime instead of ending minutes early.
  const target = Math.max(18, Math.round((safeSeconds / 60) * 145));
  return {
    min: Math.max(14, Math.round(target * 0.93)),
    target,
    max: Math.max(20, Math.round(target * 1.07)),
  };
}

async function validateYoutubeVideo(videoId, hint = null) {
  if (!videoId) return null;
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const hintedDuration = num(hint?.duration_seconds, 0);
    const durationSeconds = hintedDuration > 0 ? hintedDuration : await fetchYoutubeDuration(videoId);
    return {
      video_id: videoId,
      title: text(payload?.title, hint?.title || ''),
      thumbnail_url: text(payload?.thumbnail_url, `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`),
      channel_name: text(payload?.author_name, hint?.channel_name || ''),
      duration_seconds: durationSeconds,
      source_type: classifyRadioSafeYoutubeSource({
        title: text(payload?.title, hint?.title || ''),
        channel_name: text(payload?.author_name, hint?.channel_name || ''),
      }) || 'youtube_video',
    };
  } catch {
    return null;
  }
}

async function searchYoutubeVideo(songTitle, artist, usedIds = new Set(), expectedLength = 0, options = {}) {
  try {
    const requireRadioSafe = options.requireRadioSafe !== false;
    const queries = requireRadioSafe
      ? [
          `"${songTitle}" "${artist}" official audio`,
          `"${songTitle}" "${artist}" visualizer`,
          `"${songTitle}" "${artist}" lyrics`,
          `${artist} ${songTitle} audio`,
        ]
      : [
          `"${songTitle}" "${artist}" official music video`,
          `"${songTitle}" "${artist}" official video`,
          `${artist} ${songTitle} music video`,
        ];

    const candidateMap = new Map();
    for (const queryText of queries) {
      const query = encodeURIComponent(queryText);
      const response = await fetch(`https://www.youtube.com/results?search_query=${query}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;
      const html = await response.text();
      for (const candidate of extractYoutubeSearchCandidates(html)) {
        if (usedIds.has(candidate.video_id) || candidateMap.has(candidate.video_id)) continue;
        candidateMap.set(candidate.video_id, candidate);
      }
      const usableCount = [...candidateMap.values()].filter(candidate => !requireRadioSafe || isRadioSafeYoutubeSource(candidate)).length;
      if (usableCount >= 6) break;
    }

    const candidates = [...candidateMap.values()]
      .filter(candidate => !requireRadioSafe || isRadioSafeYoutubeSource(candidate))
      .slice(0, 12);

    const metadata = (await Promise.all(
      candidates.map(candidate => validateYoutubeVideo(candidate.video_id, candidate))
    )).filter(Boolean);

    const ranked = metadata
      .filter(meta => !requireRadioSafe || isRadioSafeYoutubeSource(meta))
      .map(meta => ({ meta, ...scoreYoutubeMatch(meta, songTitle, artist, expectedLength) }))
      .filter(({ meta, titleCoverage, artistCoverage }) => {
        const duration = num(meta.duration_seconds, 0);
        const durationLooksLikeSong = duration >= 75 && duration <= 900;
        return durationLooksLikeSong && titleCoverage >= 0.67 && artistCoverage >= 0.5;
      })
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.meta || null;
  } catch {}
  return null;
}

export async function fetchYoutubeMetadata(url, options = {}) {
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

  if (options.requireRadioSafe === true) {
    const duration = num(metadata.duration_seconds, 0);
    if (!isRadioSafeYoutubeSource(metadata)) {
      const error = new Error('Radio playlists accept lyric videos, visualizers, and continuous audio tracks only.');
      error.code = 'RADIO_SAFE_YOUTUBE_SOURCE_REQUIRED';
      error.status = 400;
      throw error;
    }
    if (duration < 75 || duration > 900) {
      const error = new Error('Could not verify a full-song duration for this Radio track.');
      error.code = 'RADIO_SAFE_DURATION_REQUIRED';
      error.status = 400;
      throw error;
    }
  }

  return metadata;
}


export async function refreshMusicPlaylistYoutubeMetadata({ sql, ownerUserId, configurationId }) {
  const ownerId = String(ownerUserId);
  const configId = text(configurationId);
  if (!configId) throw new Error('configuration_id_required');

  const [config] = await sql`
    SELECT * FROM creapd.music_production_configurations
    WHERE id=${configId} AND owner_user_id=${ownerId}
    LIMIT 1
  `;
  if (!config) throw new Error('Music configuration not found');

  const playlist = await sql`
    SELECT * FROM creapd.music_playlist_items
    WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
    ORDER BY order_index ASC, created_at ASC
  `;

  const resolutions = await Promise.all(playlist.map(async song => {
    let metadata = null;

    if (song.youtube_video_id) {
      const current = await validateYoutubeVideo(song.youtube_video_id);
      const currentDuration = num(current?.duration_seconds, 0);
      if (
        current &&
        isRadioSafeYoutubeSource(current) &&
        currentDuration >= 75 &&
        currentDuration <= 900
      ) {
        metadata = current;
      }
    }

    if (!metadata) {
      metadata = await searchYoutubeVideo(
        text(song.song_title),
        text(song.artist),
        new Set(),
        num(song.length_seconds, 0) > 75 ? num(song.length_seconds, 0) : 0,
      );
    }

    return { song, metadata };
  }));

  const updated = [];
  const unresolved = [];
  const usedIds = new Set();

  for (const { song, metadata } of resolutions) {
    const duration = num(metadata?.duration_seconds, 0);
    if (
      !metadata ||
      usedIds.has(metadata.video_id) ||
      !isRadioSafeYoutubeSource(metadata) ||
      duration < 75 ||
      duration > 900
    ) {
      unresolved.push({
        id: song.id,
        song_title: song.song_title,
        artist: song.artist,
      });
      continue;
    }

    usedIds.add(metadata.video_id);
    const sourcePayload = {
      ...(song.source_payload && typeof song.source_payload === 'object' ? song.source_payload : {}),
      youtube_title: metadata.title,
      youtube_duration_seconds: duration,
      youtube_source_type: classifyRadioSafeYoutubeSource(metadata),
      requested_title: song.song_title,
      requested_artist: song.artist,
      refreshed_at: new Date().toISOString(),
    };

    const [row] = await sql`
      UPDATE creapd.music_playlist_items
      SET
        length_seconds=${duration},
        youtube_video_id=${metadata.video_id},
        thumbnail_url=${metadata.thumbnail_url},
        channel_name=${metadata.channel_name},
        source='youtube_radio_verified',
        source_payload=${safeJson(sourcePayload)}::jsonb,
        updated_at=now()
      WHERE id=${song.id} AND owner_user_id=${ownerId}
      RETURNING *
    `;
    if (row) updated.push(row);
  }

  const refreshedPlaylist = await sql`
    SELECT * FROM creapd.music_playlist_items
    WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
    ORDER BY order_index ASC, created_at ASC
  `;

  const byId = new Map(refreshedPlaylist.map(song => [song.id, song]));
  const byTitle = new Map(
    refreshedPlaylist.map(song => [text(song.song_title).toLowerCase(), song])
  );

  const rundown = await sql`
    SELECT * FROM creapd.music_rundown_items
    WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
    ORDER BY order_index ASC, created_at ASC
  `;

  let cursor = parseTimeToSeconds(config.show_start_time || '00:00');
  for (const item of rundown) {
    let duration = Math.max(0, num(item.duration_seconds, 0));

    if (item.segment_type === 'song') {
      const matched =
        (item.associated_song_id ? byId.get(item.associated_song_id) : null) ||
        byTitle.get(text(item.associated_song_title || item.title).toLowerCase());

      if (matched?.length_seconds) {
        duration = num(matched.length_seconds, duration);
      }
    }

    const startTime = formatSecondsToTime(cursor);
    cursor += duration;
    const endTime = formatSecondsToTime(cursor);

    await sql`
      UPDATE creapd.music_rundown_items
      SET
        start_time=${startTime},
        duration_seconds=${duration},
        end_time=${endTime},
        updated_at=now()
      WHERE id=${item.id} AND owner_user_id=${ownerId}
    `;
  }

  return {
    updated_count: updated.length,
    unresolved,
    playlist: refreshedPlaylist,
  };
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

function artistShowMetadata(config) {
  const payload = object(config?.source_payload, {});
  return {
    enabled: String(payload.show_mode || '').toLowerCase() === 'artist',
    artist_profile_id: text(payload.artist_profile_id),
    artist_interview_session_id: text(payload.artist_interview_session_id),
  };
}

async function buildArtistPlaylist({ sql, ownerUserId, config }) {
  const ownerId = String(ownerUserId);
  const artistMeta = artistShowMetadata(config);
  if (!artistMeta.enabled || !artistMeta.artist_profile_id) return [];

  const catalog = await sql`
    SELECT *
    FROM creapd.artist_catalog_tracks
    WHERE profile_id=${artistMeta.artist_profile_id}
      AND owner_user_id=${ownerId}
    ORDER BY created_at ASC
  `;

  if (!catalog.length) {
    const error = new Error('Artist Show cannot build without at least one Artist Catalogue track');
    error.code = 'ARTIST_SHOW_CATALOG_REQUIRED';
    error.status = 409;
    throw error;
  }

  const rows = [];
  for (let index = 0; index < catalog.length; index += 1) {
    const track = catalog[index];
    const metadata = object(track.metadata, {});
    const youtubeVideoId = extractYoutubeId(track.source_url);
    const duration = Math.max(30, num(metadata.duration_seconds, 180));
    const source = track.audio_url
      ? 'artist_catalog_upload'
      : youtubeVideoId
        ? 'artist_catalog_youtube'
        : 'artist_catalog_link';

    const [row] = await sql`
      INSERT INTO creapd.music_playlist_items (
        id, configuration_id, owner_user_id, order_index, song_title, artist,
        length_seconds, genre, mood, era_year, album, release_year,
        reason_selected, status, source, youtube_video_id, thumbnail_url,
        channel_name, source_payload
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${ownerId}, ${index},
        ${text(track.title, `Artist Track ${index + 1}`)},
        ${text(track.artist, config.host_name || 'Artist')},
        ${duration}, ${text(metadata.genre) || null}, ${text(metadata.mood) || null},
        ${text(track.release_year) || null}, ${text(track.album) || null},
        ${text(track.release_year) || null},
        'Artist-supplied catalogue track', 'suggested', ${source},
        ${youtubeVideoId || null}, ${text(track.artwork_url) || null},
        ${text(track.artist, config.host_name || 'Artist')},
        ${safeJson({
          artist_show: true,
          catalog_track_id: track.id,
          audio_url: track.audio_url || null,
          source_url: track.source_url || null,
          description: track.description || null,
          lyrics: track.lyrics || null,
          source_type: track.source_type || 'manual',
          artist_profile_id: artistMeta.artist_profile_id,
        })}::jsonb
      )
      RETURNING *
    `;
    rows.push(row);
  }

  return rows;
}

async function buildArtistResearch({ sql, ownerUserId, config }) {
  const ownerId = String(ownerUserId);
  const artistMeta = artistShowMetadata(config);
  if (!artistMeta.enabled || !artistMeta.artist_profile_id) return [];

  const [profile] = await sql`
    SELECT *
    FROM creapd.artist_profiles
    WHERE id=${artistMeta.artist_profile_id} AND owner_user_id=${ownerId}
    LIMIT 1
  `;

  const catalog = await sql`
    SELECT *
    FROM creapd.artist_catalog_tracks
    WHERE profile_id=${artistMeta.artist_profile_id} AND owner_user_id=${ownerId}
    ORDER BY created_at ASC
  `;

  let turns = [];
  if (artistMeta.artist_interview_session_id) {
    turns = await sql`
      SELECT *
      FROM creapd.artist_interview_turns
      WHERE session_id=${artistMeta.artist_interview_session_id}
        AND owner_user_id=${ownerId}
      ORDER BY sequence ASC, created_at ASC
    `;
  } else {
    const [latestSession] = await sql`
      SELECT *
      FROM creapd.artist_interview_sessions
      WHERE profile_id=${artistMeta.artist_profile_id}
        AND owner_user_id=${ownerId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (latestSession) {
      turns = await sql`
        SELECT *
        FROM creapd.artist_interview_turns
        WHERE session_id=${latestSession.id} AND owner_user_id=${ownerId}
        ORDER BY sequence ASC, created_at ASC
      `;
    }
  }

  const rows = [];
  let index = 0;

  if (profile?.bio_summary || profile?.artistic_message) {
    const [row] = await sql`
      INSERT INTO creapd.music_research_items (
        id, configuration_id, owner_user_id, title, source, category, summary,
        url, suggested_angle, research_date, relevance
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${ownerId}, 'Artist Profile',
        'Artist-supplied profile', 'artist_profile',
        ${[
          profile?.bio_summary ? `Background: ${profile.bio_summary}` : '',
          profile?.artistic_message ? `Artist message: ${profile.artistic_message}` : '',
        ].filter(Boolean).join('\n')},
        null, 'Use as artist-approved background; do not invent beyond the supplied statements.',
        ${new Date().toISOString().slice(0,10)}, 'high'
      )
      RETURNING *
    `;
    rows.push(row);
    index += 1;
  }

  for (const turn of turns.slice(0, 30)) {
    if (!text(turn.answer_text)) continue;
    const [row] = await sql`
      INSERT INTO creapd.music_research_items (
        id, configuration_id, owner_user_id, title, source, category, summary,
        url, suggested_angle, research_date, relevance
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${ownerId},
        ${`Artist Interview ${index + 1}: ${text(turn.question).slice(0, 120)}`},
        'Recorded CREAPr Artist Interview', 'artist_interview',
        ${text(turn.answer_text)}, ${turn.audio_url || null},
        ${`Use this as first-person artist testimony responding to: ${text(turn.question)}`},
        ${new Date(turn.created_at || Date.now()).toISOString().slice(0,10)}, 'high'
      )
      RETURNING *
    `;
    rows.push(row);
    index += 1;
  }

  for (const track of catalog.slice(0, 30)) {
    const supplied = [track.description, track.lyrics ? `Lyrics excerpt: ${String(track.lyrics).slice(0, 1800)}` : '']
      .filter(Boolean)
      .join('\n');
    if (!supplied) continue;
    const [row] = await sql`
      INSERT INTO creapd.music_research_items (
        id, configuration_id, owner_user_id, title, source, category, summary,
        url, suggested_angle, research_date, relevance
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${ownerId},
        ${`Catalogue Note: ${track.title}`}, 'Artist-supplied catalogue',
        'artist_catalog', ${supplied}, ${track.source_url || track.audio_url || null},
        'Use only as supplied catalogue evidence. Treat interpretation as a question unless the artist explicitly explained the meaning.',
        ${new Date().toISOString().slice(0,10)}, 'high'
      )
      RETURNING *
    `;
    rows.push(row);
  }

  return rows;
}

async function buildPlaylist({ sql, ownerUserId, config, targetCount }) {
  const year = new Date().getUTCFullYear();
  const genres = array(config.genres, []);
  const moods = array(config.moods, []);
  const editorialTopics = array(config.music_topics, []);
  const candidateCount = Math.min(24, Math.max(targetCount + 8, 14));
  const targetMusicSeconds = Math.max(15, num(config.required_music_runtime, 45)) * 60;

  const prompt = `You are the playlist director for CREAPD Music Studio. Build a pool of REAL, commercially released songs for a playable show. CREAPD will independently verify every song against YouTube before it can enter the rundown.

SHOW
Name: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Editorial focus: ${editorialTopics.join(', ') || 'Music and artist conversation'}
Host: ${config.host_name || 'Host'}
Format: ${config.production_format || 'radio'}
Genres: ${genres.join(', ') || 'Top 40'}
Moods: ${moods.join(', ') || 'Feel Good'}
Tone: ${config.show_tone || 'Professional'}
Music runtime target: ${num(config.required_music_runtime, 45)} minutes
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

Return exactly ${candidateCount} candidates so CREAPD has enough verified options to fill the runtime. Prefer releases from ${year - 2}-${year} unless the user requested older eras or throwbacks. NEVER invent a song title, artist, collaboration, remix, or release. The title and artist must correspond to a real recording someone can search for on YouTube. Include a realistic song length in seconds. The show description and editorial focus are instructions, not decoration: song choices must fit them unless a must-play rule overrides them.`;

  const result = await structured(prompt, PLAYLIST_SCHEMA, 'creapd_music_playlist_v2', 6500);
  const candidates = array(result?.data?.playlist, []).slice(0, candidateCount);
  if (candidates.length < Math.min(8, candidateCount)) {
    throw new Error(`Playlist generation returned only ${candidates.length} candidates`);
  }

  const resolved = await Promise.all(candidates.map(async song => ({
    song,
    metadata: await searchYoutubeVideo(
      text(song.song_title),
      text(song.artist),
      new Set(),
      num(song.length_seconds, 180),
    ),
  })));

  const selected = [];
  const usedIds = new Set();
  let selectedRuntime = 0;

  for (const { song, metadata } of resolved) {
    if (!metadata || usedIds.has(metadata.video_id)) continue;
    usedIds.add(metadata.video_id);
    const actualDuration = num(metadata.duration_seconds, 0);
    if (actualDuration < 75) continue;
    selected.push({ song, metadata, actualDuration });
    selectedRuntime += actualDuration;

    if (
      selected.length >= 6 &&
      selectedRuntime >= targetMusicSeconds * 0.95
    ) break;

    if (selected.length >= 15) break;
  }

  if (selected.length < Math.min(6, targetCount)) {
    throw new Error(`Only ${selected.length} playlist songs could be verified against full-length YouTube matches`);
  }

  const rows = [];
  for (let index = 0; index < selected.length; index += 1) {
    const { song, metadata, actualDuration } = selected[index];
    const [row] = await sql`
      INSERT INTO creapd.music_playlist_items (
        id, configuration_id, owner_user_id, order_index, song_title, artist,
        length_seconds, genre, mood, era_year, reason_selected, status, source,
        youtube_video_id, thumbnail_url, channel_name, source_payload
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${index},
        ${text(song.song_title, metadata.title || 'Unknown')}, ${text(song.artist, metadata.channel_name || 'Unknown')},
        ${actualDuration}, ${text(song.genre) || null}, ${text(song.mood) || null},
        ${text(song.era_year) || null}, ${text(song.reason_selected) || null},
        'suggested', 'youtube_radio_verified',
        ${metadata.video_id}, ${metadata.thumbnail_url}, ${metadata.channel_name},
        ${safeJson({
          youtube_title: metadata.title,
          youtube_duration_seconds: metadata.duration_seconds,
          youtube_source_type: classifyRadioSafeYoutubeSource(metadata),
          requested_title: text(song.song_title),
          requested_artist: text(song.artist),
        })}::jsonb
      ) RETURNING *
    `;
    rows.push(row);
  }

  return rows;
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
Description / premise: ${config.show_description || 'Not supplied'}
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
Description / premise: ${config.show_description || 'Not supplied'}
Tone: ${config.show_tone}
Genres: ${array(config.genres, []).join(', ') || 'General music'}
Requested topic categories: ${requested.join(', ') || 'Artist news, releases, culture, charts'}

The show's description/premise is the primary editorial instruction. Every topic should clearly serve that premise instead of drifting into generic music chatter.

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
  const producerOverrides = producerInstructionBlock(config, ['station_id', 'song_copy']);
  const prompt = `You are the production-assets writer for CREAPD Music Studio. Generate practical on-air material for this show.

SHOW: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Editorial focus: ${array(config.music_topics, []).join(', ') || 'Music and artist conversation'}
Host: ${config.host_name || 'Host'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}
${producerOverrides}
PLAYLIST:
${playlistText}

TOPICS:
${topicsText || 'None'}

VERIFIED / ARTIST-SUPPLIED RESEARCH:
${researchText || 'None'}

Create a useful mix of these asset types: song_intro, song_outro, artist_fact, host_banter, music_trivia, station_id, sponsor_read, social_caption, hashtag, video_prompt, production_notes.

SOURCE RULES:
- song_intro and song_outro MUST name an exact playlist song in associated_song_title. Build the copy from that exact song title + artist and only use factual artist/current-event claims when supported by the supplied verified research. Never invent chart positions, release facts, awards, quotes, or biography details.
- host_banter comes from the show's description/premise, editorial focus, tone, and playlist context.
- station_id comes only from the configured station/show/host identity.
- Every station_id asset MUST say the exact configured host name "${config.host_name || 'Host'}".
${radioProductionTools(config).quality.require_station_name && config.station_name ? `- Every station_id asset must also say the exact station name "${config.station_name}".` : ''}
- Never substitute "your host", "with your host", "our host", or "the host" for the configured host name.
- sponsor_read is placeholder copy unless sponsor information is explicitly present in the show instructions.
- topic/current-event/artist-story copy must stay grounded in TOPICS and VERIFIED / ARTIST-SUPPLIED RESEARCH.

Aim for 12-20 concise assets total.`;
  const result = await structured(prompt, ASSETS_SCHEMA, 'creapd_music_assets_v1', 7000);
  const rawAssets = array(result?.data?.assets, []).slice(0, 24);
  const rows = [];
  const usedStationAssetCopy = [];
  for (const asset of rawAssets) {
    const type = text(asset.asset_type, 'host_banter');
    if (!VALID_ASSET_TYPES.has(type)) continue;
    let assetContent = text(asset.content);
    if (type === 'station_id') {
      if (!stationIdIsValid(assetContent, config, '', usedStationAssetCopy)) {
        assetContent = await generateStationIdReplacement({
          config,
          previousScript: assetContent,
          avoidScripts: usedStationAssetCopy,
        });
      }
      usedStationAssetCopy.push(assetContent);
    }
    const [row] = await sql`
      INSERT INTO creapd.music_assets (
        id, configuration_id, owner_user_id, asset_type, title, content,
        associated_song_title, associated_topic, status
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${type},
        ${text(asset.title, type.replaceAll('_', ' '))}, ${assetContent},
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
Description / premise: ${config.show_description || 'Not supplied'}
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
  const candidates = array(result?.data?.items, []).slice(0, Math.max(remaining * 3, 18));
  const usedIds = new Set([...locked.map(i => i.youtube_video_id), ...playlist.map(i => i.youtube_video_id)].filter(Boolean));
  const rows = [...locked];

  // Resolve YouTube candidates concurrently so a 10-item countdown does not
  // turn into a long chain of network waits inside one serverless invocation.
  const resolved = await Promise.all(candidates.map(async candidate => ({
    candidate,
    metadata: await searchYoutubeVideo(candidate.song_title, candidate.artist, usedIds, 0, { requireRadioSafe: false }),
  })));

  for (const { candidate, metadata } of resolved) {
    if (rows.length >= 10) break;
    if (!metadata || usedIds.has(metadata.video_id)) continue;
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

function rundownScriptSource(item, config) {
  switch (item.segment_type) {
    case 'intro':
      return 'Discovery Room show identity: title, premise, host/co-host, station, tone, and editorial focus.';
    case 'outro':
      return 'Discovery Room show identity plus the completed show/rundown context.';
    case 'topic_segment':
      return 'Selected topic + generated topic material/research: ' + (item.associated_topic || item.title) + '.';
    case 'talk_break':
      return 'Discovery Room show premise/editorial focus + surrounding playlist context. No unsupported current facts.';
    case 'sponsor_break':
      return 'Commercial/sponsor runtime settings. Placeholder sponsor copy unless sponsor information was explicitly supplied.';
    case 'station_id':
      return 'Configured station/show identity: ' + (config.station_name || 'station name not supplied') + ', ' + config.production_name + ', ' + (config.host_name || 'host') + '.';
    case 'song':
      return 'Playlist audio track: ' + (item.associated_song_title || item.title) + '. The song itself has no rundown script; host intro/outro copy comes from song-specific Production assets.';
    default:
      return 'Show configuration + relevant approved production material.';
  }
}

async function buildRundown({ sql, ownerUserId, config, playlist, topics, research = [], assets = [] }) {
  const blueprint = buildRundownBlueprint(playlist, topics, config);
  const blueprintText = blueprint.map((item, index) => {
    if (item.segment_type === 'song') {
      return `${index + 1}. [song] ${item.title} | song=${item.associated_song_title || item.title} | full track=${Math.round(item.target_duration)}s`;
    }
    const words = spokenWordRange(item.target_duration, item.segment_type, config);
    return `${index + 1}. [${item.segment_type}] ${item.title}${item.associated_topic ? ` | topic=${item.associated_topic}` : ''} | target=${Math.round(item.target_duration)}s | REQUIRED WORDS=${words.min}-${words.max} (aim ${words.target}) | SCRIPT SOURCE=${rundownScriptSource(item, config)}`;
  }).join('\n');

  const topicText = topics.map(t => `${t.topic_name}: ${t.generated_summary}\nTalking points: ${t.talking_points || ''}\nSources: ${t.sources || 'evergreen/no external source'}`).join('\n\n');
  const researchText = research.slice(0, 12).map((r, i) => `${i + 1}. ${r.title} — ${r.source || 'source'}: ${r.summary}`).join('\n');
  const assetText = assets
    .filter(a => ['song_intro','song_outro','host_banter','station_id','sponsor_read','artist_fact','music_trivia'].includes(a.asset_type))
    .slice(0, 40)
    .map((a, i) => `${i + 1}. [${a.asset_type}] ${a.title || ''}${a.associated_song_title ? ` | song=${a.associated_song_title}` : ''}${a.associated_topic ? ` | topic=${a.associated_topic}` : ''}: ${a.content || ''}`)
    .join('\n');
  const editorialFocus = array(config.music_topics, []).join(', ') || 'Music and artist conversation';
  const producerOverrides = producerInstructionBlock(config, ['intro', 'station_id', 'topic_segment', 'talk_break', 'outro']);

  const prompt = `You are the rundown/script writer for CREAPD Music Studio. The rundown structure below is LOCKED. Return exactly the same number of items in exactly the same order. Do not add, remove, merge, split, or reorder segments.

SHOW INSTRUCTIONS
Name: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Editorial focus chosen by the user: ${editorialFocus}
Host: ${config.host_name || 'Host'}
Co-host: ${config.co_host_name || 'None'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}
${producerOverrides}
The description/premise and editorial focus are PRIMARY instructions. The host script must sound like THIS show, not a generic music show.

LOCKED BLUEPRINT:
${blueprintText}

TOPIC MATERIAL:
${topicText || 'No generated topics'}

VERIFIED RESEARCH MATERIAL:
${researchText || 'No verified current research supplied.'}

PRE-GENERATED PRODUCTION ASSETS:
${assetText || 'No production assets supplied.'}

SCRIPT SOURCE MAP:
- intro: Discovery Room show identity and premise only.
- topic_segment: matching TOPIC MATERIAL and its cited/verified research.
- talk_break: show premise/editorial focus plus surrounding playlist context; do not invent current facts.
- sponsor_break: sponsor/commercial settings; use placeholder copy unless sponsor information was explicitly supplied.
- station_id: configured station name, show title, and host identity only.
- outro: show identity plus a recap/close of the actual rundown.
- song: AUDIO ONLY. script_content must be empty. Song intro/outro host copy lives in PRE-GENERATED PRODUCTION ASSETS.

SCRIPT RULES:
- For every spoken segment, obey its REQUIRED WORDS range. This is a runtime requirement, not a suggestion.
- Do NOT shorten long segments for concision. A 10-minute segment needs roughly 1,400-1,500 spoken words.
- Topic segments: develop the supplied material into a natural radio conversation that stays on the show's premise. Use transitions, examples, framing, recaps, and host personality to fill the required runtime without inventing unsupported current facts.
- Talk breaks: natural host commentary tied to the show's premise/editorial focus.
- Sponsor breaks: generic placeholder ad-read unless show data names a sponsor; fill the required runtime with a realistic break structure.
- Station IDs may be brief but must still fit their listed word range.
- EVERY station_id MUST say the exact configured host name "${config.host_name || 'Host'}".
- NEVER write "your host", "with your host", "our host", or "the host" as a substitute for the configured host name.
${radioProductionTools(config).quality.require_station_name && config.station_name ? `- EVERY station_id must also say the exact station name "${config.station_name}".` : ''}
- If the rundown contains multiple Station IDs, vary the opening, sentence structure, and closing so they do not sound like copies of one another.
- Intro/outro: establish and close the specific show premise, not generic filler.
- Song segments: script_content MUST be empty. The full song audio supplies the runtime; use song_intro/song_outro Production assets for host copy around songs.
- Never change a song title or artist from the playlist.
Return rundown array matching the blueprint exactly.`;

  const result = await structured(prompt, RUNDOWN_SCHEMA, 'creapd_music_rundown_v2', 12000);
  const scripts = array(result?.data?.rundown, []);

  const underfilled = [];
  for (let index = 0; index < blueprint.length; index += 1) {
    const bp = blueprint[index];
    if (bp.segment_type === 'song') continue;
    const script = text(scripts[index]?.script_content);
    const words = spokenWordRange(bp.target_duration, bp.segment_type, config);
    if (countWords(script) < Math.round(words.min * 0.9)) {
      underfilled.push({
        order: index + 1,
        index,
        segment_type: bp.segment_type,
        title: bp.title,
        topic: bp.associated_topic || '',
        current_script: script,
        min_words: words.min,
        max_words: words.max,
        target_words: words.target,
      });
    }
  }

  if (underfilled.length) {
    const repairPrompt = `You are repairing under-length CREAPD Music Studio scripts. Rewrite ONLY the listed segments so their spoken copy fills the configured runtime.

SHOW
Name: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Editorial focus: ${editorialFocus}
Tone: ${config.show_tone || 'Professional'}
${producerOverrides}
TOPIC MATERIAL:
${topicText || 'No generated topics'}

UNDER-LENGTH SEGMENTS:
${underfilled.map(item => `${item.order}. [${item.segment_type}] ${item.title}${item.topic ? ` | topic=${item.topic}` : ''} | REQUIRED ${item.min_words}-${item.max_words} words, aim ${item.target_words}\nCurrent draft: ${item.current_script || '(empty)'}`).join('\n\n')}

Return one repair per listed order. Each repaired script MUST fall inside its required word range. Preserve the show's actual premise and supplied topic facts. Do not pad with meaningless repetition and do not invent current facts.`;

    const repairResult = await structured(repairPrompt, SCRIPT_REPAIR_SCHEMA, 'creapd_music_rundown_repair_v1', 12000);
    const repairs = array(repairResult?.data?.repairs, []);
    for (const repair of repairs) {
      const order = Math.round(num(repair.order, 0));
      const target = underfilled.find(item => item.order === order);
      if (!target) continue;
      if (!scripts[target.index]) scripts[target.index] = {};
      scripts[target.index].script_content = text(repair.script_content, scripts[target.index].script_content || '');
    }
  }

  const acceptedStationIds = [];
  for (let index = 0; index < blueprint.length; index += 1) {
    const bp = blueprint[index];
    if (bp.segment_type !== 'station_id') continue;

    const current = text(scripts[index]?.script_content);
    if (!stationIdIsValid(current, config, '', acceptedStationIds)) {
      const replacement = await generateStationIdReplacement({
        config,
        previousScript: current,
        avoidScripts: acceptedStationIds,
      });
      if (!scripts[index]) scripts[index] = {};
      scripts[index].script_content = replacement;
    }
    acceptedStationIds.push(text(scripts[index]?.script_content));
  }

  let cursor = parseTimeToSeconds(config.show_start_time || '06:00');
  const rows = [];
  for (let index = 0; index < blueprint.length; index += 1) {
    const bp = blueprint[index];
    const generated = scripts[index] || {};
    const script = bp.segment_type === 'song' ? '' : text(generated.script_content);
    const scriptSource = rundownScriptSource(bp, config);
    const generatedNote = text(generated.notes);
    const sourceNote = 'Script source: ' + scriptSource + (generatedNote ? ' | ' + generatedNote : '');
    const duration = Math.max(10, num(bp.target_duration, 60));
    const start = formatSecondsToTime(cursor);
    cursor += duration;
    const end = formatSecondsToTime(cursor);
    const matchingSong = bp.associated_song_title
      ? playlist.find(s => text(s.song_title).toLowerCase() === text(bp.associated_song_title).toLowerCase())
      : null;

    const [row] = await sql`
      INSERT INTO creapd.music_rundown_items (
        id, configuration_id, owner_user_id, order_index, segment_type, title,
        script_content, start_time, duration_seconds, end_time, notes, status,
        associated_song_id, associated_song_title, associated_topic
      ) VALUES (
        ${randomUUID()}, ${config.id}, ${String(ownerUserId)}, ${index}, ${bp.segment_type},
        ${bp.title}, ${script || null}, ${start}, ${duration}, ${end}, ${sourceNote},
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

    const artistMeta = artistShowMetadata(config);
    const total = Math.max(30, Math.min(180, num(config.total_show_runtime, 90)));
    const musicMinutes = Math.max(15, Math.round(num(config.required_music_runtime, total * 0.5)));
    const targetCount = Math.max(8, Math.min(15, Math.ceil(musicMinutes / 3.5)));
    const plan = {
      production_format: config.production_format || 'radio',
      show_mode: artistMeta.enabled ? 'artist' : 'standard',
      artist_profile_id: artistMeta.artist_profile_id || null,
      total_show_runtime: total,
      required_music_runtime: musicMinutes,
      estimated_song_count: targetCount,
      automation_preferences: automationPreferences(config.ai_automation),
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

    const automation = automationPreferences(config.ai_automation);
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
        playlist = artistMeta.enabled
          ? await buildArtistPlaylist({ sql, ownerUserId, config })
          : await buildPlaylist({ sql, ownerUserId, config, targetCount });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'playlist', 'complete', { count: playlist.length, youtube_resolved: playlist.filter(x => x.youtube_video_id).length });
      }
    }

    if (runStage('research')) {
      if (!section && !automation.includes('Auto Research')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'research', 'skipped', { count: research.length });
      } else {
        await sql`DELETE FROM creapd.music_research_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        research = artistMeta.enabled
          ? await buildArtistResearch({ sql, ownerUserId, config })
          : await buildResearch({ sql, ownerUserId, config });
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
      top10 = await generateMusicTop10({ sql, ownerUserId, configurationId: config.id, preserveLocked: true });
      await appendStage(sql, ownerUserId, config.id, buildLog, 'top10', top10.length ? 'complete' : 'failed', { count: top10.length });
    }

    if (runStage('rundown')) {
      if (!section && !automation.includes('Auto Assemble Packet')) {
        await appendStage(sql, ownerUserId, config.id, buildLog, 'rundown', 'skipped', { count: rundown.length });
      } else {
        if (!playlist.length) throw new Error('Cannot build rundown without a playlist');
        await sql`DELETE FROM creapd.music_rundown_items WHERE configuration_id=${config.id} AND owner_user_id=${String(ownerUserId)}`;
        rundown = await buildRundown({ sql, ownerUserId, config, playlist, topics, research, assets });
        await appendStage(sql, ownerUserId, config.id, buildLog, 'rundown', rundown.length ? 'complete' : 'failed', { count: rundown.length });
      }
    }

    await sql`
      UPDATE creapd.music_production_configurations
      SET status='in_review', build_log=${safeJson(buildLog)}::jsonb,
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


async function retimeMusicRundown(sql, ownerUserId, configurationId, showStartTime = '06:00') {
  const ownerId = String(ownerUserId);
  const rows = await sql`
    SELECT * FROM creapd.music_rundown_items
    WHERE configuration_id=${configurationId} AND owner_user_id=${ownerId}
    ORDER BY order_index ASC, created_at ASC
  `;

  let cursor = parseTimeToSeconds(showStartTime || '06:00');
  for (const row of rows) {
    const duration = Math.max(0, num(row.duration_seconds, 0));
    const start = formatSecondsToTime(cursor);
    cursor += duration;
    const end = formatSecondsToTime(cursor);
    await sql`
      UPDATE creapd.music_rundown_items
      SET start_time=${start}, end_time=${end}, updated_at=now()
      WHERE id=${row.id} AND owner_user_id=${ownerId}
    `;
  }
}

async function regenerateRejectedTracks({ sql, ownerUserId, config, playlist, research }) {
  const ownerId = String(ownerUserId);
  const rejected = playlist.filter(item => text(item.status).toLowerCase() === 'rejected');
  if (!rejected.length) return { replaced: 0, unresolved: [] };

  const active = playlist.filter(item => text(item.status).toLowerCase() !== 'rejected');
  const exclusions = [...active, ...rejected]
    .map(item => `${item.song_title} — ${item.artist}`)
    .filter(Boolean);

  const candidateCount = Math.min(24, Math.max(8, rejected.length * 5));
  const year = new Date().getUTCFullYear();
  const prompt = `You are replacing REJECTED playlist tracks for a CREAPD radio show. Return ${candidateCount} REAL commercially released replacement candidates.

SHOW: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Genres: ${array(config.genres, []).join(', ') || 'Top 40'}
Moods: ${array(config.moods, []).join(', ') || 'Feel Good'}
Tone: ${config.show_tone || 'Professional'}
Preferred eras: ${config.preferred_eras || 'Current'}
Energy flow: ${config.playlist_energy_flow || 'Build Energy Gradually'}
Clean only: ${config.clean_only === true}
Explicit allowed: ${config.explicit_allowed === true}

THESE TRACKS WERE REJECTED:
${rejected.map((item, i) => `${i + 1}. ${item.song_title} — ${item.artist}`).join('\n')}

DO NOT RETURN ANY EXISTING OR REJECTED TRACK:
${exclusions.join('\n') || 'None'}

Return real song_title + artist pairs only. Do not invent titles, artists, collaborations, or remixes. Prefer releases from ${year - 2}-${year} unless the configured eras/throwback rules call for older music. Each replacement must fit the show and playlist tone. Include a realistic length_seconds, genre, mood, era_year, and a short reason_selected.`;

  const result = await structured(prompt, PLAYLIST_SCHEMA, 'creapd_music_rejected_playlist_v1', 5000);
  const candidates = array(result?.data?.playlist, []).slice(0, candidateCount);
  const usedIds = new Set(active.map(item => item.youtube_video_id).filter(Boolean));
  const usedTitles = new Set(
    [...active, ...rejected].map(item => `${text(item.song_title).toLowerCase()}::${text(item.artist).toLowerCase()}`)
  );

  const resolved = await Promise.all(candidates.map(async song => {
    const key = `${text(song.song_title).toLowerCase()}::${text(song.artist).toLowerCase()}`;
    if (usedTitles.has(key)) return { song, metadata: null };
    return {
      song,
      metadata: await searchYoutubeVideo(
        text(song.song_title),
        text(song.artist),
        usedIds,
        num(song.length_seconds, 180),
      ),
    };
  }));

  const replacements = [];
  for (const entry of resolved) {
    const duration = num(entry.metadata?.duration_seconds, 0);
    const key = `${text(entry.song?.song_title).toLowerCase()}::${text(entry.song?.artist).toLowerCase()}`;
    if (!entry.metadata || duration < 75 || usedIds.has(entry.metadata.video_id) || usedTitles.has(key)) continue;
    usedIds.add(entry.metadata.video_id);
    usedTitles.add(key);
    replacements.push({ ...entry, duration });
    if (replacements.length >= rejected.length) break;
  }

  const changed = [];
  const unresolved = [];
  for (let index = 0; index < rejected.length; index += 1) {
    const old = rejected[index];
    const replacement = replacements[index];
    if (!replacement) {
      unresolved.push({ id: old.id, song_title: old.song_title, artist: old.artist });
      continue;
    }

    const { song, metadata, duration } = replacement;
    const oldTitle = old.song_title;
    const sourcePayload = {
      youtube_title: metadata.title,
      youtube_duration_seconds: duration,
      youtube_source_type: classifyRadioSafeYoutubeSource(metadata),
      requested_title: text(song.song_title),
      requested_artist: text(song.artist),
      regenerated_from_rejected_track: {
        song_title: old.song_title,
        artist: old.artist,
      },
      regenerated_at: new Date().toISOString(),
    };

    const [updated] = await sql`
      UPDATE creapd.music_playlist_items
      SET
        song_title=${text(song.song_title, metadata.title || old.song_title)},
        artist=${text(song.artist, metadata.channel_name || old.artist)},
        length_seconds=${duration},
        genre=${text(song.genre) || old.genre || null},
        mood=${text(song.mood) || old.mood || null},
        era_year=${text(song.era_year) || old.era_year || null},
        reason_selected=${text(song.reason_selected) || 'Replacement for rejected track'},
        status='suggested',
        note=${'Regenerated replacement for rejected track: ' + old.song_title + ' — ' + old.artist},
        source='youtube_radio_verified',
        youtube_video_id=${metadata.video_id},
        thumbnail_url=${metadata.thumbnail_url},
        channel_name=${metadata.channel_name},
        source_payload=${safeJson(sourcePayload)}::jsonb,
        updated_at=now()
      WHERE id=${old.id} AND owner_user_id=${ownerId}
      RETURNING *
    `;

    if (!updated) continue;
    changed.push(updated);

    await sql`
      UPDATE creapd.music_rundown_items
      SET
        title=${updated.song_title},
        associated_song_title=${updated.song_title},
        duration_seconds=${duration},
        status=CASE WHEN status='rejected' THEN 'ready' ELSE status END,
        updated_at=now()
      WHERE configuration_id=${config.id}
        AND owner_user_id=${ownerId}
        AND associated_song_id=${old.id}
    `;

    await sql`
      DELETE FROM creapd.music_assets
      WHERE configuration_id=${config.id}
        AND owner_user_id=${ownerId}
        AND lower(COALESCE(associated_song_title, ''))=lower(${oldTitle})
        AND asset_type IN ('song_intro','song_outro','artist_fact')
    `;
  }

  if (changed.length) {
    const researchText = research.slice(0, 8)
      .map((item, i) => `${i + 1}. ${item.title} — ${item.source || 'source'}: ${item.summary}`)
      .join('\n');

    const trackText = changed
      .map((item, i) => `${i + 1}. ${item.song_title} — ${item.artist}`)
      .join('\n');
    const songCopyOverride = producerInstructionBlock(config, ['song_copy']);

    const assetPrompt = `You are writing replacement on-air song assets for a CREAPD radio show.

SHOW: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Host: ${config.host_name || 'Host'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}
${songCopyOverride}
REPLACEMENT TRACKS:
${trackText}

VERIFIED RESEARCH:
${researchText || 'None supplied. Keep factual artist/current-event claims evergreen.'}

For EACH replacement track, generate exactly:
1) one song_intro
2) one song_outro

Every asset MUST put the exact playlist song title in associated_song_title. The intro should naturally set up the track. The outro should recap/transition out of that exact track. Do not invent chart positions, awards, quotes, release facts, or biography details not supported above.`;

    const assetResult = await structured(assetPrompt, ASSETS_SCHEMA, 'creapd_music_rejected_track_assets_v1', 4500);
    const newAssets = array(assetResult?.data?.assets, []);

    for (const item of changed) {
      const titleKey = text(item.song_title).toLowerCase();
      for (const assetType of ['song_intro', 'song_outro']) {
        const generated = newAssets.find(asset =>
          text(asset.asset_type).toLowerCase() === assetType &&
          text(asset.associated_song_title).toLowerCase() === titleKey
        );
        if (!generated?.content) continue;

        await sql`
          INSERT INTO creapd.music_assets (
            id, configuration_id, owner_user_id, asset_type, title, content,
            associated_song_title, associated_topic, status
          ) VALUES (
            ${randomUUID()}, ${config.id}, ${ownerId}, ${assetType},
            ${text(generated.title, assetType.replaceAll('_', ' '))},
            ${text(generated.content)}, ${item.song_title}, null, 'ready'
          )
        `;
      }
    }
  }

  if (changed.length) {
    await retimeMusicRundown(sql, ownerUserId, config.id, config.show_start_time || '06:00');
  }

  return { replaced: changed.length, unresolved };
}

async function regenerateRejectedSegments({ sql, ownerUserId, config, rundown, topics, research }) {
  const ownerId = String(ownerUserId);
  const rejected = rundown.filter(item =>
    text(item.status).toLowerCase() === 'rejected' &&
    text(item.segment_type).toLowerCase() !== 'song'
  );
  if (!rejected.length) return { replaced: 0, unresolved: [] };

  const topicText = topics.map(t =>
    `${t.topic_name}: ${t.generated_summary}\nTalking points: ${t.talking_points || ''}\nSources: ${t.sources || 'evergreen/no external source'}`
  ).join('\n\n');
  const researchText = research.slice(0, 12)
    .map((r, i) => `${i + 1}. ${r.title} — ${r.source || 'source'}: ${r.summary}`)
    .join('\n');

  const rejectedRuleKeys = [...new Set(rejected.map(item => {
    if (item.segment_type === 'intro') return 'intro';
    if (item.segment_type === 'station_id') return 'station_id';
    if (item.segment_type === 'topic_segment') return 'topic_segment';
    if (item.segment_type === 'talk_break') return 'talk_break';
    if (item.segment_type === 'outro') return 'outro';
    return null;
  }).filter(Boolean))];
  const producerOverrides = producerInstructionBlock(config, rejectedRuleKeys);

  const targets = rejected.map(item => {
    const words = spokenWordRange(item.duration_seconds, item.segment_type, config);
    return {
      order: Number(item.order_index || 0) + 1,
      item,
      words,
      source: rundownScriptSource(item, config),
    };
  });

  const prompt = `You are replacing REJECTED spoken segments for a CREAPD radio show. Generate fresh replacement copy ONLY for the listed segments.

SHOW
Name: ${config.production_name}
Description / premise: ${config.show_description || 'Not supplied'}
Editorial focus: ${array(config.music_topics, []).join(', ') || 'Music and artist conversation'}
Host: ${config.host_name || 'Host'}
Co-host: ${config.co_host_name || 'None'}
Station: ${config.station_name || 'the station'}
Tone: ${config.show_tone || 'Professional'}
${producerOverrides}
TOPIC MATERIAL:
${topicText || 'No topic material'}

VERIFIED RESEARCH:
${researchText || 'No current research supplied'}

REJECTED SEGMENTS TO REPLACE:
${targets.map(target =>
  `${target.order}. [${target.item.segment_type}] ${target.item.title || ''}${target.item.associated_topic ? ` | topic=${target.item.associated_topic}` : ''} | SOURCE=${target.source} | REQUIRED ${target.words.min}-${target.words.max} words, aim ${target.words.target}\nREJECTED COPY TO REPLACE: ${target.item.script_content || '(empty)'}`
).join('\n\n')}

STATION ID REGENERATION RULES:
- Every station_id MUST say the exact configured host name "${config.host_name || 'Host'}".
${radioProductionTools(config).quality.require_station_name && config.station_name ? `- It MUST also say the exact station name "${config.station_name}".` : ''}
- NEVER use "your host", "with your host", "our host", or "the host" instead of the actual configured host name.
- A regenerated Station ID must be materially different from its rejected copy: use a different opening, sentence structure, and closing.
- Do not invent slogans, frequencies, call letters, cities, or station facts that were not configured.

Return one fresh repair for every listed order. Do not reuse the rejected wording. Stay inside each required word range. Current factual claims must be supported by VERIFIED RESEARCH; otherwise keep the copy evergreen.`;

  const result = await structured(prompt, SCRIPT_REPAIR_SCHEMA, 'creapd_music_rejected_segments_v1', 12000);
  const repairs = array(result?.data?.repairs, []);
  const changed = [];
  const unresolved = [];

  for (const target of targets) {
    const repair = repairs.find(item => Math.round(num(item.order, 0)) === target.order);
    let script = text(repair?.script_content);

    if (target.item.segment_type === 'station_id') {
      if (!stationIdIsValid(script, config, target.item.script_content || '')) {
        script = await generateStationIdReplacement({
          config,
          previousScript: target.item.script_content || '',
          avoidScripts: rundown
            .filter(item => item.id !== target.item.id && item.segment_type === 'station_id')
            .map(item => item.script_content)
            .filter(Boolean),
        });
      }
    }

    if (!script) {
      unresolved.push({ id: target.item.id, title: target.item.title, segment_type: target.item.segment_type });
      continue;
    }

    const sourceNote = 'Script source: ' + target.source + ' | Regenerated after rejection';
    const [updated] = await sql`
      UPDATE creapd.music_rundown_items
      SET
        script_content=${script},
        notes=${sourceNote},
        status='suggested',
        updated_at=now()
      WHERE id=${target.item.id} AND owner_user_id=${ownerId}
      RETURNING *
    `;
    if (updated) changed.push(updated);
  }

  return { replaced: changed.length, unresolved };
}

export async function regenerateRejectedMusicMaterials({ sql, ownerUserId, configurationId, kind = 'all' }) {
  const config = await requireConfig(sql, ownerUserId, configurationId);
  const ownerId = String(ownerUserId);

  await sql`
    UPDATE creapd.music_production_configurations
    SET status='in_review', updated_at=now()
    WHERE id=${config.id} AND owner_user_id=${ownerId}
  `;
  const normalizedKind = ['all', 'tracks', 'segments'].includes(text(kind).toLowerCase())
    ? text(kind).toLowerCase()
    : 'all';

  const [playlist, rundown, topics, research] = await Promise.all([
    sql`SELECT * FROM creapd.music_playlist_items WHERE configuration_id=${config.id} AND owner_user_id=${ownerId} ORDER BY order_index ASC`,
    sql`SELECT * FROM creapd.music_rundown_items WHERE configuration_id=${config.id} AND owner_user_id=${ownerId} ORDER BY order_index ASC`,
    sql`SELECT * FROM creapd.music_topics WHERE configuration_id=${config.id} AND owner_user_id=${ownerId} ORDER BY display_order ASC`,
    sql`SELECT * FROM creapd.music_research_items WHERE configuration_id=${config.id} AND owner_user_id=${ownerId} ORDER BY created_at ASC`,
  ]);

  const result = {
    tracks: { replaced: 0, unresolved: [] },
    segments: { replaced: 0, unresolved: [] },
  };

  if (normalizedKind === 'all' || normalizedKind === 'tracks') {
    result.tracks = await regenerateRejectedTracks({
      sql,
      ownerUserId,
      config,
      playlist,
      research,
    });
  }

  const freshRundown = (normalizedKind === 'all' && result.tracks.replaced)
    ? await sql`SELECT * FROM creapd.music_rundown_items WHERE configuration_id=${config.id} AND owner_user_id=${ownerId} ORDER BY order_index ASC`
    : rundown;

  if (normalizedKind === 'all' || normalizedKind === 'segments') {
    result.segments = await regenerateRejectedSegments({
      sql,
      ownerUserId,
      config,
      rundown: freshRundown,
      topics,
      research,
    });
  }

  return {
    success: true,
    configuration_id: config.id,
    kind: normalizedKind,
    ...result,
  };
}

export async function generateArtistInterviewQuestion({
  profile,
  catalog = [],
  turns = [],
}) {
  const artistName = text(profile?.public_name || profile?.artist_name, 'the artist');
  const answeredTurns = Array.isArray(turns) ? turns.filter(turn => text(turn?.answer_text)) : [];

  if (!answeredTurns.length) {
    return {
      question: `What made ${artistName} want to get into music?`,
      reason: 'Open the interview with the artist’s origin story.',
      source_refs: ['artist_profile'],
      mode: 'origin',
    };
  }

  const recentTurns = answeredTurns.slice(-6).map((turn, index) =>
    `${index + 1}. CREAPr: ${text(turn.question)}\nARTIST: ${text(turn.answer_text)}`
  ).join('\n\n');

  const catalogText = (Array.isArray(catalog) ? catalog : []).slice(0, 30).map((track, index) => {
    const details = [
      `title=${text(track.title)}`,
      track.album ? `album=${text(track.album)}` : '',
      track.release_year ? `year=${text(track.release_year)}` : '',
      track.description ? `artist_note=${text(track.description)}` : '',
      track.lyrics ? `lyrics_excerpt=${text(track.lyrics).slice(0, 900)}` : '',
      track.source_type ? `source=${text(track.source_type)}` : '',
    ].filter(Boolean).join(' | ');
    return `${index + 1}. ${details}`;
  }).join('\n');

  const knowledge = profile?.knowledge && typeof profile.knowledge === 'object'
    ? JSON.stringify(profile.knowledge).slice(0, 5000)
    : '{}';

  const prompt = `You are CREAPr, the on-air interviewer inside CREAPD. Conduct a real, curious artist interview with ${artistName}.

INTERVIEW PRIORITY:
1. First, follow the artist's most recent answer when it naturally creates a meaningful follow-up.
2. If the answer reaches a natural stopping point, inspect the artist's supplied catalogue for a useful contrast, outlier, recurring theme, shift, collaborator, title, or story worth asking about.
3. If neither gives you a strong question, identify an important gap in the artist story that has not been answered yet.
4. Never pretend you know why a song exists or what it means. When you notice something, frame it as an observation and ask the artist to explain it.
5. Do not repeat a question already answered.
6. Ask ONE question only. It should sound like a human interviewer, not a form.
7. You may challenge an apparent contradiction respectfully when the evidence in the supplied catalogue supports the observation.

ARTIST PROFILE:
Name: ${artistName}
Bio: ${text(profile?.bio_summary) || 'Not supplied'}
Artist message: ${text(profile?.artistic_message) || 'Not supplied'}
Known artist facts: ${knowledge}

CATALOGUE PROVIDED BY ARTIST:
${catalogText || 'No catalogue tracks supplied yet.'}

RECENT INTERVIEW:
${recentTurns}

Return the next interview question, a short internal reason, and source_refs identifying which supplied items motivated the question. source_refs can contain "last_answer", "artist_profile", or exact track titles from the catalogue.`;

  const result = await structured(
    prompt,
    {
      type: 'object',
      required: ['question', 'reason', 'source_refs'],
      properties: {
        question: { type: 'string' },
        reason: { type: 'string' },
        source_refs: { type: 'array', items: { type: 'string' } },
      },
    },
    'creapd_artist_interview_question_v1',
    900,
  );

  const data = result?.data || {};
  return {
    question: text(data.question, `What part of your music do you think people misunderstand most, ${artistName}?`),
    reason: text(data.reason, 'Continue the artist story using the supplied interview and catalogue context.'),
    source_refs: array(data.source_refs, ['last_answer']).slice(0, 8),
    mode: 'adaptive',
    provider: result?.provider || null,
    model: result?.model || null,
  };
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
