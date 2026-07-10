import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const url = body.url;

    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'A YouTube URL is required' }, { status: 400 });
    }

    // Extract video ID from various YouTube URL formats
    let videoId = null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
      /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
      /(?:music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    // If no pattern matched, check if the raw string IS a video ID (11 chars)
    if (!videoId && /^[A-Za-z0-9_-]{11}$/.test(url.trim())) {
      videoId = url.trim();
    }

    if (!videoId) {
      return Response.json({ error: 'Could not extract a valid YouTube video ID from the provided URL' }, { status: 400 });
    }

    // Fetch OEmbed data (public, no API key needed)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await fetch(oembedUrl);

    if (!oembedResponse.ok) {
      return Response.json({ error: 'YouTube video not found or is private' }, { status: 404 });
    }

    const oembedData = await oembedResponse.json();

    return Response.json({
      video_id: videoId,
      title: oembedData.title || 'Unknown Title',
      thumbnail_url: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channel_name: oembedData.author_name || 'Unknown Channel',
      embed_html: oembedData.html || `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});