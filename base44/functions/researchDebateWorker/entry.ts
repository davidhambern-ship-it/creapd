import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Debate Worker
 * Identifies areas of debate, gray areas, contradictory viewpoints.
 * Capability: reasoning (GPT)
 * Output: Debate analysis with preserved viewpoints
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { research_query, topic_id, configuration_id, research_findings } = await req.json();
    if (!research_query) {
      return Response.json({ error: 'research_query is required' }, { status: 400 });
    }

    const prompt = `You are the Debate Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Identify areas of debate, gray areas, contradictory viewpoints, scholarly disagreement, public controversy, and open questions.

RESEARCH QUERY: "${research_query}"

EXISTING RESEARCH FINDINGS:
${JSON.stringify(research_findings || [], null, 2)}

Identify:
- Areas of debate where experts or sources disagree
- Gray areas where evidence is inconclusive
- Competing perspectives with their supporting evidence and weaknesses
- Open questions that remain unresolved
- Emerging developments that could change the landscape

Rules:
- Preserve ALL viewpoints — do not take sides.
- Present each perspective with its strongest supporting evidence.
- Note weaknesses in each argument.
- This is RAW research — preserve debate, do not resolve it.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4',
      response_json_schema: {
        type: 'object',
        properties: {
          areas_of_debate: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string' },
                perspectives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      viewpoint: { type: 'string' },
                      evidence: { type: 'string' },
                      weakness: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          gray_areas: { type: 'array', items: { type: 'string' } },
          open_questions: { type: 'array', items: { type: 'string' } },
          emerging_developments: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json({
      worker_id: 'research_debate',
      department: 'research',
      topic_id,
      areas_of_debate: result.areas_of_debate || [],
      gray_areas: result.gray_areas || [],
      open_questions: result.open_questions || [],
      emerging_developments: result.emerging_developments || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});