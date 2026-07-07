import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Source Verification Worker
 * Evaluates source credibility, authority, trustworthiness, confidence.
 * Capability: reasoning (GPT)
 * Output: Source credibility assessments
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sources, research_query, topic_id, configuration_id } = await req.json();
    if (!sources || !Array.isArray(sources)) {
      return Response.json({ error: 'sources array is required' }, { status: 400 });
    }

    const prompt = `You are the Source Verification Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Evaluate source credibility, authority, trustworthiness, and confidence.

RESEARCH QUERY: "${research_query}"

SOURCES TO EVALUATE:
${JSON.stringify(sources, null, 2)}

For each source, provide:
- Source name and URL
- Credibility score (0-100)
- Authority assessment (why this source is or isn't trustworthy)
- Potential biases
- Conflicts with other sources

Rules:
- Be objective and evidence-based in your assessments.
- Flag sources with known biases.
- Identify conflicting sources.
- Do NOT discard sources — preserve them with confidence scores.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4',
      response_json_schema: {
        type: 'object',
        properties: {
          assessments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_name: { type: 'string' },
                source_url: { type: 'string' },
                credibility_score: { type: 'number' },
                authority_assessment: { type: 'string' },
                biases: { type: 'array', items: { type: 'string' } },
                conflicts_with: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_source_verification',
      department: 'research',
      topic_id,
      assessments: result.assessments || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});