import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id, section } = body;

    if (!configuration_id) return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    if (!section) return Response.json({ error: 'section is required' }, { status: 400 });

    const VALID_SECTIONS = ['playlist', 'research', 'topics', 'assets', 'rundown', 'rundown_item', 'top10'];
    if (!VALID_SECTIONS.includes(section)) {
      return Response.json({ error: `Invalid section. Valid: ${VALID_SECTIONS.join(', ')}` }, { status: 400 });
    }

    const config = await base44.entities.MusicProductionConfiguration.get(configuration_id);
    if (!config) return Response.json({ error: 'Configuration not found' }, { status: 404 });

    // Set building status
    await base44.entities.MusicProductionConfiguration.update(configuration_id, { status: 'building' });

    const genres = safeParse(config.genres, []);
    const moods = safeParse(config.moods, []);
    const musicTopics = safeParse(config.music_topics, []);
    const productionFormat = config.production_format || 'radio';
    const pacingRules = safeParse(config.pacing_rules, { max_sequential_songs: 4, min_talk_break_frequency: 1 });
    const requiredMusicMinutes = config.required_music_runtime || 70;

    const buildLog = [];
    const persistLog = async (stage, status, extra = {}) => {
      buildLog.push({ stage, status, timestamp: new Date().toISOString(), ...extra });
    };

    // Load prerequisite data from DB
    const loadPlaylist = () => base44.entities.PlaylistItem.filter({ configuration_id }, 'order');
    const loadTopics = () => base44.entities.MusicTopic.filter({ configuration_id });
    const loadResearch = () => base44.entities.MusicResearchItem.filter({ configuration_id });

    // ═══ PLAYLIST ═══
    if (section === 'playlist') {
      await base44.entities.PlaylistItem.deleteMany({ configuration_id });

      const playlistPrompt = `You are a professional music production assistant for a ${productionFormat === 'live' ? 'live music broadcast' : 'radio show'} / music program.
You are generating a SET LIST / PLAYLIST PLAN only. Each song entry is a recommendation with title, artist, and metadata.

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
- Include Throwbacks: ${config.include_throwbacks === true ? 'Yes' : 'No'}
- Clean Only: ${config.clean_only === true ? 'Yes' : 'No'}
- Explicit Allowed: ${config.explicit_allowed === true ? 'Yes' : 'No'}
- Preferred Eras: ${config.preferred_eras || 'Modern (2020s)'}

RECENCY RULE — CRITICAL:
The default era for this playlist is MODERN/RECENT MUSIC. Unless the user has explicitly enabled "Include Throwbacks" or specified older eras in "Preferred Eras", you MUST prioritize songs released in 2022-2025.
- At least 70% of the playlist must be songs released in 2022 or later.
- If "Include Throwbacks" is enabled, you may include up to 30% older tracks (pre-2020), but the majority should still be recent.
- If "Preferred Eras" specifies a specific older decade (e.g., "80s", "90s", "2000s"), follow that era preference instead.
- Never include more than 2 songs from before 2010 unless throwbacks are explicitly enabled or preferred_eras specifies older eras.
- era_year must reflect the actual release year of each song.

Generate a playlist of AT LEAST 20 REAL, well-known songs that totals approximately ${requiredMusicMinutes} minutes. Each song must include: song_title, artist, length_seconds (realistic estimate), genre, mood, era_year, and reason_selected. NEVER return fewer than 20 songs.

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

      const healResult = await withSelfHealing(base44, 'playlist_generation', async (adjustedPrompt) => {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: adjustedPrompt,
          add_context_from_internet: true,
          response_json_schema: playlistSchema,
          model: 'gemini_3_flash'
        });
        const songs = result?.playlist || result?.songs || [];
        if (songs.length < 10) {
          throw new Error(`Playlist generation returned only ${songs.length} songs (minimum 10 required).`);
        }
        return { playlist: songs };
      }, playlistPrompt);
      persistLog('playlist_generation', healResult.success ? 'complete' : 'failed', { error: healResult.error, attempts: healResult.attempts });

      const playlistResult = healResult.success ? healResult.result : { playlist: [] };
      const playlistData = (playlistResult.playlist || []).map((song, idx) => ({
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

        // YouTube lookup
        try {
          const createdItems = await loadPlaylist();
          const updates = [];
          const resolvedKeys = new Set();
          const failedVideoIds = new Set();
          const ytSchema = {
            type: 'object',
            properties: {
              results: { type: 'array', items: { type: 'object', properties: {
                song_title: { type: 'string' }, artist: { type: 'string' }, youtube_url: { type: 'string' }
              } } }
            }
          };

          for (let attempt = 0; attempt < 3; attempt++) {
            const remaining = createdItems.filter(item => !resolvedKeys.has(`${item.song_title}|||${item.artist}`));
            if (remaining.length === 0) break;
            const songList = remaining.map((s, i) => `${i + 1}. "${s.song_title}" by ${s.artist}`).join('\n');
            const failedHint = failedVideoIds.size > 0 ? `\n\nDo NOT use these video IDs:\n${[...failedVideoIds].join(', ')}` : '';
            const ytPrompt = `You are a music librarian. For each song below, find its REAL YouTube video URL.

STRICT RULES:
- NO cover versions, lyric videos, fan-made videos, or live covers. Official recordings only.
- ONLY official music videos, Vevo uploads, or official artist/label channel uploads.

SONGS TO FIND:
${songList}${failedHint}

Return a JSON object with key "results" containing an array of objects with song_title, artist, and youtube_url.`;

            const ytResult = await base44.integrations.Core.InvokeLLM({
              prompt: ytPrompt, add_context_from_internet: true, response_json_schema: ytSchema, model: 'gemini_3_flash'
            });
            const ytResults = ytResult.results || [];
            if (ytResults.length === 0) break;

            for (const result of ytResults) {
              const videoId = extractVideoId(result.youtube_url || '');
              if (!videoId || failedVideoIds.has(videoId)) continue;
              const matchedItem = createdItems.find(item => item.song_title === result.song_title && item.artist === result.artist);
              if (!matchedItem) continue;
              try {
                const oembedResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (!oembedResp.ok) { failedVideoIds.add(videoId); continue; }
                const oembed = await oembedResp.json();
                updates.push({ id: matchedItem.id, youtube_video_id: videoId, thumbnail_url: oembed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, channel_name: oembed.author_name || '' });
                resolvedKeys.add(`${matchedItem.song_title}|||${matchedItem.artist}`);
              } catch { failedVideoIds.add(videoId); continue; }
            }
          }
          if (updates.length > 0) await base44.entities.PlaylistItem.bulkUpdate(updates);
        } catch (e) {
          persistLog('youtube_lookup', 'failed', { error: e.message });
        }
      }
      persistLog('playlist', playlistData.length > 0 ? 'complete' : 'failed', { count: playlistData.length });
    }

    // ═══ RESEARCH ═══
    if (section === 'research') {
      await base44.entities.MusicResearchItem.deleteMany({ configuration_id });

      const MUSIC_ARTICLE_CATEGORIES = ['new_release', 'tour_announcement', 'artist_news', 'chart_movement', 'festival_lineup', 'album_review', 'interview', 'music_industry', 'streaming', 'local_concert', 'genre_spotlight', 'classic_track'];
      const ARTICLE_STATUSES = ['approved', 'available', 'selected', 'bernas_pick', 'saved_for_later'];

      let musicArticles = [];
      try {
        const allRecent = await base44.asServiceRole.entities.Article.list('-published_at', 60);
        musicArticles = allRecent.filter(a => MUSIC_ARTICLE_CATEGORIES.includes(a.category) && ARTICLE_STATUSES.includes(a.status));
      } catch (e) {
        persistLog('article_query', 'failed', { error: e.message });
      }

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

For each article, provide: title, source_name, summary (2-3 sentences), category (must be one of: ${MUSIC_ARTICLE_CATEGORIES.join(', ')}), published_at (ISO date string), url, and suggested_angle (a unique coverage angle for a music show).

Find up to 20 recent articles.`;

          const newsSchema = {
            type: 'object',
            properties: {
              articles: { type: 'array', items: { type: 'object', properties: {
                title: { type: 'string' }, source_name: { type: 'string' }, summary: { type: 'string' },
                category: { type: 'string' }, published_at: { type: 'string' }, url: { type: 'string' }, suggested_angle: { type: 'string' }
              } } }
            }
          };

          const newsResult = await base44.integrations.Core.InvokeLLM({
            prompt: newsPrompt, add_context_from_internet: true, response_json_schema: newsSchema, model: 'gemini_3_flash'
          });
          const newArticleRecords = (newsResult.articles || []).map(a => ({
            title: a.title || 'Untitled', source_name: a.source_name || '', summary: a.summary || '',
            category: MUSIC_ARTICLE_CATEGORIES.includes(a.category) ? a.category : 'artist_news',
            published_at: a.published_at || new Date().toISOString(), url: a.url || '',
            suggested_angle: a.suggested_angle || '', status: 'approved', content_type: 'text'
          }));
          if (newArticleRecords.length > 0) {
            musicArticles = await base44.asServiceRole.entities.Article.bulkCreate(newArticleRecords);
          }
        } catch (e) {
          persistLog('music_news_fetch', 'failed', { error: e.message });
        }
      }

      const researchData = musicArticles.map(a => ({
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
      persistLog('research', researchData.length > 0 ? 'complete' : 'failed', { count: researchData.length });
    }

    // ═══ TOPICS ═══
    if (section === 'topics') {
      await base44.entities.MusicTopic.deleteMany({ configuration_id });

      // Load research articles from DB (either MusicResearchItem or Article)
      let musicArticles = [];
      try {
        const allRecent = await base44.asServiceRole.entities.Article.list('-published_at', 60);
        const MUSIC_ARTICLE_CATEGORIES = ['new_release', 'tour_announcement', 'artist_news', 'chart_movement', 'festival_lineup', 'album_review', 'interview', 'music_industry', 'streaming', 'local_concert', 'genre_spotlight', 'classic_track'];
        const ARTICLE_STATUSES = ['approved', 'available', 'selected', 'bernas_pick', 'saved_for_later'];
        musicArticles = allRecent.filter(a => MUSIC_ARTICLE_CATEGORIES.includes(a.category) && ARTICLE_STATUSES.includes(a.status));
      } catch (e) {
        persistLog('article_query', 'failed', { error: e.message });
      }

      // Also load existing MusicResearchItem records
      const existingResearch = await loadResearch();
      if (existingResearch.length > 0) {
        musicArticles = musicArticles.concat(existingResearch.map(r => ({
          title: r.title, source_name: r.source, category: r.category, summary: r.summary, suggested_angle: '', body_content: r.summary
        })));
      }

      if (musicArticles.length > 0) {
        const articleContext = musicArticles.slice(0, 30).map(a =>
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
- suggested_placement: Where in the show this topic fits best

IMPORTANT: You MUST generate at least 5 topics. If fewer than 5 topics are selected, generate additional relevant music topics from the article content to reach a minimum of 5 topics.

Return a JSON object with key "topics" containing an array of at least 5 topic objects.`;

        const topicSchema = {
          type: 'object',
          properties: {
            topics: { type: 'array', items: { type: 'object', properties: {
              topic_name: { type: 'string' }, generated_summary: { type: 'string' }, talking_points: { type: 'string' },
              sources: { type: 'string' }, suggested_placement: { type: 'string' }
            } } }
          }
        };

        const healResult = await withSelfHealing(base44, 'topic_generation', async (adjustedPrompt) => {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: adjustedPrompt, response_json_schema: topicSchema
          });
          const topics = result?.topics || [];
          if (topics.length < 3) {
            throw new Error(`Topic generation returned only ${topics.length} topics (minimum 3 required).`);
          }
          return result;
        }, topicPrompt);
        persistLog('topic_generation', healResult.success ? 'complete' : 'failed', { error: healResult.error, attempts: healResult.attempts });

        const topicResult = healResult.success ? healResult.result : { topics: [] };
        const topicData = (topicResult.topics || []).map(topic => ({
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
        persistLog('topics', topicData.length > 0 ? 'complete' : 'failed', { count: topicData.length });
      } else {
        persistLog('topics', 'skipped', { reason: 'No research articles found' });
      }
    }

    // ═══ ASSETS ═══
    if (section === 'assets') {
      await base44.entities.MusicAsset.deleteMany({ configuration_id });

      // Load existing playlist and topics from DB
      const playlistData = await loadPlaylist();
      const topicData = await loadTopics();

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
- song_intros: Array of {{song_title, intro_text}} for ALL songs in the playlist
- song_outros: Array of {{song_title, outro_text}} for ALL songs in the playlist
- artist_bios: Array of {{artist, bio_text}} — a brief 3-4 sentence biography for each UNIQUE artist in the playlist
- music_trivia: Array of {{question, answer}} — 8-10 music trivia questions related to the playlist artists, songs, and genres
- tour_dates: Array of {{artist, tour_name, dates, locations}} — upcoming or recent tour dates for artists in the playlist
- concert_news: Array of {{headline, details}} — 5-8 recent concert/festival news items relevant to the playlist's genres
- video_prompt: A video production prompt for social media clips
- production_notes: Internal production notes for the team

Return a JSON object with exactly these keys: host_banter (string), song_intros (array), song_outros (array), artist_bios (array), music_trivia (array), tour_dates (array), concert_news (array), video_prompt (string), production_notes (string).`;

      const assetsSchema = {
        type: 'object',
        properties: {
          host_banter: { type: 'string' },
          song_intros: { type: 'array', items: { type: 'object', properties: { song_title: { type: 'string' }, intro_text: { type: 'string' } } } },
          song_outros: { type: 'array', items: { type: 'object', properties: { song_title: { type: 'string' }, outro_text: { type: 'string' } } } },
          artist_bios: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                artist: { type: 'string' },
                bio_text: { type: 'string' }
              }
            }
          },
          music_trivia: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' }
              }
            }
          },
          tour_dates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                artist: { type: 'string' },
                tour_name: { type: 'string' },
                dates: { type: 'string' },
                locations: { type: 'string' }
              }
            }
          },
          concert_news: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                details: { type: 'string' }
              }
            }
          },
          video_prompt: { type: 'string' },
          production_notes: { type: 'string' }
        }
      };

      const healResult = await withSelfHealing(base44, 'assets_generation', async (adjustedPrompt) => {
        return await base44.integrations.Core.InvokeLLM({ prompt: adjustedPrompt, response_json_schema: assetsSchema });
      }, assetsPrompt);
      persistLog('assets_generation', healResult.success ? 'complete' : 'failed', { error: healResult.error, attempts: healResult.attempts });

      const llmAssets = healResult.success ? healResult.result : { host_banter: '', song_intros: [], song_outros: [], video_prompt: '', production_notes: '' };
      const assets = [];
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
      if (llmAssets.artist_bios) {
        for (const bio of llmAssets.artist_bios) {
          assets.push({ configuration_id, asset_type: 'artist_bio', title: `Bio: ${bio.artist}`, content: bio.bio_text, associated_song_title: bio.artist, status: 'ready' });
        }
      }
      if (llmAssets.music_trivia) {
        const triviaContent = llmAssets.music_trivia.map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer}`).join('\n\n');
        assets.push({ configuration_id, asset_type: 'music_trivia', title: 'Music Trivia', content: triviaContent, status: 'ready' });
      }
      if (llmAssets.tour_dates) {
        const tourContent = llmAssets.tour_dates.map(t => `${t.artist} — ${t.tour_name}: ${t.dates} (${t.locations})`).join('\n');
        assets.push({ configuration_id, asset_type: 'tour_dates', title: 'Tour Dates', content: tourContent, status: 'ready' });
      }
      if (llmAssets.concert_news) {
        const newsContent = llmAssets.concert_news.map(n => `${n.headline}: ${n.details}`).join('\n');
        assets.push({ configuration_id, asset_type: 'concert_news', title: 'Concert News', content: newsContent, status: 'ready' });
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
      persistLog('assets', assets.length > 0 ? 'complete' : 'failed', { count: assets.length });
    }

    // ═══ RUNDOWN ═══
    if (section === 'rundown') {
      await base44.entities.ShowRundownItem.deleteMany({ configuration_id });

      // Load existing playlist and topics from DB
      const playlistData = await loadPlaylist();
      const topicData = await loadTopics();

      if (playlistData.length === 0) {
        persistLog('rundown', 'failed', { error: 'No playlist found — generate playlist first' });
      } else {
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
${playlistSummary}

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
            rundown: { type: 'array', items: { type: 'object', properties: {
              order: { type: 'number' }, segment_type: { type: 'string' }, title: { type: 'string' },
              script_content: { type: 'string' }, associated_song_title: { type: 'string' },
              associated_topic: { type: 'string' }, notes: { type: 'string' }
            } } }
          }
        };

        const healResult = await withSelfHealing(base44, 'rundown_scripts', async (adjustedPrompt) => {
          return await base44.integrations.Core.InvokeLLM({ prompt: adjustedPrompt, response_json_schema: rundownSchema });
        }, rundownPrompt);
        persistLog('rundown_scripts', healResult.success ? 'complete' : 'failed', { error: healResult.error, attempts: healResult.attempts });

        const llmRundown = healResult.success ? healResult.result : { rundown: [] };
        const llmRundownItems = llmRundown.rundown || [];

        const CHARS_PER_SEC = 15;
        const showStartSecs = parseTimeToSeconds(config.show_start_time || '00:00');
        let cursorSecs = showStartSecs;

        const rundownData = blueprint.map((bpItem, idx) => {
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
            configuration_id, order: idx, segment_type: segmentType, title: bpItem.title || '',
            script_content: scriptContent, associated_topic: bpItem.associated_topic || null,
            duration_seconds: durationSeconds, start_time: startTime, end_time: endTime,
            notes: llmItem.notes || '', status: 'ready'
          };
        });

        if (rundownData.length > 0) {
          await base44.entities.ShowRundownItem.bulkCreate(rundownData);
        }
        persistLog('rundown', rundownData.length > 0 ? 'complete' : 'failed', { count: rundownData.length });
      }
    }

    // ═══ RUNDOWN ITEM (single segment regeneration with optional instruction) ═══
    if (section === 'rundown_item') {
      const { item_id, instruction } = body;
      if (!item_id) return Response.json({ error: 'item_id is required for rundown_item section' }, { status: 400 });

      const existingItem = await base44.entities.ShowRundownItem.get(item_id);
      if (!existingItem) return Response.json({ error: 'Rundown item not found' }, { status: 404 });

      const playlistData = await loadPlaylist();
      const topicData = await loadTopics();
      const assetData = await base44.entities.MusicAsset.filter({ configuration_id });

      const playlistSummary = playlistData.map((s, i) =>
        `${i + 1}. "${s.song_title}" by ${s.artist} (${s.genre})`
      ).join('\n');

      const topicSummary = topicData.map(t => `- ${t.topic_name}: ${t.generated_summary || ''}`).join('\n');

      const assetContext = assetData.map(a => `[${a.asset_type}] ${a.title}: ${(a.content || '').substring(0, 200)}`).join('\n');

      const regenPrompt = `You are a professional music show producer. Rewrite the script for a SINGLE show rundown segment.

