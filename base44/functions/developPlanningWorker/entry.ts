import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Presentation Planning Worker
 * Creates presentation outline, points, story flow, section breaks, slide sequence.
 * One Presentation Point = one future StorySlide.
 * Capability: organization (Claude)
 * Output: Presentation Points & Outline
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { dossier, configuration_id, target_slide_count } = await req.json();
    if (!dossier) {
      return Response.json({ error: 'dossier is required' }, { status: 400 });
    }

    const prompt = `You are the Presentation Planning Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create the presentation structure from the approved Research Dossier.

APPROVED RESEARCH DOSSIER:
${typeof dossier === 'string' ? dossier : JSON.stringify(dossier, null, 2)}

Create a presentation structure. One Presentation Point equals one future StorySlide.

Provide:
- presentation_outline: High-level outline with sections
- presentation_points: Array where each point = one future slide
  - title: Slide title
  - key_message: The main takeaway for this slide
  - content_summary: What this slide covers
  - section: Which section it belongs to
  - order: Sequential position
- story_flow: How the narrative flows from beginning to end
- section_breaks: Where sections divide
- slide_sequence: Recommended ordering rationale

Target approximately ${target_slide_count || 10} slides.

Rules:
- Do NOT write scripts or create visual assets. Only create the structure.
- Each Presentation Point must be self-contained.
- The narrative should flow logically.
- Every point should trace back to the dossier.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          presentation_outline: { type: 'string' },
          presentation_points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                key_message: { type: 'string' },
                content_summary: { type: 'string' },
                section: { type: 'string' },
                order: { type: 'number' },
              },
            },
          },
          story_flow: { type: 'string' },
          section_breaks: { type: 'array', items: { type: 'string' } },
          slide_sequence_rationale: { type: 'string' },
        },
      },
    });

    return Response.json({
      worker_id: 'develop_planning',
      department: 'develop',
      configuration_id,
      presentation_points: result.presentation_points || [],
      presentation_outline: result.presentation_outline || '',
      story_flow: result.story_flow || '',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});