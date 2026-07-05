import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, voice_id, stability, similarity_boost } = await req.json();
    if (!text || !voice_id) {
      return Response.json({ error: 'text and voice_id are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: typeof stability === 'number' ? stability : 0.5,
            similarity_boost: typeof similarity_boost === 'number' ? similarity_boost : 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      return Response.json({ error: `ElevenLabs TTS failed: ${errText}` }, { status: 500 });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const file = new File([audioBlob], 'narration.mp3', { type: 'audio/mpeg' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ url: uploadResult.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});