import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §4 — Topics Department: Intent Mapping AI
 * Transforms producer intent into a structured Research Assignment.
 * Output: Research Assignment (requires producer approval)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { producer_message, configuration_id, conversation_history } = await req.json();

    if (!producer_message) {
      return Response.json({ error: 'producer_message is required' }, { status: 400 });
    }

    const prompt = `You are the Intent Mapping AI in the CREAPD Research Production Profile (RPP-AI-001 §4).

Your mission: Transform the producer's intent into a structured Research Assignment.

PRODUCER MESSAGE: "${producer_message}"

CONVERSATION HISTORY:
${JSON.stringify(conversation_history || [], null, 2)}

Produce a Research Assignment as JSON with:
- primary_topic: The main research topic
- supporting_topics: Array of related sub-topics
- categories: Suggested research categories
- research_scope: Boundaries of what should/shouldn't be covered
- research_objectives: Array of specific objectives
- missing_information: What needs clarification
- clarification_questions: Questions to ask the producer (only if critical)
- suggested_research_paths: Array of directions to explore

Rules:
- You do NOT perform research. You define WHAT will be researched.
- Research must not begin until the producer approves this assignment.
- Keep the scope focused and achievable.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          primary_topic: { type: 'string' },
          supporting_topics: { type: 'array', items: { type: 'string' } },
          categories: { type: 'array', items: { type: 'string' } },
          research_scope: { type: 'string' },
          research_objectives: { type: 'array', items: { type: 'string' } },
          missing_information: { type: 'array', items: { type: 'string' } },
          clarification_questions: { type: 'array', items: { type: 'string' } },
          suggested_research_paths: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json({
      worker_id: 'topics_intent_mapper',
      department: 'topics',
      research_assignment: result,
      requires_producer_approval: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});