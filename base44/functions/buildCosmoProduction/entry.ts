import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id } = body;

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    const config = await base44.entities.CosmoProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await base44.entities.CosmoProductionConfiguration.update(configuration_id, { status: 'building' });

    const topics = safeParse(config.topics, []);
    const researchSources = safeParse(config.research_sources, []);
    const aiAutomation = safeParse(config.ai_automation, []);

    // Delete old generated content
    await base44.entities.CosmoTopic.deleteMany({ configuration_id });
    await base44.entities.CosmoResearchItem.deleteMany({ configuration_id });
    await base44.entities.CosmoGuest.deleteMany({ configuration_id });
    await base44.entities.CosmoSegment.deleteMany({ configuration_id });
    await base44.entities.CosmoAsset.deleteMany({ configuration_id });

    // ===== LLM CALL 1: Research + Topics (with web search) =====
    const prompt1 = `You are a professional health & beauty show production assistant. You help produce beauty shows, wellness programs, skincare tutorials, and health-focused content.

SHOW DETAILS:
- Production Name: ${config.production_name || 'Beauty & Wellness Show'}
- Host: ${config.host_name || 'Host'}
- Show Date: ${config.show_date || 'TBD'}
- Station: ${config.station_name || 'N/A'}
- Live/Recorded: ${config.live_or_recorded || 'live'}
- Show Format: ${config.show_format || 'Tutorial / How-To'}
- Show Tone: ${config.show_tone || 'Warm & Empowering'}
- Show Description: ${config.show_description || 'N/A'}

SELECTED TOPICS:
${topics.join(', ') || 'None selected — choose relevant health & beauty topics'}

RESEARCH SOURCES (use these for research):
${researchSources.join(', ') || 'All available sources'}

GUEST DETAILS (if provided):
${config.guest_details || 'No specific guests provided — suggest relevant experts if appropriate'}

TASKS:

1. RESEARCH: For each selected topic, find current and relevant information from the listed sources. Generate 2-4 research items per topic. Each item must include: title, source, category, summary, date, and relevance (high/medium/low).

2. TOPICS: For each selected health/beauty topic, generate a detailed topic breakdown. Each topic must include: topic_name, generated_summary (summary of current developments and trends), talking_points (key talking points for discussion, line-break separated), sources (sources consulted), suggested_placement (where in the show this topic fits best).

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
              category: { type: 'string' },
              summary: { type: 'string' },
              date: { type: 'string' },
              relevance: { type: 'string' }
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
              sources: { type: 'string' },
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
      category: item.category || '',
      summary: item.summary || '',
      date: item.date || new Date().toISOString().split('T')[0],
      relevance: ['high', 'medium', 'low'].includes(item.relevance) ? item.relevance : 'medium'
    }));
    if (researchData.length > 0) {
      await base44.entities.CosmoResearchItem.bulkCreate(researchData);
    }

    // Create topic items
    const topicData = (llm1.topics || []).map(topic => ({
      configuration_id,
      topic_name: topic.topic_name || '',
      generated_summary: topic.generated_summary || '',
      talking_points: topic.talking_points || '',
      sources: topic.sources || '',
      suggested_placement: topic.suggested_placement || '',
      status: 'ready'
    }));
    if (topicData.length > 0) {
      await base44.entities.CosmoTopic.bulkCreate(topicData);
    }

    // ===== LLM CALL 2: Rundown + AI Assets =====
    const topicSummary = (llm1.topics || []).map(t =>
      `- ${t.topic_name}: ${(t.generated_summary || '').substring(0, 100)}...`
    ).join('\n');

    const prompt2 = `You are a professional health & beauty show production assistant. Based on the following topics, research, and show configuration, generate the show rundown and AI production assets.

SHOW CONFIGURATION:
- Production Name: ${config.production_name || 'Beauty & Wellness Show'}
- Host: ${config.host_name || 'Host'}
- Co-Host: ${config.co_host_name || 'None'}
- Show Format: ${config.show_format || 'Tutorial / How-To'}
- Total Show Runtime: ${config.total_show_runtime || 30} minutes
- Beauty/Demo Runtime: ${config.cosmo_segment_runtime || 22} minutes
- Commercial/Sponsor Runtime: ${config.commercial_sponsor_runtime || 4} minutes
- Intro Runtime: ${config.intro_runtime || 2} minutes
- Outro Runtime: ${config.outro_runtime || 2} minutes
- Show Tone: ${config.show_tone || 'Warm & Empowering'}
- Show Start Time: ${config.show_start_time || '14:00'}