SHOW: ${config.production_name || 'Music Show'}
HOST: ${config.host_name || 'Host'}
TONE: ${config.show_tone || 'Professional'}

PLAYLIST:
${playlistSummary || 'N/A'}

TOPICS:
${topicSummary || 'N/A'}

AVAILABLE ASSETS (for reference):
${assetContext || 'N/A'}

CURRENT SEGMENT:
- Type: ${existingItem.segment_type}
- Title: ${existingItem.title}
- Current Script: ${existingItem.script_content || '(empty)'}
- Notes: ${existingItem.notes || ''}

${instruction ? `USER INSTRUCTION: ${instruction}` : 'Regenerate this segment with the same intent but fresh, improved content.'}

RULES:
- Write a complete, ready-to-read voiceover script for this segment
- Match the show tone (${config.show_tone || 'Professional'})
- For artist_bio segments: Write a compelling 3-4 sentence artist biography
- For music_trivia segments: Write an engaging trivia question and reveal the answer
- For tour_dates segments: Write upcoming tour/concert dates for relevant artists
- For concert_news segments: Write recent concert/festival news
- For talk_break segments: Write natural host banter (2-3 sentences)
- For topic_segment segments: Expand the topic's talking points into a full script
- For intro segments: Write a compelling show opening
- For outro segments: Write a show closing
- For sponsor_break segments: Write ad-read copy
- For station_id segments: Write a brief station ID (under 15 seconds)

