import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Fact Research Worker
 * Collects verified factual information with source attribution.
 * Capability: deep_research (Gemini with web search)
 * Output: Verified facts with citations
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { research_query, topic_id, configuration_id, focus_area } = await req.json();
    if (!research_query) {
      return Response.json({ error: 'research_query is required' }, { status: 400 });
    }

    const prompt = `You are the Fact Research Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Collect verified factual information.

RESEARCH QUERY: "${research_query}"
${focus_area ? `FOCUS AREA: ${focus_area}` : ''}

Gather verified facts with source attribution. For each fact, provide:
- The fact statement
- Source name, URL, source type
- Confidence level (0-100)

Rules:
- Only include facts you can verify from real sources.
- Do NOT fabricate sources or URLs.
- Flag any unverified claims.
- Preserve conflicting information from different sources.
- This is RAW research — do not organize or interpret, just collect facts.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          facts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fact: { type: 'string' },
                source_name: { type: 'string' },
                source_url: { type: 'string' },
                source_type: { type: 'string' },
                confidence: { type: 'number' },
                conflicting: { type: 'boolean' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_fact',
      department: 'research',
      topic_id,
      facts: result.facts || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});