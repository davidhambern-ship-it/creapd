import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * APD Step 1 — Semantic Transcript / Visual Intent Map
 *
 * Pre-processes a narration script into a segment-by-segment Visual Intent Map.
 * Each segment identifies what visual elements the APD needs at that point in
 * the narration — statistics, charts, images, quotes, lower thirds, etc.
 *
 * This runs BEFORE scene graph generation, giving the APD explicit visual cues
 * rather than relying on the LLM to infer visual needs from raw script text.
 *
 * Output: visual_intent_map — array of segments with:
 *   - segment_text, start_time, end_time
 *   - intent (introduce_topic, present_data, emotional_moment, etc.)
 *   - keywords (for asset library lookup)
 *   - visual_cue (chart, statistic, image, quote_highlight, lower_third, etc.)
 *   - suggested_element_types (headline, statistic, image, chart, etc.)
 *   - emotional_tone (neutral, urgent, positive, somber, etc.)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      headline,
      story_summary,
      teleprompter_script,
      talking_points,
      sentence_timeline,
      production_profile,
      fact_check_notes,
    } = body;

    if (!teleprompter_script && !story_summary) {
      return Response.json({ error: 'Either teleprompter_script or story_summary is required' }, { status: 400 });
    }

    const sentences = Array.isArray(sentence_timeline) ? sentence_timeline : [];
    const totalDurationMs = sentences.length > 0
      ? Math.max(...sentences.map(s => (s.end_time || 0) * 1000))
      : 0;

    const prompt = `You are the CREAPD Visual Intent Analyzer. Your job is to read a narration script and produce a Visual Intent Map — a segment-by-segment breakdown of what visuals the presentation needs at each point in the narration.

HEADLINE: ${headline || 'Untitled'}
STORY SUMMARY: ${story_summary || ''}
TELEPROMPTER SCRIPT:
${(teleprompter_script || '').substring(0, 3000)}

TALKING POINTS:
${talking_points || 'None'}

FACT CHECK NOTES:
${(fact_check_notes || '').substring(0, 500)}

SENTENCE TIMELINE (ms):
${JSON.stringify(sentences.slice(0, 40), null, 2)}

TOTAL DURATION: ${totalDurationMs}ms

INSTRUCTIONS:
Break the narration into 2-8 semantic segments based on topic shifts, data mentions, emotional shifts, or key points. For each segment, identify:
- segment_text: The narration text for this segment (excerpt)
- start_time: Start time in ms (align with sentence boundaries from the timeline)
- end_time: End time in ms
- intent: The communicative intent — one of: "introduce_topic", "present_data", "tell_story", "emotional_moment", "emphasize_quote", "call_to_action", "transition", "conclude"
- keywords: Key terms or entities mentioned (array — these will be used for asset library lookup)
- visual_cue: The PRIMARY visual type needed — one of: "chart", "statistic", "image", "quote_highlight", "lower_third", "text_only", "comparison", "timeline", "map"
- suggested_element_types: Array of element types from: headline, body_text, statistic, image, chart, quote, talking_point_card, lower_third, callout, icon
- emotional_tone: "neutral", "urgent", "positive", "somber", "energetic", "contemplative"

RULES:
1. Segments must cover the FULL duration from 0 to ${totalDurationMs}ms with no gaps.
2. Start/end times must align with sentence boundaries from the timeline.
3. Every statistic or number mentioned in the script MUST get visual_cue "statistic".
4. Every quote or emotional statement should get visual_cue "quote_highlight".
5. Segments should be 3-15 seconds long — not too short, not too long.
6. Be specific with keywords — these will be used for asset selection.
7. Not every segment needs a visual — "text_only" is valid for segments where narration alone is sufficient.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          visual_intent_map: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                segment_text: { type: 'string' },
                start_time: { type: 'number' },
                end_time: { type: 'number' },
                intent: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                visual_cue: { type: 'string' },
                suggested_element_types: { type: 'array', items: { type: 'string' } },
                emotional_tone: { type: 'string' },
              },
              required: ['segment_text', 'start_time', 'end_time', 'intent', 'keywords', 'visual_cue', 'suggested_element_types', 'emotional_tone'],
            },
          },
          overall_emotional_arc: { type: 'string' },
          recommended_visual_density: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['visual_intent_map'],
      },
    });

    return Response.json({
      visual_intent_map: result.visual_intent_map || [],
      overall_emotional_arc: result.overall_emotional_arc || '',
      recommended_visual_density: result.recommended_visual_density || 'medium',
      total_duration_ms: totalDurationMs,
      segment_count: (result.visual_intent_map || []).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});