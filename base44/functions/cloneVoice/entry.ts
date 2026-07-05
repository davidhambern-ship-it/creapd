import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { audio_url } = await req.json();
    if (!audio_url) return Response.json({ error: 'audio_url is required' }, { status: 400 });

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });

    // Fetch the uploaded audio file
    const audioResponse = await fetch(audio_url);
    if (!audioResponse.ok) {
      return Response.json({ error: 'Failed to fetch audio file' }, { status: 500 });
    }
    const audioBlob = await audioResponse.blob();

    // Create form data for ElevenLabs instant voice cloning
    const formData = new FormData();
    formData.append('name', `CREAPD Voice - ${user.full_name || user.email}`);
    formData.append('files', audioBlob, 'recording.webm');

    const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    if (!cloneResponse.ok) {
      const errText = await cloneResponse.text();
      return Response.json({ error: `ElevenLabs cloning failed: ${errText}` }, { status: 500 });
    }

    const cloneData = await cloneResponse.json();
    return Response.json({ voice_id: cloneData.voice_id, name: cloneData?.requires_verification ? null : (cloneData?.name || 'Cloned Voice') });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});