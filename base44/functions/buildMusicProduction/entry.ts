import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let pipelineConfigId = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id } = body;
    pipelineConfigId = configuration_id;

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

    const pacingRules = safeParse(config.pacing_rules, { max_sequential_songs: 4, min_talk_break_frequency: 1 });

    const requiredMusicMinutes = config.required_music_runtime || 70;

    // ═══════════════════════════════════════════════════════
    // STAGE 1: PRODUCTION PLANNING — Build PRP from DCP
    // ═══════════════════════════════════════════════════════

    const estimatedSongCount = Math.ceil(requiredMusicMinutes / 3.5);

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

    if (musicTopics.length > 0) {
      requirements.push(
        { requirement_type: 'topic_research', title: 'Topic Research', detail: `Research for ${musicTopics.length} selected topics`, quantity: musicTopics.length, media_type: 'text' },
        { requirement_type: 'artist_fact', title: 'Artist Facts', detail: 'Interesting facts about playlist artists', quantity: estimatedSongCount, media_type: 'text' },
      );
      if (musicTopics.includes('Music Trivia')) {
        requirements.push({ requirement_type: 'music_trivia', title: 'Music Trivia', detail: 'Music trivia questions for the show', quantity: 1, media_type: 'text' });
      }
    }

    if (musicTopics.includes('Music Video Releases') || musicTopics.includes('Viral Songs')) {
      requirements.push(
        { requirement_type: 'video_segment', title: 'Video Segments', detail: 'Video iframe embeds for featured videos', quantity: 1, media_type: 'video' },
      );
    }

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

    await base44.entities.MusicProductionConfiguration.update(configuration_id, {
      status: 'building',
      production_plan: JSON.stringify(prp),
    });

    // Delete old generated content for this configuration
    await base44.entities.PlaylistItem.deleteMany({ configuration_id });
    await base44.entities.MusicTopic.deleteMany({ configuration_id });
    await base44.entities.MusicResearchItem.deleteMany({ configuration_id });
    await base44.entities.ShowRundownItem.deleteMany({ configuration_id });
    await base44.entities.MusicAsset.deleteMany({ configuration_id });

    const buildLog = [];
    const persistBuildLog = async (stageName, status, extra = {}) => {
      buildLog.push({ stage: stageName, status, timestamp: new Date().toISOString(), ...extra });
      try {
        await base44.entities.MusicProductionConfiguration.update(configuration_id, {
          build_log: JSON.stringify(buildLog)
        });
      } catch (e) {
        console.error(`Failed to persist build log for ${stageName}:`, e.message);
      }
    };

    await persistBuildLog('planning', 'complete', { requirements_count: requirements.length });

    const autoResearch = aiAutomation.includes('Auto Research');
    const autoBuildPlaylist = aiAutomation.includes('Auto Build Playlist');
    const autoDevelop = aiAutomation.includes('Auto Develop');
    const autoGenerateImages = aiAutomation.includes('Auto Generate Images');
    const autoAssemblePacket = aiAutomation.includes('Auto Assemble Packet');
    const autoExport = aiAutomation.includes('Auto Export');

    let playlistData = [];
    let researchData = [];
    let topicData = [];
    let assets = [];
    let musicArticles = [];
    let rundownData = [];

    // ═══════════════════════════════════════════════════════
    // STAGE 2: PLAYLIST DEPARTMENT
    // Gated by ai_automation preference: 'Auto Build Playlist'
    // ═══════════════════════════════════════════════════════

    if (autoBuildPlaylist) {
      const playlistPrompt = `You are a professional music production assistant for a ${productionFormat === 'live' ? 'live music broadcast' : 'radio show'} / music program.
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

Generate a playlist of REAL, well-known songs that totals approximately ${requiredMusicMinutes} minutes. Include a mix of songs matching the genres, moods, and energy flow. Each song must include: song_title, artist, length_seconds (realistic estimate), genre, mood, era_year, and reason_selected (why this song fits). Respect all playlist rules. Apply the energy flow pattern to song ordering.

Return a JSON object with key "playlist" containing an array of song objects.`;

      const playlistSchema = {
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
          }
        }
      };

      const playlistHealResult = await withSelfHealing(base44, 'playlist_generation', async (adjustedPrompt) => {
        return await base44.integrations.Core.InvokeLLM({
          prompt: adjustedPrompt,
          add_context_from_internet: true,
          response_json_schema: playlistSchema,
          model: 'gemini_3_flash'
        });
      }, playlistPrompt);
      buildLog.push({ stage: 'playlist_generation', success: playlistHealResult.success, error: playlistHealResult.error, attempts: playlistHealResult.attempts });
      const playlistResult = playlistHealResult.success ? playlistHealResult.result : { playlist: [] };

      playlistData = (playlistResult.playlist || []).map((song, idx) => ({
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
          const createdItems = await base44.entities.PlaylistItem.filter({ configuration_id });
          const updates = [];
          const resolvedKeys = new Set();
          const failedVideoIds = new Set();

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

          for (let attempt = 0; attempt < 3; attempt++) {
            const remaining = createdItems.filter(item =>
              !resolvedKeys.has(`${item.song_title}|||${item.artist}`)
            );
            if (remaining.length === 0) break;

            const songList = remaining.map((s, i) => `${i + 1}. "${s.song_title}" by ${s.artist}`).join('\n');
            const failedHint = failedVideoIds.size > 0
              ? `\n\nDo NOT use these video IDs — they are unavailable:\n${[...failedVideoIds].join(', ')}`
              : '';

            const ytPrompt = `You are a music librarian. For each song below, find its REAL YouTube video URL.

STRICT RULES:
- NO cover versions, lyric videos, fan-made videos, or live covers. Official recordings only.
- ONLY official music videos, Vevo uploads, or official artist/label channel uploads.
- Each URL must point to a working, publicly available video.

SONGS TO FIND:
${songList}${failedHint}

Return a JSON object with key "results" containing an array of objects, each with:
- song_title (exact match from the list above)
- artist (exact match from the list above)
- youtube_url (full YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID)

Only include songs where you found a real, working YouTube URL.`;

            const ytResult = await base44.integrations.Core.InvokeLLM({
              prompt: ytPrompt,
              add_context_from_internet: true,
              response_json_schema: ytSchema,
              model: 'gemini_3_flash'
            });

            const ytResults = ytResult.results || [];
            if (ytResults.length === 0) break;

            for (const result of ytResults) {
              const videoId = extractVideoId(result.youtube_url || '');
              if (!videoId || failedVideoIds.has(videoId)) continue;

              const matchedItem = createdItems.find(item =>
                item.song_title === result.song_title && item.artist === result.artist
              );
              if (!matchedItem) continue;

              try {
                const oembedResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (!oembedResp.ok) {
                  failedVideoIds.add(videoId);
                  continue;
                }
                const oembed = await oembedResp.json();

                updates.push({
                  id: matchedItem.id,
                  youtube_video_id: videoId,
                  thumbnail_url: oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                  channel_name: oembed.author_name || ''
                });
                resolvedKeys.add(`${matchedItem.song_title}|||${matchedItem.artist}`);
              } catch {
                failedVideoIds.add(videoId);
                continue;
              }
            }
          }

          if (updates.length > 0) {
            await base44.entities.PlaylistItem.bulkUpdate(updates);
          }
        } catch (e) {
          console.error('YouTube lookup for playlist failed:', e.message);
          buildLog.push({ stage: 'youtube_lookup', success: false, error: e.message, timestamp: new Date().toISOString() });
        }
      }
    }

    await persistBuildLog('playlist', playlistData.length > 0 ? 'complete' : 'skipped', { count: playlistData.length });

    // ═══════════════════════════════════════════════════════
    // STAGE 3: RESEARCH DEPARTMENT
    // Gated by ai_automation preference: 'Auto Research'
    // Fetches music news articles and creates research items
    // ═══════════════════════════════════════════════════════

    const MUSIC_ARTICLE_CATEGORIES = [
      'new_release', 'tour_announcement', 'artist_news', 'chart_movement',
      'festival_lineup', 'album_review', 'interview', 'music_industry',
      'streaming', 'local_concert', 'genre_spotlight', 'classic_track'
    ];
    const ARTICLE_STATUSES = ['approved', 'available', 'selected', 'bernas_pick', 'saved_for_later'];

    if (autoResearch) {
      // 3a: Query existing Article records for music categories
      try {
        const allRecent = await base44.asServiceRole.entities.Article.list('-published_at', 60);
        musicArticles = allRecent.filter(
          a => MUSIC_ARTICLE_CATEGORIES.includes(a.category) && ARTICLE_STATUSES.includes(a.status)
        );
      } catch (e) {
        console.error('Article query failed:', e.message);
        buildLog.push({ stage: 'article_query', success: false, error: e.message, timestamp: new Date().toISOString() });
      }

      // 3b: If no music articles in DB, fetch via web search and persist as Article records
      if (musicArticles.length === 0) {
        try {
          const newsPrompt = `Search for current music news. Find real, recent articles about:
- New album/single releases
- Artist news and announcements
- Chart movements (Billboard, streaming platforms)
- Tour announcements and concert news
- Music industry trends
- Festival lineups
- Music interviews

For each article, provide: title, source_name (publication), summary (2-3 sentences), category (must be one of: new_release, tour_announcement, artist_news, chart_movement, festival_lineup, album_review, interview, music_industry, streaming, local_concert, genre_spotlight, classic_track), published_at (ISO date string), url, and suggested_angle (a unique coverage angle for a music show).

Find up to 20 recent articles.`;

          const newsSchema = {
            type: 'object',
            properties: {
              articles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    source_name: { type: 'string' },
                    summary: { type: 'string' },
                    category: { type: 'string' },
                    published_at: { type: 'string' },
                    url: { type: 'string' },
                    suggested_angle: { type: 'string' }
                  }
                }
              }
            }
          };

          const newsResult = await base44.integrations.Core.InvokeLLM({
            prompt: newsPrompt,
            add_context_from_internet: true,
            response_json_schema: newsSchema,
            model: 'gemini_3_flash'
          });

          const newArticleRecords = (newsResult.articles || []).map(a => ({
            title: a.title || 'Untitled',
            source_name: a.source_name || '',
            summary: a.summary || '',
            category: MUSIC_ARTICLE_CATEGORIES.includes(a.category) ? a.category : 'artist_news',
            published_at: a.published_at || new Date().toISOString(),
            url: a.url || '',
            suggested_angle: a.suggested_angle || '',
            status: 'approved',
            content_type: 'text'
          }));

          if (newArticleRecords.length > 0) {
            musicArticles = await base44.asServiceRole.entities.Article.bulkCreate(newArticleRecords);
          }
        } catch (e) {
          console.error('Music news fetch failed:', e.message);
          buildLog.push({ stage: 'music_news_fetch', success: false, error: e.message, timestamp: new Date().toISOString() });
        }
      }

      // 3c: Create MusicResearchItem records directly from articles
      researchData = musicArticles.map(a => ({
        configuration_id,
        title: a.title || '',
        source: a.source_name || '',
        category: a.category || '',
        summary: a.summary || '',
        date: a.published_at ? new Date(a.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        relevance: 'high'
      }));
      if (researchData.length > 0) {
        await base44.entities.MusicResearchItem.bulkCreate(researchData);
      }
    }

    await persistBuildLog('research', researchData.length > 0 ? 'complete' : 'skipped', { count: researchData.length });

    // ═══════════════════════════════════════════════════════
    // STAGE 4: TOPICS DEPARTMENT
    // Generates topic talking points grounded in research articles
    // ═══════════════════════════════════════════════════════

    if (autoResearch && musicArticles.length > 0) {
      const articleContext = musicArticles.map(a =>
        `TITLE: ${a.title}\nSOURCE: ${a.source_name}\nCATEGORY: ${a.category}\nSUMMARY: ${a.summary || ''}\nANGLE: ${a.suggested_angle || ''}\nBODY: ${(a.body_content || a.summary || '').substring(0, 800)}`
      ).join('\n\n---\n\n');

      const topicPrompt = `You are a professional music show producer for a ${productionFormat} show. Based on these REAL news articles, generate talking points for each selected music topic.

SELECTED TOPICS:
${musicTopics.join(', ') || 'General music news'}

REAL NEWS ARTICLES (your source material — use ONLY this information):
${articleContext}

For each selected topic, generate:
- topic_name: Use the exact topic name from the selected topics list above
- generated_summary: A 2-3 sentence summary of current developments, grounded in the article content
- talking_points: 3-5 talking points as a single string with line breaks, each grounded in the real article content above
- sources: List the source names from the articles you referenced
- suggested_placement: Where in the show this topic fits best (e.g., "After song block 1", "Mid-show", "Near outro")

CRITICAL: All talking points must be grounded in the real article content provided above. Do not invent facts or use information not present in the articles.

Return a JSON object with key "topics" containing an array of topic objects.`;

      const topicSchema = {
        type: 'object',
        properties: {
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

      const topicHealResult = await withSelfHealing(base44, 'topic_generation', async (adjustedPrompt) => {
        return await base44.integrations.Core.InvokeLLM({
          prompt: adjustedPrompt,
          response_json_schema: topicSchema
        });
      }, topicPrompt);
      buildLog.push({ stage: 'topic_generation', success: topicHealResult.success, error: topicHealResult.error, attempts: topicHealResult.attempts });
      const topicResult = topicHealResult.success ? topicHealResult.result : { topics: [] };

      topicData = (topicResult.topics || []).map(topic => ({
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

    await persistBuildLog('topics', topicData.length > 0 ? 'complete' : 'skipped', { count: topicData.length });

    // ═══════════════════════════════════════════════════════
    // STAGE 5: ASSETS DEPARTMENT
    // Gated by ai_automation preference: 'Auto Develop'
    // Generates production assets: host banter, song intros/outros,
    // social captions, hashtags, thumbnail/video prompts, production notes
    // ═══════════════════════════════════════════════════════

    if (autoDevelop) {
      const playlistSummary = playlistData.map((s, i) =>
        `${i + 1}. "${s.song_title}" by ${s.artist} (${Math.round((s.length_seconds || 180) / 60)} min, ${s.genre})`
      ).join('\n');

      const topicSummary = topicData.map(t => {
        const points = (t.talking_points || '').split('\n').filter(Boolean).map(p => `    ${p}`).join('\n');
        return `- ${t.topic_name}:\n  Summary: ${t.generated_summary || ''}\n  Talking Points:\n${points}`;
      }).join('\n');

      const assetsPrompt = `You are a professional music production assistant. Based on the following playlist, topics, and show configuration, generate production assets for the show.

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

TOPIC DETAILS:
${topicSummary || 'No topics generated'}

ASSETS TO GENERATE:
- host_banter: 2-3 segments of conversational banter (matching show tone, separated by ---)
- song_intros: Array of {song_title, intro_text} for ALL songs in the playlist
- song_outros: Array of {song_title, outro_text} for ALL songs in the playlist
- social_captions: Array of 3 social media caption strings for promoting the show
- hashtags: A single string of relevant hashtags separated by spaces
- thumbnail_prompt: A detailed AI image generation prompt for the show thumbnail
- video_prompt: A video production prompt for social media clips
- production_notes: Internal production notes for the team

Return a JSON object with exactly these keys: host_banter (string), song_intros (array), song_outros (array), social_captions (array), hashtags (string), thumbnail_prompt (string), video_prompt (string), production_notes (string).`;

      const assetsSchema = {
        type: 'object',
        properties: {
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

      const assetsHealResult = await withSelfHealing(base44, 'assets_generation', async (adjustedPrompt) => {
        return await base44.integrations.Core.InvokeLLM({
          prompt: adjustedPrompt,
          response_json_schema: assetsSchema
        });
      }, assetsPrompt);
      buildLog.push({ stage: 'assets_generation', success: assetsHealResult.success, error: assetsHealResult.error, attempts: assetsHealResult.attempts });
      const llmAssets = assetsHealResult.success ? assetsHealResult.result : { host_banter: '', song_intros: [], song_outros: [], social_captions: [], hashtags: '', thumbnail_prompt: '', video_prompt: '', production_notes: '' };

      // Create AI assets
      if (llmAssets.host_banter) {
        assets.push({ configuration_id, asset_type: 'host_banter', title: 'Host Banter', content: llmAssets.host_banter, status: 'ready' });
      }
      if (llmAssets.song_intros) {
        for (const intro of llmAssets.song_intros) {
          assets.push({ configuration_id, asset_type: 'song_intro', title: `Intro: ${intro.song_title}`, content: intro.intro_text, associated_song_title: intro.song_title, status: 'ready' });
        }
      }
      if (llmAssets.song_outros) {
        for (const outro of llmAssets.song_outros) {
          assets.push({ configuration_id, asset_type: 'song_outro', title: `Outro: ${outro.song_title}`, content: outro.outro_text, associated_song_title: outro.song_title, status: 'ready' });
        }
      }
      if (llmAssets.social_captions) {
        assets.push({ configuration_id, asset_type: 'social_caption', title: 'Social Captions', content: llmAssets.social_captions.join('\n\n---\n\n'), status: 'ready' });
      }
      if (llmAssets.hashtags) {
        assets.push({ configuration_id, asset_type: 'hashtag', title: 'Hashtags', content: llmAssets.hashtags, status: 'ready' });
      }
      if (llmAssets.thumbnail_prompt) {
        assets.push({ configuration_id, asset_type: 'thumbnail_prompt', title: 'Thumbnail Prompt', content: llmAssets.thumbnail_prompt, status: 'ready' });
      }
      if (llmAssets.video_prompt) {
        assets.push({ configuration_id, asset_type: 'video_prompt', title: 'Video Prompt', content: llmAssets.video_prompt, status: 'ready' });
      }
      if (llmAssets.production_notes) {
        assets.push({ configuration_id, asset_type: 'production_notes', title: 'Production Notes', content: llmAssets.production_notes, status: 'ready' });
      }

      if (assets.length > 0) {
        await base44.entities.MusicAsset.bulkCreate(assets);
      }

      // AI Image Generation — gated by 'Auto Generate Images'
      if (autoGenerateImages && llmAssets.thumbnail_prompt) {
        try {
          const imgResult = await base44.integrations.Core.GenerateImage({
            prompt: llmAssets.thumbnail_prompt
          });
          if (imgResult?.url) {
            await base44.entities.MusicAsset.create({
              configuration_id,
              asset_type: 'ai_image',
              title: 'Show Thumbnail',
              content: llmAssets.thumbnail_prompt,
              generated_image_url: imgResult.url,
              status: 'approved'
            });
          }
        } catch (e) {
          console.error('Image generation failed:', e.message);
          buildLog.push({ stage: 'image_generation', success: false, error: e.message, timestamp: new Date().toISOString() });
        }
      }

      // APD Package Assembly — gated by 'Auto Assemble Packet'
      if (autoAssemblePacket) {
        try {
          await base44.functions.invoke('createAPDReadyPackage', {
            production_profile: 'music',
            source_entity_type: 'MusicProductionConfiguration',
            source_entity_id: configuration_id,
            configuration_id,
            title: config.production_name || 'Music Show',
            headline: config.production_name || 'Music Show',
            teleprompter_script: llmAssets.host_banter || '',
            story_summary: topicData.map(t => `${t.topic_name}: ${t.generated_summary}`).join('\n\n'),
            talking_points: topicData.map(t => t.talking_points).join('\n---\n'),
            social_media_caption: llmAssets.social_captions ? llmAssets.social_captions.join('\n\n') : '',
            thumbnail_prompt: llmAssets.thumbnail_prompt || '',
            image_generation_prompt: llmAssets.thumbnail_prompt || '',
            producer_notes: llmAssets.production_notes || '',
            artist_facts: llmAssets.song_intros ? llmAssets.song_intros.map(f => `${f.song_title}`).join('\n') : '',
            playlist_segment: playlistData.map(p => `${p.song_title} by ${p.artist}`).join('\n')
          });
        } catch (e) {
          console.error('APD adapter failed:', e.message);
          buildLog.push({ stage: 'apd_packet_assembly', success: false, error: e.message, timestamp: new Date().toISOString() });
        }
      }
    }

    await persistBuildLog('assets', assets.length > 0 ? 'complete' : 'skipped', { count: assets.length });

    // ═══════════════════════════════════════════════════════
    // STAGE 6: TOP 10 DEPARTMENT
    // Generates ranked YouTube video embeds — excludes playlist songs
    // ═══════════════════════════════════════════════════════

    let top10_count = 0;
    try {
      const top10Result = await base44.functions.invoke('generateMusicTop10', { configuration_id });
      top10_count = top10Result?.data?.top10_count || 0;
    } catch (e) {
      console.error('Top 10 generation failed:', e.message);
      buildLog.push({ stage: 'top10_generation', success: false, error: e.message, timestamp: new Date().toISOString() });
    }

    await persistBuildLog('top10', top10_count > 0 ? 'complete' : 'skipped', { count: top10_count });

    // ═══════════════════════════════════════════════════════
    // STAGE 7: RUNDOWN — THE FINISHED PRODUCT
    // Gated by ai_automation preference: 'Auto Develop'
    // Final assembly: builds pacing-aware blueprint, then generates
    // voiceover scripts for each segment. This is the last stage
    // because the rundown incorporates all prior outputs.
    // ═══════════════════════════════════════════════════════

    if (autoDevelop) {
      const playlistSummary = playlistData.map((s, i) =>
        `${i + 1}. "${s.song_title}" by ${s.artist} (${Math.round((s.length_seconds || 180) / 60)} min, ${s.genre})`
      ).join('\n');

      const topicSummary = topicData.map(t => {
        const points = (t.talking_points || '').split('\n').filter(Boolean).map(p => `    ${p}`).join('\n');
        return `- ${t.topic_name}:\n  Summary: ${t.generated_summary || ''}\n  Talking Points:\n${points}`;
      }).join('\n');

      const blueprint = buildRundownBlueprint(playlistData, topicData, pacingRules, config);
      const blueprintText = blueprint.map((bp, i) => {
        const parts = [`  ${i + 1}. [${bp.segment_type}] "${bp.title}" (target: ${bp.target_duration || 60}s)`];
        if (bp.associated_song_title) parts.push(`     Song: "${bp.associated_song_title}"`);
        if (bp.associated_topic) parts.push(`     Topic: "${bp.associated_topic}"`);
        return parts.join('\n');
      }).join('\n');

      const rundownPrompt = `You are a professional music production assistant. Based on the following playlist, topics, and show configuration, write voiceover scripts for a pre-structured show rundown.

CRITICAL: You MUST follow the RUNDOWN BLUEPRINT below EXACTLY — same segment count, same order, same segment types, same song/topic assignments. Your only job is to write the script_content for each segment and brief notes. Do NOT add, remove, reorder, or rename segments.

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

RUNDOWN BLUEPRINT (follow this EXACTLY):
${blueprintText}

TOPIC DETAILS (use talking points to write topic_segment scripts):
${topicSummary || 'No topics generated'}

SCRIPT REQUIREMENTS:
- Show Intro: A compelling show opening that welcomes listeners, introduces the host, and sets the tone. Match the show tone (${config.show_tone}).
- Show Outro: A show closing that thanks listeners and signs off.
- Talk Breaks: Conversational banter scripts that feel natural and engaging.
- Topic Segments: Expand the topic's talking points into a full spoken script that fills the allocated time (~150 words per minute).
- Song Intros: A brief, engaging intro for each song that mentions the artist and song title.
- Sponsor Breaks: Write sponsor/ad-read copy that fills the allocated time (~150 words per minute). If no specific sponsor is configured, write generic ad-read copy.
- Station IDs: Write a brief station identification segment (e.g., "You're listening to ${config.station_name || 'the station'}"). Keep it under 15 seconds.
- For each non-song segment, script_content length should be proportional to the target duration shown in the blueprint (~150 words per minute).

Return a JSON object with exactly one key: rundown (array matching the blueprint EXACTLY — same length, same order, same segment_type/title/associated_song_title/associated_topic, plus script_content and notes).`;

      const rundownSchema = {
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
          }
        }
      };

      const rundownHealResult = await withSelfHealing(base44, 'rundown_scripts', async (adjustedPrompt) => {
        return await base44.integrations.Core.InvokeLLM({
          prompt: adjustedPrompt,
          response_json_schema: rundownSchema
        });
      }, rundownPrompt);
      buildLog.push({ stage: 'rundown_scripts', success: rundownHealResult.success, error: rundownHealResult.error, attempts: rundownHealResult.attempts });
      const llmRundown = rundownHealResult.success ? rundownHealResult.result : { rundown: [] };

      // Create rundown items — merge blueprint structure with LLM-generated scripts
      const CHARS_PER_SEC = 15;
      const showStartSecs = parseTimeToSeconds(config.show_start_time || '00:00');
      let cursorSecs = showStartSecs;

      const llmRundownItems = llmRundown.rundown || [];

      rundownData = blueprint.map((bpItem, idx) => {
        const llmItem = llmRundownItems[idx] || {};
        const scriptContent = llmItem.script_content || '';
        const segmentType = bpItem.segment_type;

        let durationSeconds;
        if (segmentType === 'song') {
          const songTitle = (bpItem.associated_song_title || '').toLowerCase().trim();
          const matchedSong = playlistData.find(s => (s.song_title || '').toLowerCase().trim() === songTitle);
          const songLength = matchedSong?.length_seconds || 180;
          const introLength = scriptContent ? Math.ceil(scriptContent.length / CHARS_PER_SEC) : 0;
          durationSeconds = songLength + introLength;
        } else if (segmentType === 'sponsor_break' || segmentType === 'station_id') {
          durationSeconds = bpItem.target_duration || (segmentType === 'station_id' ? 15 : 60);
        } else {
          durationSeconds = scriptContent ? Math.ceil(scriptContent.length / CHARS_PER_SEC) : (bpItem.target_duration || 60);
        }

        const startTime = formatSecondsToTime(cursorSecs);
        cursorSecs += durationSeconds;
        const endTime = formatSecondsToTime(cursorSecs);

        return {
          configuration_id,
          order: idx,
          segment_type: segmentType,
          title: bpItem.title || '',
          script_content: scriptContent,
          associated_topic: bpItem.associated_topic || null,
          duration_seconds: durationSeconds,
          start_time: startTime,
          end_time: endTime,
          notes: llmItem.notes || '',
          status: 'ready'
        };
      });
      if (rundownData.length > 0) {
        await base44.entities.ShowRundownItem.bulkCreate(rundownData);
      }
    }

    await persistBuildLog('rundown', rundownData.length > 0 ? 'complete' : 'skipped', { count: rundownData.length });

    // Update config status to ready and persist build log
    await base44.entities.MusicProductionConfiguration.update(configuration_id, { status: 'ready', build_log: JSON.stringify(buildLog) });

    return Response.json({
      success: true,
      configuration_id,
      production_format: productionFormat,
      requirements_count: requirements.length,
      playlist_count: playlistData.length,
      research_count: researchData.length,
      topic_count: topicData.length,
      asset_count: assets.length,
      top10_count,
      rundown_count: rundownData.length,
    });
  } catch (error) {
    if (pipelineConfigId) {
      try {
        const errorBase44 = createClientFromRequest(req);
        await errorBase44.asServiceRole.entities.MusicProductionConfiguration.update(pipelineConfigId, {
          status: 'failed',
          build_log: JSON.stringify([{ stage: 'pipeline', success: false, error: error.message, timestamp: new Date().toISOString() }])
        });
      } catch (updateErr) {
        console.error('Failed to record pipeline error:', updateErr.message);
      }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function withSelfHealing(base44, stageName, fn, initialContext, maxRetries = 2) {
  let lastError = null;
  let currentContext = initialContext;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn(currentContext);
      return { success: true, result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      console.error(`[${stageName}] Attempt ${attempt + 1} failed:`, error.message);

      if (attempt < maxRetries) {
        try {
          const diagnosis = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a debugging assistant for an automated music production pipeline.

STAGE: ${stageName}
ATTEMPT: ${attempt + 1} of ${maxRetries + 1}
ERROR: ${error.message}

ORIGINAL PROMPT/CONTEXT:
${currentContext.substring(0, 4000)}

Analyze what went wrong and provide a fix. Return JSON with:
- root_cause: brief explanation of why the operation failed
- fix_strategy: concrete steps to avoid this error on retry
- adjusted_context: the corrected prompt/context to use on the next attempt (return the full corrected prompt, not just the diff)`,
            response_json_schema: {
              type: 'object',
              properties: {
                root_cause: { type: 'string' },
                fix_strategy: { type: 'string' },
                adjusted_context: { type: 'string' }
              }
            }
          });

          if (diagnosis.adjusted_context) {
            currentContext = diagnosis.adjusted_context;
          }
          console.log(`[${stageName}] Self-heal: ${diagnosis.root_cause} -> ${diagnosis.fix_strategy}`);
        } catch (diagError) {
          console.error(`[${stageName}] Self-heal diagnosis failed:`, diagError.message);
        }
      }
    }
  }

  return { success: false, error: lastError?.message || 'Unknown error', attempts: maxRetries + 1 };
}

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

// ═══ RUNDOWN BLUEPRINT BUILDER ═══
// Builds a deterministic segment structure that enforces pacing rules:
// no more than max_sequential_songs play in a row, with talk breaks,
// topic segments, sponsor breaks, and station IDs interleaved between
// song blocks. Time budgets are calculated from the configuration.
function buildRundownBlueprint(playlist, topics, pacingRules, config) {
  const maxSequential = pacingRules.max_sequential_songs || 4;

  // Time budgets (in seconds) from configuration
  const introSecs = Math.round((config.intro_runtime || 1) * 60);
  const outroSecs = Math.round((config.outro_runtime || 1) * 60);
  const talkSecs = Math.round((config.talk_segment_runtime || 12) * 60);
  const sponsorSecs = Math.round((config.commercial_sponsor_runtime || 6) * 60);
  const stationIdSecs = 15;

  // Split songs into blocks of at most maxSequential
  const songBlocks = [];
  for (let i = 0; i < playlist.length; i += maxSequential) {
    songBlocks.push(playlist.slice(i, i + maxSequential));
  }

  const numIntervals = Math.max(songBlocks.length - 1, 1);
  const talkPerInterval = Math.floor(talkSecs / numIntervals);
  const sponsorPerInterval = Math.floor(sponsorSecs / Math.max(Math.floor(songBlocks.length / 2), 1));

  const blueprint = [];
  blueprint.push({ segment_type: 'intro', title: 'Show Intro', target_duration: introSecs });

  let topicIdx = 0;

  for (let blockIdx = 0; blockIdx < songBlocks.length; blockIdx++) {
    // Add each song in this block
    for (const song of songBlocks[blockIdx]) {
      blueprint.push({
        segment_type: 'song',
        title: song.song_title,
        associated_song_title: song.song_title,
        target_duration: song.length_seconds || 180
      });
    }

    // After each block (except the last), insert interstitial segments
    if (blockIdx < songBlocks.length - 1) {
      // Topic segment or talk break
      if (topicIdx < topics.length) {
        blueprint.push({
          segment_type: 'topic_segment',
          title: topics[topicIdx].topic_name,
          associated_topic: topics[topicIdx].topic_name,
          target_duration: talkPerInterval
        });
        topicIdx++;
      } else {
        blueprint.push({
          segment_type: 'talk_break',
          title: 'Host Banter',
          target_duration: talkPerInterval
        });
      }

      // Sponsor break every 2 blocks
      if ((blockIdx + 1) % 2 === 0) {
        blueprint.push({
          segment_type: 'sponsor_break',
          title: 'Sponsor Break',
          target_duration: sponsorPerInterval
        });
      }

      // Station ID after every block
      blueprint.push({
        segment_type: 'station_id',
        title: 'Station ID',
        target_duration: stationIdSecs
      });
    }
  }

  // Place any remaining topics before the outro
  while (topicIdx < topics.length) {
    blueprint.push({
      segment_type: 'topic_segment',
      title: topics[topicIdx].topic_name,
      associated_topic: topics[topicIdx].topic_name,
      target_duration: 60
    });
    topicIdx++;
  }

  blueprint.push({ segment_type: 'outro', title: 'Show Outro', target_duration: outroSecs });

  return blueprint;
}