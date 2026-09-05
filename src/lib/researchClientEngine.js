import { base44 } from '@/api/base44Client';

const DEFAULT_MODEL = 'gemini_3_flash';

const schema = (properties) => ({ type: 'object', properties });
const stringArray = { type: 'array', items: { type: 'string' } };

function now() {
  return new Date().toISOString();
}

function safeJson(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function updateProgress(dossierId, stage, timings = {}, extra = {}) {
  await base44.entities.ResearchDossier.update(dossierId, {
    orchestration_metadata: JSON.stringify({
      pipeline: 'clientResearchV1',
      current_stage: stage,
      stage_timings: timings,
      ...extra,
    }),
  });
}

export async function runResearchClient(topic) {
  if (!topic?.id) throw new Error('Research topic is required.');

  const timings = {};
  const stageErrors = [];
  let dossier;

  try {
    await base44.entities.ResearchTopic.update(topic.id, {
      status: 'researching',
      research_started_at: now(),
    });

    // Create the dossier before any expensive work so the existing progress UI
    // immediately leaves its "Initializing" state.
    dossier = await base44.entities.ResearchDossier.create({
      topic_id: topic.id,
      research_query: topic.research_query || `${topic.title}. ${topic.description || ''}`.trim(),
      status: 'researching',
      role_assignments: JSON.stringify({
        query_expansion: DEFAULT_MODEL,
        discovery: DEFAULT_MODEL,
        synthesis: DEFAULT_MODEL,
        verification: DEFAULT_MODEL,
        critical_analysis: DEFAULT_MODEL,
      }),
      orchestration_metadata: JSON.stringify({
        pipeline: 'clientResearchV1',
        current_stage: 'query_expansion',
        stage_timings: {},
      }),
    });

    const researchQuery = dossier.research_query;
    const context = `TOPIC: ${topic.title}\nDESCRIPTION: ${topic.description || 'No description provided'}\nCATEGORY: ${topic.category || 'general'}\nRESEARCH DEPTH: ${topic.research_depth || 'standard'}`;

    // 1. Query expansion
    let started = Date.now();
    const expansion = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      prompt: `You are a research strategist. Break this research topic into five focused web-search queries covering the main topic, key people, organizations, opposing viewpoints, and quantitative evidence.\n\n${context}\n\nReturn JSON with one key: queries (array of strings).`,
      response_json_schema: schema({ queries: stringArray }),
    });
    const queries = (expansion?.queries || [researchQuery]).slice(0, 5);
    timings.query_expansion_ms = Date.now() - started;
    await updateProgress(dossier.id, 'discovery', timings, { sub_queries_run: queries.length });

    // 2. Discovery — browser-safe replacement for the server-side fetch pipeline.
    started = Date.now();
    const discovery = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      add_context_from_internet: true,
      prompt: `You are CREAPD's research discovery analyst. Research the topic using current internet context.\n\n${context}\n\nSEARCH ANGLES:\n${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nReturn only factual findings supported by real sources. Include URLs when available. Return JSON with:\nfindings: array of objects {fact, source_name, source_url}\nsources: array of objects {name, url, source_type, citation}.`,
      response_json_schema: schema({
        findings: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, source_name: { type: 'string' }, source_url: { type: 'string' } } } },
        sources: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } } } },
      }),
    });
    const findings = discovery?.findings || [];
    const sources = discovery?.sources || [];
    timings.discovery_ms = Date.now() - started;

    await base44.entities.ResearchDossier.update(dossier.id, {
      discovery_raw_data: JSON.stringify({ sub_queries: queries, all_findings: findings, all_sources: sources, timings }),
    });
    await updateProgress(dossier.id, 'source_verification', timings, {
      sub_queries_run: queries.length,
      sources_discovered: sources.length,
      findings_collected: findings.length,
    });

    // 3. Source verification — re-check claims with internet context instead of
    // raw cross-origin fetch(), which is not reliable from the browser.
    started = Date.now();
    const sourceVerification = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      add_context_from_internet: true,
      prompt: `Act as a source verifier. Re-check the following discovered claims against current web context. Keep only claims that can be supported.\n\nTOPIC: ${topic.title}\nCLAIMS:\n${JSON.stringify(findings.slice(0, 20))}\nSOURCES:\n${JSON.stringify(sources.slice(0, 20))}\n\nReturn JSON with verified_findings (array of {fact, source_name, source_url}) and verified_sources (array of {name, url, source_type, citation}).`,
      response_json_schema: schema({
        verified_findings: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, source_name: { type: 'string' }, source_url: { type: 'string' } } } },
        verified_sources: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } } } },
      }),
    });
    const verifiedFindings = sourceVerification?.verified_findings?.length ? sourceVerification.verified_findings : findings;
    const verifiedSources = sourceVerification?.verified_sources?.length ? sourceVerification.verified_sources : sources;
    timings.source_verification_ms = Date.now() - started;
    await updateProgress(dossier.id, 'synthesis', timings, {
      sub_queries_run: queries.length,
      sources_discovered: sources.length,
      sources_verified: verifiedSources.length,
      findings_collected: verifiedFindings.length,
    });

    // 4. Synthesis
    started = Date.now();
    const synthesis = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      prompt: `You are a senior research analyst. Build a production-ready dossier from the verified research below. Do not invent facts.\n\n${context}\n\nVERIFIED FINDINGS:\n${JSON.stringify(verifiedFindings)}\n\nVERIFIED SOURCES:\n${JSON.stringify(verifiedSources)}\n\nReturn JSON with: executive_summary (string), context_and_background (string), key_facts (array {fact, source}), key_people (array {name, role, relevance}), key_organizations (array {name, type, relevance}), timeline (array {date, event, significance}), counter_arguments (array {viewpoint, summary, source}), data_and_statistics (array {statistic, source}), coverage_angles (array {angle, rationale, target_audience}), sources (array {name, url, source_type, citation, verified}), confidence_score (number 0-100).`,
      response_json_schema: schema({
        executive_summary: { type: 'string' },
        context_and_background: { type: 'string' },
        key_facts: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, source: { type: 'string' } } } },
        key_people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, relevance: { type: 'string' } } } },
        key_organizations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, relevance: { type: 'string' } } } },
        timeline: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string' } } } },
        counter_arguments: { type: 'array', items: { type: 'object', properties: { viewpoint: { type: 'string' }, summary: { type: 'string' }, source: { type: 'string' } } } },
        data_and_statistics: { type: 'array', items: { type: 'object', properties: { statistic: { type: 'string' }, source: { type: 'string' } } } },
        coverage_angles: { type: 'array', items: { type: 'object', properties: { angle: { type: 'string' }, rationale: { type: 'string' }, target_audience: { type: 'string' } } } },
        sources: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' }, verified: { type: 'boolean' } } } },
        confidence_score: { type: 'number' },
      }),
    });
    timings.synthesis_ms = Date.now() - started;

    await base44.entities.ResearchDossier.update(dossier.id, {
      executive_summary: synthesis?.executive_summary || '',
      context_and_background: synthesis?.context_and_background || '',
      key_facts: JSON.stringify(synthesis?.key_facts || []),
      key_people: JSON.stringify(synthesis?.key_people || []),
      key_organizations: JSON.stringify(synthesis?.key_organizations || []),
      timeline: JSON.stringify(synthesis?.timeline || []),
      counter_arguments: JSON.stringify(synthesis?.counter_arguments || []),
      data_and_statistics: JSON.stringify(synthesis?.data_and_statistics || []),
      coverage_angles: JSON.stringify(synthesis?.coverage_angles || []),
      sources: JSON.stringify(synthesis?.sources || verifiedSources),
      confidence_score: synthesis?.confidence_score || 0,
    });
    await updateProgress(dossier.id, 'verification', timings);

    // 5. Claim verification
    started = Date.now();
    const verification = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      add_context_from_internet: true,
      prompt: `Fact-check these synthesized claims for the topic "${topic.title}". Return claims with claim, score (0-100), status (verified, partially_verified, unverified, disputed), and notes.\n\nCLAIMS:\n${JSON.stringify(synthesis?.key_facts || [])}`,
      response_json_schema: schema({
        claims: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, score: { type: 'number' }, status: { type: 'string' }, notes: { type: 'string' } } } },
      }),
    });
    timings.verification_ms = Date.now() - started;
    await base44.entities.ResearchDossier.update(dossier.id, {
      claim_confidence_scores: JSON.stringify(verification?.claims || []),
    });
    await updateProgress(dossier.id, 'critical_analysis', timings);

    // 6. Critical analysis
    started = Date.now();
    const critical = await base44.integrations.Core.InvokeLLM({
      model: DEFAULT_MODEL,
      prompt: `Stress-test this research dossier. Identify ambiguity, logical gaps, competing perspectives, unanswered questions, and debate potential.\n\nTOPIC: ${topic.title}\nSUMMARY: ${synthesis?.executive_summary || ''}\nKEY FACTS: ${JSON.stringify(synthesis?.key_facts || [])}\nCOUNTER ARGUMENTS: ${JSON.stringify(synthesis?.counter_arguments || [])}\n\nReturn JSON with gray_areas (string array), logical_gaps (string array), competing_perspectives (array {viewpoint, evidence, weakness}), open_questions (string array), debate_potential_score (0-10 number), organization_structure (object with themes array of {theme, description, significance}).`,
      response_json_schema: schema({
        gray_areas: stringArray,
        logical_gaps: stringArray,
        competing_perspectives: { type: 'array', items: { type: 'object', properties: { viewpoint: { type: 'string' }, evidence: { type: 'string' }, weakness: { type: 'string' } } } },
        open_questions: stringArray,
        debate_potential_score: { type: 'number' },
        organization_structure: { type: 'object', properties: { themes: { type: 'array', items: { type: 'object', properties: { theme: { type: 'string' }, description: { type: 'string' }, significance: { type: 'string' } } } } } },
      }),
    });
    timings.critical_analysis_ms = Date.now() - started;

    await base44.entities.ResearchDossier.update(dossier.id, {
      critical_analysis_report: JSON.stringify({
        gray_areas: critical?.gray_areas || [],
        logical_gaps: critical?.logical_gaps || [],
        competing_perspectives: critical?.competing_perspectives || [],
        open_questions: critical?.open_questions || [],
      }),
      debate_potential_score: critical?.debate_potential_score || 0,
      organization_structure: JSON.stringify(critical?.organization_structure || { themes: [] }),
      status: 'ready',
      orchestration_metadata: JSON.stringify({
        pipeline: 'clientResearchV1',
        current_stage: 'complete',
        stage_timings: timings,
        stage_errors: stageErrors,
        sub_queries_run: queries.length,
        sources_discovered: sources.length,
        sources_verified: verifiedSources.length,
        findings_collected: verifiedFindings.length,
      }),
    });

    await base44.entities.ResearchTopic.update(topic.id, {
      status: 'researched',
      dossier_id: dossier.id,
      confidence_score: synthesis?.confidence_score || 0,
      sources_count: (synthesis?.sources || verifiedSources).length,
      executive_summary: synthesis?.executive_summary || '',
      research_completed_at: now(),
    });

    return { success: true, dossier_id: dossier.id };
  } catch (error) {
    if (dossier?.id) {
      try {
        await base44.entities.ResearchDossier.update(dossier.id, {
          status: 'failed',
          error_message: error?.message || 'Research failed.',
          orchestration_metadata: JSON.stringify({
            pipeline: 'clientResearchV1',
            current_stage: 'failed',
            stage_timings: timings,
            stage_errors: [...stageErrors, { stage: 'fatal', error: error?.message || 'Research failed.' }],
          }),
        });
      } catch {}
    }
    try { await base44.entities.ResearchTopic.update(topic.id, { status: 'failed' }); } catch {}
    throw error;
  }
}