TOPICS:
${topicSummary || 'No topics generated'}

GUEST DETAILS:
${config.guest_details || 'No specific guests'}

SELECTED AI AUTOMATION:
${aiAutomation.join(', ') || 'Default assets'}

TASKS:

1. SHOW RUNDOWN: Create a structured show rundown that fills the total show runtime (${config.total_show_runtime || 30} minutes). Include: intro, host monologue, tutorial demos, product reviews, expert interviews, trend discussions, audience Q&A, comparisons, sponsor breaks, station IDs, transitions, and outro. Each rundown item must include: order, segment_type (one of: intro, host_monologue, tutorial_demo, product_review, expert_interview, trend_discussion, audience_qa, comparison, sponsor_break, station_id, transition, outro), title, duration_seconds, start_time (HH:MM), end_time (HH:MM), and notes.

2. AI ASSETS: Generate the following based on selected automation:
- host_intro: An engaging show opening for the host (matching show tone)
- host_outro: A closing monologue wrapping up the show
- host_script: A FULL broadcast-ready script for the HOST covering the entire show — opening, topic introductions, tutorial explanations, product insights, wellness tips, and closing. This is the complete spoken script the host will read. Keep under 4000 characters.
- cohost_script: A FULL broadcast-ready script for the CO-HOST covering their segments — reactions, supplementary commentary, questions, banter, and transitions. This is the complete spoken script the co-host will read. If no co-host is configured, generate a supporting commentary script anyway. Keep under 4000 characters.
- guest_intro: An introduction script for the guest expert(s) (if applicable, otherwise introduce the main topics)
- discussion_questions: 5-7 thought-provoking health & beauty discussion questions for the audience (separated by ---)
- audience_prompts: 3-4 prompts to encourage audience engagement (separated by ---)
- social_captions: Array of 3 social media caption strings for promoting the show
- hashtags: A single string of relevant hashtags separated by spaces
- thumbnail_prompt: A detailed AI image generation prompt for the show thumbnail/presentation cover
- presentation_prompt: A detailed prompt for generating a presentation slide deck for this beauty/wellness show (CREAPD produces presentations, not videos)
- production_notes: Internal production notes for the team

