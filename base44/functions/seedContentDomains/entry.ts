import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const existing = await base44.asServiceRole.entities.ContentDomain.list();
    if (existing.length > 0) {
      return Response.json({ message: 'Content domains already seeded', count: existing.length });
    }

    const domains = [
      {
        domain_key: 'news',
        display_name: 'News Production',
        description: 'Daily news, breaking stories, political coverage, business and technology news. The original Producer workflow.',
        icon_name: 'Newspaper',
        system_persona: 'You are a professional broadcast producer for a news show. You understand journalism, editorial judgment, and broadcast production. You prioritize accuracy, fairness, and clarity.',
        rating_criteria: 'Rate each article by opportunity (relevance to the show\'s focus and audience interest), freshness (how recent and timely), and usefulness (how much value it provides to the audience). Prioritize: breaking news, American manufacturing/reshoring, small business success, AI/tech innovation, skilled trades, agriculture, creator economy, and positive economic news.',
        asset_types: JSON.stringify([
          'teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text',
          'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions',
          'broll_suggestions', 'social_caption', 'fact_check_notes'
        ]),
        asset_descriptions: JSON.stringify({
          teleprompter_script: 'A broadcast-ready teleprompter script written for on-air reading. Use natural pacing, clear sentences, and broadcast formatting.',
          story_summary: 'A concise internal story summary (not for publication) giving the producer a quick understanding of the story.',
          talking_points: '3-5 discussion talking points for the host, emphasizing conversation rather than scripted reading.',
          lower_third_text: 'Suggested lower-third graphic text with a primary headline, secondary headline, and optional supporting line.',
          headline_suggestions: '2-3 alternative headline suggestions that are accurate, clear, and engaging without sensationalizing.',
          image_prompt: 'A detailed prompt suitable for AI image generation systems to create a headline graphic or story illustration.',
          thumbnail_prompt: 'A detailed prompt for generating a thumbnail image for this story.',
          visual_suggestions: 'Visual production suggestions including opening shot, supporting footage, charts, maps, or infographics.',
          broll_suggestions: 'B-roll footage suggestions such as establishing shots, close-ups, wide-angle footage, environmental footage, or product demonstrations.',
          social_caption: 'A social media caption aligned with the story and production style.',
          fact_check_notes: 'Factual elements requiring verification including statistics, dates, names, locations, organizations, and claims.'
        }),
        production_prompt: `You are a professional broadcast producer. Generate production assets for the following news story.

STORY DETAILS:
Title: {title}
Source: {source}
Summary: {summary}
Category: {category}

PRODUCTION SETTINGS:
Tone: {tone}
Reading Style: {reading_style}
Audience: {audience}
Target Runtime: {target_runtime}

Generate the following production assets. Each asset must be production-ready, accurate, and professional:

{asset_list}

Also estimate the reading time of the teleprompter script as "estimated_runtime" (e.g. "45 seconds", "1 minute 30 seconds").

Return a JSON object with these exact string keys: the asset types listed above plus "estimated_runtime". Each value should be a string with the generated content.`,
        briefing_prompt: `You are the Producer AI for a daily news show. The show focuses on American innovation, manufacturing, reshoring, small business, AI/technology, skilled trades, agriculture, and the creator economy — with an optimistic, pro-American tone.

Here are {article_count} pending articles from today's sources. Rate each one, select the best stories for today's briefing, and generate a complete briefing.

ARTICLES:
{articles}

INSTRUCTIONS:
1. Rate each article: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 stories for the briefing (set "selected": true). Prioritize: breaking news, American manufacturing/reshoring, small business success, AI/tech innovation, skilled trades, agriculture, creator economy, and positive economic news.
3. Pick ONE story as the host's top pick — the most important/compelling story of the day
4. Generate a complete briefing:
   - theme: 2-4 word theme (e.g., "American Innovation & Opportunity")
   - energy: emotional energy (e.g., "Optimistic & Energized")
   - mission: one sentence describing today's mission
   - monologue: 60-90 second opening monologue in the host's voice — conversational, optimistic, pro-American, referencing the top stories
   - poll: chat poll question with 3-4 options labeled A) B) C) D)
   - graphic_stat: one striking statistic worth showing on screen
   - broll: suggested B-roll footage ideas (comma-separated)
   - cta: call to action for the audience
   - conversation_starters: 3-4 conversation starter questions (numbered)
   - fact_check: key fact-checking notes for the selected stories
   - tomorrow_watch: what to watch for tomorrow
   - estimated_read_time: estimated total read time (e.g., "12 min")
   - top_3_stories: the top 3 story headlines (comma-separated)

Use the "id" field from the articles above for article_id and host_pick_id.`,
        briefing_schema: JSON.stringify({
          type: 'object',
          properties: {
            rated_articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  article_id: { type: 'string' },
                  opportunity_score: { type: 'number' },
                  freshness_score: { type: 'number' },
                  usefulness_score: { type: 'number' },
                  selected: { type: 'boolean' }
                }
              }
            },
            host_pick_id: { type: 'string' },
            theme: { type: 'string' },
            energy: { type: 'string' },
            mission: { type: 'string' },
            monologue: { type: 'string' },
            poll: { type: 'string' },
            graphic_stat: { type: 'string' },
            broll: { type: 'string' },
            cta: { type: 'string' },
            conversation_starters: { type: 'string' },
            fact_check: { type: 'string' },
            tomorrow_watch: { type: 'string' },
            estimated_read_time: { type: 'string' },
            top_3_stories: { type: 'string' }
          }
        }),
        host_pick_label: 'Top Pick',
        default_categories: 'top_story,politics,world,national,state,local,business,markets,ai,technology,science,health,environment,education,entertainment,sports,weather,crime_safety,military,food_agriculture,small_business,entrepreneurship,skilled_trades,creator_economy,good_news,fact_check,community,opinion,manufacturing,reshoring,supply_chain,state_economy,infrastructure,general',
        default_audience: 'General Public',
        default_target_runtime: '1 Minute',
        is_active: true,
        sort_order: 1
      },
      {
        domain_key: 'radio_music',
        display_name: 'Radio / Music Production',
        description: 'Music industry news, artist updates, concert tours, new releases, and chart movements. Built for radio shows and music podcasts.',
        icon_name: 'Radio',
        system_persona: 'You are a professional radio producer and music curator. You understand the music industry, artist ecosystems, tour logistics, chart trends, and what engages music listeners. You prioritize artist accuracy, relevance to the station\'s format, and listener engagement.',
        rating_criteria: 'Rate each item by opportunity (relevance to the station\'s format and audience interest), freshness (how recent — new releases and tour announcements score high), and usefulness (how much value it provides to listeners). Prioritize: new music releases, tour announcements, artist interviews, chart movements, industry trends, festival lineups, and local concert news.',
        asset_types: JSON.stringify([
          'show_script', 'story_summary', 'talking_points', 'lower_third_text',
          'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions',
          'playlist_segment', 'social_caption', 'artist_facts'
        ]),
        asset_descriptions: JSON.stringify({
          show_script: 'A radio-ready host script for on-air delivery. Written for spoken-word pacing with natural transitions, intro/outro cues, and broadcast formatting.',
          story_summary: 'A concise internal summary giving the producer a quick understanding of the music news item.',
          talking_points: '3-5 discussion talking points for the host about the artist, track, or music news.',
          lower_third_text: 'Suggested on-screen text (for simulcast or social clips) with artist name, track title, and optional supporting info.',
          headline_suggestions: '2-3 alternative headline or segment title suggestions that are engaging and accurate.',
          image_prompt: 'A detailed prompt for AI image generation to create a segment graphic or artist illustration.',
          thumbnail_prompt: 'A detailed prompt for generating a thumbnail image for this segment.',
          visual_suggestions: 'Visual suggestions for social media clips or simulcast — artist photos, album art, concert footage, etc.',
          playlist_segment: 'Suggested songs or tracks to pair with this segment — relevant to the artist or topic being discussed.',
          social_caption: 'A social media caption aligned with the music content and station style.',
          artist_facts: 'Key facts about the artist(s) involved — genre, label, notable releases, tour status, and verification notes.'
        }),
        production_prompt: `You are a professional radio producer. Generate production assets for the following music content item.

CONTENT DETAILS:
Title: {title}
Source: {source}
Summary: {summary}
Category: {category}

PRODUCTION SETTINGS:
Tone: {tone}
Reading Style: {reading_style}
Audience: {audience}
Target Runtime: {target_runtime}

Generate the following production assets. Each asset must be broadcast-ready, accurate, and professional:

{asset_list}

Also estimate the reading time of the show script as "estimated_runtime" (e.g. "45 seconds", "1 minute 30 seconds").

Return a JSON object with these exact string keys: the asset types listed above plus "estimated_runtime". Each value should be a string with the generated content.`,
        briefing_prompt: `You are the Producer AI for a radio music show. The show covers music industry news, artist updates, new releases, concert tours, and chart movements — with an energetic, music-forward tone.

Here are {article_count} pending items from today's sources. Rate each one, select the best items for today's show, and generate a complete briefing.

ARTICLES:
{articles}

INSTRUCTIONS:
1. Rate each item: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 items for the show (set "selected": true). Prioritize: new releases, tour announcements, artist news, chart movements, festival lineups, and local concert events.
3. Pick ONE item as the host's top pick — the most important/compelling music story of the day
4. Generate a complete briefing:
   - theme: 2-4 word theme (e.g., "New Releases & Tour Buzz")
   - energy: emotional energy (e.g., "Hyped & Ready")
   - mission: one sentence describing today's show mission
   - monologue: 60-90 second opening monologue in the host's voice — energetic, music-forward, referencing the top items
   - poll: listener poll question with 3-4 options labeled A) B) C) D)
   - graphic_stat: one striking music statistic worth mentioning (chart position, streaming numbers, etc.)
   - broll: suggested visual/segment ideas (artist photos, concert footage, album art) (comma-separated)
   - cta: call to action for the listeners (e.g., request lines, social engagement)
   - conversation_starters: 3-4 conversation starter questions (numbered)
   - fact_check: key fact-checking notes for the selected items
   - tomorrow_watch: what to watch for tomorrow in music
   - estimated_read_time: estimated total read time (e.g., "12 min")
   - top_3_stories: the top 3 item headlines (comma-separated)

Use the "id" field from the items above for article_id and host_pick_id.`,
        briefing_schema: JSON.stringify({
          type: 'object',
          properties: {
            rated_articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  article_id: { type: 'string' },
                  opportunity_score: { type: 'number' },
                  freshness_score: { type: 'number' },
                  usefulness_score: { type: 'number' },
                  selected: { type: 'boolean' }
                }
              }
            },
            host_pick_id: { type: 'string' },
            theme: { type: 'string' },
            energy: { type: 'string' },
            mission: { type: 'string' },
            monologue: { type: 'string' },
            poll: { type: 'string' },
            graphic_stat: { type: 'string' },
            broll: { type: 'string' },
            cta: { type: 'string' },
            conversation_starters: { type: 'string' },
            fact_check: { type: 'string' },
            tomorrow_watch: { type: 'string' },
            estimated_read_time: { type: 'string' },
            top_3_stories: { type: 'string' }
          }
        }),
        host_pick_label: 'Featured Track',
        default_categories: 'new_release,tour_announcement,artist_news,chart_movement,festival_lineup,album_review,interview,music_industry,streaming,local_concert,genre_spotlight,classic_track,general',
        default_audience: 'Music Listeners',
        default_target_runtime: '3 Minutes',
        is_active: true,
        sort_order: 2
      },
      {
        domain_key: 'cooking',
        display_name: 'Cooking / Culinary Production',
        description: 'Recipes, cooking techniques, food trends, restaurant news, and culinary education. Built for cooking shows and food content.',
        icon_name: 'ChefHat',
        system_persona: 'You are a professional culinary producer and food content creator. You understand cooking techniques, recipe development, food trends, and what engages home cooks and food enthusiasts. You prioritize clarity, accuracy of cooking instructions, and visual appeal.',
        rating_criteria: 'Rate each item by opportunity (relevance to the show\'s format and audience interest), freshness (seasonal relevance, trending ingredients, new techniques), and usefulness (how much practical value it provides to viewers). Prioritize: seasonal recipes, trending ingredients, cooking techniques, restaurant/cuisine news, food science, kitchen tips, and cultural food stories.',
        asset_types: JSON.stringify([
          'show_script', 'story_summary', 'talking_points', 'lower_third_text',
          'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions',
          'ingredient_list', 'social_caption', 'cooking_notes'
        ]),
        asset_descriptions: JSON.stringify({
          show_script: 'A cooking show host script for on-air delivery. Written for a conversational, instructional pace with natural transitions between segments.',
          story_summary: 'A concise internal summary giving the producer a quick understanding of the recipe or food topic.',
          talking_points: '3-5 discussion talking points for the host about the dish, technique, ingredient, or food trend.',
          lower_third_text: 'Suggested on-screen text with recipe name, key ingredients, and optional supporting info.',
          headline_suggestions: '2-3 alternative segment title suggestions that are engaging and appetizing.',
          image_prompt: 'A detailed prompt for AI image generation to create a dish illustration or segment graphic.',
          thumbnail_prompt: 'A detailed prompt for generating a thumbnail image for this cooking segment.',
          visual_suggestions: 'Visual production suggestions including plating shots, prep footage, cooking technique close-ups, and finished dish presentations.',
          ingredient_list: 'Complete ingredient list with quantities for the recipe or segment being discussed.',
          social_caption: 'A social media caption aligned with the food content and show style.',
          cooking_notes: 'Key cooking notes including temperatures, times, technique tips, substitution options, and safety considerations.'
        }),
        production_prompt: `You are a professional culinary producer. Generate production assets for the following cooking content item.

CONTENT DETAILS:
Title: {title}
Source: {source}
Summary: {summary}
Category: {category}

PRODUCTION SETTINGS:
Tone: {tone}
Reading Style: {reading_style}
Audience: {audience}
Target Runtime: {target_runtime}

Generate the following production assets. Each asset must be production-ready, accurate, and professional:

{asset_list}

Also estimate the reading time of the show script as "estimated_runtime" (e.g. "45 seconds", "1 minute 30 seconds").

Return a JSON object with these exact string keys: the asset types listed above plus "estimated_runtime". Each value should be a string with the generated content.`,
        briefing_prompt: `You are the Producer AI for a cooking show. The show covers recipes, cooking techniques, food trends, restaurant news, and culinary education — with a warm, instructional, food-loving tone.

Here are {article_count} pending items from today's sources. Rate each one, select the best items for today's show, and generate a complete briefing.

ARTICLES:
{articles}

INSTRUCTIONS:
1. Rate each item: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 items for the show (set "selected": true). Prioritize: seasonal recipes, trending ingredients, cooking techniques, restaurant/cuisine news, food science, kitchen tips, and cultural food stories.
3. Pick ONE item as the host's top pick — the most compelling recipe or food story of the day
4. Generate a complete briefing:
   - theme: 2-4 word theme (e.g., "Summer Grilling & Fresh Herbs")
   - energy: emotional energy (e.g., "Warm & Inspired")
   - mission: one sentence describing today's show mission
   - monologue: 60-90 second opening monologue in the host's voice — warm, food-loving, referencing the top items
   - poll: viewer poll question with 3-4 options labeled A) B) C) D) (e.g., favorite ingredient, cooking method)
   - graphic_stat: one striking food statistic worth showing on screen
   - broll: suggested visual/segment ideas (plating shots, prep footage, technique close-ups) (comma-separated)
   - cta: call to action for the viewers (e.g., try this recipe, share your results)
   - conversation_starters: 3-4 conversation starter questions (numbered)
   - fact_check: key fact-checking notes for the selected items (cooking times, temperatures, ingredient claims)
   - tomorrow_watch: what to watch for tomorrow in food
   - estimated_read_time: estimated total read time (e.g., "12 min")
   - top_3_stories: the top 3 item headlines (comma-separated)

Use the "id" field from the items above for article_id and host_pick_id.`,
        briefing_schema: JSON.stringify({
          type: 'object',
          properties: {
            rated_articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  article_id: { type: 'string' },
                  opportunity_score: { type: 'number' },
                  freshness_score: { type: 'number' },
                  usefulness_score: { type: 'number' },
                  selected: { type: 'boolean' }
                }
              }
            },
            host_pick_id: { type: 'string' },
            theme: { type: 'string' },
            energy: { type: 'string' },
            mission: { type: 'string' },
            monologue: { type: 'string' },
            poll: { type: 'string' },
            graphic_stat: { type: 'string' },
            broll: { type: 'string' },
            cta: { type: 'string' },
            conversation_starters: { type: 'string' },
            fact_check: { type: 'string' },
            tomorrow_watch: { type: 'string' },
            estimated_read_time: { type: 'string' },
            top_3_stories: { type: 'string' }
          }
        }),
        host_pick_label: 'Featured Recipe',
        default_categories: 'seasonal_recipe,technique,trending_ingredient,restaurant_news,food_science,kitchen_tip,cuisine_cultural,baking,grilling,plant_based,comfort_food,general',
        default_audience: 'Home Cooks & Food Enthusiasts',
        default_target_runtime: '5 Minutes',
        is_active: true,
        sort_order: 3
      },
      {
        domain_key: 'spiritual',
        display_name: 'Spiritual / Faith Production',
        description: 'Devotionals, sermons, spiritual teachings, faith-based content, and inspirational messages. Built for church livestreams, faith podcasts, and spiritual broadcasts.',
        icon_name: 'Church',
        system_persona: 'You are a professional spiritual content producer. You understand faith-based communication, sermon preparation, devotional writing, and what spiritually engages a congregation or audience. You prioritize reverence, authenticity, scriptural accuracy, and pastoral care.',
        rating_criteria: 'Rate each item by opportunity (relevance to the congregation\'s needs and spiritual season), freshness (timeliness — liturgical calendar, current events through a faith lens), and usefulness (how much spiritual nourishment it provides). Prioritize: devotional content, scripture reflections, inspirational stories, faith-based news, community outreach, prayer guides, and seasonal/liturgical content.',
        asset_types: JSON.stringify([
          'show_script', 'story_summary', 'talking_points', 'lower_third_text',
          'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions',
          'scripture_references', 'social_caption', 'reflection_notes'
        ]),
        asset_descriptions: JSON.stringify({
          show_script: 'A spiritually-themed host script for on-air delivery. Written for a contemplative, pastoral pace with natural transitions and a reverent tone.',
          story_summary: 'A concise internal summary giving the producer a quick understanding of the spiritual content item.',
          talking_points: '3-5 discussion or reflection talking points for the host about the teaching, devotional, or faith topic.',
          lower_third_text: 'Suggested on-screen text with scripture references, key themes, and optional supporting info.',
          headline_suggestions: '2-3 alternative segment title suggestions that are reverent, clear, and engaging.',
          image_prompt: 'A detailed prompt for AI image generation to create a spiritual illustration or segment graphic.',
          thumbnail_prompt: 'A detailed prompt for generating a thumbnail image for this spiritual segment.',
          visual_suggestions: 'Visual production suggestions including nature footage, candlelight, scripture text overlays, community photos, and contemplative imagery.',
          scripture_references: 'Relevant scripture passages, references, and context that support the content being discussed.',
          social_caption: 'A social media caption aligned with the spiritual content and community style.',
          reflection_notes: 'Key reflection notes including discussion questions, prayer points, application ideas, and pastoral considerations.'
        }),
        production_prompt: `You are a professional spiritual content producer. Generate production assets for the following faith-based content item.

CONTENT DETAILS:
Title: {title}
Source: {source}
Summary: {summary}
Category: {category}

PRODUCTION SETTINGS:
Tone: {tone}
Reading Style: {reading_style}
Audience: {audience}
Target Runtime: {target_runtime}

Generate the following production assets. Each asset must be production-ready, reverent, and professional:

{asset_list}

Also estimate the reading time of the show script as "estimated_runtime" (e.g. "45 seconds", "1 minute 30 seconds").

Return a JSON object with these exact string keys: the asset types listed above plus "estimated_runtime". Each value should be a string with the generated content.`,
        briefing_prompt: `You are the Producer AI for a spiritual/faith show. The show covers devotionals, scripture reflections, inspirational stories, faith-based news, and community outreach — with a reverent, uplifting, and pastoral tone.

Here are {article_count} pending items from today's sources. Rate each one, select the best items for today's show, and generate a complete briefing.

ARTICLES:
{articles}

INSTRUCTIONS:
1. Rate each item: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 items for the show (set "selected": true). Prioritize: devotional content, scripture reflections, inspirational stories, faith-based news, community outreach, prayer guides, and seasonal/liturgical content.
3. Pick ONE item as the host's top pick — the most spiritually resonant or timely message of the day
4. Generate a complete briefing:
   - theme: 2-4 word theme (e.g., "Grace & Renewal")
   - energy: emotional/spiritual energy (e.g., "Reflective & Uplifted")
   - mission: one sentence describing today's spiritual mission
   - monologue: 60-90 second opening monologue in the host's voice — reverent, pastoral, referencing the top items
   - poll: community reflection question with 3-4 options labeled A) B) C) D)
   - graphic_stat: one striking faith-related statistic or scripture insight worth showing on screen
   - broll: suggested visual/segment ideas (nature footage, scripture overlays, community photos) (comma-separated)
   - cta: call to action for the community (e.g., prayer requests, community engagement)
   - conversation_starters: 3-4 reflection or discussion questions (numbered)
   - fact_check: key verification notes for the selected items (scripture accuracy, factual claims)
   - tomorrow_watch: what to watch for tomorrow in faith and community
   - estimated_read_time: estimated total read time (e.g., "12 min")
   - top_3_stories: the top 3 item headlines (comma-separated)

Use the "id" field from the items above for article_id and host_pick_id.`,
        briefing_schema: JSON.stringify({
          type: 'object',
          properties: {
            rated_articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  article_id: { type: 'string' },
                  opportunity_score: { type: 'number' },
                  freshness_score: { type: 'number' },
                  usefulness_score: { type: 'number' },
                  selected: { type: 'boolean' }
                }
              }
            },
            host_pick_id: { type: 'string' },
            theme: { type: 'string' },
            energy: { type: 'string' },
            mission: { type: 'string' },
            monologue: { type: 'string' },
            poll: { type: 'string' },
            graphic_stat: { type: 'string' },
            broll: { type: 'string' },
            cta: { type: 'string' },
            conversation_starters: { type: 'string' },
            fact_check: { type: 'string' },
            tomorrow_watch: { type: 'string' },
            estimated_read_time: { type: 'string' },
            top_3_stories: { type: 'string' }
          }
        }),
        host_pick_label: 'Featured Message',
        default_categories: 'devotional,scripture_reflection,inspirational_story,faith_news,community_outreach,prayer_guide,liturgical_seasonal,sermon_excerpt,testimony,general',
        default_audience: 'Faith Community',
        default_target_runtime: '5 Minutes',
        is_active: true,
        sort_order: 4
      }
    ];

    await base44.asServiceRole.entities.ContentDomain.bulkCreate(domains);

    return Response.json({
      message: 'Content domains seeded successfully',
      count: domains.length,
      domains: domains.map(d => ({ key: d.domain_key, name: d.display_name }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});