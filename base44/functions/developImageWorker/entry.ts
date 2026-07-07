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

    // Optionally generate images using the GenerateImage integration
    let generated_images = [];
    if (generate_images && result.image_assets) {
      for (const asset of result.image_assets.slice(0, 5)) {
        try {
          const imgRes = await base44.integrations.Core.GenerateImage({
            prompt: asset.image_prompt,
          });
          generated_images.push({
            point_title: asset.point_title,
            image_url: imgRes.url,
          });
        } catch (imgErr) {
          // Continue if individual image generation fails
        }
      }
    }

    return Response.json({
      worker_id: 'develop_image',
      department: 'develop',
      configuration_id,
      image_assets: result.image_assets || [],
      generated_images,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});