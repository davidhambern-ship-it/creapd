import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `ElevenLabs API error: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const voices = (data.voices || []).map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category || '',
      labels: v.labels || {},
      preview_url: v.preview_url || '',
    }));

    return Response.json({ voices });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});