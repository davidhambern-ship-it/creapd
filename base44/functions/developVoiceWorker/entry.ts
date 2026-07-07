import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §7 — Develop Department: Voice Worker
 * Creates narration script, voice package, voiceovers, timing, pronunciation notes,
 * music suggestions, sound effect suggestions.
 * Capability: long_form_writing (Claude Opus)
 * Output: Voice Package & Narration
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { scripts, presentation_points, configuration_id, voice_id } = await req.json();
    if (!scripts) {
      return Response.json({ error: 'scripts is required' }, { status: 400 });
    }

    const prompt = `You are the Voice Worker in the CREAPD Develop Department (RPP-AI-001 §7).

Your mission: Create narration scripts, voice packages with timing, and audio suggestions.

SCRIPTS:
${JSON.stringify(scripts, null, 2)}

For each script segment, create:
- narration_script: The exact text to be narrated (may differ from teleprompter)
- estimated_duration_seconds: Estimated speaking duration
- pronunciation_notes: Difficult names, terms, or words requiring guidance
- pacing_notes: Speed and rhythm guidance
- emphasis_points: Words or phrases to emphasize

Also provide:
- music_suggestions: Background music recommendations per segment
- sound_effect_suggestions: Sound effects that enhance the presentation
- total_estimated_runtime: Total presentation runtime

Rules:
- Narration scripts should be optimized for spoken delivery.
- Duration estimates should account for natural pacing.
- Pronunciation notes should cover unfamiliar terms.
- Music suggestions should match the tone of each segment.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_opus_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          voice_segments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                point_title: { type: 'string' },
                narration_script: { type: 'string' },
                estimated_duration_seconds: { type: 'number' },
                pronunciation_notes: { type: 'array', items: { type: 'string' } },
                pacing_notes: { type: 'string' },
                emphasis_points: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          music_suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                segment: { type: 'string' },
                suggestion: { type: 'string' },
                mood: { type: 'string' },
              },
            },
          },
          sound_effect_suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                segment: { type: 'string' },
                effect: { type: 'string' },
                timing: { type: 'string' },
              },
            },
          },
          total_estimated_runtime: { type: 'number' },
        },
      },
    });

    return Response.json({
      worker_id: 'develop_voice',
      department: 'develop',
      configuration_id,
      voice_id: voice_id || 'river',
      voice_segments: result.voice_segments || [],
      music_suggestions: result.music_suggestions || [],
      sound_effect_suggestions: result.sound_effect_suggestions || [],
      total_estimated_runtime: result.total_estimated_runtime || 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});