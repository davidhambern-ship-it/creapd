import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEFAULT_ROLE_ASSIGNMENTS = {
  discovery: 'gemini_3_flash',
  organization: 'gpt_5_mini',
  critical_analysis: 'gpt_5_5'
};

Deno.serve(async (req) => {
  let base44, dossierId;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, topic_id, research_depth, role_assignments } = body;

    if (!article_id && !topic_id) {
      return Response.json({ error: 'article_id or topic_id is required' }, { status: 400 });
    }

    const roles = { ...DEFAULT_ROLE_ASSIGNMENTS, ...(role_assignments || {}) };
    const timings = {};
    const stageErrors = [];

    // ===== Resolve research context (same pattern as performDeepResearch) =====
    let researchQuery, contextBlock, topicRef = null, articleRef = null;

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
      articleRef = await base44.entities.Article.get(article_id);
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

    // ========================================================================
    // STAGE 1: DISCOVERY SPECIALIST
    // Gathers raw findings, search results, and initial data points.
    // Uses web search-enabled model for broad information gathering.
    // ========================================================================
    let discoveryData;
    try {
      const t0 = Date.now();
      const discoveryPrompt = `You are the Discovery Specialist in a research department. Your job is to gather raw, comprehensive information on the following topic using internet sources. Cast a wide net — collect facts, quotes, statistics, dates, names, and viewpoints without filtering or organizing yet.

${contextBlock}

RESEARCH OBJECTIVES:
1. RAW FACTS: Collect 8-15 verifiable facts related to this story. Each must include a source name or URL.
2. QUOTES: Collect any direct quotes from key figures or experts relevant to this topic.
3. STATISTICS: Collect any relevant numbers, percentages, or data points with sources.
4. TIMELINE EVENTS: Collect key chronological events with dates.
5. KEY PEOPLE: Identify people mentioned or relevant — name, role, affiliation.
6. KEY ORGANIZATIONS: Identify organizations, companies, or institutions involved.
7. VIEWPOINTS: Collect any differing perspectives, opinions, or narratives about this topic. Include who holds each viewpoint.
8. SOURCES: List all sources consulted with URLs where possible.

Return JSON with these keys:
- raw_facts (array of {fact, source})
- quotes (array of {quote, speaker, source})
- statistics (array of {statistic, source})
- timeline_events (array of {date, event, significance})
- key_people (array of {name, role, affiliation})
- key_organizations (array of {name, type, relevance})
- viewpoints (array of {viewpoint, holder, evidence})
- sources (array of {name, url, source_type, citation})`;

      const discoverySchema = {
        type: 'object',
        properties: {
          raw_facts: {
            type: 'array',
            items: { type: 'object', properties: { fact: { type: 'string' }, source: { type: 'string' } } }
          },
          quotes: {
            type: 'array',
            items: { type: 'object', properties: { quote: { type: 'string' }, speaker: { type: 'string' }, source: { type: 'string' } } }
          },
          statistics: {
            type: 'array',
            items: { type: 'object', properties: { statistic: { type: 'string' }, source: { type: 'string' } } }
          },
          timeline_events: {
            type: 'array',
            items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, significance: { type: 'string' } } }
          },
          key_people: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, affiliation: { type: 'string' } } }
          },
          key_organizations: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, relevance: { type: 'string' } } }
          },
          viewpoints: {
            type: 'array',
            items: { type: 'object', properties: { viewpoint: { type: 'string' }, holder: { type: 'string' }, evidence: { type: 'string' } } }
          },
          sources: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } } }
          }
        }
      };

      discoveryData = await base44.integrations.Core.InvokeLLM({
        prompt: discoveryPrompt,
        add_context_from_internet: true,
        response_json_schema: discoverySchema,
        model: roles.discovery
      });

      timings.discovery_ms = Date.now() - t0;

      // Cache raw discovery output
      await base44.entities.ResearchDossier.update(dossierId, {
        discovery_raw_data: JSON.stringify(discoveryData)
      });
    } catch (err) {
      stageErrors.push({ stage: 'discovery', error: err.message });
      timings.discovery_ms = -1;
      // If discovery fails, we can't continue — the other stages depend on it
      throw new Error(`Discovery stage failed: ${err.message}`);
    }

    // ========================================================================
    // STAGE 2: ORGANIZATION SPECIALIST
    // Structures raw discovery data into the legacy dossier fields
    // AND produces the new organization_structure JSON.
    // ========================================================================
    let orgData;
    try {
      const t1 = Date.now();
      const discoverySummary = JSON.stringify({
        raw_facts_count: (discoveryData.raw_facts || []).length,
        quotes_count: (discoveryData.quotes || []).length,
        statistics_count: (discoveryData.statistics || []).length,
        timeline_count: (discoveryData.timeline_events || []).length,
        people_count: (discoveryData.key_people || []).length,
        orgs_count: (discoveryData.key_organizations || []).length,
        viewpoints_count: (discoveryData.viewpoints || []).length,
        sources_count: (discoveryData.sources || []).length
      });

      const orgPrompt = `You are the Organization Specialist in a research department. You receive raw findings from the Discovery Specialist and organize them into structured, production-ready formats.

RESEARCH QUERY: ${researchQuery}
${contextBlock}

DISCOVERY DATA SUMMARY:
${discoverySummary}

FULL DISCOVERY DATA (JSON):
${JSON.stringify(discoveryData).substring(0, 8000)}

TASKS:
1. EXECUTIVE SUMMARY: Write a 2-3 paragraph synthesis of all findings that gives a producer complete understanding.
2. KEY FACTS: Select the 5-10 most important verifiable facts. Each: {fact, source}.
3. CONTEXT & BACKGROUND: Write the historical and situational context a producer needs.
4. KEY PEOPLE: Organize into {name, role, relevance} format.
5. KEY ORGANIZATIONS: Organize into {name, type, relevance} format.
6. TIMELINE: Build a clean chronological timeline. Each: {date, event, significance}.
7. COUNTER-ARGUMENTS: Extract differing viewpoints into {viewpoint, summary, source}.
8. DATA & STATISTICS: Organize into {statistic, source}.
9. COVERAGE ANGLES: Suggest 3-5 distinct angles. Each: {angle, rationale, target_audience}.
10. SOURCES: Consolidate all sources. Each: {name, url, source_type, citation}.
11. ORGANIZATION STRUCTURE: Create a thematic clustering of the research — group findings into themes, sub-topics, and narrative threads. Format: {themes: [{theme, description, related_facts: [indices], significance}]}

Return JSON with these keys:
- executive_summary (string)
- key_facts (array of {fact, source})
- context_and_background (string)
- key_people (array of {name, role, relevance})
- key_organizations (array of {name, type, relevance})
- timeline (array of {date, event, significance})
- counter_arguments (array of {viewpoint, summary, source})
- data_and_statistics (array of {statistic, source})
- coverage_angles (array of {angle, rationale, target_audience})
- sources (array of {name, url, source_type, citation})
- organization_structure (object with themes array)
- confidence_score (number 0-100)`;

      const orgSchema = {
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
            items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }, source_type: { type: 'string' }, citation: { type: 'string' } } }
          },
          organization_structure: {
            type: 'object',
            properties: {
              themes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    theme: { type: 'string' },
                    description: { type: 'string' },
                    significance: { type: 'string' }
                  }
                }
              }
            }
          },
          confidence_score: { type: 'number' }
        }
      };

      orgData = await base44.integrations.Core.InvokeLLM({
        prompt: orgPrompt,
        response_json_schema: orgSchema,
        model: roles.organization
      });

      timings.organization_ms = Date.now() - t1;

      // Save to BOTH legacy fields and new organization_structure
      await base44.entities.ResearchDossier.update(dossierId, {
        executive_summary: orgData.executive_summary || '',
        key_facts: JSON.stringify(orgData.key_facts || []),
        context_and_background: orgData.context_and_background || '',
        key_people: JSON.stringify(orgData.key_people || []),
        key_organizations: JSON.stringify(orgData.key_organizations || []),
        timeline: JSON.stringify(orgData.timeline || []),
        counter_arguments: JSON.stringify(orgData.counter_arguments || []),
        data_and_statistics: JSON.stringify(orgData.data_and_statistics || []),
        coverage_angles: JSON.stringify(orgData.coverage_angles || []),
        sources: JSON.stringify(orgData.sources || []),
        confidence_score: orgData.confidence_score || 0,
        organization_structure: JSON.stringify(orgData.organization_structure || { themes: [] })
      });
    } catch (err) {
      stageErrors.push({ stage: 'organization', error: err.message });
      timings.organization_ms = -1;
    }

    // ========================================================================
    // STAGE 3: CRITICAL ANALYSIS SPECIALIST
    // Identifies gray areas, logical gaps, competing perspectives,
    // and scores debate potential. Writes to the new specialist fields.
    // ========================================================================
    let criticalData;
    try {
      const t2 = Date.now();
      const orgExcerpt = (orgData?.executive_summary || researchQuery).substring(0, 2000);
      const counterArgs = JSON.stringify(orgData?.counter_arguments || discoveryData?.viewpoints || []).substring(0, 2000);
      const keyFacts = JSON.stringify(orgData?.key_facts || discoveryData?.raw_facts || []).substring(0, 2000);

      const criticalPrompt = `You are the Critical Analysis Specialist in a research department. Your role is to stress-test the research findings — identify weaknesses, gaps, and areas of genuine debate. You are the devil's advocate and fact-checker.

RESEARCH QUERY: ${researchQuery}

EXECUTIVE SUMMARY:
${orgExcerpt}

KEY FACTS:
${keyFacts}

COUNTER-ARGUMENTS / VIEWPOINTS:
${counterArgs}

TASKS:
1. GRAY AREAS: Identify 2-5 aspects of the story that are ambiguous, uncertain, or under-reported. These are not facts — they are gaps in knowledge.
2. LOGICAL GAPS: Identify 2-5 logical leaps, unsupported claims, or missing causal links in the research.
3. COMPETING PERSPECTIVES: For each major debate point, identify the competing perspectives. Each: {viewpoint, evidence, weakness} — what evidence supports it and what is its weakest point.
4. OPEN QUESTIONS: List 2-5 questions that remain unanswered and would benefit from further investigation.
5. DEBATE POTENTIAL: Score 0-10 how much genuine debate or discussion potential this topic has. Higher = more contested, more suitable for talk/debate segments.
6. CLAIM CONFIDENCE: For each key fact, assign a confidence score (0-100) and brief notes on verification status.

Return JSON with these keys:
- gray_areas (array of strings)
- logical_gaps (array of strings)
- competing_perspectives (array of {viewpoint, evidence, weakness})
- open_questions (array of strings)
- debate_potential_score (number 0-10)
- claim_confidence_scores (array of {claim, score, notes})`;

      const criticalSchema = {
        type: 'object',
        properties: {
          gray_areas: { type: 'array', items: { type: 'string' } },
          logical_gaps: { type: 'array', items: { type: 'string' } },
          competing_perspectives: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                viewpoint: { type: 'string' },
                evidence: { type: 'string' },
                weakness: { type: 'string' }
              }
            }
          },
          open_questions: { type: 'array', items: { type: 'string' } },
          debate_potential_score: { type: 'number' },
          claim_confidence_scores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                claim: { type: 'string' },
                score: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          }
        }
      };

      criticalData = await base44.integrations.Core.InvokeLLM({
        prompt: criticalPrompt,
        response_json_schema: criticalSchema,
        model: roles.critical_analysis
      });

      timings.critical_analysis_ms = Date.now() - t2;

      // Save specialist fields
      await base44.entities.ResearchDossier.update(dossierId, {
        critical_analysis_report: JSON.stringify({
          gray_areas: criticalData.gray_areas || [],
          logical_gaps: criticalData.logical_gaps || [],
          competing_perspectives: criticalData.competing_perspectives || [],
          open_questions: criticalData.open_questions || []
        }),
        debate_potential_score: criticalData.debate_potential_score || 0,
        claim_confidence_scores: JSON.stringify(criticalData.claim_confidence_scores || [])
      });
    } catch (err) {
      stageErrors.push({ stage: 'critical_analysis', error: err.message });
      timings.critical_analysis_ms = -1;
    }

    // ===== Save orchestration metadata & mark ready =====
    await base44.entities.ResearchDossier.update(dossierId, {
      orchestration_metadata: JSON.stringify({
        stage_timings: timings,
        models_used: roles,
        stage_errors: stageErrors,
        completed_stages: stageErrors.length === 0 ? ['discovery', 'organization', 'critical_analysis'] : stageErrors.length === 3 ? [] : ['discovery']
      }),
      status: 'ready'
    });

    // ===== Update ResearchTopic if in topic mode =====
    if (topic_id) {
      await base44.entities.ResearchTopic.update(topic_id, {
        status: 'researched',
        dossier_id: dossierId,
        confidence_score: orgData?.confidence_score || 0,
        sources_count: (orgData?.sources || []).length,
        executive_summary: orgData?.executive_summary || '',
        research_completed_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      dossier_id: dossierId,
      confidence_score: orgData?.confidence_score || 0,
      debate_potential_score: criticalData?.debate_potential_score || 0,
      sources_count: (orgData?.sources || []).length,
      stage_timings: timings,
      stage_errors: stageErrors
    });
  } catch (error) {
    if (base44 && dossierId) {
      try {
        await base44.entities.ResearchDossier.update(dossierId, {
          status: 'failed',
          error_message: error.message,
          orchestration_metadata: JSON.stringify({ stage_timings: timings || {}, stage_errors: [{ stage: 'fatal', error: error.message }] })
        });
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});