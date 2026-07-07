import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §8 — Packet Department: Export Worker
 * Produces disposable export files from the editable presentation.
 * StoriesPresentation remains the authoritative editable source.
 * Capability: organization (Claude)
 * Output: Export files (disposable)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_id, export_format, configuration_id } = await req.json();

    if (!presentation_id) {
      return Response.json({ error: 'presentation_id is required' }, { status: 400 });
    }

    // Fetch the StoriesPresentation
    const presentation = await base44.entities.StoriesPresentation.get(presentation_id);
    if (!presentation) {
      return Response.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Fetch all slides
    const slides = await base44.entities.StorySlide.filter(
      { presentation_id },
      'order',
      200
    );

    // The Export Worker formats the editable presentation into the requested format
    const format = export_format || 'json';

    if (format === 'json') {
      // JSON export — direct serialization
      return Response.json({
        worker_id: 'packet_export',
        department: 'packet',
        configuration_id,
        export_format: 'json',
        presentation: {
          title: presentation.title,
          slides: slides.map(s => ({
            order: s.order,
            title: s.slide_title,
            content: s.slide_content,
            speaker_notes: s.speaker_notes,
            narration: s.narration_script,
            layout: s.layout_template,
            transition: s.transition,
          })),
        },
        note: 'JSON export. StoriesPresentation remains the authoritative editable source.',
      });
    }

    // For other formats, generate export metadata
    const prompt = `You are the Export Worker in the CREAPD Packet Department (RPP-AI-001 §8).

Your mission: Prepare the presentation for export to ${format}.

PRESENTATION:
${JSON.stringify({
  title: presentation.title,
  slide_count: slides.length,
  slides: slides.map(s => ({
    title: s.slide_title,
    content: s.slide_content,
    notes: s.speaker_notes,
  })),
}, null, 2)}

Create export-ready content formatted for ${format}. The exported file is disposable — the StoriesPresentation remains the authoritative editable source.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({
      worker_id: 'packet_export',
      department: 'packet',
      configuration_id,
      export_format: format,
      export_content: result,
      presentation_title: presentation.title,
      slide_count: slides.length,
      note: 'Export is disposable. StoriesPresentation remains the authoritative editable source.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});