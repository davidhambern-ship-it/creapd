import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id } = body;

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    const config = await base44.entities.MusicProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const genres = safeParse(config.genres, []);
    const moods = safeParse(config.moods, []);
    const musicTopics = safeParse(config.music_topics, []);

    // Fetch existing playlist items so we can exclude them from the Top 10
    const playlistItems = await base44.entities.PlaylistItem.filter({ configuration_id });
    const playlistSongList = playlistItems
      .map(item => `${item.song_title} — ${item.artist}`)
      .filter(s => s && s !== ' — ');
    const playlistExclusions = playlistSongList.length > 0
      ? playlistSongList.join('\n')
      : 'None';

    // Also exclude any already-locked Top 10 items (they survive regeneration)
    const existingTop10 = await base44.entities.Top10Item.filter({ configuration_id });
    const lockedItems = existingTop10.filter(i => i.locked);

    // Delete existing non-locked Top 10 items for this config
    const unlockedIds = existingTop10.filter(i => !i.locked).map(i => i.id);
    if (unlockedIds.length > 0) {
      await base44.entities.Top10Item.deleteMany({ _id: { $in: unlockedIds } });
    }

    // Build locked items context so AI knows what's already secured
    const lockedList = lockedItems.length > 0
      ? lockedItems.map(i => `${i.title} (${i.youtube_video_id})`).join('\n')
      : 'None';

    const remainingSlots = 10 - lockedItems.length;

    if (remainingSlots <= 0) {
      return Response.json({ success: true, configuration_id, top10_count: lockedItems.length });
    }

    // Request 4x items as buffer — many LLM-suggested videos fail oEmbed validation.
    // Large initial buffer avoids retry LLM calls, keeping us within the 120s timeout.
    const requestCount = Math.ceil(remainingSlots * 4);

    const prompt = `You are a music video curator for a ${config.production_format === 'live' ? 'live music broadcast' : 'radio show'} / music program.

Your task: Build a TOP 10 MUSIC VIDEOS list as ranked YouTube video embeds. These must be REAL, searchable YouTube videos that actually exist.

SHOW CONTEXT:
- Production Name: ${config.production_name || 'Music Show'}
- Show Tone: ${config.show_tone || 'Professional'}
- Genres: ${genres.join(', ') || 'Top 40'}
- Moods: ${moods.join(', ') || 'Feel Good'}
- Music Topics: ${musicTopics.join(', ') || 'General'}
- Preferred Eras: ${config.preferred_eras || 'Any'}
- Blocked Songs: ${config.blocked_songs || 'None'}
- Blocked Artists: ${config.blocked_artists || 'None'}

EXCLUSIONS — DO NOT include any of these songs (they are already in the show playlist):
${playlistExclusions}

ALREADY LOCKED (these are already in the Top 10, do NOT duplicate them):
${lockedList}

RULES:
1. Return exactly ${requestCount} items (we need ${remainingSlots} that pass validation, so provide extras as backup). These will fill the remaining Top 10 slots alongside the locked items.
2. Each item MUST be a real YouTube video — include the full YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID).
3. Prefer official music videos, live performances, or Vevo channels.
4. Match the genres, moods, and topics from the show config where possible.
5. Respect blocked songs/artists — never include them.
6. DO NOT include ANY song from the EXCLUSIONS list above — the Top 10 must be DIFFERENT from the playlist.
7. Each item needs: title (video title), youtube_url (full URL), channel_name (YouTube channel), and rank_reason (why it's ranked here).
8. Each video must have a UNIQUE YouTube video ID — no duplicates.

Return a JSON object with key "items" containing an array of ${requestCount} objects, each with: title, youtube_url, channel_name, rank_reason.`;

    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              youtube_url: { type: 'string' },
              channel_name: { type: 'string' },
              rank_reason: { type: 'string' }
            }
          }
        }
      }
    };

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
      model: 'gemini_3_flash'
    });

    const rawItems = llmResult.items || [];

    // Deduplicate and extract video IDs
    const usedVideoIds = new Set();
    const candidates = [];
    for (const raw of rawItems) {
      const videoId = extractVideoId(raw.youtube_url || '');
      if (videoId && !usedVideoIds.has(videoId)) {
        usedVideoIds.add(videoId);
        candidates.push({ raw, videoId });
      }
    }

    // Parallel oEmbed validation — launch all fetches at once for speed.
    // Each response body is consumed (via .json() or .text()) to prevent
    // Deno's stalled-response deadlock warnings.
    const results = await Promise.allSettled(
      candidates.map(async (c) => {
        const oembedResp = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${c.videoId}&format=json`
        );
        if (!oembedResp.ok) {
          // Consume body to prevent stalled-response deadlock
          await oembedResp.text().catch(() => {});
          throw new Error(`oEmbed ${c.videoId} returned ${oembedResp.status}`);
        }
        const oembed = await oembedResp.json();
        return { raw: c.raw, videoId: c.videoId, oembed };
      })
    );

    // Collect validated records up to remainingSlots
    const top10Records = [];
    for (const result of results) {
      if (top10Records.length >= remainingSlots) break;
      if (result.status === 'fulfilled') {
        const { videoId, raw, oembed } = result.value;
        top10Records.push({
          configuration_id,
          order: lockedItems.length + top10Records.length,
          title: oembed.title || raw.title || 'Unknown',
          youtube_video_id: videoId,
          thumbnail_url: oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          channel_name: oembed.author_name || raw.channel_name || '',
          note: raw.rank_reason || ''
        });
      }
    }

    if (top10Records.length > 0) {
      await base44.entities.Top10Item.bulkCreate(top10Records);
    }

    return Response.json({
      success: true,
      configuration_id,
      top10_count: top10Records.length + lockedItems.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function extractVideoId(url) {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}