Return a JSON object with: title (string), script_content (string), notes (string).`;

      const regenSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          script_content: { type: 'string' },
          notes: { type: 'string' }
        }
      };

      try {
        const regenResult = await base44.integrations.Core.InvokeLLM({
          prompt: regenPrompt,
          response_json_schema: regenSchema,
          add_context_from_internet: ['tour_dates', 'concert_news', 'artist_bio'].includes(existingItem.segment_type),
        });

        const newScript = regenResult.script_content || '';
        const newTitle = regenResult.title || existingItem.title;
        const newNotes = regenResult.notes || existingItem.notes;
        const CHARS_PER_SEC = 15;
        const newDuration = existingItem.segment_type === 'song'
          ? existingItem.duration_seconds
          : newScript ? Math.ceil(newScript.length / CHARS_PER_SEC) : (existingItem.duration_seconds || 60);

        await base44.entities.ShowRundownItem.update(item_id, {
          script_content: newScript,
          title: newTitle,
          notes: newNotes,
          duration_seconds: newDuration,
          status: 'ready',
        });

        // Retiming: recalculate start/end times for all items after this one
        const allItems = await base44.entities.ShowRundownItem.filter({ configuration_id }, 'order');
        const showStartSecs = parseTimeToSeconds(config.show_start_time || '00:00');
        let cursorSecs = showStartSecs;
        const timeUpdates = [];
        for (const ri of allItems) {
          const startTime = formatSecondsToTime(cursorSecs);
          cursorSecs += ri.duration_seconds || 60;
          const endTime = formatSecondsToTime(cursorSecs);
          timeUpdates.push({ id: ri.id, start_time: startTime, end_time: endTime });
        }
        if (timeUpdates.length > 0) {
          await base44.entities.ShowRundownItem.bulkUpdate(timeUpdates);
        }

        persistLog('rundown_item', 'complete', { item_id });
        return Response.json({
          success: true,
          configuration_id,
          section: 'rundown_item',
          item_id,
          title: newTitle,
          script_content: newScript,
          notes: newNotes,
          duration_seconds: newDuration,
        });
      } catch (e) {
        persistLog('rundown_item', 'failed', { error: e.message });
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ═══ TOP 10 ═══
    if (section === 'top10') {
      await base44.asServiceRole.entities.Top10Item.deleteMany({ configuration_id });
      try {
        const top10Result = await base44.functions.invoke('generateMusicTop10', { configuration_id });
        const top10_count = top10Result?.data?.top10_count || 0;
        persistLog('top10', top10_count > 0 ? 'complete' : 'failed', { count: top10_count });
      } catch (e) {
        persistLog('top10', 'failed', { error: e.message });
      }
    }

    // Set status back to ready
    await base44.entities.MusicProductionConfiguration.update(configuration_id, {
      status: 'ready',
      build_log: JSON.stringify(buildLog)
    });

    return Response.json({
      success: true,
      configuration_id,
      section,
      build_log: buildLog
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ═══ HELPERS ═══

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

function buildRundownBlueprint(playlist, topics, pacingRules, config) {
  const maxSequential = pacingRules.max_sequential_songs || 4;
  const introSecs = Math.round((config.intro_runtime || 1) * 60);
  const outroSecs = Math.round((config.outro_runtime || 1) * 60);
  const talkSecs = Math.round((config.talk_segment_runtime || 12) * 60);
  const sponsorSecs = Math.round((config.commercial_sponsor_runtime || 6) * 60);
  const stationIdSecs = 15;

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
    for (const song of songBlocks[blockIdx]) {
      blueprint.push({
        segment_type: 'song', title: song.song_title,
        associated_song_title: song.song_title, target_duration: song.length_seconds || 180
      });
    }
    if (blockIdx < songBlocks.length - 1) {
      if (topicIdx < topics.length) {
        blueprint.push({
          segment_type: 'topic_segment', title: topics[topicIdx].topic_name,
          associated_topic: topics[topicIdx].topic_name, target_duration: talkPerInterval
        });
        topicIdx++;
      } else {
        blueprint.push({ segment_type: 'talk_break', title: 'Host Banter', target_duration: talkPerInterval });
      }
      if ((blockIdx + 1) % 2 === 0) {
        blueprint.push({ segment_type: 'sponsor_break', title: 'Sponsor Break', target_duration: sponsorPerInterval });
      }
      blueprint.push({ segment_type: 'station_id', title: 'Station ID', target_duration: stationIdSecs });
    }
  }
  while (topicIdx < topics.length) {
    blueprint.push({
      segment_type: 'topic_segment', title: topics[topicIdx].topic_name,
      associated_topic: topics[topicIdx].topic_name, target_duration: 60
    });
    topicIdx++;
  }
  blueprint.push({ segment_type: 'outro', title: 'Show Outro', target_duration: outroSecs });
  return blueprint;
}

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