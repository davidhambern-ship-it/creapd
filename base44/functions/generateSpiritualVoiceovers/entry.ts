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

    // Generate voice sequentially to stay within timeout and avoid rate limits
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

    return Response.json({
      success: true,
      configuration_id,
      voiceovers_generated: generated,
      voiceovers_failed: failed,
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