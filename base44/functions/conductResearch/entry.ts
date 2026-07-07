import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44, session_id;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    session_id = body.session_id;

    if (!session_id) {
      return Response.json({ error: 'session_id is required' }, { status: 400 });
    }

    const session = await base44.entities.ResearchSession.get(session_id);
    if (!session) {
      return Response.json({ error: 'Research session not found' }, { status: 404 });
    }

    const sacredTexts = safeParse(session.sacred_texts, []);
    const researchSources = safeParse(session.research_sources, []);

    // ===== LLM CALL 1: Study Type + Plan + Primary Sources + Original Language + Historical =====
    const prompt1 = `You are a professional spiritual research assistant. You help producers investigate passages, doctrines, historical events, people, places, original languages, philosophies, religious traditions, spiritual questions, and theological topics through structured, source-based research.

You are NOT a theological authority. You organize research. The producer remains responsible for all doctrine, interpretation, and teaching.

RESEARCH QUESTION: ${session.research_question}

FAITH TRADITION SETTINGS:
- Faith Tradition: ${session.faith_tradition || 'Christianity'}
- Branch/Denomination: ${session.branch_denomination || 'No Preference'}
- Sacred Texts: ${sacredTexts.join(', ') || 'Default texts for tradition'}
- Research Sources: ${researchSources.join(', ') || 'All available sources'}

SYSTEM RULES:
- Never present AI-generated content as authoritative doctrine
- Clearly distinguish between Primary Sources (sacred texts) and Secondary Sources (commentaries, historical references)
- Respect the selected Faith Tradition — do not mix terminology from unrelated traditions
- All findings must include source attribution and citation information
- When multiple perspectives exist, present each separately with attribution
- Every statement should be traceable to its originating source whenever possible

TASKS:

1. STUDY TYPE: Determine the most appropriate study type for this research question. Choose one: passage, topic, question, doctrine, original_language, word, character, biography, place, historical_event, comparative, current_event, apologetics, theme, timeline, cultural, philosophy, tradition, custom.

2. RESEARCH PLAN: Generate a research plan as an array of steps. Each step has a label (short description) and status (set all to "completed" since you are performing them now). Example steps: "Determining Study Type", "Searching Primary Sources", "Analyzing Original Language", "Searching Historical Sources", "Building Timeline", "Generating Citations".

3. PRIMARY SOURCE ANALYSIS: Identify relevant primary source passages, parallel passages, cross references, repeated themes, related events, and related teachings. Provide a thorough analysis with specific references and citations from the sacred texts.

4. ORIGINAL LANGUAGE ANALYSIS: Analyze important words from the original languages relevant to this research. For each word, provide: word (original script), language, transliteration (pronunciation), literal_meaning, definitions, grammar (part of speech, tense, etc.), root, word_family, occurrences (where it appears), translation_differences (how different translations render it), and lexicon_sources. Provide 2-5 key words.

5. HISTORICAL DEVELOPMENT: Build a chronological understanding of how this subject developed through history. Include earliest references, major events, important figures, and development through time. Everything must be cited.

6. TIMELINE EVENTS: Create a chronological timeline of key events related to this research. Each event has: date (approximate if unknown), event (description), and significance (why it matters).

Return a JSON object with exactly these keys: study_type (string), research_plan (array of {label, status}), primary_source_analysis (string), original_language (array of word study objects), historical_development (string), timeline_events (array of {date, event, significance}).`;

    const schema1 = {
      type: 'object',
      properties: {
        study_type: { type: 'string' },
        research_plan: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              status: { type: 'string' }
            }
          }
        },
        primary_source_analysis: { type: 'string' },
        original_language: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              language: { type: 'string' },
              transliteration: { type: 'string' },
              literal_meaning: { type: 'string' },
              definitions: { type: 'string' },
              grammar: { type: 'string' },
              root: { type: 'string' },
              word_family: { type: 'string' },
              occurrences: { type: 'string' },
              translation_differences: { type: 'string' },
              lexicon_sources: { type: 'string' }
            }
          }
        },
        historical_development: { type: 'string' },
        timeline_events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              event: { type: 'string' },
              significance: { type: 'string' }
            }
          }
        }
      }
    };

    const llm1 = await base44.integrations.Core.InvokeLLM({
      prompt: prompt1,
      add_context_from_internet: true,
      response_json_schema: schema1,
      model: 'gemini_3_flash'
    });

    // Save first batch of findings
    await base44.entities.ResearchSession.update(session_id, {
      study_type: llm1.study_type || 'custom',
      research_plan: JSON.stringify(llm1.research_plan || []),
      primary_source_analysis: llm1.primary_source_analysis || '',
      original_language_analysis: JSON.stringify(llm1.original_language || []),
      historical_development: llm1.historical_development || '',
      timeline_events: JSON.stringify(llm1.timeline_events || [])
    });

    // ===== LLM CALL 2: Comparative + Perspectives + Summary + Related + Sources =====
    const primaryExcerpt = (llm1.primary_source_analysis || '').substring(0, 800);
    const historicalExcerpt = (llm1.historical_development || '').substring(0, 800);
    const wordStudies = (llm1.original_language || []).map(w => `${w.word} (${w.transliteration}): ${w.literal_meaning}`).join('; ');

    const prompt2 = `You are a professional spiritual research assistant. Based on the following research findings, generate the synthesis layer.

RESEARCH QUESTION: ${session.research_question}
FAITH TRADITION: ${session.faith_tradition || 'Christianity'}
BRANCH: ${session.branch_denomination || 'No Preference'}

PRIMARY SOURCE ANALYSIS (excerpt):
${primaryExcerpt}

HISTORICAL DEVELOPMENT (excerpt):
${historicalExcerpt}

KEY WORD STUDIES:
${wordStudies || 'None identified'}

SYSTEM RULES:
- Never present AI-generated content as authoritative doctrine
- When multiple perspectives exist, present each separately with attribution
- All sources must be cited
- AI suggestions must be clearly labeled as suggestions

TASKS:

1. COMPARATIVE ANALYSIS: If this research involves comparisons (people, teachings, doctrines, traditions, translations, etc.), create structured comparison tables. Each comparison has: subject_a, subject_b, and points (array of {aspect, subject_a_view, subject_b_view}). If no comparison is relevant, return an empty array.

2. MULTIPLE PERSPECTIVES: Identify any differing viewpoints within the research. Each perspective includes: perspective (label), summary, supporting_sources, and references. If no differing perspectives exist, return an empty array.

3. RESEARCH SUMMARY: Write a comprehensive research summary (3-5 paragraphs) that synthesizes all findings. This should give the producer a complete understanding of the subject.

4. RELATED STUDIES: Suggest 3-5 related research questions the producer might want to explore next. Each has: question, study_type, and relevance (why it's related).

5. SOURCES: List all sources consulted. Each has: name, source_type (primary_source, secondary_source, historical_reference, language_study, current_event, academic, ai_suggestion), and citation (full citation info).

6. DISCUSSION QUESTIONS: Generate 3-5 discussion questions based on the research that could be used in a production setting.

7. PRODUCTION IDEAS: Suggest 2-4 production ideas based on this research. Each idea must contain: production_type (one of: Sermon, Bible Study, Devotional, Teaching Series, Podcast, Livestream, Prayer Meeting, Study Group, Youth Lesson, Educational Presentation, Discussion Panel, Q&A Session, Meditation Session, Scripture Reading, Worship Service, Community Event, Custom Production), title, description (how this research informs the production), suggested_audience (one of: General Audience, Adults, Young Adults, Teenagers, Children, Families, Leaders, New Believers, Long-Time Members, Visitors, Interfaith Audience, Academic Audience, Community Outreach, Online Audience, Private Study), suggested_tone (one of: Inspirational, Pastoral, Academic, Conversational, Devotional, Teaching, Evangelistic, Storytelling, Meditative), suggested_runtime (one of: 10 Minutes, 15 Minutes, 20 Minutes, 30 Minutes, 45 Minutes, 60 Minutes, 90 Minutes), suggested_structure (brief outline of how the production should be structured), source_study_topic (which part of the research this idea is based on), suggested_assets (array of strings — what assets to generate, e.g. ["outline", "talking points", "discussion questions", "social caption", "thumbnail prompt"]).

Return a JSON object with exactly these keys: comparative_analysis (array), multiple_perspectives (array), research_summary (string), related_studies (array), sources (array), discussion_questions (array of strings), production_ideas (array).`;

    const schema2 = {
      type: 'object',
      properties: {
        comparative_analysis: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subject_a: { type: 'string' },
              subject_b: { type: 'string' },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    aspect: { type: 'string' },
                    subject_a_view: { type: 'string' },
                    subject_b_view: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        multiple_perspectives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              perspective: { type: 'string' },
              summary: { type: 'string' },
              supporting_sources: { type: 'string' },
              references: { type: 'string' }
            }
          }
        },
        research_summary: { type: 'string' },
        related_studies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              study_type: { type: 'string' },
              relevance: { type: 'string' }
            }
          }
        },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              source_type: { type: 'string' },
              citation: { type: 'string' }
            }
          }
        },
        discussion_questions: {
          type: 'array',
          items: { type: 'string' }
        },
        production_ideas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              production_type: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              suggested_audience: { type: 'string' },
              suggested_tone: { type: 'string' },
              suggested_runtime: { type: 'string' },
              suggested_structure: { type: 'string' },
              source_study_topic: { type: 'string' },
              suggested_assets: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    };

    const llm2 = await base44.integrations.Core.InvokeLLM({
      prompt: prompt2,
      response_json_schema: schema2,
      model: 'gemini_3_flash'
    });

    // Save second batch + mark ready
    await base44.entities.ResearchSession.update(session_id, {
      comparative_analysis: JSON.stringify(llm2.comparative_analysis || []),
      multiple_perspectives: JSON.stringify(llm2.multiple_perspectives || []),
      research_summary: llm2.research_summary || '',
      related_studies: JSON.stringify(llm2.related_studies || []),
      sources_used: JSON.stringify(llm2.sources || []),
      citations: (llm2.sources || []).map(s => s.citation).filter(Boolean).join('\n\n'),
      discussion_questions: JSON.stringify(llm2.discussion_questions || []),
      production_ideas: JSON.stringify(llm2.production_ideas || []),
      status: 'ready'
    });

    return Response.json({
      success: true,
      session_id,
      study_type: llm1.study_type,
      sources_count: (llm2.sources || []).length
    });
  } catch (error) {
    if (base44 && session_id) {
      try { await base44.entities.ResearchSession.update(session_id, { status: 'failed' }); } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}