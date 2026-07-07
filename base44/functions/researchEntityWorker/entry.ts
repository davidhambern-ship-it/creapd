import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Entity Worker
 * Identifies people, organizations, locations, products, events, technologies.
 * Capability: reasoning (GPT)
 * Output: Entity registry
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

    const prompt = `You are the Entity Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Identify people, organizations, locations, products, events, and technologies relevant to the research.

RESEARCH QUERY: "${research_query}"

EXISTING RESEARCH FINDINGS:
${JSON.stringify(research_findings || [], null, 2)}

Extract and categorize all entities mentioned or relevant:
- People (name, role, relevance to topic)
- Organizations (name, type, role, relevance)
- Locations (name, type, relevance)
- Products (name, type, relevance)
- Events (name, date, relevance)
- Technologies (name, type, relevance)

Also identify relationships between entities where possible.

Rules:
- Only include entities that are verifiable.
- Do NOT fabricate entities.
- Note the source where each entity was identified.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_4',
      response_json_schema: {
        type: 'object',
        properties: {
          people: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                role: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          organizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                role: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                date: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          technologies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                relevance: { type: 'string' },
              },
            },
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entity_a: { type: 'string' },
                relationship: { type: 'string' },
                entity_b: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_entity',
      department: 'research',
      topic_id,
      entities: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});