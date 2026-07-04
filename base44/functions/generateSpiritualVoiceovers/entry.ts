import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  let configuration_id;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    configuration_id = body.configuration_id;
    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    const config = await base44.entities.SpiritualProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const sections = await base44.entities.SpiritualMessageSection.filter({ configuration_id }, 'order');
    if (sections.length === 0) {
      return Response.json({ error: 'No message sections found' }, { status: 400 });
    }

    const totalTargetSeconds = parseRuntimeToSeconds(config.target_runtime);
    const perSectionTarget = Math.floor(totalTargetSeconds / sections.length);

    let generated = 0;
    let failed = 0;
    let adjusted = 0;

    // ===== PASS 1: Generate voice for all sections =====
    for (const section of sections) {
      try {
        const text = (section.content || '').substring(0, 5000);
        if (!text || text.trim().length < 10) {
          await base44.entities.SpiritualMessageSection.update(section.id, {
            voice_url: null,
            voice_duration_seconds: 0,
            target_runtime_seconds: perSectionTarget,
            runtime_status: 'pending'
          });
          continue;
        }

        const voiceResult = await base44.integrations.Core.GenerateSpeech({
          text: text,
          voice: 'storm',
          language_code: 'en'
        });

        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const voiceDuration = Math.round(wordCount / 2.5);
        const status = voiceDuration < perSectionTarget * 0.7 ? 'too_short'
          : voiceDuration > perSectionTarget * 1.3 ? 'too_long'
          : 'on_target';

        await base44.entities.SpiritualMessageSection.update(section.id, {
          voice_url: voiceResult.url,
          voice_duration_seconds: voiceDuration,
          target_runtime_seconds: perSectionTarget,
          runtime_status: status
        });
        generated++;
      } catch (err) {
        failed++;
      }
    }

    // ===== PASS 2: Runtime validation — auto-adjust sections that are too short or too long =====
    const updatedSections = await base44.entities.SpiritualMessageSection.filter({ configuration_id }, 'order');
    for (const section of updatedSections) {
      if (section.runtime_status !== 'too_short' && section.runtime_status !== 'too_long') continue;
      if (!section.voice_url) continue;

      try {
        const target = section.target_runtime_seconds || perSectionTarget;
        const currentDuration = section.voice_duration_seconds || 0;
        const isTooShort = section.runtime_status === 'too_short';
        const ratio = isTooShort ? target / Math.max(currentDuration, 1) : currentDuration / Math.max(target, 1);

        const adjustPrompt = isTooShort
          ? `Expand the following spiritual message section to be approximately ${Math.round(ratio * 100)}% longer (about ${target} seconds of speaking time at 130 wpm, so roughly ${Math.round(target / 130 * 60)} words). Keep the same tone, style, and key points. Add depth, illustrations, or supporting detail. Do NOT add new scripture references. Return ONLY the expanded narration text, nothing else.\n\nCurrent text (${currentDuration}s):\n${section.content}`
          : `Condense the following spiritual message section to be approximately ${Math.round((1 / ratio) * 100)}% shorter (about ${target} seconds of speaking time at 130 wpm, so roughly ${Math.round(target / 130 * 60)} words). Keep the core message, key points, and scripture references. Remove redundancy. Return ONLY the condensed narration text, nothing else.\n\nCurrent text (${currentDuration}s):\n${section.content}`;

        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: adjustPrompt
        });

        const adjustedText = typeof llmResult === 'string' ? llmResult : (llmResult.text || llmResult.content || '');
        if (!adjustedText || adjustedText.trim().length < 20) continue;

        // Regenerate voice with adjusted text
        const newVoice = await base44.integrations.Core.GenerateSpeech({
          text: adjustedText.substring(0, 5000),
          voice: 'storm',
          language_code: 'en'
        });

        const newWordCount = adjustedText.split(/\s+/).filter(Boolean).length;
        const newDuration = Math.round(newWordCount / 2.5);
        const newStatus = newDuration < target * 0.7 ? 'too_short'
          : newDuration > target * 1.3 ? 'too_long'
          : 'on_target';

        await base44.entities.SpiritualMessageSection.update(section.id, {
          content: adjustedText,
          voice_url: newVoice.url,
          voice_duration_seconds: newDuration,
          runtime_status: newStatus,
          estimated_duration_seconds: newDuration
        });
        adjusted++;
      } catch (err) {
        // If adjustment fails, leave the original voice
      }
    }

    // ===== PASS 3: Generate Voice Packages for all sections with voice =====
    const voicedSections = await base44.asServiceRole.entities.SpiritualMessageSection.filter({ configuration_id }, 'order');
    let vpGenerated = 0;
    for (const section of voicedSections) {
      if (!section.voice_url || !section.content) continue;
      try {
        await base44.asServiceRole.functions.invoke('generateVoicePackage', {
          script_text: section.content,
          voice: 'storm',
          language_code: 'en',
          source_type: 'spiritual_section',
          source_id: section.id,
          existing_audio_url: section.voice_url,
          existing_duration_seconds: section.voice_duration_seconds
        });
        vpGenerated++;
      } catch (err) {
        // VP generation failure should not break the flow
      }
    }

    // Generate thumbnail image for title slide
    let imageGenerated = false;
    try {
      const titleSlide = await base44.entities.SpiritualAsset.filter({
        configuration_id,
        asset_type: 'title_slide'
      });
      const needsImage = titleSlide.find(a => !a.generated_image_url);
      if (needsImage) {
        const thumbnailAsset = await base44.entities.SpiritualAsset.filter({
          configuration_id,
          asset_type: 'thumbnail'
        });
        const thumbnailPrompt = thumbnailAsset[0]?.content;
        if (thumbnailPrompt) {
          const imageResult = await base44.integrations.Core.GenerateImage({
            prompt: thumbnailPrompt
          });
          if (imageResult.url) {
            await base44.entities.SpiritualAsset.update(needsImage.id, { generated_image_url: imageResult.url });
            imageGenerated = true;
          }
        }
      }
    } catch {}

    // ===== BACKFILL APD VOICE PACKAGE =====
    // The APD adapter (createAPDReadyPackage) was called during buildSpiritualProduction
    // before voiceovers existed. Update the APD VoicePackage now with the generated audio.
    try {
      const apdPackages = await base44.asServiceRole.entities.ProductionPackage.filter({
        source_entity_type: 'SpiritualProductionConfiguration',
        source_entity_id: configuration_id
      });
      for (const apdPkg of apdPackages) {
        if (!apdPkg.voice_package_id) continue;
        const apdVp = await base44.asServiceRole.entities.VoicePackage.get(apdPkg.voice_package_id);
        if (!apdVp) continue;

        // Use the first voiced section's audio as the primary narration
        const firstVoicedSection = voicedSections.find(s => s.voice_url);
        const combinedScript = voicedSections
          .filter(s => s.content)
          .map(s => s.content)
          .join('\n\n');

        const updateData = {};
        if (firstVoicedSection?.voice_url) {
          updateData.voice_audio_url = firstVoicedSection.voice_url;
        }
        if (combinedScript) {
          updateData.teleprompter_script = combinedScript;
          updateData.transcript = combinedScript;
        }
        // Recalculate total duration from all sections
        const totalSec = voicedSections.reduce((sum, s) => sum + (s.voice_duration_seconds || 0), 0);
        if (totalSec > 0) {
          updateData.total_duration_seconds = totalSec;
        }

        if (Object.keys(updateData).length > 0) {
          await base44.asServiceRole.entities.VoicePackage.update(apdVp.id, updateData);
          // Also update the ProductionPackage's generated_audio_url
          if (firstVoicedSection?.voice_url) {
            await base44.asServiceRole.entities.ProductionPackage.update(apdPkg.id, {
              generated_audio_url: firstVoicedSection.voice_url
            });
          }
        }
      }
    } catch (e) {
      console.error('APD VP backfill failed:', e.message);
    }

    return Response.json({
      success: true,
      configuration_id,
      voiceovers_generated: generated,
      voiceovers_failed: failed,
      runtime_adjusted: adjusted,
      voice_packages_generated: vpGenerated,
      image_generated: imageGenerated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseRuntimeToSeconds(runtimeStr) {
  if (!runtimeStr) return 1800;
  const match = String(runtimeStr).match(/(\d+)\s*Minute/i);
  if (match) return parseInt(match[1]) * 60;
  return 1800;
}