import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if already seeded
    const existing = await base44.entities.ProductionProfile.list();
    if (existing.length > 0) {
      return Response.json({ message: 'Already seeded', count: existing.length });
    }

    const profiles = [
      {
        profile_name: 'News',
        profile_type: 'news',
        description: 'News briefings and production packages',
        icon: 'Search',
        color: 'from-berna-purple to-purple-600',
        research_modules: JSON.stringify(['news_sources', 'government_sources', 'press_releases', 'business_finance', 'technology', 'science', 'local_news']),
        production_modules: JSON.stringify(['teleprompter_script', 'story_cards', 'lower_thirds', 'ai_images', 'headline_graphics', 'talking_points', 'fact_check_notes', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'teleprompter', 'pdf', 'markdown']),
        is_default: true
      },
      {
        profile_name: 'Podcast',
        profile_type: 'podcast',
        description: 'Episode outlines, show notes, and scripts',
        icon: 'Mic',
        color: 'from-berna-orange to-orange-500',
        research_modules: JSON.stringify(['topic_research', 'guest_research', 'industry_news', 'audience_questions', 'trending_discussions', 'user_links']),
        production_modules: JSON.stringify(['episode_outline', 'intro_script', 'segment_breakdown', 'talking_points', 'guest_questions', 'ad_reads', 'outro_script', 'show_notes', 'social_captions', 'thumbnail']),
        output_modules: JSON.stringify(['full_package', 'show_notes', 'teleprompter', 'markdown']),
        is_default: false
      },
      {
        profile_name: 'Radio Show',
        profile_type: 'radio_show',
        description: 'Radio broadcasts and live audio',
        icon: 'Radio',
        color: 'from-berna-emerald to-emerald-500',
        research_modules: JSON.stringify(['music_charts', 'weather', 'local_events', 'news_headlines', 'artist_updates', 'community_announcements', 'traffic_reports']),
        production_modules: JSON.stringify(['show_clock', 'segment_rundown', 'host_banter', 'playlist', 'station_breaks', 'sponsor_reads', 'caller_prompts', 'trivia', 'transition_scripts']),
        output_modules: JSON.stringify(['full_package', 'rundown', 'playlist', 'teleprompter']),
        is_default: false
      },
      {
        profile_name: 'Music Show',
        profile_type: 'music_show',
        description: 'Playlists, artist facts, and music trivia',
        icon: 'Music',
        color: 'from-pink-500 to-rose-500',
        research_modules: JSON.stringify(['music_charts', 'new_releases', 'artist_news', 'music_history', 'artist_birthdays', 'concert_announcements', 'genre_trends']),
        production_modules: JSON.stringify(['playlist', 'artist_facts', 'song_introductions', 'music_trivia', 'segment_scripts', 'transition_banter', 'lower_thirds', 'ai_images', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'playlist', 'teleprompter', 'social_package']),
        is_default: false
      },
      {
        profile_name: 'Cooking Show',
        profile_type: 'cooking_show',
        description: 'Recipes, ingredient lists, and cooking scripts',
        icon: 'ChefHat',
        color: 'from-amber-500 to-orange-400',
        research_modules: JSON.stringify(['recipes', 'ingredients', 'seasonal_foods', 'nutrition_facts', 'food_history', 'kitchen_tips', 'grocery_info']),
        production_modules: JSON.stringify(['recipe_cards', 'ingredient_list', 'shopping_list', 'cooking_rundown', 'host_script', 'food_facts', 'step_by_step', 'plating_notes', 'ai_images', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'recipe_sheet', 'shopping_list', 'teleprompter', 'pdf']),
        is_default: false
      },
      {
        profile_name: 'Sports Show',
        profile_type: 'sports_show',
        description: 'Game recaps, commentary, and analysis',
        icon: 'Trophy',
        color: 'from-blue-500 to-cyan-500',
        research_modules: JSON.stringify(['scores', 'schedules', 'standings', 'player_stats', 'team_news', 'injury_reports', 'historical_matchups']),
        production_modules: JSON.stringify(['game_recap', 'segment_rundown', 'talking_points', 'player_profiles', 'debate_questions', 'prediction_segments', 'lower_thirds', 'ai_graphics', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'rundown', 'teleprompter', 'social_package']),
        is_default: false
      },
      {
        profile_name: 'Talk Show',
        profile_type: 'talk_show',
        description: 'Interviews, discussions, and guest segments',
        icon: 'MessageCircle',
        color: 'from-violet-500 to-purple-500',
        research_modules: JSON.stringify(['guest_background', 'trending_topics', 'audience_questions', 'industry_research', 'current_events']),
        production_modules: JSON.stringify(['episode_outline', 'guest_intro', 'interview_questions', 'segment_transitions', 'monologue', 'audience_prompts', 'social_captions', 'ai_images', 'lower_thirds']),
        output_modules: JSON.stringify(['full_package', 'teleprompter', 'show_notes', 'markdown']),
        is_default: false
      },
      {
        profile_name: 'Livestream',
        profile_type: 'livestream',
        description: 'Creator streams, chat prompts, and segments',
        icon: 'Video',
        color: 'from-red-500 to-pink-500',
        research_modules: JSON.stringify(['trending_topics', 'platform_trends', 'audience_prompts', 'game_info', 'community_updates']),
        production_modules: JSON.stringify(['stream_outline', 'opening_script', 'segment_list', 'chat_prompts', 'poll_questions', 'donation_prompts', 'sponsor_reads', 'closing_script', 'thumbnail', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'outline', 'teleprompter', 'social_package']),
        is_default: false
      },
      {
        profile_name: 'Church Service',
        profile_type: 'church_service',
        description: 'Sermons, scripture, and ministry content',
        icon: 'Church',
        color: 'from-indigo-500 to-blue-500',
        research_modules: JSON.stringify(['scripture', 'sermon_research', 'historical_context', 'devotionals', 'announcements', 'prayer_topics']),
        production_modules: JSON.stringify(['sermon_outline', 'scripture_references', 'discussion_questions', 'prayer_points', 'announcement_script', 'service_rundown', 'slide_text', 'social_captions', 'ai_graphics']),
        output_modules: JSON.stringify(['full_package', 'sermon_outline', 'slide_outline', 'teleprompter', 'pdf']),
        is_default: false
      },
      {
        profile_name: 'Educational Content',
        profile_type: 'educational_content',
        description: 'Lessons, tutorials, and lectures',
        icon: 'GraduationCap',
        color: 'from-teal-500 to-emerald-500',
        research_modules: JSON.stringify(['topic_research', 'learning_objectives', 'reference_materials', 'examples', 'exercises']),
        production_modules: JSON.stringify(['lesson_plan', 'teaching_script', 'learning_objectives', 'key_terms', 'examples', 'quiz_questions', 'slide_outline', 'student_handout', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'lesson_plan', 'slide_outline', 'handout', 'pdf']),
        is_default: false
      },
      {
        profile_name: 'Business Briefing',
        profile_type: 'business_briefing',
        description: 'Corporate updates and presentations',
        icon: 'Briefcase',
        color: 'from-slate-500 to-gray-500',
        research_modules: JSON.stringify(['industry_news', 'company_updates', 'market_data', 'competitor_news', 'internal_notes']),
        production_modules: JSON.stringify(['executive_summary', 'presentation_outline', 'talking_points', 'slide_text', 'team_update_script', 'charts', 'ai_images', 'email_summary']),
        output_modules: JSON.stringify(['full_package', 'presentation', 'email', 'pdf', 'docx']),
        is_default: false
      },
      {
        profile_name: 'Gaming Stream',
        profile_type: 'gaming_stream',
        description: 'Gaming content and streams',
        icon: 'Gamepad2',
        color: 'from-lime-500 to-green-500',
        research_modules: JSON.stringify(['game_updates', 'patch_notes', 'esports_news', 'developer_posts', 'community_trends', 'upcoming_releases']),
        production_modules: JSON.stringify(['stream_outline', 'game_summary', 'talking_points', 'segment_ideas', 'chat_prompts', 'challenge_ideas', 'ai_graphics', 'thumbnail', 'social_captions']),
        output_modules: JSON.stringify(['full_package', 'outline', 'teleprompter', 'social_package']),
        is_default: false
      }
    ];

    await base44.entities.ProductionProfile.bulkCreate(profiles);

    return Response.json({ 
      message: 'Production profiles seeded successfully',
      count: profiles.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});