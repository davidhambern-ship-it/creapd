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

    const config = await base44.entities.MusicProductionConfiguration.get(configuration_id);
    if (!config) {
      return Response.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await base44.entities.MusicProductionConfiguration.update(configuration_id, { status: 'planning' });

    const genres = safeParse(config.genres, []);
    const moods = safeParse(config.moods, []);
    const musicTopics = safeParse(config.music_topics, []);
    const researchSources = safeParse(config.research_sources, []);
    const aiAutomation = safeParse(config.ai_automation, []);
    const productionFormat = config.production_format || 'radio';

    const requiredMusicMinutes = config.required_music_runtime || 70;

    // ═══════════════════════════════════════════════════════
    // STAGE 1: PRODUCTION PLANNING — Build PRP from DCP
    // The DCP (Discovery Configuration Package) IS the config.
    // Planning interprets it and produces a PRP (Production
    // Requirements Package) — a list of required deliverables.
    // No content is generated here — only requirements.
    // ═══════════════════════════════════════════════════════

    const estimatedSongCount = Math.ceil(requiredMusicMinutes / 3.5);

    // Requirements differ by production format
    const requirements = productionFormat === 'live' ? [
      { requirement_type: 'rundown', title: 'Live Rundown', detail: 'Structured live show rundown with timing', quantity: 1, media_type: 'text' },
      { requirement_type: 'script', title: 'Live Host Scripts', detail: 'Host scripts for live segments', quantity: 1, media_type: 'text' },
      { requirement_type: 'audience_prompt', title: 'Audience Prompts', detail: 'Interactive prompts for live audience', quantity: 1, media_type: 'text' },
      { requirement_type: 'lower_third', title: 'Lower Thirds', detail: 'Lower third graphics for live broadcast', quantity: 1, media_type: 'video' },
      { requirement_type: 'timing', title: 'Live Timing', detail: 'Segment timing and cue sheet', quantity: 1, media_type: 'text' },
      { requirement_type: 'transition', title: 'Live Transitions', detail: 'Transition cues between segments', quantity: 1, media_type: 'video' },
      { requirement_type: 'producer_cue', title: 'Producer Cues', detail: 'Cue cards for producer', quantity: 1, media_type: 'text' },
      { requirement_type: 'video_support', title: 'Video Support', detail: 'Video support elements for live broadcast', quantity: 1, media_type: 'video' },
    ] : [
      { requirement_type: 'playlist_track', title: 'Playlist Tracks', detail: `~${estimatedSongCount} audio track embeds`, quantity: estimatedSongCount, media_type: 'audio' },
      { requirement_type: 'show_clock', title: 'Show Clock', detail: 'Clock showing segment timing for the radio show', quantity: 1, media_type: 'text' },
      { requirement_type: 'song_intro', title: 'Song Intros', detail: 'Intro text for each playlist track', quantity: estimatedSongCount, media_type: 'text' },
      { requirement_type: 'song_outro', title: 'Song Outros', detail: 'Outro text for each playlist track', quantity: estimatedSongCount, media_type: 'text' },
      { requirement_type: 'host_banter', title: 'Host Banter', detail: 'Conversational banter segments', quantity: 1, media_type: 'text' },
      { requirement_type: 'station_id', title: 'Station IDs', detail: 'Station identification segments', quantity: 1, media_type: 'text' },
      { requirement_type: 'sponsor_read', title: 'Sponsor Reads', detail: 'Sponsor read copy', quantity: 1, media_type: 'text' },
      { requirement_type: 'final_rundown', title: 'Final Rundown', detail: 'Complete show rundown with timing', quantity: 1, media_type: 'text' },
    ];

    // Add topic-based requirements if topics are selected
    if (musicTopics.length > 0) {
      requirements.push(
        { requirement_type: 'topic_research', title: 'Topic Research', detail: `Research for ${musicTopics.length} selected topics`, quantity: musicTopics.length, media_type: 'text' },
        { requirement_type: 'artist_fact', title: 'Artist Facts', detail: 'Interesting facts about playlist artists', quantity: estimatedSongCount, media_type: 'text' },
      );
      if (musicTopics.includes('Music Trivia')) {
        requirements.push({ requirement_type: 'music_trivia', title: 'Music Trivia', detail: 'Music trivia questions for the show', quantity: 1, media_type: 'text' });
      }
    }

    // Add video requirements if video-related topics are selected
    if (musicTopics.includes('Music Video Releases') || musicTopics.includes('Viral Songs')) {
      requirements.push(
        { requirement_type: 'video_segment', title: 'Video Segments', detail: 'Video iframe embeds for featured videos', quantity: 1, media_type: 'video' },
      );
    }

    // Build the PRP
    const prp = {
      production_format: productionFormat,
      total_show_runtime: config.total_show_runtime || 90,
      required_music_runtime: requiredMusicMinutes,
      estimated_song_count: estimatedSongCount,
      requirements,
      media_rules: {
        playlist_tracks: 'Audio track embeds only — never satisfied by video',
        video_segments: 'Video iframe embeds — separate from track media',
        interchange_rule: 'Track media and Video media are separate asset types and are never interchangeable',
      },
      automation_preferences: aiAutomation,
      planning_notes: `Production format "${productionFormat}" requires ${requirements.length} deliverable categories. Planning determines required work; departments execute it.`,
    };

    // Store the PRP on the config
    await base44.entities.MusicProductionConfiguration.update(configuration_id, {
      status: 'building',
      production_plan: JSON.stringify(prp),
    });

    // ═══════════════════════════════════════════════════════
    // STAGE 2: RESEARCH DEPARTMENT
    // Gated by ai_automation preference: 'Auto Research'
    // ═══════════════════════════════════════════════════════

    // Delete old generated content for this configuration
    await base44.entities.PlaylistItem.deleteMany({ configuration_id });
    await base44.entities.MusicTopic.deleteMany({ configuration_id });
    await base44.entities.MusicResearchItem.deleteMany({ configuration_id });
    await base44.entities.ShowRundownItem.deleteMany({ configuration_id });
    await base44.entities.MusicAsset.deleteMany({ configuration_id });

    const autoResearch = aiAutomation.includes('Auto Research');
    const autoBuildPlaylist = aiAutomation.includes('Auto Build Playlist');
    const autoDevelop = aiAutomation.includes('Auto Develop');
    const autoGenerateImages = aiAutomation.includes('Auto Generate Images');
    const autoAssemblePacket = aiAutomation.includes('Auto Assemble Packet');
    const autoExport = aiAutomation.includes('Auto Export');

    let playlistData = [];
    let researchData = [];
    let topicData = [];

    if (autoResearch || autoBuildPlaylist) {
      // ===== LLM CALL 1: Research + Playlist + Topics (with web search) =====
      const prompt1 = `You are a professional music production assistant for a ${productionFormat === 'live' ? 'live music broadcast' : 'radio show'} / music program.
You are generating a SET LIST / PLAYLIST PLAN only. You are NOT streaming or providing playable music. Each song entry is a recommendation with title, artist, and metadata.

IMPORTANT MEDIA RULE: Playlist tracks are AUDIO track embeds only. Never satisfy a track requirement using a video. Video requirements are separate asset types.

SHOW DETAILS:
- Production Name: ${config.production_name || 'Music Show'}
- Host: ${config.host_name || 'Host'}
- Show Date: ${config.show_date || 'TBD'}
- Station: ${config.station_name || 'N/A'}
- Production Format: ${productionFormat}

MUSIC SETTINGS:
- Genres: ${genres.join(', ') || 'Top 40'}
- Mood/Vibe: ${moods.join(', ') || 'Feel Good'}
- Show Tone: ${config.show_tone || 'Professional'}
- Required Music Runtime: ${requiredMusicMinutes} minutes
- Energy Flow: ${config.playlist_energy_flow || 'Build Energy Gradually'}

PLAYLIST RULES:
- Must-Play Songs: ${config.must_play_songs || 'None specified'}
- Blocked Songs: ${config.blocked_songs || 'None specified'}
- Blocked Artists: ${config.blocked_artists || 'None specified'}
- Max Songs Per Artist: ${config.max_songs_per_artist || 2}
- Include Independent Artists: ${config.include_indie !== false ? 'Yes' : 'No'}
- Include Local Artists: ${config.include_local === true ? 'Yes' : 'No'}
- Include New Releases: ${config.include_new_releases !== false ? 'Yes' : 'No'}
- Include Throwbacks: ${config.include_throwbacks !== false ? 'Yes' : 'No'}
- Clean Only: ${config.clean_only === true ? 'Yes' : 'No'}
- Explicit Allowed: ${config.explicit_allowed === true ? 'Yes' : 'No'}
- Preferred Eras: ${config.preferred_eras || 'Any'}

SELECTED MUSIC TOPICS:
${musicTopics.join(', ') || 'None selected'}

RESEARCH SOURCES (use these for research):
${researchSources.join(', ') || 'All available sources'}

TASKS:

1. PLAYLIST: Generate a playlist of REAL, well-known songs that totals approximately ${requiredMusicMinutes} minutes. Include a mix of songs matching the genres, moods, and energy flow. Each song must include: song_title, artist, length_seconds (realistic estimate), genre, mood, era_year, and reason_selected (why this song fits). Respect all playlist rules. Apply the energy flow pattern to song ordering.

2. RESEARCH: For each selected topic, find current and relevant music information from the listed sources. Generate 2-4 research items per topic. Each item must include: title, source, category, summary, date, and relevance (high/medium/low).

3. TOPICS: For each selected topic, generate: a summary of current developments, 3-5 talking points (as a single string with line breaks), sources consulted, and suggested_placement in the show.

Return a JSON object with exactly these keys: playlist (array), research (array), topics (array).`;

      const schema1 = {
        type: 'object',
        properties: {
          playlist: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                song_title: { type: 'string' },
                artist: { type: 'string' },
                length_seconds: { type: 'number' },
                genre: { type: 'string' },
                mood: { type: 'string' },
                era_year: { type: 'string' },
                reason_selected: { type: 'string' }
              }
            }
          },
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

      // Create playlist items
      playlistData = (llm1.playlist || []).map((song, idx) => ({
        configuration_id,
        order: idx,
        song_title: song.song_title || 'Unknown',
        artist: song.artist || 'Unknown',
        length_seconds: song.length_seconds || 180,
        genre: song.genre || (genres[0] || 'Pop'),
        mood: song.mood || (moods[0] || 'Feel Good'),
        era_year: song.era_year || '',
        reason_selected: song.reason_selected || '',
        status: 'suggested'
      }));
      if (playlistData.length > 0) {
        await base44.entities.PlaylistItem.bulkCreate(playlistData);

        // YouTube lookup — find real YouTube video IDs for each playlist track
        try {
          const songList = playlistData.map((s, i) => `${i + 1}. "${s.song_title}" by ${s.artist}`).join('\n');

          const ytPrompt = `You are a music librarian. For each song below, find its REAL YouTube video URL. These must be REAL, searchable YouTube videos that actually exist. Prefer official music videos, Vevo, or official channel uploads.

SONGS TO FIND:
${songList}

Return a JSON object with key "results" containing an array of objects, each with:
- song_title (exact match from the list above)
- artist (exact match from the list above)
- youtube_url (full YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID)

Only include songs where you found a real, working YouTube URL. Skip any you cannot find.`;

          const ytSchema = {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    song_title: { type: 'string' },
                    artist: { type: 'string' },
                    youtube_url: { type: 'string' }
                  }
                }
              }
            }
          };

          const ytResult = await base44.integrations.Core.InvokeLLM({
            prompt: ytPrompt,
            add_context_from_internet: true,
            response_json_schema: ytSchema,
            model: 'gemini_3_flash'
          });

          const ytResults = ytResult.results || [];

          // Fetch created playlist items to get their IDs
          const createdItems = await base44.entities.PlaylistItem.filter({ configuration_id });

          const updates = [];
          for (const result of ytResults) {
            const videoId = extractVideoId(result.youtube_url || '');
            if (!videoId) continue;

            const matchedItem = createdItems.find(item =>
              item.song_title === result.song_title && item.artist === result.artist
            );
            if (!matchedItem) continue;

            // Validate via oEmbed
            let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            let channelName = '';
            try {
              const oembedResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
              if (oembedResp.ok) {
                const oembed = await oembedResp.json();
                channelName = oembed.author_name || '';
                thumbnailUrl = oembed.thumbnail_url || thumbnailUrl;
              }
            } catch {}

            updates.push({
              id: matchedItem.id,
              youtube_video_id: videoId,
              thumbnail_url: thumbnailUrl,
              channel_name: channelName
            });
          }

          if (updates.length > 0) {
            await base44.entities.PlaylistItem.bulkUpdate(updates);
          }
        } catch (e) {
          console.error('YouTube lookup for playlist failed:', e.message);
        }
      }

      // Create research items
      researchData = (llm1.research || []).map(item => ({
        configuration_id,
        title: item.title || '',
        source: item.source || '',
        category: item.category || '',
        summary: item.summary || '',
        date: item.date || new Date().toISOString().split('T')[0],
        relevance: ['high', 'medium', 'low'].includes(item.relevance) ? item.relevance : 'medium'
      }));
      if (researchData.length > 0) {
        await base44.entities.MusicResearchItem.bulkCreate(researchData);
      }

      // Create topic items
      topicData = (llm1.topics || []).map(topic => ({
        configuration_id,
        topic_name: topic.topic_name || '',
        generated_summary: topic.generated_summary || '',
        talking_points: topic.talking_points || '',
        sources: topic.sources || '',
        suggested_placement: topic.suggested_placement || '',
        status: 'ready'
      }));
      if (topicData.length > 0) {
        await base44.entities.MusicTopic.bulkCreate(topicData);
      }
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 3: DEVELOPMENT DEPARTMENT
    // Gated by ai_automation preference: 'Auto Develop'
    // Generates rundown and production assets
    // ═══════════════════════════════════════════════════════

    let rundownData = [];
    let assets = [];

    if (autoDevelop) {
      const playlistSummary = playlistData.map((s, i) =>
        `${i + 1}. "${s.song_title}" by ${s.artist} (${Math.round((s.length_seconds || 180) / 60)} min, ${s.genre})`
      ).join('\n');

      const topicSummary = topicData.map(t => {
        const points = (t.talking_points || '').split('\n').filter(Boolean).map(p => `    ${p}`).join('\n');
        return `- ${t.topic_name}:\n  Summary: ${t.generated_summary || ''}\n  Talking Points:\n${points}`;
      }).join('\n');

      const prompt2 = `You are a professional music production assistant. Based on the following playlist, topics, and show configuration, generate the show rundown and AI production assets.

IMPORTANT MEDIA RULE: Playlist track requirements resolve to AUDIO embeds only. Video requirements resolve to VIDEO iframe embeds. These are never interchangeable.

SHOW CONFIGURATION:
- Production Name: ${config.production_name || 'Music Show'}
- Host: ${config.host_name || 'Host'}
- Co-Host: ${config.co_host_name || 'None'}
- Production Format: ${productionFormat}
- Total Show Runtime: ${config.total_show_runtime || 90} minutes
- Required Music Runtime: ${requiredMusicMinutes} minutes
- Talk/Segment Runtime: ${config.talk_segment_runtime || 12} minutes
- Commercial/Sponsor Runtime: ${config.commercial_sponsor_runtime || 6} minutes
- Intro Runtime: ${config.intro_runtime || 1} minutes
- Outro Runtime: ${config.outro_runtime || 1} minutes
- Show Tone: ${config.show_tone || 'Professional'}
- Show Start Time: ${config.show_start_time || '06:00'}

PLAYLIST (songs in order):
${playlistSummary || 'No playlist generated'}

TOPICS (with talking points):
${topicSummary || 'No topics generated'}

TASKS:

1. SHOW RUNDOWN: Create a structured show rundown that fills the total show runtime (${config.total_show_runtime || 90} minutes).

MANDATORY: The rundown MUST start with an "intro" segment (Show Intro) and end with an "outro" segment (Show Outro).

Each rundown item must include:
- order: sequence number
- segment_type: one of: intro, song, talk_break, topic_segment, sponsor_break, station_id, outro
- title: segment title
- script_content: The FULL voiceover script text for this segment — what the host will say. REQUIRED for every non-song segment. For song segments, this is the intro the host says before the song plays.
- associated_song_title: For song segments only — the exact song title from the playlist above
- associated_topic: For topic_segment items only — the topic name
- notes: brief production notes

SCRIPT REQUIREMENTS:
- Show Intro: Write a compelling show opening script that welcomes listeners, introduces the host, and sets the tone. Match the show tone (${config.show_tone}).
- Show Outro: Write a show closing script that thanks listeners and signs off.
- Talk Breaks: Generate conversational banter scripts based on the show vibe and tone. These should feel natural and engaging.
- Topic Segments: Derive the script content from the numbered talking points provided for each topic. Expand each talking point into a full spoken script that fills the allocated time.
- Song Intros: Write a brief, engaging intro for each song that mentions the artist and song title.
- For each non-song segment, the script_content length should be proportional to the allocated time (~150 words per minute). Do NOT include duration_seconds, start_time, or end_time — those will be calculated from the script text.

2. AI ASSETS: Generate the following based on the production format (${productionFormat}):
- host_banter: 2-3 segments of conversational banter for the host (matching show tone, separated by ---)
- song_intros: Array of {song_title, intro_text} for ALL songs in the playlist
- song_outros: Array of {song_title, outro_text} for ALL songs in the playlist
- social_captions: Array of 3 social media caption strings for promoting the show
- hashtags: A single string of relevant hashtags separated by spaces
- thumbnail_prompt: A detailed AI image generation prompt for the show thumbnail
- video_prompt: A video production prompt for social media clips
- production_notes: Internal production notes for the team

Return a JSON object with exactly these keys: rundown (array), host_banter (string), song_intros (array), song_outros (array), social_captions (array), hashtags (string), thumbnail_prompt (string), video_prompt (string), production_notes (string).`;

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
                script_content: { type: 'string' },
                associated_song_title: { type: 'string' },
                associated_topic: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          host_banter: { type: 'string' },
          song_intros: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                song_title: { type: 'string' },
                intro_text: { type: 'string' }
              }
            }
          },
          song_outros: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                song_title: { type: 'string' },
                outro_text: { type: 'string' }
              }
            }
          },
          social_captions: {
            type: 'array',
            items: { type: 'string' }
          },
          hashtags: { type: 'string' },
          thumbnail_prompt: { type: 'string' },
          video_prompt: { type: 'string' },
          production_notes: { type: 'string' }
        }
      };

      const llm2 = await base44.integrations.Core.InvokeLLM({
        prompt: prompt2,
        response_json_schema: schema2
      });

      // Create rundown items — calculate duration from script text, build cumulative timeline
      const CHARS_PER_SEC = 15;
      const showStartSecs = parseTimeToSeconds(config.show_start_time || '00:00');
      let cursorSecs = showStartSecs;

      rundownData = (llm2.rundown || []).map((item, idx) => {
        const segmentType = ['intro', 'song', 'talk_break', 'topic_segment', 'sponsor_break', 'station_id', 'outro'].includes(item.segment_type) ? item.segment_type : 'talk_break';
        const scriptContent = item.script_content || '';

        let durationSeconds;
        if (segmentType === 'song') {
          const songTitle = (item.associated_song_title || item.title || '').toLowerCase().trim();
          const matchedSong = playlistData.find(s => (s.song_title || '').toLowerCase().trim() === songTitle);
          const songLength = matchedSong?.length_seconds || 180;
          const introLength = scriptContent ? Math.ceil(scriptContent.length / CHARS_PER_SEC) : 0;
          durationSeconds = songLength + introLength;
        } else {
          durationSeconds = scriptContent ? Math.ceil(scriptContent.length / CHARS_PER_SEC) : 60;
        }

        const startTime = formatSecondsToTime(cursorSecs);
        cursorSecs += durationSeconds;
        const endTime = formatSecondsToTime(cursorSecs);

        return {
          configuration_id,
          order: item.order || idx,
          segment_type: segmentType,
          title: item.title || '',
          script_content: scriptContent,
          associated_topic: item.associated_topic || null,
          duration_seconds: durationSeconds,
          start_time: startTime,
          end_time: endTime,
          notes: item.notes || '',
          status: 'ready'
        };
      });
      if (rundownData.length > 0) {
        await base44.entities.ShowRundownItem.bulkCreate(rundownData);
      }

      // Create AI assets — format-agnostic deliverables
      if (llm2.host_banter) {
        assets.push({ configuration_id, asset_type: 'host_banter', title: 'Host Banter', content: llm2.host_banter, status: 'ready' });
      }
      if (llm2.song_intros) {
        for (const intro of llm2.song_intros) {
          assets.push({ configuration_id, asset_type: 'song_intro', title: `Intro: ${intro.song_title}`, content: intro.intro_text, associated_song_title: intro.song_title, status: 'ready' });
        }
      }
      if (llm2.song_outros) {
        for (const outro of llm2.song_outros) {
          assets.push({ configuration_id, asset_type: 'song_outro', title: `Outro: ${outro.song_title}`, content: outro.outro_text, associated_song_title: outro.song_title, status: 'ready' });
        }
      }
      if (llm2.social_captions) {
        assets.push({ configuration_id, asset_type: 'social_caption', title: 'Social Captions', content: llm2.social_captions.join('\n\n---\n\n'), status: 'ready' });
      }
      if (llm2.hashtags) {
        assets.push({ configuration_id, asset_type: 'hashtag', title: 'Hashtags', content: llm2.hashtags, status: 'ready' });
      }
      if (llm2.thumbnail_prompt) {
        assets.push({ configuration_id, asset_type: 'thumbnail_prompt', title: 'Thumbnail Prompt', content: llm2.thumbnail_prompt, status: 'ready' });
      }
      if (llm2.video_prompt) {
        assets.push({ configuration_id, asset_type: 'video_prompt', title: 'Video Prompt', content: llm2.video_prompt, status: 'ready' });
      }
      if (llm2.production_notes) {
        assets.push({ configuration_id, asset_type: 'production_notes', title: 'Production Notes', content: llm2.production_notes, status: 'ready' });
      }

      if (assets.length > 0) {
        await base44.entities.MusicAsset.bulkCreate(assets);
      }

      // ═══════════════════════════════════════════════════════
      // STAGE 4: ASSET DEPARTMENT — AI Image Generation
      // Gated by ai_automation preference: 'Auto Generate Images'
      // ═══════════════════════════════════════════════════════

      if (autoGenerateImages && llm2.thumbnail_prompt) {
        try {
          const imgResult = await base44.integrations.Core.GenerateImage({
            prompt: llm2.thumbnail_prompt
          });
          if (imgResult?.url) {
            await base44.entities.MusicAsset.create({
              configuration_id,
              asset_type: 'ai_image',
              title: 'Show Thumbnail',
              content: llm2.thumbnail_prompt,
              generated_image_url: imgResult.url,
              status: 'approved'
            });
          }
        } catch (e) {
          console.error('Image generation failed:', e.message);
        }
      }

      // ═══════════════════════════════════════════════════════
      // STAGE 5: PACKET DEPARTMENT — APD Package Assembly
      // Gated by ai_automation preference: 'Auto Assemble Packet'
      // ═══════════════════════════════════════════════════════

      if (autoAssemblePacket) {
        try {
          await base44.functions.invoke('createAPDReadyPackage', {
            production_profile: 'music',
            source_entity_type: 'MusicProductionConfiguration',
            source_entity_id: configuration_id,
            configuration_id,
            title: config.production_name || 'Music Show',
            headline: config.production_name || 'Music Show',
            teleprompter_script: llm2.host_banter || '',
            story_summary: topicData.map(t => `${t.topic_name}: ${t.generated_summary}`).join('\n\n'),
            talking_points: topicData.map(t => t.talking_points).join('\n---\n'),
            social_media_caption: llm2.social_captions ? llm2.social_captions.join('\n\n') : '',
            thumbnail_prompt: llm2.thumbnail_prompt || '',
            image_generation_prompt: llm2.thumbnail_prompt || '',
            producer_notes: llm2.production_notes || '',
            artist_facts: llm2.song_intros ? llm2.song_intros.map(f => `${f.song_title}`).join('\n') : '',
            playlist_segment: playlistData.map(p => `${p.song_title} by ${p.artist}`).join('\n')
          });
        } catch (e) {
          console.error('APD adapter failed:', e.message);
        }
      }

      // ═══════════════════════════════════════════════════════
      // STAGE 6: EXPORT DEPARTMENT
      // Gated by ai_automation preference: 'Auto Export'
      // ═══════════════════════════════════════════════════════

      if (autoExport) {
        try {
          await base44.functions.invoke('createExportJob', {
            production_profile: 'music',
            source_entity_type: 'MusicProductionConfiguration',
            configuration_id,
            title: config.production_name || 'Music Show',
          });
        } catch (e) {
          console.error('Export job failed:', e.message);
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 7: TOP 10 — Auto-generate after playlist exists
    // ═══════════════════════════════════════════════════════

    let top10_count = 0;
    try {
      const top10Result = await base44.functions.invoke('generateMusicTop10', { configuration_id });
      top10_count = top10Result?.data?.top10_count || 0;
    } catch (e) {
      console.error('Top 10 generation failed:', e.message);
    }

    // Update config status to ready
    await base44.entities.MusicProductionConfiguration.update(configuration_id, { status: 'ready' });

    return Response.json({
      success: true,
      configuration_id,
      production_format: productionFormat,
      requirements_count: requirements.length,
      playlist_count: playlistData.length,
      research_count: researchData.length,
      topic_count: topicData.length,
      rundown_count: rundownData.length,
      asset_count: assets.length,
      top10_count,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function extractVideoId(url) {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60;
}

function formatSecondsToTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}