import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VOICE_LABELS = {
  river: 'River',
  honey: 'Honey',
  sunny: 'Sunny',
  storm: 'Storm',
  spark: 'Spark'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      script_text,
      voice,
      language_code,
      source_type,
      source_id,
      existing_audio_url,
      existing_duration_seconds
    } = body;

    if (!script_text) return Response.json({ error: 'script_text is required' }, { status: 400 });
    if (!source_type || !source_id) return Response.json({ error: 'source_type and source_id are required' }, { status: 400 });

    // ===== STEP 1: Generate or use existing audio =====
    let audioUrl = existing_audio_url || '';
    let estimatedDuration = existing_duration_seconds || 0;

    if (!audioUrl) {
      const speechResult = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text: script_text.substring(0, 5000),
        voice: voice || 'river',
        language_code: language_code || 'en'
      });
      audioUrl = speechResult.url;
    }

    if (!estimatedDuration || estimatedDuration < 1) {
      const wc = script_text.split(/\s+/).filter(Boolean).length;
      estimatedDuration = Math.max(3, Math.round((wc / 150) * 60));
    }

    const wordCount = script_text.split(/\s+/).filter(Boolean).length;

    // ===== STEP 2: Generate VP timeline data via LLM =====
    const vpPrompt = `You are a Voice Package timing analyzer. Given a narration script and its estimated total duration, produce a complete timing dataset.

NARRATION SCRIPT:
${script_text.substring(0, 4000)}

ESTIMATED TOTAL DURATION: ${estimatedDuration} seconds

YOUR TASK:
Break down this narration into a structured timing dataset. All times are in seconds, starting from 0.

1. SENTENCE TIMELINE: Split the script into sentences. Distribute the total duration proportionally based on each sentence's word count. Leave ~0.35s gaps between sentences for pauses. Each sentence object has: sentence_id (number), sentence_text (string), start_time (number), end_time (number), duration (number).

2. PARAGRAPH TIMELINE: Group sentences into paragraphs by topical breaks. Each paragraph object has: paragraph_id (number), start_time (number), end_time (number), duration (number).

3. PAUSE TIMELINE: Detect meaningful pauses between sentences and paragraphs. Use these pause_type values: "Sentence Pause" (0.3-0.4s), "Paragraph Pause" (0.6-1.0s), "Dramatic Pause" (0.8-1.5s), "Natural Breath Pause" (0.15-0.25s). Each pause object has: pause_start (number), pause_end (number), duration (number), pause_type (string).

4. TIMESTAMPED TRANSCRIPT: Each sentence on its own line, prefixed with "MM:SS  " (e.g., "00:14  Today's top story...")

5. TRANSCRIPT: Plain text transcript of the full narration, no timestamps.

6. RUNTIME STATS object with: total_words (number), total_sentences (number), total_paragraphs (number), wpm (number), avg_sentence_duration (number), avg_pause_duration (number), reading_level (string).

You MUST populate sentence_timeline, paragraph_timeline, and pause_timeline with at least one entry each. Do NOT return empty arrays.`;

    const vpResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: vpPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          transcript: { type: 'string' },
          timestamped_transcript: { type: 'string' },
          sentence_timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sentence_id: { type: 'number' },
                sentence_text: { type: 'string' },
                start_time: { type: 'number' },
                end_time: { type: 'number' },
                duration: { type: 'number' }
              }
            }
          },
          paragraph_timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                paragraph_id: { type: 'number' },
                start_time: { type: 'number' },
                end_time: { type: 'number' },
                duration: { type: 'number' }
              }
            }
          },
          pause_timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pause_start: { type: 'number' },
                pause_end: { type: 'number' },
                duration: { type: 'number' },
                pause_type: { type: 'string' }
              }
            }
          },
          runtime_stats: {
            type: 'object',
            properties: {
              total_words: { type: 'number' },
              total_sentences: { type: 'number' },
              total_paragraphs: { type: 'number' },
              wpm: { type: 'number' },
              avg_sentence_duration: { type: 'number' },
              avg_pause_duration: { type: 'number' },
              reading_level: { type: 'string' }
            }
          }
        },
        required: ['transcript', 'timestamped_transcript', 'sentence_timeline', 'paragraph_timeline', 'pause_timeline', 'runtime_stats']
      }
    });

    function safeParse(val, fallback) {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return Array.isArray(val) || typeof val === 'object' ? val : fallback;
    }

    const sentenceTimeline = safeParse(vpResponse.sentence_timeline, []);
    const paragraphTimeline = safeParse(vpResponse.paragraph_timeline, []);
    const pauseTimeline = safeParse(vpResponse.pause_timeline, []);
    const runtimeStats = safeParse(vpResponse.runtime_stats, {});

    // ===== STEP 3: Compute word timeline from sentence timeline =====
    const wordTimeline = [];
    if (Array.isArray(sentenceTimeline) && sentenceTimeline.length > 0) {
      sentenceTimeline.forEach((sentence) => {
        const words = (sentence.sentence_text || '').split(/\s+/).filter(Boolean);
        const sStart = sentence.start_time || 0;
        const sDur = sentence.duration || ((sentence.end_time || 0) - sStart) || 1;
        const wordDur = sDur / Math.max(words.length, 1);
        words.forEach((word, wIdx) => {
          wordTimeline.push({
            word: word,
            start_time: +(sStart + wIdx * wordDur).toFixed(2),
            end_time: +(sStart + (wIdx + 1) * wordDur).toFixed(2),
            confidence_score: 0.97
          });
        });
      });
    }

    // ===== STEP 4: Build voice metadata =====
    const voiceMetadata = {
      voice_id: voice || 'river',
      voice_name: VOICE_LABELS[voice] || 'River',
      voice_provider: 'Base44 TTS',
      language: language_code || 'en',
      accent: 'neutral',
      speaking_style: 'narration',
      emotion: 'neutral',
      pitch: 'default',
      speed: '1.0',
      generation_engine: 'Base44 Core',
      generation_date: new Date().toISOString()
    };

    // ===== STEP 5: Calculate runtime statistics =====
    const finalStats = {
      total_runtime: estimatedDuration,
      total_words: wordCount,
      total_sentences: sentenceTimeline.length,
      total_paragraphs: paragraphTimeline.length,
      wpm: Math.round(wordCount / Math.max(estimatedDuration / 60, 0.1)),
      avg_sentence_duration: sentenceTimeline.length > 0
        ? +(sentenceTimeline.reduce((s, x) => s + (x.duration || 0), 0) / sentenceTimeline.length).toFixed(2)
        : 0,
      avg_pause_duration: pauseTimeline.length > 0
        ? +(pauseTimeline.reduce((s, x) => s + (x.duration || 0), 0) / pauseTimeline.length).toFixed(2)
        : 0,
      reading_level: runtimeStats.reading_level || 'N/A'
    };

    // ===== STEP 6: Create or update VoicePackage entity =====
    const existingVPs = await base44.asServiceRole.entities.VoicePackage.filter({
      source_type,
      source_id,
      is_primary: true
    });

    const vpData = {
      voice_audio_url: audioUrl,
      teleprompter_script: script_text,
      transcript: vpResponse.transcript || script_text,
      timestamped_transcript: vpResponse.timestamped_transcript || '',
      sentence_timeline: JSON.stringify(sentenceTimeline),
      word_timeline: JSON.stringify(wordTimeline),
      paragraph_timeline: JSON.stringify(paragraphTimeline),
      pause_timeline: JSON.stringify(pauseTimeline),
      voice_metadata: JSON.stringify(voiceMetadata),
      runtime_stats: JSON.stringify(finalStats),
      total_duration_seconds: estimatedDuration,
      status: 'generated'
    };

    let vp;
    if (existingVPs && existingVPs.length > 0) {
      vp = await base44.asServiceRole.entities.VoicePackage.update(existingVPs[0].id, vpData);
    } else {
      vpData.is_primary = true;
      vp = await base44.asServiceRole.entities.VoicePackage.create({
        source_type,
        source_id,
        ...vpData
      });
    }

    // ===== STEP 7: Update source entity with voice_package_id =====
    if (source_type === 'production_package') {
      await base44.asServiceRole.entities.ProductionPackage.update(source_id, { voice_package_id: vp.id });
    } else if (source_type === 'spiritual_section') {
      await base44.asServiceRole.entities.SpiritualMessageSection.update(source_id, { voice_package_id: vp.id });
    }

    return Response.json({ voice_package: vp, audio_url: audioUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});