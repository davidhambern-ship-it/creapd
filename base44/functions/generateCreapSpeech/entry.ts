import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Friendly name → ElevenLabs voice_id mapping
// Legacy IDs auto-route to their current replacement voices
const VOICE_MAP = {
  adam: 'pNInz6obpgDQGcFmaJgB',      // Male, deep — good default for CREAP
  rachel: '21m00Tcm4TlvDq8ikWAM',   // Female, calm narration
  antoni: 'ErXwobgtWoWfW5kpwLRm',   // Male, casual → routes to Adam
  domi: 'AZnzlk1XvdvUeBnXmlld',     // Female, soft → routes to Elara
  bella: 'EXAVITQu4vr4xnSDxMaL',     // Female, soft
  drew: 'CwhRBKSZXDXygfGTiPB2',     // Male, news → routes to Wyatt
  josh: 'TxGEqnHWrfWFTfGW9XjX',     // Male, deep
  arnold: 'VR6AewLTigWG4xSOukaG',   // Male, deep → routes to Adam
  sam: 'yoZ06aMxZJJ28mfd3POQ',      // Male, young → routes to Riley
  elli: 'MF3mGyEYCl7XYWbV9V6O',     // Female, young → routes to Peter
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { text, voice, model_id } = body;

    if (!text) return Response.json({ error: 'text is required' }, { status: 400 });

    const voiceKey = (voice || 'adam').toLowerCase();
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