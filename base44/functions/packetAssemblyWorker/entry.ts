import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §8 — Packet Department: Presentation Assembly AI
 * Assembles the editable presentation from all production assets.
 * Does NOT generate content — only assembles.
 * Capability: organization (Claude)
 * Output: Production Packet (Editable StoriesPresentation + StorySlides)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      configuration_id,
      presentation_points,
      scripts,
      image_assets,
      video_assets,
      voice_segments,
      design_specs,
      dossier,
    } = await req.json();

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    // The Assembly AI does not generate content — it maps existing assets to slides.
    // The actual StoriesPresentation creation is handled by buildResearchPacket.
    // This worker provides the assembly map: which assets go on which slide.

    const prompt = `You are the Presentation Assembly AI in the CREAPD Packet Department (RPP-AI-001 §8).

Your mission: Create the assembly map for the editable presentation.
You do NOT generate content. You map existing assets to slides.

PRESENTATION POINTS:
${JSON.stringify(presentation_points || [], null, 2)}

SCRIPTS:
${JSON.stringify(scripts || [], null, 2)}

IMAGE ASSETS:
${JSON.stringify(image_assets || [], null, 2)}

VIDEO ASSETS:
${JSON.stringify(video_assets || [], null, 2)}

VOICE SEGMENTS:
${JSON.stringify(voice_segments || [], null, 2)}

DESIGN SPECS:
${JSON.stringify(design_specs || [], null, 2)}

Create an assembly map: for each slide, specify exactly which assets populate it.
- slide_number
- title (from presentation point)
- body_content (from script)
- speaker_notes (from script)
- image_ref (from image assets)
- video_ref (from video assets)
- narration (from voice segments)
- layout (from design specs)
- animation (from design specs)
- transition (from design specs)

Rules:
- You assemble — you do not create new content.
- Every asset must trace to its source.
- Slides must follow the presentation point order.
- The assembled presentation must remain fully editable.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          assembly_map: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slide_number: { type: 'number' },
                title: { type: 'string' },
                body_content: { type: 'string' },
                speaker_notes: { type: 'string' },
                image_ref: { type: 'string' },
                video_ref: { type: 'string' },
                narration: { type: 'string' },
                layout: { type: 'string' },
                animation: { type: 'string' },
                transition: { type: 'string' },
              },
            },
          },
          total_slides: { type: 'number' },
        },
      },
    });

    return Response.json({
      worker_id: 'packet_assembly',
      department: 'packet',
      configuration_id,
      assembly_map: result.assembly_map || [],
      total_slides: result.total_slides || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});