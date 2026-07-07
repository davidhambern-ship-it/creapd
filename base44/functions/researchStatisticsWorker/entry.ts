import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Statistics Worker
 * Collects numerical data, reports, studies, percentages, measurements.
 * Capability: deep_research (Gemini with web search)
 * Output: Statistical data with sources
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

    const prompt = `You are the Statistics Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Collect numerical data, reports, studies, percentages, and measurements.

RESEARCH QUERY: "${research_query}"

Gather all relevant statistics. For each statistic:
- The statistic value
- Context (what it measures)
- Source name, URL
- Year/date of data
- Confidence level

Rules:
- Only include statistics from real, verifiable sources.
- Do NOT fabricate numbers or sources.
- Include the year the data was collected.
- Note any methodological caveats.
- This is RAW research — do not interpret, just collect data points.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          statistics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                context: { type: 'string' },
                source_name: { type: 'string' },
                source_url: { type: 'string' },
                year: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_statistics',
      department: 'research',
      topic_id,
      statistics: result.statistics || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});