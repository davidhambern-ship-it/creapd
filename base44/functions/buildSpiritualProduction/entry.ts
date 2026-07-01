import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  let configuration_id;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    configuration_id = body.configuration_id;
    const research_session_id = body.research_session_id;

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    const config = await base44.entities.SpiritualProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await base44.entities.SpiritualProductionConfiguration.update(configuration_id, { status: 'building' });

    // Fetch source research session if provided (production created from a research idea)
    let researchSession = null;
    let researchContext = '';
    const sourceSessionId = research_session_id || config.source_research_session_id;
    if (sourceSessionId) {
      try {
        researchSession = await base44.entities.ResearchSession.get(sourceSessionId);
        if (researchSession) {
          const words = safeParse(researchSession.original_language_analysis, []);
          const timeline = safeParse(researchSession.timeline_events, []);
          const wordSummary = words.map(w => `${w.word} (${w.transliteration || ''}): ${w.literal_meaning || ''}`).join('; ');
          const timelineSummary = timeline.map(e => `${e.date}: ${e.event}`).join('; ');
          researchContext = `
SOURCE RESEARCH SESSION CONTEXT:
- Research Question: ${researchSession.research_question || 'N/A'}
- Study Type: ${researchSession.study_type || 'custom'}
- Research Summary: ${(researchSession.research_summary || '').substring(0, 1200)}
- Primary Source Analysis: ${(researchSession.primary_source_analysis || '').substring(0, 800)}
- Key Word Studies: ${wordSummary.substring(0, 500) || 'None'}
- Historical Development: ${(researchSession.historical_development || '').substring(0, 800)}
- Timeline: ${timelineSummary.substring(0, 500) || 'None'}
- Citations: ${(researchSession.citations || '').substring(0, 500)}
This production was created from the above research. Use these findings as primary source material.`;
        }
      } catch {}
    }

    const studyResources = safeParse(config.study_resources, []);
    const studyTopics = safeParse(config.study_topics, []);
    const researchSources = safeParse(config.research_sources, []);
    const sacredTexts = safeParse(config.sacred_texts, []);
    const aiAutomation = safeParse(config.ai_automation, []);

    // Delete old generated content
    await base44.entities.SpiritualResearchItem.deleteMany({ configuration_id });
    await base44.entities.SpiritualStudyTopic.deleteMany({ configuration_id });
    await base44.entities.SpiritualMessageSection.deleteMany({ configuration_id });
    await base44.entities.SpiritualAsset.deleteMany({ configuration_id });
    await base44.entities.SpiritualPackageItem.deleteMany({ configuration_id });

    // ===== LLM CALL 1: Research + Study Topics (with web search) =====
    const prompt1 = `You are a professional spiritual production research assistant. You help producers research and prepare spiritual content.

You are NOT a theological authority. You organize research. The producer remains responsible for all doctrine, interpretation, and teaching.

PRODUCTION DETAILS:
- Production Name: ${config.production_name || 'Spiritual Production'}
- Speaker: ${config.speaker_name || 'Speaker'}
- Date: ${config.production_date || 'TBD'}
- Location: ${config.location || 'N/A'}
- Organization: ${config.organization_name || 'N/A'}

FAITH TRADITION SETTINGS:
- Faith Tradition: ${config.faith_tradition || 'Christianity'}
- Branch/Denomination: ${config.branch_denomination || 'No Preference'}
- Production Type: ${config.production_type || 'Sermon'}
- Audience: ${config.audience || 'General Audience'}
- Speaker Tone: ${config.speaker_tone || 'Inspirational'}
- Target Runtime: ${config.target_runtime || '30 Minutes'}

SACRED TEXTS (selected by producer):
${sacredTexts.join(', ') || 'Default texts for tradition'}
- Default Translation: ${config.default_translation || 'Default'}

STUDY RESOURCES (approved by producer):
${studyResources.join(', ') || 'All available'}

SELECTED STUDY TOPICS:
${studyTopics.join(', ') || 'None selected — generate relevant topics for the faith tradition'}

RESEARCH SOURCES:
${researchSources.join(', ') || 'All available sources'}

CURRENT EVENTS: ${config.current_events_enabled !== false ? 'Enabled — include relevant current events' : 'Disabled — do not include current events'}
${researchContext}

SYSTEM RULES:
- Never present AI-generated content as authoritative doctrine
- Clearly distinguish between Primary Sources (sacred texts) and Secondary Sources (commentaries, historical references)
- Respect the selected Faith Tradition — do not mix terminology from unrelated traditions
- All research items must include source attribution and citation information
- When multiple perspectives exist, present each separately with attribution
- Adapt vocabulary and reading level to the selected audience

TASKS:

1. RESEARCH: For each selected study topic, find relevant and current information from the listed research sources. Generate 3-5 research items per topic. Each item must include: title, source (source name/publication), source_type (one of: primary_source, secondary_source, historical_reference, language_study, current_event, ai_suggestion), category, summary (a comprehensive 2-3 paragraph summary of the source content), full_text (the full article text when available from the web search results — if full text is not available, leave empty string), excerpt (a short representative quote or excerpt from the source, 1-2 sentences), key_points (JSON array of 3-5 key points as strings), author (author or organization), date, publication_date, source_url (the URL to the original source if available), relevance (high/medium/low), citation (full citation info), associated_topic, tags (comma-separated tags), related_topics (JSON array of related topic strings), related_study_questions (JSON array of 2-3 related study questions as strings), full_text_available (boolean — true only if you included actual full_text content), full_text_unavailable_reason (string explaining why full text is unavailable, e.g. "paywall", "subscription required", "content behind login", "summary only available from search results" — leave empty if full_text_available is true). If current events are enabled, include relevant current events. Respect the faith tradition — do not mix unrelated traditions.

2. STUDY TOPICS: For each selected topic, generate a comprehensive study summary including: topic_name, generated_summary (2-3 paragraphs), talking_points (3-5 points as a single string with line breaks), key_passages (relevant scripture/sacred text references with full citations), sources (sources consulted), historical_context (relevant historical background), discussion_questions (3-5 questions for the audience), multiple_perspectives (if applicable, different viewpoints from selected resources — each attributed), and suggested_placement (where in the production this topic fits).

Return a JSON object with exactly these keys: research (array), topics (array).`;

    const schema1 = {
      type: 'object',
      properties: {
        research: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              source: { type: 'string' },
              source_type: { type: 'string' },
              category: { type: 'string' },
              summary: { type: 'string' },
              full_text: { type: 'string' },
              excerpt: { type: 'string' },
              key_points: { type: 'array', items: { type: 'string' } },
              author: { type: 'string' },
              date: { type: 'string' },
              publication_date: { type: 'string' },
              source_url: { type: 'string' },
              relevance: { type: 'string' },
              citation: { type: 'string' },
              associated_topic: { type: 'string' },
              tags: { type: 'string' },
              related_topics: { type: 'array', items: { type: 'string' } },
              related_study_questions: { type: 'array', items: { type: 'string' } },
              full_text_available: { type: 'boolean' },
              full_text_unavailable_reason: { type: 'string' }
            }
          }
        },
        topics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic_name: { type: 'string' },
              generated_summary: { type: 'string' },
              talking_points: { type: 'string' },
              key_passages: { type: 'string' },
              sources: { type: 'string' },
              historical_context: { type: 'string' },
              discussion_questions: { type: 'string' },
              multiple_perspectives: { type: 'string' },
              suggested_placement: { type: 'string' }
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

    // Create research items
    const researchData = (llm1.research || []).map(item => ({
      configuration_id,
      title: item.title || '',
      source: item.source || '',
      source_type: ['primary_source', 'secondary_source', 'historical_reference', 'language_study', 'current_event', 'ai_suggestion'].includes(item.source_type) ? item.source_type : 'secondary_source',
      category: item.category || '',
      summary: item.summary || '',
      full_text: item.full_text || '',
      excerpt: item.excerpt || '',
      key_points: JSON.stringify(item.key_points || []),
      author: item.author || '',
      date: item.date || new Date().toISOString().split('T')[0],
      publication_date: item.publication_date || item.date || '',
      source_url: item.source_url || '',
      relevance: ['high', 'medium', 'low'].includes(item.relevance) ? item.relevance : 'medium',
      citation: item.citation || '',
      associated_topic: item.associated_topic || '',
      tags: item.tags || '',
      related_topics: JSON.stringify(item.related_topics || []),
      related_study_questions: JSON.stringify(item.related_study_questions || []),
      full_text_available: !!item.full_text_available,
      full_text_unavailable_reason: item.full_text_unavailable_reason || '',
      status: 'new'
    }));
    if (researchData.length > 0) {
      await base44.entities.SpiritualResearchItem.bulkCreate(researchData);
    }

    // Create study topics
    const topicData = (llm1.topics || []).map(topic => ({
      configuration_id,
      topic_name: topic.topic_name || '',
      generated_summary: topic.generated_summary || '',
      talking_points: topic.talking_points || '',
      key_passages: topic.key_passages || '',
      sources: topic.sources || '',
      historical_context: topic.historical_context || '',
      discussion_questions: topic.discussion_questions || '',
      multiple_perspectives: topic.multiple_perspectives || '',
      suggested_placement: topic.suggested_placement || '',
      status: 'ready'
    }));
    if (topicData.length > 0) {
      await base44.entities.SpiritualStudyTopic.bulkCreate(topicData);
    }

    // ===== LLM CALL 2: Message Builder + AI Assets =====
    const topicSummary = (llm1.topics || []).map(t =>
      `- ${t.topic_name}: ${(t.generated_summary || '').substring(0, 150)}...`
    ).join('\n');

    const researchSummary = (llm1.research || []).slice(0, 15).map(r =>
      `- [${r.source_type}] ${r.title} (${r.source})`
    ).join('\n');

    const prompt2 = `You are a professional spiritual production assistant. Based on the following research and study topics, generate the message builder sections and AI production assets.

PRODUCTION CONFIGURATION:
- Production Name: ${config.production_name || 'Spiritual Production'}
- Speaker: ${config.speaker_name || 'Speaker'}
- Co-Host: ${config.co_host_name || 'None'}
- Faith Tradition: ${config.faith_tradition || 'Christianity'}
- Branch/Denomination: ${config.branch_denomination || 'No Preference'}
- Production Type: ${config.production_type || 'Sermon'}
- Audience: ${config.audience || 'General Audience'}
- Speaker Tone: ${config.speaker_tone || 'Inspirational'}
- Target Runtime: ${config.target_runtime || '30 Minutes'}
- Default Translation: ${config.default_translation || 'Default'}

STUDY TOPICS:
${topicSummary || 'No topics generated'}

RESEARCH HIGHLIGHTS:
${researchSummary || 'No research generated'}

SELECTED AI AUTOMATION:
${aiAutomation.join(', ') || 'Default assets'}

SYSTEM RULES:
- Never present AI-generated content as authoritative doctrine
- All scripture references must include the selected translation
- All citations must be preserved
- AI suggestions must be clearly labeled as suggestions
- Speaker notes remain private
- Adapt content to the selected audience and production type

TASKS:

1. MESSAGE SECTIONS: Create a structured message outline with the following sections (adapt to production type):
   - opening: Welcome and opening remarks
   - introduction: Introduction to the main theme
   - main_section: 2-3 main teaching sections (create separate entries)
   - supporting_reference: Supporting scripture/text references with citations
   - illustration: A relevant illustration or story
   - application: Practical application for the audience
   - discussion_question: 2-3 discussion questions (create separate entries)
   - closing: Closing thoughts
   - call_to_action: Call to action
   - prayer: Opening or closing prayer (if applicable)
   - closing_notes: Final notes

   Each section must include: order, section_type (from the list above), title, content (the full message text for this section), speaker_notes (private notes for the speaker), scripture_references (with citations), citations (source citations), estimated_duration_seconds (realistic speaking time based on word count at 130 wpm), target_runtime_seconds (intended duration for this section, proportional to total target runtime), slide_title (concise title for the presentation slide for this section), slide_content (bullet points or key phrases for the slide — NOT the full script), and slide_visual_prompt (brief description of the visual design for this slide).

2. AI ASSETS: Generate the following based on selected automation:
   - title_slide: Title and theme for the production
   - scripture_slides: Array of {reference, translation, text} for key passages (3-5 slides)
   - social_captions: Array of 3 social media caption strings
   - prayer_guide: A prayer guide with prayer points
   - speaker_notes: Overall speaker notes and timing cues
   - discussion_guide: Discussion questions with leader notes
   - reading_plan: A short reading plan related to the topics
   - thumbnail_prompt: A detailed AI image generation prompt for the production thumbnail
   - video_prompt: A video production prompt for social media clips
   - production_notes: Internal production notes for the team

Return a JSON object with exactly these keys: message_sections (array), title_slide (string), scripture_slides (array), social_captions (array), prayer_guide (string), speaker_notes (string), discussion_guide (string), reading_plan (string), thumbnail_prompt (string), video_prompt (string), production_notes (string).`;

    const schema2 = {
      type: 'object',
      properties: {
        message_sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              order: { type: 'number' },
              section_type: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              speaker_notes: { type: 'string' },
              scripture_references: { type: 'string' },
              citations: { type: 'string' },
              estimated_duration_seconds: { type: 'number' },
              target_runtime_seconds: { type: 'number' },
              slide_title: { type: 'string' },
              slide_content: { type: 'string' },
              slide_visual_prompt: { type: 'string' }
            }
          }
        },
        title_slide: { type: 'string' },
        scripture_slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              reference: { type: 'string' },
              translation: { type: 'string' },
              text: { type: 'string' }
            }
          }
        },
        social_captions: {
          type: 'array',
          items: { type: 'string' }
        },
        prayer_guide: { type: 'string' },
        speaker_notes: { type: 'string' },
        discussion_guide: { type: 'string' },
        reading_plan: { type: 'string' },
        thumbnail_prompt: { type: 'string' },
        video_prompt: { type: 'string' },
        production_notes: { type: 'string' }
      }
    };

    const llm2 = await base44.integrations.Core.InvokeLLM({
      prompt: prompt2,
      response_json_schema: schema2
    });

    // Create message sections
    const messageData = (llm2.message_sections || []).map((section, idx) => ({
      configuration_id,
      order: section.order || idx,
      section_type: ['opening', 'introduction', 'main_section', 'supporting_reference', 'illustration', 'application', 'discussion_question', 'closing', 'call_to_action', 'prayer', 'announcements', 'closing_notes'].includes(section.section_type) ? section.section_type : 'main_section',
      title: section.title || '',
      content: section.content || '',
      speaker_notes: section.speaker_notes || '',
      scripture_references: section.scripture_references || '',
      citations: section.citations || '',
      estimated_duration_seconds: section.estimated_duration_seconds || 0,
      target_runtime_seconds: section.target_runtime_seconds || 0,
      slide_title: section.slide_title || '',
      slide_content: section.slide_content || '',
      slide_visual_prompt: section.slide_visual_prompt || '',
      runtime_status: 'pending',
      status: 'generated'
    }));
    if (messageData.length > 0) {
      await base44.entities.SpiritualMessageSection.bulkCreate(messageData);
    }

    // Fetch created sections for per-section slide assets
    let createdSections = [];
    if (messageData.length > 0) {
      createdSections = await base44.entities.SpiritualMessageSection.filter({ configuration_id }, 'order');
    }

    // Create AI assets — ALL assets generated automatically (Production Engine)
    const assets = [];
    const slideDataMap = llm2.message_sections || [];

    // Per-section presentation slides
    for (let i = 0; i < createdSections.length; i++) {
      const section = createdSections[i];
      const slide = slideDataMap[i] || {};
      const slideType = section.section_type === 'opening' ? 'title_slide'
        : section.section_type === 'closing' || section.section_type === 'closing_notes' ? 'closing_slide'
        : section.section_type === 'call_to_action' ? 'call_to_action_slide'
        : 'scripture_slide';
      assets.push({
        configuration_id,
        asset_type: slideType,
        title: slide.slide_title || section.title,
        content: slide.slide_content || '',
        associated_section_id: section.id,
        associated_topic: section.title,
        status: 'ready'
      });
    }

    // Global production assets (always generated — Production Engine)
    if (llm2.scripture_slides) {
      for (const slide of llm2.scripture_slides) {
        assets.push({
          configuration_id,
          asset_type: 'scripture_slide',
          title: `Scripture: ${slide.reference}`,
          content: slide.text,
          scripture_reference: slide.reference,
          translation: slide.translation || config.default_translation || '',
          citation: `${slide.reference} (${slide.translation || config.default_translation || 'Default'})`,
          status: 'ready'
        });
      }
    }
    if (llm2.social_captions) {
      assets.push({ configuration_id, asset_type: 'social_graphic', title: 'Social Media Captions', content: llm2.social_captions.join('\n\n---\n\n'), status: 'ready' });
    }
    if (llm2.prayer_guide) {
      assets.push({ configuration_id, asset_type: 'prayer_guide', title: 'Prayer Guide', content: llm2.prayer_guide, status: 'ready' });
    }
    if (llm2.speaker_notes) {
      assets.push({ configuration_id, asset_type: 'speaker_notes', title: 'Overall Speaker Notes', content: llm2.speaker_notes, status: 'ready' });
    }
    if (llm2.discussion_guide) {
      assets.push({ configuration_id, asset_type: 'discussion_guide', title: 'Discussion Guide', content: llm2.discussion_guide, status: 'ready' });
    }
    if (llm2.reading_plan) {
      assets.push({ configuration_id, asset_type: 'reading_plan', title: 'Reading Plan', content: llm2.reading_plan, status: 'ready' });
    }
    if (llm2.thumbnail_prompt) {
      assets.push({ configuration_id, asset_type: 'thumbnail', title: 'Thumbnail Prompt', content: llm2.thumbnail_prompt, status: 'ready' });
    }
    if (llm2.video_prompt) {
      assets.push({ configuration_id, asset_type: 'video_prompt', title: 'Video Prompt', content: llm2.video_prompt, status: 'ready' });
    }
    if (llm2.production_notes) {
      assets.push({ configuration_id, asset_type: 'production_notes', title: 'Production Notes', content: llm2.production_notes, status: 'ready' });
    }

    let createdAssets = [];
    if (assets.length > 0) {
      createdAssets = await base44.entities.SpiritualAsset.bulkCreate(assets);
    }

    // Create production package items
    const packageItems = [];
    if (messageData.length > 0) {
      packageItems.push({ configuration_id, order: 0, item_type: 'message', title: 'Message', content: `${messageData.length} sections generated`, source: 'Message Builder', status: 'approved' });
    }
    if (topicData.length > 0) {
      packageItems.push({ configuration_id, order: 1, item_type: 'study', title: 'Study Materials', content: `${topicData.length} topics prepared`, source: 'Study Workspace', status: 'approved' });
    }
    if (researchData.length > 0) {
      packageItems.push({ configuration_id, order: 2, item_type: 'research', title: 'Research', content: `${researchData.length} research items`, source: 'Research Center', status: 'approved' });
    }
    const slideCount = createdSections.length + (llm2.scripture_slides ? llm2.scripture_slides.length : 0);
    packageItems.push({ configuration_id, order: 3, item_type: 'presentation', title: 'Presentation Slides', content: `${slideCount} slides`, source: 'AI Assets', status: 'approved' });
    packageItems.push({ configuration_id, order: 4, item_type: 'prayer', title: 'Prayer Guide', content: 'Prayer guide generated', source: 'AI Assets', status: 'approved' });
    packageItems.push({ configuration_id, order: 5, item_type: 'reading_plan', title: 'Reading Plan', content: 'Reading plan generated', source: 'AI Assets', status: 'approved' });
    packageItems.push({ configuration_id, order: 6, item_type: 'discussion', title: 'Discussion Materials', content: 'Discussion guide generated', source: 'AI Assets', status: 'approved' });

    if (packageItems.length > 0) {
      await base44.entities.SpiritualPackageItem.bulkCreate(packageItems);
    }

    // Core production is complete — mark as ready so the frontend stops polling
    await base44.entities.SpiritualProductionConfiguration.update(configuration_id, { status: 'ready' });

    // Voice generation and image generation are handled by a separate function
    // (generateSpiritualVoiceovers) that the frontend triggers after the build completes,
    // to avoid exceeding the function timeout.

    return Response.json({
      success: true,
      configuration_id,
      research_count: researchData.length,
      topic_count: topicData.length,
      message_section_count: messageData.length,
      asset_count: assets.length,
      package_item_count: packageItems.length
    });
  } catch (error) {
    try {
      await base44.entities.SpiritualProductionConfiguration.update(configuration_id, { status: 'failed' });
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseRuntimeToSeconds(runtimeStr) {
  if (!runtimeStr) return 1800;
  const match = String(runtimeStr).match(/(\d+)\s*Minute/i);
  if (match) return parseInt(match[1]) * 60;
  return 1800;
}

function safeParse(str, fallback) {
  if (!str) return fallback;
  let result = str;
  // Recursively parse double-encoded JSON strings (e.g. "\"[\\\"topic\\\"]\"" → ["topic"])
  for (let i = 0; i < 3; i++) {
    if (typeof result !== 'string') break;
    try { result = JSON.parse(result); } catch { break; }
  }
  // If the expected fallback is an array but the result isn't, return the fallback
  if (Array.isArray(fallback) && !Array.isArray(result)) return fallback;
  return result ?? fallback;
}