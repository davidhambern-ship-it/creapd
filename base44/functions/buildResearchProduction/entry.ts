import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, research_point_id, asset_types, tone, reading_style, audience, target_runtime, preferred_models } = body;

    if (!article_id && !research_point_id) return Response.json({ error: 'article_id or research_point_id is required' }, { status: 400 });

    // ===== Determine context: Article or ResearchPoint =====
    let sourceTitle, sourceName, sourceCategory, dossier, sourceRefId, sourceType;

    if (research_point_id) {
      const point = await base44.entities.ResearchPoint.get(research_point_id);
      if (!point) return Response.json({ error: 'ResearchPoint not found' }, { status: 404 });

      sourceRefId = research_point_id;
      sourceType = 'research_point';
      sourceTitle = point.title;
      sourceName = point.topic_title || 'Research Production';
      sourceCategory = point.point_type || 'finding';

      if (!point.topic_id) return Response.json({ error: 'ResearchPoint has no topic_id' }, { status: 400 });
      const topic = await base44.entities.ResearchTopic.get(point.topic_id);
      if (!topic || !topic.dossier_id) return Response.json({ error: 'No dossier found for this topic. Run research first.' }, { status: 400 });
      dossier = await base44.entities.ResearchDossier.get(topic.dossier_id);
      if (!dossier || dossier.status !== 'ready') return Response.json({ error: `Dossier not ready (status: ${dossier?.status || 'missing'})` }, { status: 400 });

      const pointContext = `\n\nRESEARCH POINT (the specific finding to produce):
Point Title: ${point.title}
Point Type: ${point.point_type}
Point Content: ${point.content}
Significance: ${point.significance || 'N/A'}
Suggested Angle: ${point.suggested_angle || 'N/A'}
Suggested Segment: ${point.suggested_segment || 'N/A'}
Point Key Facts: ${safeParse(point.key_facts, []).map(f => `- ${f.fact} (Source: ${f.source})`).join('\n') || 'N/A'}
Point Sources: ${safeParse(point.sources, []).map(s => `- ${s.name}: ${s.citation}`).join('\n') || 'N/A'}`;
      body._pointContext = pointContext;
      body._topicTitle = topic.title;
    } else {
      sourceRefId = article_id;
      sourceType = 'article';
      const article = await base44.entities.Article.get(article_id);
      if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });
      sourceTitle = article.title;
      sourceName = article.source_name || article.publication || 'Unknown';
      sourceCategory = article.category || 'general';

      const dossiers = await base44.entities.ResearchDossier.filter({ article_id, status: 'ready' }, '-created_date', 1);
      if (!dossiers || dossiers.length === 0) {
        return Response.json({ error: 'No ready ResearchDossier found for this article. Run research first.' }, { status: 400 });
      }
      dossier = dossiers[0];
    }

    // Research-dedicated asset types
    const RESEARCH_ASSETS = ['teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions', 'broll_suggestions', 'social_caption', 'fact_check_notes'];
    const requestedAssets = (asset_types && asset_types.length > 0) ? asset_types : RESEARCH_ASSETS;

    const responseSchema = {
      type: 'object',
      properties: {
        ...Object.fromEntries(requestedAssets.map(a => [a, { type: 'string' }])),
        estimated_runtime: { type: 'string' }
      },
      required: [...requestedAssets, 'estimated_runtime']
    };

    const researchContext = `RESEARCH DOSSIER (deep research with internet context):

Executive Summary:
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
${safeParse(dossier.coverage_angles, []).map(a => `- ${a.angle}: ${a.rationale} (Target: ${a.target_audience})`).join('\n') || 'N/A'}

Sources:
${safeParse(dossier.sources, []).map(s => `- ${s.name} (${s.source_type}): ${s.citation}`).join('\n') || 'N/A'}`;

    const pointContext = body._pointContext || '';
    const topicTitle = body._topicTitle || '';

    const buildPrompt = (modelName) => `You are a professional research production producer using the ${modelName} model. Generate production assets for the following ${sourceType === 'research_point' ? 'research point' : 'story'}, using the deep research dossier provided.${sourceType === 'research_point' ? `\n\nRESEARCH TOPIC: ${topicTitle}` : ''}

${sourceType === 'research_point' ? 'RESEARCH POINT' : 'STORY'}:
Title: ${sourceTitle}
Source: ${sourceName}
Category: ${sourceCategory}
${researchContext}${pointContext}

PRODUCTION SETTINGS:
Tone: ${tone || 'professional'}
Reading Style: ${reading_style || 'broadcast_news'}
Audience: ${audience || 'General Public'}
Target Runtime: ${target_runtime || '1 Minute'}

Generate the following production assets. Use the research dossier as your primary source of truth — incorporate verified facts, cite sources where relevant, and reflect the coverage angles in your script.${sourceType === 'research_point' ? ' Focus the script on the specific research point provided above, using the broader dossier for context and supporting details.' : ''}

${requestedAssets.map(a => `- ${a}`).join('\n')}

Also estimate the reading time of the script as "estimated_runtime".

Return a JSON object with these exact string keys: ${[...requestedAssets, 'estimated_runtime'].join(', ')}. Each value should be a string with the generated content.`;

    // Models to run in parallel
    const models = preferred_models && preferred_models.length === 3
      ? preferred_models
      : ['gemini_3_flash', 'gpt_5_mini', 'claude_sonnet_4_6'];

    const parallelResults = await Promise.allSettled(models.map(model =>
      base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(model), response_json_schema: responseSchema, model })
    ));

    const modelOutputs = [];
    parallelResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        modelOutputs.push({ model: models[i], data: result.value });
      }
    });

    if (modelOutputs.length === 0) throw new Error('All model generations failed');

    if (modelOutputs.length === 1) {
      return await savePackage(base44, sourceRefId, sourceType, modelOutputs[0].data, requestedAssets, tone, reading_style, audience, target_runtime, modelOutputs[0].model);
    }

    // Synthesis: Chief Editor merges all outputs
    const modelSummaries = modelOutputs.map(m =>
      `=== ${m.model.toUpperCase()} OUTPUT ===\n${requestedAssets.map(a => `${a}: ${m.data[a] || 'N/A'}`).join('\n')}\nestimated_runtime: ${m.data.estimated_runtime || 'N/A'}`
    ).join('\n\n');

    const synthesisPrompt = `You are the Chief Editor. You have received production assets generated by ${modelOutputs.length} different AI models for the same ${sourceType === 'research_point' ? 'research point' : 'story'}. Your job is to synthesize the best elements from each into a single, high-quality production package.${sourceType === 'research_point' ? `\n\nRESEARCH TOPIC: ${topicTitle}` : ''}

${sourceType === 'research_point' ? 'RESEARCH POINT' : 'STORY'}:
Title: ${sourceTitle}
Source: ${sourceName}

${researchContext}${pointContext}

MODEL OUTPUTS:
${modelSummaries}

INSTRUCTIONS:
- For each asset, pick the best version across all models — or combine the strongest elements from multiple models.
- Ensure factual accuracy by cross-referencing against the research dossier.
- The teleprompter script should be the strongest, most broadcast-ready version.
- Eliminate any redundancy or hallucination — only verified facts from the dossier should remain.
- Maintain consistent tone and style across all assets.${sourceType === 'research_point' ? ' Focus the final script on the specific research point, using the dossier for context.' : ''}

Generate the following assets:
${requestedAssets.map(a => `- ${a}`).join('\n')}

Also estimate the reading time of the script as "estimated_runtime".

Return a JSON object with these exact string keys: ${[...requestedAssets, 'estimated_runtime'].join(', ')}.`;

    const synthesized = await base44.integrations.Core.InvokeLLM({
      prompt: synthesisPrompt,
      response_json_schema: responseSchema,
      model: 'claude_opus_4_6'
    });

    const modelsUsed = modelOutputs.map(m => m.model).join(', ') + ' → synthesized';
    return await savePackage(base44, sourceRefId, sourceType, synthesized, requestedAssets, tone, reading_style, audience, target_runtime, modelsUsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function savePackage(base44, sourceRefId, sourceType, llmResponse, requestedAssets, tone, reading_style, audience, target_runtime, generationProvider) {
  const updateFields = {};
  requestedAssets.forEach(a => { updateFields[a] = llmResponse[a] || ''; });
  updateFields.estimated_runtime = llmResponse.estimated_runtime || '';
  updateFields.tone = tone || 'professional';
  updateFields.reading_style = reading_style || 'broadcast_news';
  updateFields.audience = audience || 'General Public';
  updateFields.target_runtime = target_runtime || '1 Minute';
  updateFields.status = 'generated';
  updateFields.generation_provider = generationProvider;
  updateFields.generated_at = new Date().toISOString();
  updateFields.production_profile = 'news'; // Research packages use news-style production profile

  let filterQuery, existing;
  if (sourceType === 'research_point') {
    filterQuery = { source_entity_type: 'ResearchPoint', source_entity_id: sourceRefId };
  } else {
    filterQuery = { article_id: sourceRefId };
  }

  existing = await base44.entities.ProductionPackage.filter(filterQuery);
  let pkg;

  if (existing && existing.length > 0) {
    updateFields.is_regenerated = true;
    updateFields.generation_count = (existing[0].generation_count || 0) + 1;
    updateFields.is_edited = false;
    pkg = await base44.entities.ProductionPackage.update(existing[0].id, updateFields);
  } else {
    updateFields.generation_count = 1;
    if (sourceType === 'research_point') {
      updateFields.source_entity_type = 'ResearchPoint';
      updateFields.source_entity_id = sourceRefId;
    } else {
      updateFields.article_id = sourceRefId;
    }
    pkg = await base44.entities.ProductionPackage.create(updateFields);
  }

  if (sourceType === 'research_point') {
    try { await base44.entities.ResearchPoint.update(sourceRefId, { package_id: pkg.id, status: 'used' }); } catch {}
  }

  return Response.json({ package: pkg, models_used: generationProvider });
}

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}