// Production Profile Configurations
// Each profile defines terminology, research modules, setup fields, and generated assets

export const PRODUCTION_PROFILES = {
  news: {
    profile_type: 'news',
    profile_name: 'News Production',
    description: 'Daily news briefings, breaking news, and news segments',
    icon: 'newspaper',
    color: 'berna-purple',
    item_type_label: 'Story',
    item_type_label_plural: 'Stories',
    research_label: 'News Research',
    rundown_label: 'News Rundown',
    setup_fields: {
      briefing_type: { type: 'select', options: ['daily', 'breaking_news', 'weekly_planning', 'custom'], default: 'daily' },
      theme: { type: 'text', placeholder: "Today's theme or focus" },
      energy: { type: 'select', options: ['professional', 'conversational', 'energetic'], default: 'professional' },
      target_runtime: { type: 'text', default: '30 Minutes' },
    },
    research_modules: [
      'major_news', 'wire_service', 'government', 'state_government',
      'local_business', 'manufacturing', 'labor_workforce',
      'ai_technology', 'agriculture_food', 'creator_economy',
      'science_research', 'fact_checking', 'company_newsroom',
      'university_research', 'business_finance', 'technology',
      'small_business', 'press_release', 'local_news'
    ],
    production_item_types: ['top_story', 'politics', 'world', 'national', 'state', 'local', 'business', 'technology', 'sports', 'weather'],
    generated_assets: [
      'teleprompter_script', 'headline', 'lower_thirds', 'image_prompt',
      'video_prompt', 'ai_image', 'broll_suggestions', 'fact_check_notes',
      'source_attribution', 'social_caption', 'talking_points'
    ],
    default_templates: ['story_cards', 'lower_thirds', 'headline_graphics', 'breaking_news_graphics'],
    export_options: ['pdf', 'docx', 'markdown', 'teleprompter', 'html'],
  },
  music_show: {
    profile_type: 'music_show',
    profile_name: 'Music Show',
    description: 'Radio shows, music programs, and playlist-based content',
    icon: 'music',
    color: 'berna-orange',
    item_type_label: 'Song',
    item_type_label_plural: 'Playlist',
    research_label: 'Music Research',
    rundown_label: 'Show Clock',
    setup_fields: {
      show_length: { type: 'text', default: '60 Minutes' },
      genre_selection: { type: 'text', placeholder: 'e.g., Rock, Pop, Jazz, Hip-Hop' },
      mood_selection: { type: 'text', placeholder: 'e.g., Upbeat, Chill, Energetic' },
      clean_explicit: { type: 'select', options: ['clean', 'explicit', 'mixed'], default: 'clean' },
      era_preference: { type: 'text', placeholder: 'e.g., 80s, 90s, 2000s, Current' },
      must_play_songs: { type: 'textarea', placeholder: 'List must-play songs' },
      blocked_artists: { type: 'textarea', placeholder: 'List blocked artists' },
      platform_preference: { type: 'text', placeholder: 'e.g., Spotify, Apple Music, YouTube' },
    },
    research_modules: [
      'music_charts', 'new_releases', 'artist_news', 'music_history',
      'artist_facts', 'user_playlists', 'album_releases', 'concert_tours'
    ],
    production_item_types: ['song', 'artist_feature', 'album_review', 'music_news', 'trivia', 'host_banter'],
    generated_assets: [
      'playlist', 'song_order', 'show_clock', 'host_banter', 'artist_facts',
      'song_intros', 'transition_scripts', 'trivia', 'sponsor_breaks',
      'social_caption', 'thumbnail_image', 'ai_image'
    ],
    default_templates: ['playlist_graphics', 'artist_cards', 'now_playing_graphics'],
    export_options: ['pdf', 'markdown', 'text', 'html'],
  },
  cooking_show: {
    profile_type: 'cooking_show',
    profile_name: 'Cooking Show',
    description: 'Recipe demonstrations, cooking segments, and food content',
    icon: 'chef-hat',
    color: 'berna-emerald',
    item_type_label: 'Recipe',
    item_type_label_plural: 'Recipes',
    research_label: 'Recipe Research',
    rundown_label: 'Cooking Rundown',
    setup_fields: {
      show_length: { type: 'text', default: '30 Minutes' },
      cuisine_type: { type: 'text', placeholder: 'e.g., Italian, Mexican, Asian, American' },
      meal_type: { type: 'select', options: ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'any'], default: 'any' },
      dietary_restrictions: { type: 'text', placeholder: 'e.g., Vegan, Gluten-free, Keto' },
      skill_level: { type: 'select', options: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
      ingredients_available: { type: 'textarea', placeholder: 'List available ingredients' },
      ingredients_to_avoid: { type: 'textarea', placeholder: 'List ingredients to avoid' },
      number_of_recipes: { type: 'number', default: 3 },
    },
    research_modules: [
      'recipes', 'ingredients', 'food_facts', 'nutrition',
      'seasonal_foods', 'kitchen_tips', 'cooking_techniques', 'chef_profiles'
    ],
    production_item_types: ['recipe', 'ingredient_spotlight', 'cooking_tip', 'food_fact', 'kitchen_hack'],
    generated_assets: [
      'recipe_card', 'ingredient_list', 'shopping_list', 'cooking_rundown',
      'step_by_step_script', 'host_talking_points', 'food_facts', 'plating_notes',
      'ai_food_image', 'social_caption', 'nutrition_facts'
    ],
    default_templates: ['recipe_cards', 'ingredient_graphics', 'cooking_step_graphics'],
    export_options: ['pdf', 'docx', 'markdown', 'html'],
  },
  podcast: {
    profile_type: 'podcast',
    profile_name: 'Podcast',
    description: 'Podcast episodes, interviews, and audio content',
    icon: 'mic',
    color: 'berna-purple',
    item_type_label: 'Topic',
    item_type_label_plural: 'Topics',
    research_label: 'Topic Research',
    rundown_label: 'Episode Rundown',
    setup_fields: {
      episode_length: { type: 'text', default: '45 Minutes' },
      topic: { type: 'text', placeholder: 'Main episode topic' },
      guest_name: { type: 'text', placeholder: 'Guest name (if applicable)' },
      guest_bio: { type: 'textarea', placeholder: 'Guest biography' },
      audience: { type: 'text', placeholder: 'Target audience' },
      tone: { type: 'select', options: ['professional', 'conversational', 'humorous', 'educational'], default: 'conversational' },
      segment_count: { type: 'number', default: 4 },
    },
    research_modules: [
      'topic_research', 'guest_research', 'industry_news', 'audience_questions',
      'user_links', 'related_podcasts', 'trending_topics'
    ],
    production_item_types: ['topic', 'segment', 'guest_question', 'talking_point', 'ad_read'],
    generated_assets: [
      'episode_outline', 'intro_script', 'segment_breakdown', 'host_talking_points',
      'guest_questions', 'ad_reads', 'outro_script', 'show_notes',
      'episode_title_ideas', 'social_caption', 'thumbnail_image'
    ],
    default_templates: ['episode_graphics', 'quote_cards', 'show_notes_template'],
    export_options: ['pdf', 'markdown', 'text', 'html', 'teleprompter'],
  },
  sports_show: {
    profile_type: 'sports_show',
    profile_name: 'Sports Show',
    description: 'Sports coverage, game analysis, and sports commentary',
    icon: 'trophy',
    color: 'berna-navy',
    item_type_label: 'Game',
    item_type_label_plural: 'Games',
    research_label: 'Sports Research',
    rundown_label: 'Sports Rundown',
    setup_fields: {
      show_length: { type: 'text', default: '60 Minutes' },
      sports_focus: { type: 'text', placeholder: 'e.g., NFL, NBA, MLB, Soccer, Multi-sport' },
      coverage_type: { type: 'select', options: ['live', 'highlights', 'analysis', 'talk'], default: 'analysis' },
      teams_to_cover: { type: 'textarea', placeholder: 'List teams to focus on' },
    },
    research_modules: [
      'game_results', 'team_stats', 'player_stats', 'injury_reports',
      'trade_news', 'league_standings', 'upcoming_matchups', 'sports_analysis'
    ],
    production_item_types: ['game', 'team', 'player', 'stat', 'matchup', 'talking_point'],
    generated_assets: [
      'game_recap', 'stats_graphics', 'player_profiles', 'talking_points',
      'highlight_scripts', 'analysis_segments', 'social_caption', 'thumbnail_image'
    ],
    default_templates: ['scoreboard_graphics', 'player_cards', 'stats_graphics'],
    export_options: ['pdf', 'markdown', 'html', 'teleprompter'],
  },
  talk_show: {
    profile_type: 'talk_show',
    profile_name: 'Talk Show',
    description: 'Interview shows, panel discussions, and talk formats',
    icon: 'message-circle',
    color: 'berna-purple',
    item_type_label: 'Segment',
    item_type_label_plural: 'Segments',
    research_label: 'Topic Research',
    rundown_label: 'Show Rundown',
    setup_fields: {
      show_length: { type: 'text', default: '60 Minutes' },
      host_name: { type: 'text', placeholder: 'Host name' },
      guest_count: { type: 'number', default: 2 },
      audience_participation: { type: 'select', options: ['yes', 'no', 'limited'], default: 'no' },
    },
    research_modules: ['topic_research', 'guest_research', 'current_events', 'trending_topics'],
    production_item_types: ['segment', 'interview', 'panel_discussion', 'audience_qa'],
    generated_assets: ['show_rundown', 'intro_script', 'interview_questions', 'talking_points', 'social_caption'],
    default_templates: ['talk_show_graphics', 'guest_cards'],
    export_options: ['pdf', 'markdown', 'teleprompter', 'html'],
  },
  livestream: {
    profile_type: 'livestream',
    profile_name: 'Livestream',
    description: 'Live streaming content, webinars, and live events',
    icon: 'video',
    color: 'berna-orange',
    item_type_label: 'Segment',
    item_type_label_plural: 'Segments',
    research_label: 'Content Research',
    rundown_label: 'Stream Rundown',
    setup_fields: {
      stream_length: { type: 'text', default: '60 Minutes' },
      platform: { type: 'text', placeholder: 'e.g., YouTube, Twitch, Facebook' },
      interactive_elements: { type: 'text', placeholder: 'e.g., Chat, Polls, Q&A' },
    },
    research_modules: ['topic_research', 'audience_questions', 'trending_topics', 'product_info'],
    production_item_types: ['segment', 'demo', 'qa', 'announcement'],
    generated_assets: ['stream_rundown', 'intro_script', 'talking_points', 'chat_prompts', 'social_caption'],
    default_templates: ['livestream_graphics', 'overlay_templates'],
    export_options: ['pdf', 'markdown', 'html'],
  },
  church_service: {
    profile_type: 'church_service',
    profile_name: 'Church Service',
    description: 'Worship services, sermons, and religious content',
    icon: 'church',
    color: 'berna-emerald',
    item_type_label: 'Element',
    item_type_label_plural: 'Service Elements',
    research_label: 'Service Research',
    rundown_label: 'Service Rundown',
    setup_fields: {
      service_type: { type: 'select', options: ['sunday', 'wednesday', 'special', 'holiday'], default: 'sunday' },
      pastor_name: { type: 'text', placeholder: 'Pastor/Minister name' },
      sermon_topic: { type: 'text', placeholder: 'Sermon topic or theme' },
      scripture_focus: { type: 'text', placeholder: 'Primary scripture passage' },
    },
    research_modules: ['scripture', 'sermon_topics', 'prayer_topics', 'worship_songs', 'announcements'],
    production_item_types: ['scripture', 'sermon_point', 'prayer', 'announcement', 'worship_song'],
    generated_assets: ['service_rundown', 'sermon_outline', 'slide_text', 'bulletin_content', 'social_caption'],
    default_templates: ['slide_templates', 'bulletin_templates'],
    export_options: ['pdf', 'markdown', 'html', 'teleprompter'],
  },
  educational_content: {
    profile_type: 'educational_content',
    profile_name: 'Educational Content',
    description: 'Lessons, tutorials, and educational videos',
    icon: 'graduation-cap',
    color: 'berna-navy',
    item_type_label: 'Lesson',
    item_type_label_plural: 'Lessons',
    research_label: 'Lesson Research',
    rundown_label: 'Lesson Plan',
    setup_fields: {
      subject: { type: 'text', placeholder: 'e.g., Math, Science, History' },
      grade_level: { type: 'text', placeholder: 'e.g., Elementary, High School, College' },
      learning_objectives: { type: 'textarea', placeholder: 'What students should learn' },
      duration: { type: 'text', default: '30 Minutes' },
    },
    research_modules: ['lesson_content', 'examples', 'key_terms', 'quiz_questions', 'student_handouts'],
    production_item_types: ['lesson', 'topic', 'example', 'key_term', 'quiz_question'],
    generated_assets: ['lesson_plan', 'script', 'slide_content', 'quiz', 'handouts', 'social_caption'],
    default_templates: ['lesson_templates', 'slide_templates'],
    export_options: ['pdf', 'docx', 'markdown', 'html', 'teleprompter'],
  },
  business_briefing: {
    profile_type: 'business_briefing',
    profile_name: 'Business Briefing',
    description: 'Business updates, market reports, and corporate communications',
    icon: 'briefcase',
    color: 'berna-purple',
    item_type_label: 'Update',
    item_type_label_plural: 'Updates',
    research_label: 'Business Research',
    rundown_label: 'Briefing Rundown',
    setup_fields: {
      briefing_type: { type: 'select', options: ['daily', 'weekly', 'monthly', 'quarterly'], default: 'daily' },
      audience: { type: 'text', placeholder: 'e.g., Executives, Sales Team, All Staff' },
      focus_areas: { type: 'text', placeholder: 'e.g., Sales, Marketing, Operations' },
    },
    research_modules: ['market_news', 'company_news', 'industry_trends', 'financial_reports', 'competitor_analysis'],
    production_item_types: ['market_update', 'company_news', 'industry_trend', 'financial_highlight'],
    generated_assets: ['briefing_script', 'slide_deck', 'executive_summary', 'talking_points', 'social_caption'],
    default_templates: ['business_graphics', 'chart_templates'],
    export_options: ['pdf', 'docx', 'markdown', 'html', 'teleprompter'],
  },
  gaming_stream: {
    profile_type: 'gaming_stream',
    profile_name: 'Gaming Stream',
    description: 'Gaming content, gameplay streams, and gaming commentary',
    icon: 'gamepad-2',
    color: 'berna-orange',
    item_type_label: 'Game',
    item_type_label_plural: 'Games',
    research_label: 'Gaming Research',
    rundown_label: 'Stream Plan',
    setup_fields: {
      game_title: { type: 'text', placeholder: 'Main game to play' },
      stream_length: { type: 'text', default: '120 Minutes' },
      platform: { type: 'text', placeholder: 'e.g., Twitch, YouTube Gaming' },
      interaction_level: { type: 'select', options: ['high', 'medium', 'low'], default: 'high' },
    },
    research_modules: ['game_info', 'gaming_news', 'viewer_questions', 'game_tips', 'esports_news'],
    production_item_types: ['game_segment', 'review', 'tip', 'news', 'viewer_interaction'],
    generated_assets: ['stream_plan', 'intro_script', 'talking_points', 'chat_prompts', 'social_caption', 'thumbnail'],
    default_templates: ['gaming_overlays', 'alert_templates'],
    export_options: ['pdf', 'markdown', 'html'],
  },
  radio_show: {
    profile_type: 'radio_show',
    profile_name: 'Radio Show',
    description: 'Traditional radio broadcasting and audio programs',
    icon: 'radio',
    color: 'berna-purple',
    item_type_label: 'Segment',
    item_type_label_plural: 'Segments',
    research_label: 'Show Research',
    rundown_label: 'Show Clock',
    setup_fields: {
      show_length: { type: 'text', default: '60 Minutes' },
      format: { type: 'select', options: ['talk', 'music', 'mixed', 'news'], default: 'mixed' },
      co_hosts: { type: 'text', placeholder: 'Co-host names' },
    },
    research_modules: ['topic_research', 'music_playlist', 'news_stories', 'traffic_weather', 'advertisers'],
    production_item_types: ['segment', 'news', 'traffic', 'weather', 'ad_read'],
    generated_assets: ['show_clock', 'script', 'ad_reads', 'news_copy', 'social_caption'],
    default_templates: ['radio_graphics', 'sponsor_graphics'],
    export_options: ['pdf', 'markdown', 'text', 'teleprompter'],
  },
  custom: {
    profile_type: 'custom',
    profile_name: 'Custom Production',
    description: 'Define your own production workflow',
    icon: 'settings',
    color: 'berna-purple',
    item_type_label: 'Item',
    item_type_label_plural: 'Items',
    research_label: 'Research',
    rundown_label: 'Rundown',
    setup_fields: {
      custom_field_1: { type: 'text', placeholder: 'Custom field 1' },
      custom_field_2: { type: 'text', placeholder: 'Custom field 2' },
    },
    research_modules: ['custom'],
    production_item_types: ['custom'],
    generated_assets: ['custom'],
    default_templates: [],
    export_options: ['pdf', 'markdown', 'html'],
  },
};

