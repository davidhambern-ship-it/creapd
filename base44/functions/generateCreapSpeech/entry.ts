import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Friendly name → ElevenLabs voice_id mapping
const VOICE_MAP = {
  daniel: 'onwK4e9ZLuTAKqWW03F9',   // British male, steady broadcaster — CREAP default
  george: 'JBFqnCBsd6RMkjVDRZzb',   // British male, warm storyteller
  alice: 'Xb7hH8MSUJpSbSDYk0k2',    // British female, clear educator
  lily: 'pFZP5JQG7iQjIQuC4Bku',     // British female, velvety actress
  adam: 'pNInz6obpgDQGcFmaJgB',     // American male, deep
  rachel: '21m00Tcm4TlvDq8ikWAM',   // American female, calm
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, voice, model_id } = body;

    if (!text) return Response.json({ error: 'text is required' }, { status: 400 });

    const voiceKey = (voice || 'daniel').toLowerCase();
    const voiceId = VOICE_MAP[voiceKey] || VOICE_MAP.adam;
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 });

    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.substring(0, 5000),
          model_id: model_id || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
            speed: 0.95,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      throw new Error(`ElevenLabs TTS failed: ${ttsResponse.status} ${errText}`);
    }

    // Get audio as blob and upload to app storage
    const audioBlob = await ttsResponse.blob();
    const file = new File([audioBlob], 'creap_speech.mp3', { type: 'audio/mpeg' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({
      url: uploadResult.file_url,
      voice: voiceKey,
      provider: 'elevenlabs',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});