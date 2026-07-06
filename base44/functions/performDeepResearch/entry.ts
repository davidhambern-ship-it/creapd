import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44, dossierId;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, research_depth } = body;

    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.entities.Article.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });

    const researchQuery = `${article.title}. ${article.summary || ''}`.trim();

    // Create dossier record in "researching" state
    const dossier = await base44.entities.ResearchDossier.create({
      article_id,
      research_query: researchQuery,
      status: 'researching'
    });
    dossierId = dossier.id;

    // ===== LLM CALL: Deep research with internet context =====
    const prompt = `You are a deep research analyst. Perform thorough, source-based research on the following story topic. Use information available on the internet to go well beyond what is in the original article.

STORY:
Title: ${article.title}
Source: ${article.source_name || article.publication || 'Unknown'}
Summary: ${article.summary || 'No summary available'}
Category: ${article.category || 'general'}
Published: ${article.published_at || 'Unknown'}

RESEARCH OBJECTIVES:
1. KEY FACTS: Identify 5-10 verifiable facts central to this story. Each fact must include a source attribution.
2. CONTEXT & BACKGROUND: Provide the historical and situational context a producer would need to understand why this story matters now.
3. KEY PEOPLE: Identify the key people involved or referenced. For each: name, role/title, and their relevance to the story.
4. KEY ORGANIZATIONS: Identify the key organizations, companies, or institutions involved. For each: name, type, and relevance.
5. TIMELINE: Build a chronological timeline of key events leading up to and surrounding this story.
6. COUNTER-ARGUMENTS: Identify any differing viewpoints, criticisms, or counter-narratives. Each must include attribution.
7. DATA & STATISTICS: Identify relevant statistics, figures, or data points that quantify or contextualize the story. Each must include a source.
8. COVERAGE ANGLES: Suggest 3-5 distinct coverage angles a producer could take. Each: angle, rationale, and target audience.
9. SOURCES: List all sources consulted with full citation info.

Return a JSON object with exactly these keys:
- executive_summary (string — 2-3 paragraph synthesis)
- key_facts (array of {fact, source})
- context_and_background (string)
- key_people (array of {name, role, relevance})
- key_organizations (array of {name, type, relevance})
- timeline (array of {date, event, significance})
- counter_arguments (array of {viewpoint, summary, source})
- data_and_statistics (array of {statistic, source})
- coverage_angles (array of {angle, rationale, target_audience})
- sources (array of {name, url, source_type, citation})
- confidence_score (number 0-100 — how complete and well-sourced the research is)`;

    const schema = {
      type: 'object',
      properties: {
        executive_summary: { type: 'string' },
        key_facts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { fact: { type: 'string' }, source: { type: 'string' } }
          }
        },
        context_and_background: { type: 'string' },
        key_people: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, role: { type: 'string' }, relevance: { type: 'string' } }
          }
        },
        key_organizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, type: { type: 'string' }, relevance: { type: 'string' } }
          }
        },
        timeline: {
          type: 'array',
          items: {
            type: 'object',
            properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string' } }
          }
        },
        counter_arguments: {
          type: 'array',
          items: {
            type: 'object',
            properties: { viewpoint: { type: 'string' }, summary: { type: 'string' }, source: { type: 'string' } }
          }
        },
        data_and_statistics: {
          type: 'array',
          items: {
            type: 'object',
            properties: { statistic: { type: 'string' }, source: { type: 'string' } }
          }
        },
        coverage_angles: {
          type: 'array',
          items: {
            type: 'object',
            properties: { angle: { type: 'string' }, rationale: { type: 'string' }, target_audience: { type: 'string' } }
          }
        },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } }
          }
        },
        confidence_score: { type: 'number' }
      }
    };

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema,
      model: 'gemini_3_1_pro'
    });

    // Save findings and mark ready
    const updated = await base44.entities.ResearchDossier.update(dossierId, {
      executive_summary: llmResponse.executive_summary || '',
      key_facts: JSON.stringify(llmResponse.key_facts || []),
      context_and_background: llmResponse.context_and_background || '',
      key_people: JSON.stringify(llmResponse.key_people || []),
      key_organizations: JSON.stringify(llmResponse.key_organizations || []),
      timeline: JSON.stringify(llmResponse.timeline || []),
      counter_arguments: JSON.stringify(llmResponse.counter_arguments || []),
      data_and_statistics: JSON.stringify(llmResponse.data_and_statistics || []),
      coverage_angles: JSON.stringify(llmResponse.coverage_angles || []),
      sources: JSON.stringify(llmResponse.sources || []),
      confidence_score: llmResponse.confidence_score || 0,
      status: 'ready'
    });

    return Response.json({
      success: true,
      dossier_id: dossierId,
      confidence_score: llmResponse.confidence_score || 0,
      sources_count: (llmResponse.sources || []).length
    });
  } catch (error) {
    if (base44 && dossierId) {
      try { await base44.entities.ResearchDossier.update(dossierId, { status: 'failed', error_message: error.message }); } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});