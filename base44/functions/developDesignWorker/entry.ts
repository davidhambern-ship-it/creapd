import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Presentation Design Worker
 * Creates layout recommendations, typography, animation suggestions, transition suggestions,
 * visual hierarchy, color recommendations.
 * Capability: creative_generation (GPT mini)
 * Output: Layout & Design Metadata
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_points, configuration_id, brand_profile } = await req.json();
    if (!presentation_points) {
      return Response.json({ error: 'presentation_points is required' }, { status: 400 });
    }

    const prompt = `You are the Presentation Design Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create layout and design recommendations for each slide.

PRESENTATION POINTS:
${JSON.stringify(presentation_points, null, 2)}

BRAND PROFILE:
${JSON.stringify(brand_profile || {}, null, 2)}

For each presentation point, recommend:
- layout_template: Layout type (full_image, split, title_bullets, quote, data_viz, fullscreen_video, comparison)
- typography: Font recommendations (heading, body, accent)
- color_scheme: Color palette for this slide
- visual_hierarchy: Order of visual priority
- animation_suggestions: Entrance and emphasis animations
- transition_suggestion: Transition to the next slide (fade, slide_left, zoom, dissolve, none)

Rules:
- Layouts should vary to maintain visual interest.
- Typography should be consistent across the presentation.
- Animations should enhance, not distract.
- Transitions should be smooth and purposeful.
- Respect brand colors if a brand profile is provided.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          design_specs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point_title: { type: 'string' },
                layout_template: { type: 'string' },
                typography: {
                  type: 'object',
                  properties: {
                    heading: { type: 'string' },
                    body: { type: 'string' },
                    accent: { type: 'string' },
                  },
                },
                color_scheme: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string' },
                    secondary: { type: 'string' },
                    accent: { type: 'string' },
                    background: { type: 'string' },
                  },
                },
                visual_hierarchy: { type: 'array', items: { type: 'string' } },
                animation_suggestions: { type: 'array', items: { type: 'string' } },
                transition_suggestion: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'develop_design',
      department: 'develop',
      configuration_id,
      design_specs: result.design_specs || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});