Return a JSON object with exactly these keys: rundown (array), host_intro (string), host_outro (string), host_script (string), cohost_script (string), guest_intro (string), discussion_questions (string), audience_prompts (string), social_captions (array), hashtags (string), thumbnail_prompt (string), presentation_prompt (string), production_notes (string).`;

    const schema2 = {
      type: 'object',
      properties: {
        rundown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              order: { type: 'number' },
              segment_type: { type: 'string' },
              title: { type: 'string' },
              duration_seconds: { type: 'number' },
              start_time: { type: 'string' },
              end_time: { type: 'string' },
              notes: { type: 'string' }
            }
          }
        },
        host_intro: { type: 'string' },
        host_outro: { type: 'string' },
        host_script: { type: 'string' },
        cohost_script: { type: 'string' },
        guest_intro: { type: 'string' },
        discussion_questions: { type: 'string' },
        audience_prompts: { type: 'string' },
        social_captions: { type: 'array', items: { type: 'string' } },
        hashtags: { type: 'string' },
        thumbnail_prompt: { type: 'string' },
        presentation_prompt: { type: 'string' },
        production_notes: { type: 'string' }
      }
    };

    const llm2 = await base44.integrations.Core.InvokeLLM({
      prompt: prompt2,
      response_json_schema: schema2
    });

    // Create rundown segments
    const validSegmentTypes = ['intro', 'host_monologue', 'tutorial_demo', 'product_review', 'expert_interview', 'trend_discussion', 'audience_qa', 'comparison', 'sponsor_break', 'station_id', 'transition', 'outro'];
    const rundownData = (llm2.rundown || []).map((item, idx) => ({
      configuration_id,
      order: item.order || idx,
      segment_type: validSegmentTypes.includes(item.segment_type) ? item.segment_type : 'tutorial_demo',
      title: item.title || '',
      duration_seconds: item.duration_seconds || 0,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      notes: item.notes || '',
      status: 'ready'
    }));
    if (rundownData.length > 0) {
      await base44.entities.CosmoSegment.bulkCreate(rundownData);
    }

    // Create AI assets
    const assets = [];

    if (aiAutomation.includes('Generate Host Intros') && llm2.host_intro) {
      assets.push({ configuration_id, asset_type: 'host_intro', title: 'Host Intro', content: llm2.host_intro, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Host Outros') && llm2.host_outro) {
      assets.push({ configuration_id, asset_type: 'host_outro', title: 'Host Outro', content: llm2.host_outro, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Guest Intros') && llm2.guest_intro) {
      assets.push({ configuration_id, asset_type: 'guest_intro', title: 'Guest Intro', content: llm2.guest_intro, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Discussion Questions') && llm2.discussion_questions) {
      assets.push({ configuration_id, asset_type: 'discussion_questions', title: 'Discussion Questions', content: llm2.discussion_questions, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Audience Prompts') && llm2.audience_prompts) {
      assets.push({ configuration_id, asset_type: 'audience_prompts', title: 'Audience Prompts', content: llm2.audience_prompts, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Talking Points') && topicData.length > 0) {
      for (const topic of topicData) {
        if (topic.talking_points) {
          assets.push({ configuration_id, asset_type: 'talking_points', title: `Talking Points: ${topic.topic_name}`, content: topic.talking_points, associated_topic: topic.topic_name, status: 'ready' });
        }
      }
    }
    if (aiAutomation.includes('Generate Social Captions') && llm2.social_captions) {
      assets.push({ configuration_id, asset_type: 'social_caption', title: 'Social Captions', content: llm2.social_captions.join('\n\n---\n\n'), status: 'ready' });
    }
    if (aiAutomation.includes('Generate Hashtags') && llm2.hashtags) {
      assets.push({ configuration_id, asset_type: 'hashtag', title: 'Hashtags', content: llm2.hashtags, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Thumbnail Prompt') && llm2.thumbnail_prompt) {
      assets.push({ configuration_id, asset_type: 'thumbnail_prompt', title: 'Thumbnail Prompt', content: llm2.thumbnail_prompt, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Presentation Prompt') && llm2.presentation_prompt) {
      assets.push({ configuration_id, asset_type: 'presentation_prompt', title: 'Presentation Prompt', content: llm2.presentation_prompt, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Production Notes') && llm2.production_notes) {
      assets.push({ configuration_id, asset_type: 'production_notes', title: 'Production Notes', content: llm2.production_notes, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Host Script') && llm2.host_script) {
      assets.push({ configuration_id, asset_type: 'host_script', title: 'Host Script', content: llm2.host_script, status: 'ready' });
    }
    if (aiAutomation.includes('Generate Co-Host Script') && llm2.cohost_script) {
      assets.push({ configuration_id, asset_type: 'cohost_script', title: 'Co-Host Script', content: llm2.cohost_script, status: 'ready' });
    }

    if (assets.length > 0) {
      await base44.entities.CosmoAsset.bulkCreate(assets);
    }

    // ===== VOICEOVER GENERATION =====
    const voiceoverAssets = [];

    if (aiAutomation.includes('Generate Host Audio') && llm2.host_script) {
      try {
        const hostScriptText = llm2.host_script.substring(0, 5000);
        const speechResult = await base44.integrations.Core.GenerateSpeech({
          text: hostScriptText,
          voice: 'honey',
          language_code: 'en'
        });
        if (speechResult && speechResult.url) {
          voiceoverAssets.push({
            configuration_id,
            asset_type: 'host_audio',
            title: 'Host Audio',
            content: hostScriptText,
            audio_url: speechResult.url,
            status: 'ready'
          });
        }
      } catch (e) {
        console.error('Host voiceover generation failed:', e.message);
      }
    }

    if (aiAutomation.includes('Generate Co-Host Audio') && llm2.cohost_script) {
      try {
        const cohostScriptText = llm2.cohost_script.substring(0, 5000);
        const speechResult = await base44.integrations.Core.GenerateSpeech({
          text: cohostScriptText,
          voice: 'sunny',
          language_code: 'en'
        });
        if (speechResult && speechResult.url) {
          voiceoverAssets.push({
            configuration_id,
            asset_type: 'cohost_audio',
            title: 'Co-Host Audio',
            content: cohostScriptText,
            audio_url: speechResult.url,
            status: 'ready'
          });
        }
      } catch (e) {
        console.error('Co-Host voiceover generation failed:', e.message);
      }
    }

    if (voiceoverAssets.length > 0) {
      await base44.entities.CosmoAsset.bulkCreate(voiceoverAssets);
    }

    await base44.entities.CosmoProductionConfiguration.update(configuration_id, { status: 'ready' });

    return Response.json({
      success: true,
      configuration_id,
      research_count: researchData.length,
      topic_count: topicData.length,
      rundown_count: rundownData.length,
      asset_count: assets.length,
      voiceover_count: voiceoverAssets.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}