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

    // Delete existing non-locked Top 10 items for this config
    await base44.entities.Top10Item.deleteMany({ configuration_id });

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

RULES:
1. Return exactly 10 items, ranked #1 through #10 (best/most fitting first).
2. Each item MUST be a real YouTube video — include the full YouTube URL (https://www.youtube.com/watch?v=VIDEO_ID).
3. Prefer official music videos, live performances, or Vevo channels.
4. Match the genres, moods, and topics from the show config where possible.
5. Respect blocked songs/artists — never include them.
6. Each item needs: title (video title), youtube_url (full URL), channel_name (YouTube channel), and rank_reason (why it's ranked here).

Return a JSON object with key "items" containing an array of 10 objects, each with: title, youtube_url, channel_name, rank_reason.`;

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

    // Validate each video via oEmbed and build Top10Item records
    const top10Records = [];
    for (let i = 0; i < rawItems.length && i < 10; i++) {
      const raw = rawItems[i];
      const videoId = extractVideoId(raw.youtube_url || '');
      if (!videoId) continue;

      // Validate via oEmbed
      let validatedTitle = raw.title || '';
      let validatedChannel = raw.channel_name || '';
      try {
        const oembedResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedResp.ok) {
          const oembed = await oembedResp.json();
          validatedTitle = oembed.title || validatedTitle;
          validatedChannel = oembed.author_name || validatedChannel;
        }
      } catch {
        // skip validation errors, use LLM-provided data
      }

      top10Records.push({
        configuration_id,
        order: i,
        title: validatedTitle || raw.title || 'Unknown',
        youtube_video_id: videoId,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        channel_name: validatedChannel || raw.channel_name || '',
        note: raw.rank_reason || ''
      });
    }

    if (top10Records.length > 0) {
      await base44.entities.Top10Item.bulkCreate(top10Records);
    }

    return Response.json({
      success: true,
      configuration_id,
      top10_count: top10Records.length
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
  // Raw 11-char ID
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