export async function extractResearchPointsClient(topic, maxPoints = 10) {
  if (!topic?.id) throw new Error('Research topic is required.');
  const currentTopic = await base44.entities.ResearchTopic.get(topic.id);
  if (!currentTopic?.dossier_id) throw new Error('No dossier found for this topic.');

  const dossier = await base44.entities.ResearchDossier.get(currentTopic.dossier_id);
  if (!dossier || dossier.status !== 'ready') throw new Error('Research dossier is not ready.');

  const response = await base44.integrations.Core.InvokeLLM({
    model: 'claude_sonnet_4_6',
    prompt: `You are a broadcast producer. Extract the ${maxPoints} strongest production-ready points from this research dossier. Return a balanced mix of findings, statistics, context, counter-arguments, timeline events, people, organizations, and coverage angles.\n\nTOPIC: ${currentTopic.title}\nEXECUTIVE SUMMARY: ${dossier.executive_summary || ''}\nCONTEXT: ${dossier.context_and_background || ''}\nKEY FACTS: ${dossier.key_facts || '[]'}\nPEOPLE: ${dossier.key_people || '[]'}\nORGANIZATIONS: ${dossier.key_organizations || '[]'}\nTIMELINE: ${dossier.timeline || '[]'}\nCOUNTER ARGUMENTS: ${dossier.counter_arguments || '[]'}\nSTATISTICS: ${dossier.data_and_statistics || '[]'}\nCOVERAGE ANGLES: ${dossier.coverage_angles || '[]'}\nSOURCES: ${dossier.sources || '[]'}\n\nReturn JSON with points: array of objects containing title, content, point_type, significance, suggested_angle, suggested_segment, priority_score (0-10), key_facts (array {fact, source}), sources (array {name, url, source_type, citation}).`,
    response_json_schema: schema({
      points: { type: 'array', items: { type: 'object', properties: {
        title: { type: 'string' }, content: { type: 'string' }, point_type: { type: 'string' }, significance: { type: 'string' }, suggested_angle: { type: 'string' }, suggested_segment: { type: 'string' }, priority_score: { type: 'number' },
        key_facts: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, source: { type: 'string' } } } },
        sources: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } } } },
      } } },
    }),
  });

  const points = (response?.points || []).slice(0, maxPoints);
  const existing = await base44.entities.ResearchPoint.filter({ topic_id: currentTopic.id, created_by_ai: true });
  if (existing?.length) {
    await base44.entities.ResearchPoint.deleteMany({ topic_id: currentTopic.id, created_by_ai: true });
  }

  const records = points.map((p, i) => ({
    configuration_id: currentTopic.configuration_id,
    topic_id: currentTopic.id,
    topic_title: currentTopic.title,
    title: p.title || 'Untitled Point',
    content: p.content || '',
    point_type: p.point_type || 'finding',
    key_facts: JSON.stringify(p.key_facts || []),
    sources: JSON.stringify(p.sources || safeJson(dossier.sources, [])),
    significance: p.significance || '',
    suggested_angle: p.suggested_angle || '',
    suggested_segment: p.suggested_segment || 'Quick Hit',
    priority_score: p.priority_score || 5,
    confidence_score: currentTopic.confidence_score || 0,
    status: 'pending',
    order: i,
    created_by_ai: true,
  }));

  if (records.length) await base44.entities.ResearchPoint.bulkCreate(records);
  await base44.entities.ResearchTopic.update(currentTopic.id, {
    status: 'in_review',
    point_count: records.length,
  });

  return { success: true, points_extracted: records.length };
}
