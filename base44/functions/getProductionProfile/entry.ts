import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile_type } = await req.json();

    if (!profile_type) {
      return Response.json({ error: 'profile_type required' }, { status: 400 });
    }

    // Get production profile
    const profiles = await base44.entities.ProductionProfile.filter({
      profile_type: profile_type
    });

    if (profiles.length === 0) {
      // Create default profile based on type
      const defaultProfile = await createDefaultProfile(base44, profile_type);
      return Response.json({ profile: defaultProfile });
    }

    // Get research modules for this profile
    const researchModules = await base44.entities.ResearchModule.filter({
      profile_type: profile_type,
      is_active: true
    });

    // Get production modules
    const productionModules = await base44.entities.ProductionModule.filter({
      profile_type: profile_type,
      is_active: true
    });

    return Response.json({
      profile: profiles[0],
      research_modules: researchModules,
      production_modules: productionModules
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createDefaultProfile(base44, profile_type) {
  const defaults = {
    news: {
      profile_name: 'News Production',
      description: 'Create news briefings and production packages',
      research_sources: 'major_news,government,press_releases,business_finance,technology,science,agriculture,local_news,creator_economy,small_business',
      output_assets: 'story_cards,teleprompter_scripts,lower_thirds,ai_images,headline_graphics,talking_points,fact_check_notes,source_attribution,social_captions,broll_suggestions'
    },
    podcast: {
      profile_name: 'Podcast Episode',
      description: 'Prepare podcast episodes',
      research_sources: 'topic_research,guest_research,industry_news,audience_questions,trending_discussions,user_links',
      output_assets: 'episode_outline,intro_script,segment_breakdown,host_talking_points,guest_questions,ad_reads,outro_script,episode_title_ideas,show_notes,social_captions,thumbnail'
    },
    radio: {
      profile_name: 'Radio Show',
      description: 'Prepare radio shows and live audio broadcasts',
      research_sources: 'music_charts,weather,local_events,news_headlines,artist_updates,community_announcements,traffic',
      output_assets: 'show_clock,segment_rundown,host_banter,playlist,station_breaks,sponsor_reads,caller_prompts,trivia,transition_scripts,social_captions'
    },
    music: {
      profile_name: 'Music Show',
      description: 'Build music-focused productions',
      research_sources: 'music_charts,new_releases,artist_news,music_history,artist_birthdays,concert_announcements,genre_trends',
      output_assets: 'playlist,artist_facts,song_introductions,music_trivia,segment_scripts,transition_banter,lower_thirds,ai_images,social_captions'
    },
    cooking: {
      profile_name: 'Cooking Show',
      description: 'Prepare cooking shows, food videos, and recipe-based content',
      research_sources: 'recipes,ingredients,seasonal_foods,nutrition_facts,food_history,kitchen_tips,grocery',
      output_assets: 'recipe_cards,ingredient_list,shopping_list,cooking_rundown,host_script,food_facts,step_by_step_instructions,plating_notes,ai_food_images,social_captions'
    },
    sports: {
      profile_name: 'Sports Show',
      description: 'Prepare sports broadcasts, commentary, and recap shows',
      research_sources: 'scores,schedules,standings,player_stats,team_news,injury_reports,historical_matchups',
      output_assets: 'game_recap,segment_rundown,talking_points,player_profiles,debate_questions,prediction_segments,lower_thirds,ai_graphics,social_captions'
    },
    talk: {
      profile_name: 'Talk Show',
      description: 'Prepare interview-based and discussion-based productions',
      research_sources: 'guest_background,trending_topics,audience_questions,industry_research,current_events',
      output_assets: 'episode_outline,guest_intro,interview_questions,segment_transitions,monologue,audience_prompts,social_captions,ai_images,lower_thirds'
    },
    livestream: {
      profile_name: 'Livestream',
      description: 'Prepare creator livestreams',
      research_sources: 'trending_topics,platform_trends,audience_prompts,game_event_info,community_updates',
      output_assets: 'stream_outline,opening_script,segment_list,chat_prompts,poll_questions,donation_prompts,sponsor_reads,closing_script,thumbnail,social_captions'
    },
    church: {
      profile_name: 'Church Service',
      description: 'Prepare church, sermon, and ministry content',
      research_sources: 'scripture,sermon_topic,historical_context,devotionals,announcements,prayer_topics',
      output_assets: 'sermon_outline,scripture_references,discussion_questions,prayer_points,announcement_script,service_rundown,slide_text,social_captions,ai_graphics'
    },
    educational: {
      profile_name: 'Educational Content',
      description: 'Prepare lessons, tutorials, lectures, and educational videos',
      research_sources: 'topic_research,learning_objectives,reference_materials,examples,exercises',
      output_assets: 'lesson_plan,teaching_script,learning_objectives,key_terms,examples,quiz_questions,slide_outline,student_handout,social_captions'
    },
    business: {
      profile_name: 'Business Briefing',
      description: 'Prepare corporate updates, market briefings, team presentations',
      research_sources: 'industry_news,market_data,company_updates,financial_reports,competitor_analysis',
      output_assets: 'briefing_outline,executive_summary,key_metrics,action_items,presentation_slides,meeting_notes,follow_up_tasks,social_captions'
    },
    gaming: {
      profile_name: 'Gaming Stream',
      description: 'Prepare gaming content and streams',
      research_sources: 'game_info,patch_notes,esports_news,streaming_trends,community_discussions',
      output_assets: 'stream_outline,game_notes,commentary_tips,viewer_prompts,highlight_moments,thumbnail,social_captions'
    },
    custom: {
      profile_name: 'Custom Production',
      description: 'Define your own workflow',
      research_sources: 'custom',
      output_assets: 'custom'
    }
  };

  const config = defaults[profile_type] || defaults.custom;

  const profile = await base44.entities.ProductionProfile.create({
    profile_name: config.profile_name,
    profile_type: profile_type,
    description: config.description,
    research_sources: config.research_sources,
    output_assets: config.output_assets,
    is_default: profile_type === 'news',
    is_active: true
  });

  return profile;
}