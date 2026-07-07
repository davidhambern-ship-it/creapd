import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §6 — Dossier Department: Knowledge Organization AI
 * Transforms raw research into structured knowledge.
 * Capability: organization (Claude)
 * Output: Approved Research Dossier (requires producer approval)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { raw_research, topic_id, configuration_id, research_query } = await req.json();
    if (!raw_research) {
      return Response.json({ error: 'raw_research is required' }, { status: 400 });
    }

    const prompt = `You are the Knowledge Organization AI in the CREAPD Dossier Department (RPP-AI-001 §6).

Your mission: Transform raw research into a structured Research Dossier.

RESEARCH QUERY: "${research_query || ''}"

RAW RESEARCH DATA:
${typeof raw_research === 'string' ? raw_research : JSON.stringify(raw_research, null, 2)}

Organize the research into a structured dossier with:
- executive_summary: 2-3 paragraph synthesis of all findings
- background: Historical context and background information
- timeline: Array of {date, event, significance}
- key_facts: Array of {fact, source, confidence}
- important_people: Array of {name, role, relevance}
- organizations: Array of {name, role, relevance}
- statistics: Array of {value, context, source, year}
- sources: Array of {name, url, source_type, citation}
- areas_of_debate: Array of {topic, perspectives}
- open_questions: Array of unresolved questions
- related_topics: Array of related topics for future research
- confidence_score: Overall confidence 0-100

Rules:
- Do NOT perform new research. Only organize what exists in the raw data.
- Preserve all source attributions.
- Preserve conflicting viewpoints.
- The Dossier becomes the authoritative knowledge source for downstream departments.
- No downstream department should return to raw research unless additional research is requested.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          background: { type: 'string' },
          timeline: { type: 'array' },
          key_facts: { type: 'array' },
          important_people: { type: 'array' },
          organizations: { type: 'array' },
          statistics: { type: 'array' },
          sources: { type: 'array' },
          areas_of_debate: { type: 'array' },
          open_questions: { type: 'array' },
          related_topics: { type: 'array' },
          confidence_score: { type: 'number' },
        },
      },
    });

    return Response.json({
      worker_id: 'dossier_organizer',
      department: 'dossier',
      topic_id,
      dossier: result,
      requires_producer_approval: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});