import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Script Worker
 * Creates teleprompter script, presentation script, speaker notes, talking points,
 * story summaries, presenter notes.
 * Capability: long_form_writing (Claude Opus)
 * Output: Scripts & Speaker Notes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_points, dossier, configuration_id, tone, reading_style } = await req.json();
    if (!presentation_points) {
      return Response.json({ error: 'presentation_points is required' }, { status: 400 });
    }

    const prompt = `You are the Script Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create all scripts and narration text from the Presentation Points.

PRESENTATION POINTS:
${JSON.stringify(presentation_points, null, 2)}

DOSSIER CONTEXT:
${typeof dossier === 'string' ? dossier : JSON.stringify(dossier, null, 2)}

TONE: ${tone || 'professional'}
READING STYLE: ${reading_style || 'broadcast_news'}

For each presentation point, create:
- teleprompter_script: Broadcast-ready teleprompter text
- presentation_script: Full presentation script
- speaker_notes: Private notes for the presenter
- talking_points: Key bullet points
- story_summary: 1-2 sentence summary of this segment

Rules:
- Write for spoken delivery, not reading.
- Match the tone and reading style.
- Keep teleprompter scripts concise and natural.
- Speaker notes should include timing cues and emphasis notes.
- All content must trace back to the dossier — do not invent facts.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_opus_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          scripts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point_title: { type: 'string' },
                teleprompter_script: { type: 'string' },
                presentation_script: { type: 'string' },
                speaker_notes: { type: 'string' },
                talking_points: { type: 'array', items: { type: 'string' } },
                story_summary: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'develop_script',
      department: 'develop',
      configuration_id,
      scripts: result.scripts || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});