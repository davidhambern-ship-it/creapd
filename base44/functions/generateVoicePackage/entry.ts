import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CHARS_PER_SECOND = 15; // ~150 wpm natural speech estimate

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      script_text,
      language_code,
      source_type,
      source_id
    } = body;

    if (!script_text) return Response.json({ error: 'script_text is required' }, { status: 400 });
    if (!source_type || !source_id) return Response.json({ error: 'source_type and source_id are required' }, { status: 400 });

    // ===== Generate voiceover audio using built-in GenerateSpeech (not ElevenLabs) =====
    const speechResult = await base44.integrations.Core.GenerateSpeech({
      text: script_text,
      voice: 'river',
      language_code: language_code || 'en'
    });
    const audioUrl = speechResult?.url || null;

    // ===== Estimate duration from word count =====
    const words = script_text.trim().split(/\s+/).filter(Boolean);
    const estimatedDuration = Math.ceil(script_text.length / CHARS_PER_SECOND);
    const wordCount = words.length;
    const wpm = Math.round(wordCount / Math.max(estimatedDuration / 60, 0.1));

    // ===== Build sentence-level timeline from text (estimated, not transcribed) =====
    const sentences = script_text.match(/[^.!?]+[.!?]*/g) || [script_text];
    let runningTime = 0;
    const sentenceTimeline = sentences.map((s, i) => {
      const dur = Math.ceil(s.trim().length / CHARS_PER_SECOND);
      const start = runningTime;
      const end = runningTime + dur;
      runningTime = end;
      return {
        sentence_id: i,
        sentence_text: s.trim(),
        start_time: +start.toFixed(2),
        end_time: +end.toFixed(2),
        duration: +dur.toFixed(2)
      };
    });

    // ===== Build timestamped transcript (estimated) =====
    const timestampedTranscript = sentenceTimeline.map(s => {
      const mins = Math.floor(s.start_time / 60);
      const secs = Math.floor(s.start_time % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}  ${s.sentence_text}`;
    }).join('\n');

    // ===== Build voice metadata — native provider =====
    const voiceMetadata = {
      voice_id: 'river',
      voice_name: 'River',
      voice_provider: 'generate_speech',
      language: language_code || 'en',
      accent: 'neutral',
      speaking_style: 'narration',
      emotion: 'neutral',
      pitch: 'default',
      speed: '1.0',
      generation_engine: 'base44 GenerateSpeech',
      generation_date: new Date().toISOString()
    };

    // ===== Runtime statistics =====
    const finalStats = {
      total_runtime: +estimatedDuration.toFixed(2),
      total_words: wordCount,
      total_sentences: sentenceTimeline.length,
      total_paragraphs: 1,
      wpm,
      avg_sentence_duration: sentenceTimeline.length > 0
        ? +(sentenceTimeline.reduce((s, x) => s + x.duration, 0) / sentenceTimeline.length).toFixed(2)
        : 0,
      avg_pause_duration: 0,
      reading_level: 'N/A'
    };

    // ===== Create or update VoicePackage entity =====
    const existingVPs = await base44.entities.VoicePackage.filter({
      source_type,
      source_id,
      is_primary: true
    });

    const vpData = {
      voice_audio_url: audioUrl,
      teleprompter_script: script_text,
      transcript: script_text,
      timestamped_transcript: timestampedTranscript,
      sentence_timeline: JSON.stringify(sentenceTimeline),
      voice_metadata: JSON.stringify(voiceMetadata),
      runtime_stats: JSON.stringify(finalStats),
      total_duration_seconds: +estimatedDuration.toFixed(2),
      status: 'generated'
    };

    let vp;
    if (existingVPs && existingVPs.length > 0) {
      vp = await base44.entities.VoicePackage.update(existingVPs[0].id, vpData);
    } else {
      vpData.is_primary = true;
      vp = await base44.entities.VoicePackage.create({
        source_type,
        source_id,
        ...vpData
      });
    }

    // ===== Update source entity with voice_package_id =====
    if (source_type === 'production_package') {
      await base44.entities.ProductionPackage.update(source_id, { voice_package_id: vp.id });
    } else if (source_type === 'spiritual_section') {
      await base44.entities.SpiritualMessageSection.update(source_id, { voice_package_id: vp.id });
    }

    return Response.json({ voice_package: vp, audio_url: audioUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});