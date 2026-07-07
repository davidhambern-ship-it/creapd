import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { topic_id, max_points } = body;

    if (!topic_id) return Response.json({ error: 'topic_id is required' }, { status: 400 });

    const topic = await base44.entities.ResearchTopic.get(topic_id);
    if (!topic) return Response.json({ error: 'ResearchTopic not found' }, { status: 404 });

    if (!topic.dossier_id) return Response.json({ error: 'No dossier found for this topic. Run performDeepResearch first.' }, { status: 400 });

    const dossier = await base44.entities.ResearchDossier.get(topic.dossier_id);
    if (!dossier) return Response.json({ error: 'ResearchDossier not found' }, { status: 404 });
    if (dossier.status !== 'ready') return Response.json({ error: `Dossier is not ready (status: ${dossier.status})` }, { status: 400 });

    const limit = max_points || 10;

    // Delete any existing auto-generated points for this topic (so re-extraction is clean)
    const existing = await base44.entities.ResearchPoint.filter({ topic_id, created_by_ai: true });
    if (existing && existing.length > 0) {
      await base44.entities.ResearchPoint.deleteMany({ topic_id, created_by_ai: true });
    }

    // Build the dossier context for the LLM
    const dossierContext = `Executive Summary:
${dossier.executive_summary || 'N/A'}

Context & Background:
${dossier.context_and_background || 'N/A'}

Key Facts:
${safeParse(dossier.key_facts, []).map(f => `- ${f.fact} (Source: ${f.source})`).join('\n') || 'N/A'}

Key People:
${safeParse(dossier.key_people, []).map(p => `- ${p.name} — ${p.role} (${p.relevance})`).join('\n') || 'N/A'}

Key Organizations:
${safeParse(dossier.key_organizations, []).map(o => `- ${o.name} — ${o.type} (${o.relevance})`).join('\n') || 'N/A'}

Timeline:
${safeParse(dossier.timeline, []).map(t => `- ${t.date}: ${t.event} — ${t.significance}`).join('\n') || 'N/A'}

Counter-Arguments:
${safeParse(dossier.counter_arguments, []).map(c => `- ${c.viewpoint}: ${c.summary} (Source: ${c.source})`).join('\n') || 'N/A'}

Data & Statistics:
${safeParse(dossier.data_and_statistics, []).map(d => `- ${d.statistic} (Source: ${d.source})`).join('\n') || 'N/A'}

Coverage Angles:
${safeParse(dossier.coverage_angles, []).map(a => `- ${a.angle}: ${a.rationale} (Target: ${a.target_audience})`).join('\n') || 'N/A'}`;

    const prompt = `You are a broadcast producer reviewing deep research findings. Extract the ${limit} most important, newsworthy, and production-ready points from the research dossier below.

RESEARCH TOPIC: ${topic.title}

DOSSIER:
${dossierContext}

INSTRUCTIONS:
- Extract exactly the ${limit} strongest points for a production.
- Each point should be a self-contained finding that a producer could turn into a segment.
- Vary the point_type — include a mix of findings, statistics, quotes, context, and coverage angles.
- Give each point a clear, concise title (max 15 words).
- Include the full detailed content (3-5 sentences).
- Assign a priority_score (0-10) based on newsworthiness and relevance.
- Assign a suggested_segment based on where this point fits in a broadcast.
- Include a brief significance note explaining why this point matters.
- For each point, carry forward the relevant sources from the dossier.

Return a JSON array of point objects with these fields:
- title (string)
- content (string — the detailed finding, 3-5 sentences)
- point_type (one of: finding, statistic, quote, context, counter_argument, timeline_event, key_person, key_organization, coverage_angle, data_point)
- significance (string — why this matters)
- suggested_angle (string — suggested coverage angle)
- suggested_segment (one of: Lead Story, Quick Hit, Feature, Breaking, Talking Points, Fact Check, B-Roll Package)
- priority_score (number 0-10)
- key_facts (array of {fact, source})
- sources (array of {name, url, source_type, citation})`;

    const schema = {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              point_type: { type: 'string' },
              significance: { type: 'string' },
              suggested_angle: { type: 'string' },
              suggested_segment: { type: 'string' },
              priority_score: { type: 'number' },
              key_facts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { fact: { type: 'string' }, source: { type: 'string' } }
                }
              },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    };

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      model: 'claude_sonnet_4_6'
    });

    // Handle various response formats: {points: [...]}, {response: [...]}, {response: {points: [...]}}, or direct array
    let points = [];
    const raw = llmResponse;
    if (Array.isArray(raw)) {
      points = raw;
    } else if (raw.points && Array.isArray(raw.points)) {
      points = raw.points;
    } else if (raw.response) {
      // Response might be a string (JSON) or an object/array
      if (typeof raw.response === 'string') {
        try {
          const parsed = JSON.parse(raw.response);
          if (Array.isArray(parsed)) points = parsed;
          else if (parsed.points && Array.isArray(parsed.points)) points = parsed.points;
        } catch {}
      } else if (Array.isArray(raw.response)) {
        points = raw.response;
      } else if (raw.response.points && Array.isArray(raw.response.points)) {
        points = raw.response.points;
      }
    }

    console.log(`LLM response type: ${typeof llmResponse}, points count: ${points.length}, raw keys: ${Object.keys(llmResponse || {}).join(', ')}`);

    // Bulk create ResearchPoint records
    const pointRecords = points.map((p, i) => ({
      configuration_id: topic.configuration_id,
      topic_id: topic.id,
      topic_title: topic.title,
      title: p.title || 'Untitled Point',
      content: p.content || '',
      point_type: p.point_type || 'finding',
      key_facts: JSON.stringify(p.key_facts || []),
      sources: JSON.stringify(p.sources || []),
      significance: p.significance || '',
      suggested_angle: p.suggested_angle || '',
      suggested_segment: p.suggested_segment || 'Quick Hit',
      priority_score: p.priority_score || 5,
      confidence_score: topic.confidence_score || 0,
      status: 'pending',
      order: i,
      created_by_ai: true
    }));

    if (pointRecords.length > 0) {
      await base44.entities.ResearchPoint.bulkCreate(pointRecords);
    }

    // Update topic with point count
    await base44.entities.ResearchTopic.update(topic_id, {
      status: 'in_review',
      point_count: pointRecords.length
    });

    return Response.json({
      success: true,
      topic_id,
      points_extracted: pointRecords.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}