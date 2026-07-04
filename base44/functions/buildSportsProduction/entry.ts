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

    const config = await base44.entities.SportsProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await base44.entities.SportsProductionConfiguration.update(configuration_id, { status: 'building' });

    const sports = safeParse(config.sports, []);
    const researchSources = safeParse(config.research_sources, []);
    const aiAutomation = safeParse(config.ai_automation, []);

    // Delete old generated content
    await base44.entities.SportsGame.deleteMany({ configuration_id });
    await base44.entities.SportsResearchItem.deleteMany({ configuration_id });
    await base44.entities.SportsAthlete.deleteMany({ configuration_id });
    await base44.entities.SportsSegment.deleteMany({ configuration_id });
    await base44.entities.SportsAsset.deleteMany({ configuration_id });

    // ===== LLM CALL 1: Research + Games (with web search) =====
    const prompt1 = `You are a professional sports show production assistant. You help produce sports shows, game previews, recaps, scoreboard updates, athlete interviews, and sports commentary presentations.

SHOW DETAILS:
- Production Name: ${config.production_name || 'Sports Show'}
- Host: ${config.host_name || 'Host'}
- Show Date: ${config.show_date || 'TBD'}
- Station: ${config.station_name || 'N/A'}
- Live/Recorded: ${config.live_or_recorded || 'live'}
- Show Format: ${config.show_format || 'Game Preview'}
- Show Tone: ${config.show_tone || 'Energetic & Analytical'}
- Show Description: ${config.show_description || 'N/A'}

SELECTED SPORTS:
${sports.join(', ') || 'None selected — choose relevant sports and games'}

RESEARCH SOURCES (use these for research):
${researchSources.join(', ') || 'All available sources'}

GUEST DETAILS (if provided):
${config.guest_details || 'No specific guests provided — suggest relevant athletes/coaches if appropriate'}

TASKS:

1. RESEARCH: For each selected sport, find current and relevant information from the listed sources. Generate 2-4 research items per sport. Each item must include: title, source, category, summary, date, and relevance (high/medium/low).

2. GAMES: For each selected sport, generate a game or matchup that would work well on the show. Each game must include: game_name, generated_summary (description of the game and context), key_matchups (key player vs player or team vs team matchups), talking_points (key talking points for discussion), stats_and_figures (important stats and figures), sources (sources consulted), suggested_placement (where in the show this game fits), game_status (upcoming/in_progress/completed).

Return a JSON object with exactly these keys: research (array), games (array).`;

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
        games: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              game_name: { type: 'string' },
              generated_summary: { type: 'string' },
              key_matchups: { type: 'string' },
              talking_points: { type: 'string' },
              stats_and_figures: { type: 'string' },
              sources: { type: 'string' },
              suggested_placement: { type: 'string' },
              game_status: { type: 'string' }
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
      await base44.entities.SportsResearchItem.bulkCreate(researchData);
    }

    // Create game items
    const validGameStatuses = ['upcoming', 'in_progress', 'completed'];
    const gameData = (llm1.games || []).map(game => ({
      configuration_id,
      game_name: game.game_name || '',
      generated_summary: game.generated_summary || '',
      key_matchups: game.key_matchups || '',
      talking_points: game.talking_points || '',
      stats_and_figures: game.stats_and_figures || '',
      sources: game.sources || '',
      suggested_placement: game.suggested_placement || '',
      game_status: validGameStatuses.includes(game.game_status) ? game.game_status : 'upcoming',
      status: 'ready'
    }));
    if (gameData.length > 0) {
      await base44.entities.SportsGame.bulkCreate(gameData);
    }

    // ===== LLM CALL 2: Rundown + AI Assets =====
    const gameSummary = (llm1.games || []).map(g =>
      `- ${g.game_name}: ${(g.generated_summary || '').substring(0, 100)}...`
    ).join('\n');

    const prompt2 = `You are a professional sports show production assistant. Based on the following games, research, and show configuration, generate the show rundown and AI production assets.

SHOW CONFIGURATION:
- Production Name: ${config.production_name || 'Sports Show'}
- Host: ${config.host_name || 'Host'}
- Co-Host: ${config.co_host_name || 'None'}
- Show Format: ${config.show_format || 'Game Preview'}
- Total Show Runtime: ${config.total_show_runtime || 30} minutes
- Sports/Discussion Runtime: ${config.sports_segment_runtime || 22} minutes
- Commercial/Sponsor Runtime: ${config.commercial_sponsor_runtime || 4} minutes
- Intro Runtime: ${config.intro_runtime || 2} minutes
- Outro Runtime: ${config.outro_runtime || 2} minutes
- Show Tone: ${config.show_tone || 'Energetic & Analytical'}
- Show Start Time: ${config.show_start_time || '18:00'}

GAMES:
${gameSummary || 'No games generated'}

GUEST DETAILS:
${config.guest_details || 'No specific guests'}

SELECTED AI AUTOMATION:
${aiAutomation.join(', ') || 'Default assets'}

TASKS:

1. SHOW RUNDOWN: Create a structured show rundown that fills the total show runtime (${config.total_show_runtime || 30} minutes). Include: intro, host monologue, game previews, game recaps, scoreboard updates, athlete interviews, analysis, debates, sponsor breaks, station IDs, transitions, and outro. Each rundown item must include: order, segment_type (one of: intro, host_monologue, game_preview, game_recap, scoreboard_update, athlete_interview, analysis, debate, audience_qa, sponsor_break, station_id, transition, outro), title, duration_seconds, start_time (HH:MM), end_time (HH:MM), and notes.

2. AI ASSETS: Generate the following based on selected automation:
- host_intro: An engaging show opening for the host (matching show tone)
- host_outro: A closing monologue wrapping up the show
- host_script: A FULL broadcast-ready script for the HOST covering the entire show — opening, game previews, analysis, stats breakdown, and closing. This is the complete spoken script the host will read. Keep under 4000 characters.
- cohost_script: A FULL broadcast-ready script for the CO-HOST covering their segments — reactions, supplementary commentary, questions, banter, and transitions. This is the complete spoken script the co-host will read. If no co-host is configured, generate a supporting commentary script anyway. Keep under 4000 characters.
- guest_intro: An introduction script for the guest athlete(s)/coach(es) (if applicable, otherwise introduce the main games)
- discussion_questions: 5-7 thought-provoking sports discussion questions for the audience (separated by ---)
- audience_prompts: 3-4 prompts to encourage audience engagement (separated by ---)
- social_captions: Array of 3 social media caption strings for promoting the show
- hashtags: A single string of relevant hashtags separated by spaces
- thumbnail_prompt: A detailed AI image generation prompt for the show thumbnail/presentation cover
- presentation_prompt: A detailed prompt for generating a presentation slide deck for this sports show (CREAPD produces presentations, not videos)
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
    const validSegmentTypes = ['intro', 'host_monologue', 'game_preview', 'game_recap', 'scoreboard_update', 'athlete_interview', 'analysis', 'debate', 'audience_qa', 'sponsor_break', 'station_id', 'transition', 'outro'];
    const rundownData = (llm2.rundown || []).map((item, idx) => ({
      configuration_id,
      order: item.order || idx,
      segment_type: validSegmentTypes.includes(item.segment_type) ? item.segment_type : 'game_preview',
      title: item.title || '',
      duration_seconds: item.duration_seconds || 0,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      notes: item.notes || '',
      status: 'ready'
    }));
    if (rundownData.length > 0) {
      await base44.entities.SportsSegment.bulkCreate(rundownData);
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
    if (aiAutomation.includes('Generate Talking Points') && gameData.length > 0) {
      for (const game of gameData) {
        if (game.talking_points) {
          assets.push({ configuration_id, asset_type: 'talking_points', title: `Talking Points: ${game.game_name}`, content: game.talking_points, associated_game: game.game_name, status: 'ready' });
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
      await base44.entities.SportsAsset.bulkCreate(assets);
    }

    // ===== VOICEOVER GENERATION =====
    const voiceoverAssets = [];

    if (aiAutomation.includes('Generate Host Audio') && llm2.host_script) {
      try {
        const hostScriptText = llm2.host_script.substring(0, 5000);
        const speechResult = await base44.integrations.Core.GenerateSpeech({
          text: hostScriptText,
          voice: 'storm',
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
          voice: 'spark',
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
      await base44.entities.SportsAsset.bulkCreate(voiceoverAssets);
    }

    // ===== APD PACKAGE ADAPTER =====
    let apdPackageId = null;
    try {
      const hostAudio = voiceoverAssets.find(v => v.asset_type === 'host_audio');
      const adapterResponse = await base44.functions.invoke('createAPDReadyPackage', {
        production_profile: 'sports',
        source_entity_type: 'SportsProductionConfiguration',
        source_entity_id: configuration_id,
        configuration_id,
        title: config.production_name || 'Sports Show',
        headline: config.production_name || 'Sports Show',
        teleprompter_script: llm2.host_script || '',
        story_summary: gameData.map(g => `${g.game_name}: ${g.generated_summary}`).join('\n\n'),
        talking_points: gameData.map(g => g.talking_points).join('\n---\n'),
        social_media_caption: llm2.social_captions ? llm2.social_captions.join('\n\n') : '',
        thumbnail_prompt: llm2.thumbnail_prompt || '',
        image_generation_prompt: llm2.presentation_prompt || llm2.thumbnail_prompt || '',
        producer_notes: llm2.production_notes || '',
        voice_audio_url: hostAudio ? hostAudio.audio_url : ''
      });
      apdPackageId = (adapterResponse?.data || adapterResponse)?.package_id || null;
    } catch (e) {
      console.error('APD adapter failed:', e.message);
    }

    await base44.entities.SportsProductionConfiguration.update(configuration_id, { status: 'ready' });

    return Response.json({
      success: true,
      configuration_id,
      research_count: researchData.length,
      game_count: gameData.length,
      rundown_count: rundownData.length,
      asset_count: assets.length,
      voiceover_count: voiceoverAssets.length,
      apd_package_id: apdPackageId
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}