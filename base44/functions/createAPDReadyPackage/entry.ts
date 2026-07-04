import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const {
      production_profile, source_entity_type, source_entity_id, configuration_id,
      title, headline, teleprompter_script, story_summary, talking_points,
      lower_third_text, title_suggestions, image_generation_prompt,
      thumbnail_prompt, visual_suggestions, broll_suggestions,
      social_media_caption, fact_check_notes, producer_notes, source_references,
      voice_audio_url, transcript, timestamped_transcript,
      sentence_timeline, word_timeline, paragraph_timeline, pause_timeline,
      runtime_stats, media_assets, status,
      cooking_notes, ingredient_list, scripture_references, reflection_notes,
      artist_facts, playlist_segment, show_script
    } = body;

    if (!production_profile || !source_entity_type || !source_entity_id) {
      return Response.json({ error: 'production_profile, source_entity_type, and source_entity_id are required' }, { status: 400 });
    }

    // Delete existing APD package for this source (rebuild scenario)
    const existing = await base44.asServiceRole.entities.ProductionPackage.filter(
      { source_entity_type, source_entity_id }
    );
    for (const oldPkg of existing) {
      if (oldPkg.voice_package_id) {
        try { await base44.asServiceRole.entities.VoicePackage.delete(oldPkg.voice_package_id); } catch {}
      }
      await base44.asServiceRole.entities.ProductionPackage.delete(oldPkg.id);
    }

    const scriptText = teleprompter_script || transcript || '';

    // Generate basic sentence_timeline if not provided
    let sentenceTimelineStr = sentence_timeline || '';
    if (!sentenceTimelineStr && scriptText) {
      const sentences = scriptText.match(/[^.!?]+[.!?]+/g) || [scriptText];
      const wordCount = scriptText.split(/\s+/).filter(w => w).length;
      const estimatedDurationSec = wordCount / 2.17; // 130 wpm
      const perSentence = estimatedDurationSec / sentences.length;
      sentenceTimelineStr = JSON.stringify(sentences.map((s, i) => ({
        sentence_id: `s${i}`,
        sentence_text: s.trim(),
        start_time: Math.round(i * perSentence * 1000),
        end_time: Math.round((i + 1) * perSentence * 1000),
        duration: Math.round(perSentence * 1000)
      })));
    }

    // Estimate duration
    let estimatedDuration = 0;
    if (runtime_stats) {
      try { estimatedDuration = JSON.parse(runtime_stats).total_runtime || 0; } catch {}
    }
    if (!estimatedDuration && scriptText) {
      estimatedDuration = Math.round((scriptText.split(/\s+/).filter(w => w).length / 2.17) * 100) / 100;
    }

    // Create VoicePackage
    const vp = await base44.asServiceRole.entities.VoicePackage.create({
      source_type: 'production_package',
      source_id: 'pending',
      voice_audio_url: voice_audio_url || '',
      teleprompter_script: scriptText,
      transcript: transcript || scriptText,
      timestamped_transcript: timestamped_transcript || '',
      sentence_timeline: sentenceTimelineStr,
      word_timeline: word_timeline || '',
      paragraph_timeline: paragraph_timeline || '',
      pause_timeline: pause_timeline || '',
      voice_metadata: JSON.stringify({
        voice_provider: 'creapd',
        generation_engine: production_profile + '_build',
        generation_date: new Date().toISOString()
      }),
      runtime_stats: runtime_stats || JSON.stringify({
        total_runtime: estimatedDuration,
        total_words: scriptText ? scriptText.split(/\s+/).filter(w => w).length : 0,
        total_sentences: scriptText ? (scriptText.match(/[^.!?]+[.!?]+/g) || [scriptText]).length : 0,
        wpm: 130
      }),
      total_duration_seconds: estimatedDuration,
      is_primary: true,
      status: 'generated'
    });

    // Create ProductionPackage
    const pkg = await base44.asServiceRole.entities.ProductionPackage.create({
      article_id: body.article_id || '',
      production_profile,
      source_entity_type,
      source_entity_id,
      configuration_id: configuration_id || '',
      teleprompter_script: scriptText,
      story_summary: story_summary || '',
      talking_points: talking_points || '',
      lower_third_text: lower_third_text || '',
      headline_suggestions: title_suggestions || headline || title || '',
      image_prompt: image_generation_prompt || thumbnail_prompt || '',
      thumbnail_prompt: thumbnail_prompt || '',
      visual_suggestions: visual_suggestions || '',
      broll_suggestions: broll_suggestions || '',
      social_caption: social_media_caption || '',
      fact_check_notes: fact_check_notes || '',
      producer_notes: producer_notes || '',
      estimated_runtime: `${Math.max(1, Math.ceil(estimatedDuration / 60))} Minute${Math.ceil(estimatedDuration / 60) !== 1 ? 's' : ''}`,
      status: status || 'approved',
      generated_audio_url: voice_audio_url || '',
      voice_package_id: vp.id,
      generation_provider: production_profile + '_adapter',
      generated_at: new Date().toISOString(),
      generation_count: 1,
      cooking_notes: cooking_notes || '',
      ingredient_list: ingredient_list || '',
      scripture_references: scripture_references || '',
      reflection_notes: reflection_notes || '',
      artist_facts: artist_facts || '',
      playlist_segment: playlist_segment || '',
      show_script: show_script || ''
    });

    // Link VoicePackage to the package
    await base44.asServiceRole.entities.VoicePackage.update(vp.id, { source_id: pkg.id });

    return Response.json({
      status: 'success',
      package_id: pkg.id,
      voice_package_id: vp.id,
      package_status: pkg.status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});