import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = [
      {
        profile_name: 'News Production',
        profile_type: 'news',
        description: 'Create news briefings and production packages with stories, scripts, and AI graphics',
        icon: 'newspaper',
        color: 'berna-purple',
        item_type_label: 'Story',
        item_type_label_plural: 'Stories',
        research_modules: 'major_news,government,press_releases,business_finance,technology,science,agriculture,local_news,creator_economy,small_business',
        production_modules: 'story_cards,teleprompter_script,lower_thirds,ai_images,headline_graphics,talking_points,fact_check_notes,social_captions,broll_suggestions',
        output_modules: 'full_package,teleprompter_script,pdf,docx,markdown,html',
        default_templates: 'news_story_card,news_lower_third,news_headline',
        ai_preferences: '{"model":"automatic","image_style":"photo_realistic","tone":"professional"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 1
      },
      {
        profile_name: 'Podcast',
        profile_type: 'podcast',
        description: 'Prepare podcast episodes with outlines, talking points, and show notes',
        icon: 'mic',
        color: 'berna-orange',
        item_type_label: 'Segment',
        item_type_label_plural: 'Segments',
        research_modules: 'topic_research,guest_research,industry_news,audience_questions,trending_discussions,user_links',
        production_modules: 'episode_outline,intro_script,segment_breakdown,talking_points,guest_questions,ad_reads,outro_script,title_ideas,show_notes,social_captions,thumbnail',
        output_modules: 'full_package,episode_outline,show_notes,pdf,markdown',
        default_templates: 'podcast_outline,podcast_show_notes',
        ai_preferences: '{"model":"automatic","tone":"conversational","reading_style":"podcast"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"markdown"}',
        sort_order: 2
      },
      {
        profile_name: 'Radio Show',
        profile_type: 'radio_show',
        description: 'Prepare radio shows with show clocks, playlists, and host banter',
        icon: 'radio',
        color: 'berna-emerald',
        item_type_label: 'Segment',
        item_type_label_plural: 'Segments',
        research_modules: 'music_charts,weather,local_events,news_headlines,artist_updates,community_announcements,traffic',
        production_modules: 'show_clock,segment_rundown,host_banter,playlist,station_breaks,sponsor_reads,caller_prompts,trivia,transition_scripts,social_captions',
        output_modules: 'full_package,show_clock,rundown,pdf,text',
        default_templates: 'radio_clock,radio_rundown',
        ai_preferences: '{"model":"automatic","tone":"energetic","reading_style":"broadcast_news"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"text"}',
        sort_order: 3
      },
      {
        profile_name: 'Music Show',
        profile_type: 'music_show',
        description: 'Build music-focused productions with playlists, artist facts, and trivia',
        icon: 'music',
        color: 'berna-purple',
        item_type_label: 'Song',
        item_type_label_plural: 'Songs',
        research_modules: 'music_charts,new_releases,artist_news,music_history,artist_birthdays,concert_announcements,genre_trends',
        production_modules: 'playlist,artist_facts,song_introductions,music_trivia,segment_scripts,transition_banter,lower_thirds,ai_images,social_captions',
        output_modules: 'full_package,playlist,segment_scripts,pdf,markdown',
        default_templates: 'music_playlist,music_lower_third',
        ai_preferences: '{"model":"automatic","tone":"energetic","image_style":"artistic"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 4
      },
      {
        profile_name: 'Cooking Show',
        profile_type: 'cooking_show',
        description: 'Prepare cooking shows with recipe cards, ingredient lists, and host scripts',
        icon: 'chef-hat',
        color: 'berna-orange',
        item_type_label: 'Recipe',
        item_type_label_plural: 'Recipes',
        research_modules: 'recipes,ingredients,seasonal_foods,nutrition_facts,food_history,kitchen_tips,grocery_info',
        production_modules: 'recipe_cards,ingredient_list,shopping_list,cooking_rundown,host_script,food_facts,step_instructions,plating_notes,ai_images,social_captions',
        output_modules: 'full_package,recipe_card,shopping_list,pdf,docx',
        default_templates: 'cooking_recipe,cooking_rundown',
        ai_preferences: '{"model":"automatic","tone":"conversational","image_style":"food_photography"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 5
      },
      {
        profile_name: 'Sports Show',
        profile_type: 'sports_show',
        description: 'Prepare sports broadcasts with game recaps, stats, and commentary',
        icon: 'trophy',
        color: 'berna-emerald',
        item_type_label: 'Topic',
        item_type_label_plural: 'Topics',
        research_modules: 'scores,schedules,standings,player_stats,team_news,injury_reports,historical_matchups',
        production_modules: 'game_recap,segment_rundown,talking_points,player_profiles,debate_questions,predictions,lower_thirds,ai_graphics,social_captions',
        output_modules: 'full_package,rundown,talking_points,pdf,markdown',
        default_templates: 'sports_rundown,sports_lower_third',
        ai_preferences: '{"model":"automatic","tone":"energetic","reading_style":"broadcast_news"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 6
      },
      {
        profile_name: 'Talk Show',
        profile_type: 'talk_show',
        description: 'Prepare interview-based and discussion-based productions',
        icon: 'message-circle',
        color: 'berna-purple',
        item_type_label: 'Topic',
        item_type_label_plural: 'Topics',
        research_modules: 'guest_background,trending_topics,audience_questions,industry_research,current_events',
        production_modules: 'episode_outline,guest_intro,interview_questions,segment_transitions,monologue,audience_prompts,social_captions,ai_images,lower_thirds',
        output_modules: 'full_package,episode_outline,interview_questions,pdf,markdown',
        default_templates: 'talk_show_outline,talk_show_questions',
        ai_preferences: '{"model":"automatic","tone":"conversational","reading_style":"interview"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 7
      },
      {
        profile_name: 'Livestream',
        profile_type: 'livestream',
        description: 'Prepare creator livestreams with outlines, chat prompts, and engagement tools',
        icon: 'video',
        color: 'berna-orange',
        item_type_label: 'Segment',
        item_type_label_plural: 'Segments',
        research_modules: 'trending_topics,platform_trends,audience_prompts,game_event_info,community_updates',
        production_modules: 'stream_outline,opening_script,segment_list,chat_prompts,poll_questions,donation_prompts,sponsor_reads,closing_script,thumbnail,social_captions',
        output_modules: 'full_package,stream_outline,chat_prompts,pdf,text',
        default_templates: 'livestream_outline,livestream_prompts',
        ai_preferences: '{"model":"automatic","tone":"energetic","reading_style":"livestream"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"text"}',
        sort_order: 8
      },
      {
        profile_name: 'Church Service',
        profile_type: 'church_service',
        description: 'Prepare church, sermon, and ministry content with scripture and devotionals',
        icon: 'church',
        color: 'berna-emerald',
        item_type_label: 'Segment',
        item_type_label_plural: 'Segments',
        research_modules: 'scripture,sermon_topic_research,historical_context,devotionals,announcements,prayer_topics',
        production_modules: 'sermon_outline,scripture_references,discussion_questions,prayer_points,announcement_script,service_rundown,slide_text,social_captions,ai_graphics',
        output_modules: 'full_package,sermon_outline,service_rundown,pdf,docx',
        default_templates: 'sermon_outline,service_rundown',
        ai_preferences: '{"model":"automatic","tone":"inspirational","reading_style":"storytelling"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 9
      },
      {
        profile_name: 'Educational Content',
        profile_type: 'educational_content',
        description: 'Prepare lessons, tutorials, lectures, and educational videos',
        icon: 'graduation-cap',
        color: 'berna-purple',
        item_type_label: 'Lesson',
        item_type_label_plural: 'Lessons',
        research_modules: 'topic_research,learning_objectives,reference_materials,examples,exercises',
        production_modules: 'lesson_plan,teaching_script,learning_objectives,key_terms,examples,quiz_questions,slide_outline,student_handout,social_captions',
        output_modules: 'full_package,lesson_plan,slide_outline,pdf,docx,markdown',
        default_templates: 'lesson_plan,educational_outline',
        ai_preferences: '{"model":"automatic","tone":"educational","reading_style":"educational_presentation"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 10
      },
      {
        profile_name: 'Business Briefing',
        profile_type: 'business_briefing',
        description: 'Prepare corporate updates, market briefings, and team presentations',
        icon: 'briefcase',
        color: 'berna-orange',
        item_type_label: 'Topic',
        item_type_label_plural: 'Topics',
        research_modules: 'industry_news,company_updates,market_data,competitor_news,internal_notes',
        production_modules: 'executive_summary,presentation_outline,talking_points,slide_text,team_update_script,charts,ai_images,email_summary',
        output_modules: 'full_package,presentation_outline,email_summary,pdf,docx,html',
        default_templates: 'business_briefing,business_slides',
        ai_preferences: '{"model":"automatic","tone":"professional","reading_style":"corporate_communication"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"pdf"}',
        sort_order: 11
      },
      {
        profile_name: 'Gaming Stream',
        profile_type: 'gaming_stream',
        description: 'Prepare gaming streams, esports shows, and gaming commentary',
        icon: 'gamepad-2',
        color: 'berna-purple',
        item_type_label: 'Segment',
        item_type_label_plural: 'Segments',
        research_modules: 'game_updates,patch_notes,esports_news,developer_posts,community_trends,upcoming_releases',
        production_modules: 'stream_outline,game_update_summary,talking_points,segment_ideas,chat_prompts,challenge_ideas,ai_graphics,thumbnail,social_captions',
        output_modules: 'full_package,stream_outline,chat_prompts,pdf,text',
        default_templates: 'gaming_outline,gaming_prompts',
        ai_preferences: '{"model":"automatic","tone":"energetic","reading_style":"livestream"}',
        export_settings: '{"include_branding":true,"include_metadata":true,"format":"text"}',
        sort_order: 12
      },
    ];

    const existingProfiles = await base44.asServiceRole.entities.ProductionProfile.list();
    const existingTypes = new Set(existingProfiles.map(p => p.profile_type));

    let created = 0;
    for (const profile of profiles) {
      if (!existingTypes.has(profile.profile_type)) {
        await base44.asServiceRole.entities.ProductionProfile.create(profile);
        created++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Seeded ${created} production profiles`,
      created 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});