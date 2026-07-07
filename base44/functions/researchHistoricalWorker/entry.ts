import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Historical Research Worker
 * Builds historical context, timelines, chronology, major events.
 * Capability: deep_research (Gemini with web search)
 * Output: Historical context and timeline
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { research_query, topic_id, configuration_id } = await req.json();
    if (!research_query) {
      return Response.json({ error: 'research_query is required' }, { status: 400 });
    }

    const prompt = `You are the Historical Research Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Build historical context, timelines, and chronology.

RESEARCH QUERY: "${research_query}"

Construct a chronological timeline of major events related to this topic. For each event:
- Date (or approximate period)
- Event description
- Significance to the topic
- Source attribution

Also provide a historical background summary explaining how the topic evolved over time.

Rules:
- Only include events from verifiable historical records.
- Do NOT fabricate dates or events.
- Flag uncertain dates.
- This is RAW research — do not interpret, just collect and organize chronologically.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          background_summary: { type: 'string' },
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                event: { type: 'string' },
                significance: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_historical',
      department: 'research',
      topic_id,
      background_summary: result.background_summary || '',
      timeline: result.timeline || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});