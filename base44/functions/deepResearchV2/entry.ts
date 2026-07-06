import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_ROLES = {
  query_expansion: 'gpt_5_mini',
  discovery: 'gemini_3_flash',
  synthesis: 'claude_sonnet_4_6',
  verification: 'gemini_3_flash',
  critical_analysis: 'gpt_5_5'
};

Deno.serve(async (req) => {
  let base44, dossierId;
  const timings = {};
  const stageErrors = [];
  const roles = { ...DEFAULT_ROLES };
  let subQueriesRun = 0;
  let sourcesDiscovered = 0;
  let sourcesVerified = 0;
  let findingsCollected = 0;

  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, topic_id, research_depth, role_assignments } = body;

    if (!article_id && !topic_id) {
      return Response.json({ error: 'article_id or topic_id is required' }, { status: 400 });
    }

    Object.assign(roles, role_assignments || {});

    // ===== Resolve research context =====
    let researchQuery, contextBlock, topicRef = null;

    if (topic_id) {
      topicRef = await base44.entities.ResearchTopic.get(topic_id);
      if (!topicRef) return Response.json({ error: 'ResearchTopic not found' }, { status: 404 });
      researchQuery = topicRef.research_query || `${topicRef.title}. ${topicRef.description || ''}`.trim();
      await base44.entities.ResearchTopic.update(topic_id, {
        status: 'researching',
        research_started_at: new Date().toISOString()
      });
      contextBlock = `TOPIC: ${topicRef.title}
DESCRIPTION: ${topicRef.description || 'No description provided'}
CATEGORY: ${topicRef.category || 'general'}
RESEARCH DEPTH: ${topicRef.research_depth || research_depth || 'standard'}`;
    } else {
      const articleRef = await base44.entities.Article.get(article_id);
      if (!articleRef) return Response.json({ error: 'Article not found' }, { status: 404 });
      researchQuery = `${articleRef.title}. ${articleRef.summary || ''}`.trim();
      contextBlock = `STORY:
Title: ${articleRef.title}
Source: ${articleRef.source_name || articleRef.publication || 'Unknown'}
Summary: ${articleRef.summary || 'No summary available'}
Category: ${articleRef.category || 'general'}
Published: ${articleRef.published_at || 'Unknown'}`;
    }

    // ===== Create dossier =====
    const dossierCreateFields = {
      research_query: researchQuery,
      status: 'researching',
      role_assignments: JSON.stringify(roles)
    };
    if (article_id) dossierCreateFields.article_id = article_id;
    if (topic_id) dossierCreateFields.topic_id = topic_id;
    const dossier = await base44.entities.ResearchDossier.create(dossierCreateFields);
    dossierId = dossier.id;

    // ================================================================
    // STAGE 1: QUERY EXPANSION
    // Break the topic into 5 targeted sub-queries for multi-angle search
    // ================================================================
    let subQueries = [];
    try {
      const t0 = Date.now();
      const expansionRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a research strategist. Break the following research topic into 5 targeted search queries that will provide comprehensive coverage from multiple angles.

${contextBlock}

Generate queries covering:
1. The main topic (broad overview of the core story)
2. Key people or figures involved
3. Key organizations, companies, or institutions
4. Counter-arguments, criticisms, or opposing viewpoints
5. Data, statistics, or quantitative evidence

Each query should be a focused search string. Make them specific enough to return targeted results but broad enough to find good sources.

Return JSON: { "queries": ["query1", "query2", ...] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            queries: { type: 'array', items: { type: 'string' } }
          }
        },
        model: roles.query_expansion
      });
      subQueries = expansionRes.queries || [researchQuery];
      subQueriesRun = subQueries.length;
      timings.query_expansion_ms = Date.now() - t0;
    } catch (err) {
      stageErrors.push({ stage: 'query_expansion', error: err.message });
      subQueries = [researchQuery];
      subQueriesRun = 1;
    }

    // ================================================================
    // STAGE 2: PARALLEL DISCOVERY
    // Fire web searches for ALL sub-queries simultaneously
    // ================================================================
    let allFindings = [];
    let allSources = [];
    try {
      const t1 = Date.now();
      const discoveryPromises = subQueries.map(query =>
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a research analyst. Search the internet for information on this specific query and return raw findings with real sources.

QUERY: ${query}

CRITICAL RULES:
- Only include facts you actually found from real sources
- Include real, accessible URLs — do not fabricate sources
- If you cannot find enough information, return fewer findings rather than making things up

Return JSON:
- findings (array of {fact, source_name, source_url}) — 3-5 key findings from this search
- sources (array of {name, url, source_type, citation}) — all real sources found`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fact: { type: 'string' },
                    source_name: { type: 'string' },
                    source_url: { type: 'string' }
                  }
                }
              },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' },
                    source_type: { type: 'string' },
                    citation: { type: 'string' }
                  }
                }
              }
            }
          },
          model: roles.discovery
        }).catch(err => {
          stageErrors.push({ stage: 'discovery', query, error: err.message });
          return { findings: [], sources: [] };
        })
      );

      const discoveryResults = await Promise.all(discoveryPromises);
      timings.discovery_ms = Date.now() - t1;

      for (const result of discoveryResults) {
        allFindings.push(...(result.findings || []));
        allSources.push(...(result.sources || []));
      }
      findingsCollected = allFindings.length;

      // Deduplicate sources by URL
      const seenUrls = new Set();
      allSources = allSources.filter(s => {
        if (!s.url || seenUrls.has(s.url)) return false;
        seenUrls.add(s.url);
        return true;
      });
      sourcesDiscovered = allSources.length;

      // Cache discovery output
      await base44.entities.ResearchDossier.update(dossierId, {
        discovery_raw_data: JSON.stringify({
          sub_queries: subQueries,
          all_findings: allFindings,
          all_sources: allSources,
          timings: { query_expansion_ms: timings.query_expansion_ms, discovery_ms: timings.discovery_ms }
        })
      });
    } catch (err) {
      stageErrors.push({ stage: 'discovery', error: err.message });
      timings.discovery_ms = -1;
    }

    // ================================================================
    // STAGE 3: SOURCE VERIFICATION
    // Actually fetch top source URLs and extract body text
    // ================================================================
    let verifiedSources = [];
    try {
      const t2 = Date.now();
      const topUrls = allSources.slice(0, 8).map(s => s.url).filter(Boolean);

      const fetchPromises = topUrls.map(url =>
        fetchSourceContent(url).then(content => ({
          url,
          content,
          verified: content.length > 200
        })).catch(() => ({ url, content: '', verified: false }))
      );

      const fetchResults = await Promise.all(fetchPromises);
      verifiedSources = fetchResults.filter(r => r.verified);
      sourcesVerified = verifiedSources.length;
      timings.source_verification_ms = Date.now() - t2;
    } catch (err) {
      stageErrors.push({ stage: 'source_verification', error: err.message });
      timings.source_verification_ms = -1;
    }

    // ================================================================
    // STAGE 4: SYNTHESIS
    // Merge ALL discovery findings + verified source content (NO TRUNCATION)
    // ================================================================
    let synData = {};
    try {
      const t3 = Date.now();

      const verifiedSourceContext = verifiedSources.length > 0
        ? verifiedSources.map((s, i) =>
            `--- SOURCE ${i + 1}: ${s.url} ---\n${s.content.substring(0, 3000)}\n`
          ).join('\n')
        : '(No sources could be fetched — relying on search-derived findings only)';

      const discoveryContext = JSON.stringify(allFindings);

      const synPrompt = `You are a senior research analyst synthesizing findings from ${subQueries.length} parallel search queries and ${verifiedSources.length} verified source documents.

RESEARCH QUERY: ${researchQuery}
${contextBlock}

=== DISCOVERY FINDINGS (from ${subQueries.length} parallel web searches, ${allFindings.length} total findings) ===
${discoveryContext}

=== VERIFIED SOURCE CONTENT (from ${verifiedSources.length} fetched and read URLs) ===
${verifiedSourceContext}

TASKS:
1. EXECUTIVE SUMMARY: Write a 2-3 paragraph synthesis giving a producer complete understanding. Ground every claim in the findings or verified sources above.
2. KEY FACTS: Select the 5-10 most important verifiable facts. Each must include {fact, source}. For source, use "VERIFIED: [url]" if from a fetched source, or "SEARCH: [source_name]" if from search results. Do NOT include facts that are not supported by the data above.
3. CONTEXT & BACKGROUND: Write the historical and situational context a producer needs.
4. KEY PEOPLE: Organize into {name, role, relevance}.
5. KEY ORGANIZATIONS: Organize into {name, type, relevance}.
6. TIMELINE: Build a clean chronological timeline. Each: {date, event, significance}.
7. COUNTER-ARGUMENTS: Extract differing viewpoints into {viewpoint, summary, source}.
8. DATA & STATISTICS: Organize into {statistic, source}.
9. COVERAGE ANGLES: Suggest 3-5 distinct angles. Each: {angle, rationale, target_audience}.
10. SOURCES: Consolidate all sources. Each: {name, url, source_type, citation, verified}. Set verified=true only if the URL was successfully fetched and read above.
11. CONFIDENCE SCORE: Score 0-100 based on source quality, verification status, and completeness.

Return JSON with: executive_summary, key_facts, context_and_background, key_people, key_organizations, timeline, counter_arguments, data_and_statistics, coverage_angles, sources, confidence_score`;

      const synSchema = {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          key_facts: {
            type: 'array',
            items: { type: 'object', properties: { fact: { type: 'string' }, source: { type: 'string' } } }
          },
          context_and_background: { type: 'string' },
          key_people: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, relevance: { type: 'string' } } }
          },
          key_organizations: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, relevance: { type: 'string' } } }
          },
          timeline: {
            type: 'array',
            items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string' } } }
          },
          counter_arguments: {
            type: 'array',
            items: { type: 'object', properties: { viewpoint: { type: 'string' }, summary: { type: 'string' }, source: { type: 'string' } } }
          },
          data_and_statistics: {
            type: 'array',
            items: { type: 'object', properties: { statistic: { type: 'string' }, source: { type: 'string' } } }
          },
          coverage_angles: {
            type: 'array',
            items: { type: 'object', properties: { angle: { type: 'string' }, rationale: { type: 'string' }, target_audience: { type: 'string' } } }
          },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                source_type: { type: 'string' },
                citation: { type: 'string' },
                verified: { type: 'boolean' }
              }
            }
          },
          confidence_score: { type: 'number' }
        }
      };

      synData = await base44.integrations.Core.InvokeLLM({
        prompt: synPrompt,
        response_json_schema: synSchema,
        model: roles.synthesis
      });

      timings.synthesis_ms = Date.now() - t3;

      await base44.entities.ResearchDossier.update(dossierId, {
        executive_summary: synData.executive_summary || '',
        key_facts: JSON.stringify(synData.key_facts || []),
        context_and_background: synData.context_and_background || '',
        key_people: JSON.stringify(synData.key_people || []),
        key_organizations: JSON.stringify(synData.key_organizations || []),
        timeline: JSON.stringify(synData.timeline || []),
        counter_arguments: JSON.stringify(synData.counter_arguments || []),
        data_and_statistics: JSON.stringify(synData.data_and_statistics || []),
        coverage_angles: JSON.stringify(synData.coverage_angles || []),
        sources: JSON.stringify(synData.sources || []),
        confidence_score: synData.confidence_score || 0
      });
    } catch (err) {
      stageErrors.push({ stage: 'synthesis', error: err.message });
      timings.synthesis_ms = -1;
    }

    // ================================================================
    // STAGE 5: FACT VERIFICATION
    // Cross-check each key fact against fetched source content
    // ================================================================
    let claimConfidence = [];
    try {
      const t4 = Date.now();
      const keyFacts = synData.key_facts || [];
      const verifiedContent = verifiedSources.length > 0
        ? verifiedSources.map(s => s.content.substring(0, 2000)).join('\n---\n')
        : '(No source content was fetched — mark all claims as unverified)';

      const verifyRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a fact-checker. For each claim below, determine if it is supported by the verified source content that was fetched from real URLs.

CLAIMS:
${JSON.stringify(keyFacts)}

VERIFIED SOURCE CONTENT (actual text fetched from real URLs):
${verifiedContent}

For each claim, assign:
- score (0-100): confidence the claim is accurate and supported by real source text
- status: "verified" (directly supported by fetched source text), "partially_verified" (related content found but not exact match), "unverified" (no supporting evidence in fetched sources), "disputed" (sources contradict)
- notes: brief explanation

Return JSON: { "claims": [{ "claim": "...", "score": 0, "status": "...", "notes": "..." }] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            claims: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  claim: { type: 'string' },
                  score: { type: 'number' },
                  status: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        model: roles.verification
      });

      claimConfidence = verifyRes.claims || [];
      timings.verification_ms = Date.now() - t4;

      await base44.entities.ResearchDossier.update(dossierId, {
        claim_confidence_scores: JSON.stringify(claimConfidence)
      });
    } catch (err) {
      stageErrors.push({ stage: 'verification', error: err.message });
      timings.verification_ms = -1;
    }

    // ================================================================
    // STAGE 6: CRITICAL ANALYSIS
    // Identify gaps, debate potential, competing perspectives — FULL data
    // ================================================================
    let criticalData = {};
    try {
      const t5 = Date.now();
      const fullSynthesis = JSON.stringify({
        executive_summary: synData.executive_summary,
        key_facts: synData.key_facts,
        counter_arguments: synData.counter_arguments,
        claim_confidence: claimConfidence
      });

      criticalData = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Critical Analysis Specialist in a research department. Stress-test the research findings — identify weaknesses, gaps, and areas of genuine debate.

RESEARCH QUERY: ${researchQuery}

FULL SYNTHESIS DATA (executive summary, key facts, counter-arguments, and claim confidence scores):
${fullSynthesis}

TASKS:
1. GRAY AREAS: 2-5 aspects that are ambiguous, uncertain, or under-reported.
2. LOGICAL GAPS: 2-5 logical leaps, unsupported claims, or missing causal links.
3. COMPETING PERSPECTIVES: For each major debate point: {viewpoint, evidence, weakness} — what evidence supports it and what is its weakest point.
4. OPEN QUESTIONS: 2-5 unanswered questions needing further investigation.
5. DEBATE POTENTIAL: Score 0-10 — higher = more contested, suitable for talk/debate segments.
6. ORGANIZATION STRUCTURE: Group findings into themes: {themes: [{theme, description, significance}]}.

Return JSON: gray_areas (array of strings), logical_gaps (array of strings), competing_perspectives (array of {viewpoint, evidence, weakness}), open_questions (array of strings), debate_potential_score (number), organization_structure (object with themes array)`,
        response_json_schema: {
          type: 'object',
          properties: {
            gray_areas: { type: 'array', items: { type: 'string' } },
            logical_gaps: { type: 'array', items: { type: 'string' } },
            competing_perspectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: { viewpoint: { type: 'string' }, evidence: { type: 'string' }, weakness: { type: 'string' } }
              }
            },
            open_questions: { type: 'array', items: { type: 'string' } },
            debate_potential_score: { type: 'number' },
            organization_structure: {
              type: 'object',
              properties: {
                themes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { theme: { type: 'string' }, description: { type: 'string' }, significance: { type: 'string' } }
                  }
                }
              }
            }
          }
        },
        model: roles.critical_analysis
      });

      timings.critical_analysis_ms = Date.now() - t5;

      await base44.entities.ResearchDossier.update(dossierId, {
        critical_analysis_report: JSON.stringify({
          gray_areas: criticalData.gray_areas || [],
          logical_gaps: criticalData.logical_gaps || [],
          competing_perspectives: criticalData.competing_perspectives || [],
          open_questions: criticalData.open_questions || []
        }),
        debate_potential_score: criticalData.debate_potential_score || 0,
        organization_structure: JSON.stringify(criticalData.organization_structure || { themes: [] })
      });
    } catch (err) {
      stageErrors.push({ stage: 'critical_analysis', error: err.message });
      timings.critical_analysis_ms = -1;
    }

    // ================================================================
    // FINALIZE
    // ================================================================
    await base44.entities.ResearchDossier.update(dossierId, {
      orchestration_metadata: JSON.stringify({
        pipeline: 'deepResearchV2',
        stage_timings: timings,
        models_used: roles,
        stage_errors: stageErrors,
        sub_queries_run: subQueriesRun,
        sources_discovered: sourcesDiscovered,
        sources_verified: sourcesVerified,
        findings_collected: findingsCollected
      }),
      status: 'ready'
    });

    if (topic_id) {
      await base44.entities.ResearchTopic.update(topic_id, {
        status: 'researched',
        dossier_id: dossierId,
        confidence_score: synData.confidence_score || 0,
        sources_count: (synData.sources || []).length,
        executive_summary: synData.executive_summary || '',
        research_completed_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      dossier_id: dossierId,
      confidence_score: synData.confidence_score || 0,
      debate_potential_score: criticalData.debate_potential_score || 0,
      sources_count: (synData.sources || []).length,
      sources_verified: sourcesVerified,
      stage_timings: timings,
      stage_errors: stageErrors
    });
  } catch (error) {
    if (base44 && dossierId) {
      try {
        await base44.entities.ResearchDossier.update(dossierId, {
          status: 'failed',
          error_message: error.message,
          orchestration_metadata: JSON.stringify({
            pipeline: 'deepResearchV2',
            stage_timings: timings,
            stage_errors: [...stageErrors, { stage: 'fatal', error: error.message }]
          })
        });
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ===== Helper: Fetch a source URL and extract plain text =====
async function fetchSourceContent(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CREAPD-Research/1.0; +https://creapd.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return '';
  const html = await res.text();
  return stripHtml(html).substring(0, 5000);
}

// ===== Helper: Strip HTML to plain text =====
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}