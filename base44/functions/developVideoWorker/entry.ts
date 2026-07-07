import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Video Worker
 * Creates video prompts, motion graphics suggestions, B-roll suggestions, video concepts.
 * Capability: creative_generation (GPT mini)
 * Output: Video Assets & Prompts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_points, configuration_id } = await req.json();
    if (!presentation_points) {
      return Response.json({ error: 'presentation_points is required' }, { status: 400 });
    }

    const prompt = `You are the Video Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create video prompts, motion graphics suggestions, and B-roll suggestions.

PRESENTATION POINTS:
${JSON.stringify(presentation_points, null, 2)}

For each presentation point where video is appropriate, create:
- video_prompt: Detailed prompt for AI video generation
- broll_suggestions: Suggested B-roll footage
- motion_graphics: Motion graphics concepts
- video_concept: Overall video concept description
- duration_estimate: Estimated duration in seconds

Rules:
- Not every slide needs video — only suggest where it adds value.
- Video prompts should be specific and detailed.
- B-roll suggestions should be realistic and obtainable.
- Motion graphics should enhance, not distract.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          video_assets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point_title: { type: 'string' },
                video_prompt: { type: 'string' },
                broll_suggestions: { type: 'array', items: { type: 'string' } },
                motion_graphics: { type: 'string' },
                video_concept: { type: 'string' },
                duration_estimate: { type: 'number' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'develop_video',
      department: 'develop',
      configuration_id,
      video_assets: result.video_assets || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});