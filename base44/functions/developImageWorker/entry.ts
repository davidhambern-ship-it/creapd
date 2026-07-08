import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Image Worker
 * Creates image prompts, generated images, illustrations, icons, charts, infographics,
 * maps, diagrams, visual concepts.
 * Capability: creative_generation (GPT mini)
 * Output: Image Assets & Prompts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_points, configuration_id, generate_images } = await req.json();
    if (!presentation_points) {
      return Response.json({ error: 'presentation_points is required' }, { status: 400 });
    }

    const prompt = `You are the Image Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create image prompts and visual concepts for each presentation point.

PRESENTATION POINTS:
${JSON.stringify(presentation_points, null, 2)}

For each presentation point, create:
- image_prompt: Detailed AI image generation prompt
- visual_concept: Description of the intended visual
- visual_type: (photograph, illustration, chart, infographic, diagram, icon, map)
- style_notes: Art direction, color palette, composition notes
- icon_suggestions: Relevant icons or symbols

Rules:
- Image prompts should be detailed and specific for AI image generation.
- Do NOT generate actual images — only create prompts and concepts.
- Match visuals to the content of each slide.
- Suggest appropriate visual types (not everything should be a photo).`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          image_assets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point_title: { type: 'string' },
                image_prompt: { type: 'string' },
                visual_concept: { type: 'string' },
                visual_type: { type: 'string' },
                style_notes: { type: 'string' },
                icon_suggestions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    // KAAE-008 Prime Directive: Check Asset Registry before AI generation
    let generated_images = [];
    let kaae_stats = { reused: 0, generated: 0, skipped: 0 };
    if (generate_images && result.image_assets) {
      for (const asset of result.image_assets.slice(0, 5)) {
        try {
          // Priority 1-5: Ask KAAE if a suitable resource already exists
          const kaaeResponse = await base44.functions.invoke('kaaeAcquire', {
            resource_type: 'image',
            query: `${asset.point_title} ${asset.visual_concept || ''}`,
            production_profile: 'research',
            allow_ai_generation: false,
            max_cost: 0,
          });

          if (kaaeResponse.data?.status === 'found' && kaaeResponse.data.asset?.cached_file_url) {
            // Reuse existing asset — zero cost, zero licensing risk
            generated_images.push({
              point_title: asset.point_title,
              image_url: kaaeResponse.data.asset.cached_file_url,
              kaae_reused: true,
              kaae_asset_id: kaaeResponse.data.asset.id,
            });
            kaae_stats.reused++;
            continue;
          }

          // Priority 6: AI generation (last resort per KAAE-008)
          const imgRes = await base44.integrations.Core.GenerateImage({
            prompt: asset.image_prompt,
          });
          generated_images.push({
            point_title: asset.point_title,
            image_url: imgRes.url,
            kaae_reused: false,
          });
          kaae_stats.generated++;

          // Register the AI-generated asset in the KAAE for future reuse
          try {
            await base44.functions.invoke('kaaeRegisterAsset', {
              title: `AI: ${asset.point_title}`,
              resource_type: 'image',
              format: 'png',
              source_url: imgRes.url,
              provider: 'ai_generation',
              provider_resource_id: imgRes.url,
              license: 'commercial_license',
              commercial_use: true,
              modification_allowed: true,
              confidence: 60,
              qa_status: 'not_reviewed',
              acquisition_method: 'ai_generation',
              keywords: JSON.stringify([asset.point_title, asset.visual_type]),
              tags: JSON.stringify(['ai_generated', asset.visual_type]),
              cached: true,
              cached_file_url: imgRes.url,
              cached_at: new Date().toISOString(),
              download_status: 'downloaded',
            });
          } catch (regErr) {
            // Registration is best-effort
          }
        } catch (imgErr) {
          kaae_stats.skipped++;
        }
      }
    }

    return Response.json({
      worker_id: 'develop_image',
      department: 'develop',
      configuration_id,
      image_assets: result.image_assets || [],
      generated_images,
      kaae_stats,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});