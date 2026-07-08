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

    // ===== STEP 2: Transcribe audio with Whisper for real word-level timestamps =====
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();

    const formData = new FormData();
    formData.append('file', audioBlob, 'narration.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errText = await whisperResponse.text();
      throw new Error(`Whisper transcription failed: ${errText}`);
    }

    const whisperData = await whisperResponse.json();
    const whisperWords = whisperData.words || [];
    const actualDuration = whisperData.duration || (whisperWords.length > 0 ? whisperWords[whisperWords.length - 1].end : 0);
    // ===== STEP 3: Build word timeline from real Whisper timestamps =====
    const wordTimeline = whisperWords.map(w => ({
      word: w.word,
      start_time: +w.start.toFixed(2),
      end_time: +w.end.toFixed(2),
      confidence_score: 0.97
    }));

    // ===== STEP 4: Build sentence timeline from real word timestamps =====
    const sentenceTimeline = [];
    let currentSentence = [];
    let sentenceId = 0;

    for (const w of whisperWords) {
      currentSentence.push(w);
      if (/[.!?]$/.test(w.word.trim())) {
        const start = currentSentence[0].start;
        const end = currentSentence[currentSentence.length - 1].end;
        sentenceTimeline.push({
          sentence_id: sentenceId++,
          sentence_text: currentSentence.map(x => x.word).join(' '),
          start_time: +start.toFixed(2),
          end_time: +end.toFixed(2),
          duration: +(end - start).toFixed(2)
        });
        currentSentence = [];
      }
    }
    if (currentSentence.length > 0) {
      const start = currentSentence[0].start;
      const end = currentSentence[currentSentence.length - 1].end;
      sentenceTimeline.push({
        sentence_id: sentenceId++,
        sentence_text: currentSentence.map(x => x.word).join(' '),
        start_time: +start.toFixed(2),
        end_time: +end.toFixed(2),
        duration: +(end - start).toFixed(2)
      });
    }

    // ===== STEP 5: Build pause timeline from real gaps between words =====
    const pauseTimeline = [];
    for (let i = 1; i < whisperWords.length; i++) {
      const gap = whisperWords[i].start - whisperWords[i - 1].end;
      if (gap > 0.1) {
        let pauseType;
        if (gap >= 0.8) pauseType = 'Dramatic Pause';
        else if (gap >= 0.5) pauseType = 'Paragraph Pause';
        else if (gap >= 0.3) pauseType = 'Sentence Pause';
        else pauseType = 'Natural Breath Pause';
        pauseTimeline.push({
          pause_start: +whisperWords[i - 1].end.toFixed(2),
          pause_end: +whisperWords[i].start.toFixed(2),
          duration: +gap.toFixed(2),
          pause_type: pauseType
        });
      }
    }

    // ===== STEP 6: Build paragraph timeline from sentence-level gaps =====
    const paragraphTimeline = [];
    if (sentenceTimeline.length > 0) {
      let paraStart = sentenceTimeline[0].start_time;
      let paraEnd = sentenceTimeline[0].end_time;
      let paraId = 0;
      for (let i = 1; i < sentenceTimeline.length; i++) {
        const gap = sentenceTimeline[i].start_time - sentenceTimeline[i - 1].end_time;
        if (gap >= 0.5) {
          paragraphTimeline.push({
            paragraph_id: paraId++,
            start_time: paraStart,
            end_time: paraEnd,
            duration: +(paraEnd - paraStart).toFixed(2)
          });
          paraStart = sentenceTimeline[i].start_time;
        }
        paraEnd = sentenceTimeline[i].end_time;
      }
      paragraphTimeline.push({
        paragraph_id: paraId++,
        start_time: paraStart,
        end_time: paraEnd,
        duration: +(paraEnd - paraStart).toFixed(2)
      });
    }

    // ===== STEP 7: Build timestamped transcript =====
    const timestampedTranscript = sentenceTimeline.map(s => {
      const mins = Math.floor(s.start_time / 60);
      const secs = Math.floor(s.start_time % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}  ${s.sentence_text}`;
    }).join('\n');

    // ===== STEP 8: Build voice metadata =====
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
      generation_engine: 'Base44 Core + OpenAI Whisper',
      generation_date: new Date().toISOString()
    };

    // ===== STEP 9: Calculate runtime statistics from real data =====
    const wordCount = whisperWords.length;
    const finalStats = {
      total_runtime: +actualDuration.toFixed(2),
      total_words: wordCount,
      total_sentences: sentenceTimeline.length,
      total_paragraphs: paragraphTimeline.length,
      wpm: Math.round(wordCount / Math.max(actualDuration / 60, 0.1)),
      avg_sentence_duration: sentenceTimeline.length > 0
        ? +(sentenceTimeline.reduce((s, x) => s + x.duration, 0) / sentenceTimeline.length).toFixed(2)
        : 0,
      avg_pause_duration: pauseTimeline.length > 0
        ? +(pauseTimeline.reduce((s, x) => s + x.duration, 0) / pauseTimeline.length).toFixed(2)
        : 0,
      reading_level: 'N/A'
    };

    // ===== STEP 6: Create or update VoicePackage entity =====
    const existingVPs = await base44.entities.VoicePackage.filter({
      source_type,
      source_id,
      is_primary: true
    });

    const vpData = {
      voice_audio_url: audioUrl,
      teleprompter_script: script_text,
      transcript: whisperData.text || script_text,
      timestamped_transcript: timestampedTranscript,
      sentence_timeline: JSON.stringify(sentenceTimeline),
      word_timeline: JSON.stringify(wordTimeline),
      paragraph_timeline: JSON.stringify(paragraphTimeline),
      pause_timeline: JSON.stringify(pauseTimeline),
      voice_metadata: JSON.stringify(voiceMetadata),
      runtime_stats: JSON.stringify(finalStats),
      total_duration_seconds: +actualDuration.toFixed(2),
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

    // ===== STEP 7: Update source entity with voice_package_id =====
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