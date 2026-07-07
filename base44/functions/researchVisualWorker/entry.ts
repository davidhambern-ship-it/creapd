import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §5 — Research Department: Visual Research Worker
 * Collects maps, images, charts, reference diagrams, visual references.
 * Capability: deep_research (Gemini with web search)
 * Output: Visual reference collection
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

    const prompt = `You are the Visual Research Worker in the CREAPD Research Department (RPP-AI-001 §5).

Your mission: Collect visual references — maps, images, charts, diagrams.

RESEARCH QUERY: "${research_query}"

Identify visual references that would support this research. For each:
- Type (map, photograph, chart, diagram, infographic, illustration)
- Description of what it shows
- Source URL
- Relevance to the topic

Rules:
- Only reference visuals that actually exist at the cited URLs.
- Do NOT fabricate image URLs.
- Describe what each visual depicts.
- Note any copyright or usage restrictions if known.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          visual_references: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                description: { type: 'string' },
                source_url: { type: 'string' },
                relevance: { type: 'string' },
                usage_notes: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({
      worker_id: 'research_visual',
      department: 'research',
      topic_id,
      visual_references: result.visual_references || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});