// Helper function to get profile config by type or ID
export function getProfileConfig(profileTypeOrId, profilesList = []) {
  // If it's a profile object from database
  if (profileTypeOrId && typeof profileTypeOrId === 'object') {
    const dbProfile = profileTypeOrId;
    const baseConfig = PRODUCTION_PROFILES[dbProfile.profile_type] || PRODUCTION_PROFILES.custom;
    return {
      ...baseConfig,
      ...dbProfile, // Override with custom fields from DB
      id: dbProfile.id,
    };
  }
  
  // If it's a string (type or ID)
  if (typeof profileTypeOrId === 'string') {
    // Check if it's a profile type
    if (PRODUCTION_PROFILES[profileTypeOrId]) {
      return PRODUCTION_PROFILES[profileTypeOrId];
    }
    // Check if it's an ID from the profiles list
    const dbProfile = profilesList.find(p => p.id === profileTypeOrId);
    if (dbProfile) {
      const baseConfig = PRODUCTION_PROFILES[dbProfile.profile_type] || PRODUCTION_PROFILES.custom;
      return {
        ...baseConfig,
        ...dbProfile,
        id: dbProfile.id,
      };
    }
  }
  
  // Default to news
  return PRODUCTION_PROFILES.news;
}

// Helper to get user-facing labels
export function getProfileLabels(profileConfig) {
  return {
    item: profileConfig.item_type_label || 'Item',
    items: profileConfig.item_type_label_plural || 'Items',
    research: profileConfig.research_label || 'Research',
    rundown: profileConfig.rundown_label || 'Rundown',
  };
}