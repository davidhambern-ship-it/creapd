import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function parseRuntimeSeconds(str) {
  if (!str) return 60;
  if (typeof str === 'number') return str;
  if (str.includes(':')) {
    const [m, s] = str.split(':').map(Number);
    return m * 60 + (s || 0);
  }
  const num = parseInt(str);
  return isNaN(num) ? 60 : num * 60;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { package_ids } = body;

    if (!package_ids || !Array.isArray(package_ids) || package_ids.length === 0) {
      return Response.json({ error: 'package_ids array is required' }, { status: 400 });
    }

    if (package_ids.length < 5) {
      return Response.json({ error: 'The APD requires a minimum of 5 approved packages to generate a presentation.' }, { status: 400 });
    }

    // Fetch all requested packages — preserve the order of package_ids so the rundown sequence is respected
    const allPackages = await base44.asServiceRole.entities.ProductionPackage.list('-created_date', 200);
    const packages = package_ids
      .map(id => allPackages.find(p => p.id === id))
      .filter(Boolean);

    if (packages.length < 5) {
      return Response.json({ error: 'At least 5 approved packages are required.' }, { status: 400 });
    }

    // Fetch associated articles
    const articleIds = [...new Set(packages.map(p => p.article_id).filter(Boolean))];
    const allArticles = await base44.asServiceRole.entities.Article.list('-created_date', 200);
    const articleMap = {};
    allArticles.forEach(a => { if (articleIds.includes(a.id)) articleMap[a.id] = a; });

    // Fetch VoicePackages for precise timing — each package's voiceover duration = slide duration
    const voicePackageIds = [...new Set(packages.map(p => p.voice_package_id).filter(Boolean))];
    let voicePackages = [];
    if (voicePackageIds.length > 0) {
      const allVPs = await base44.asServiceRole.entities.VoicePackage.list('-created_date', 200);
      voicePackages = allVPs.filter(vp => voicePackageIds.includes(vp.id));
    }
    const vpMap = {};
    voicePackages.forEach(vp => { vpMap[vp.id] = vp; });

    // Build per-slide timing: cumulative voice_start_time / voice_end_time across the presentation
    let cumulativeTime = 0;
    const packageSummaries = packages.map((pkg, idx) => {
      const article = articleMap[pkg.article_id] || {};
      const vp = vpMap[pkg.voice_package_id] || null;
      const durationSeconds = vp?.total_duration_seconds || parseRuntimeSeconds(pkg.estimated_runtime);
      const voiceStartTime = cumulativeTime;
      const voiceEndTime = cumulativeTime + durationSeconds;
      cumulativeTime = voiceEndTime;

      // Sentence timeline gives the LLM precise speech segments to sync visual elements to
      let sentenceTimeline = null;
      if (vp?.sentence_timeline) {
        try {
          const parsed = JSON.parse(vp.sentence_timeline);
          sentenceTimeline = (parsed || []).slice(0, 30).map(s => ({
            text: (s.sentence_text || '').substring(0, 120),
            start_time: s.start_time ?? 0,
            end_time: s.end_time ?? 0,
          }));
        } catch {}
      }

      return {
        index: idx + 1,
        package_id: pkg.id,
        article_title: article.title || 'Untitled',
        category: article.category || 'general',
        // Core script content
        story_summary: pkg.story_summary || '',
        teleprompter_script: pkg.teleprompter_script || pkg.show_script || '',
        talking_points: pkg.talking_points || '',
        lower_third_text: pkg.lower_third_text || '',
        headline_suggestions: pkg.headline_suggestions || '',
        // Visual / media prompts
        image_prompt: pkg.image_prompt || '',
        thumbnail_prompt: pkg.thumbnail_prompt || '',
        visual_suggestions: pkg.visual_suggestions || '',
        broll_suggestions: pkg.broll_suggestions || '',
        // Social / marketing
        social_caption: pkg.social_caption || '',
        // Fact verification
        fact_check_notes: pkg.fact_check_notes || '',
        // Domain-specific content
        artist_facts: pkg.artist_facts || '',
        playlist_segment: pkg.playlist_segment || '',
        cooking_notes: pkg.cooking_notes || '',
        ingredient_list: pkg.ingredient_list || '',
        scripture_references: pkg.scripture_references || '',
        reflection_notes: pkg.reflection_notes || '',
        // Production metadata
        producer_notes: pkg.producer_notes || '',
        tone: pkg.tone || 'professional',
        reading_style: pkg.reading_style || '',
        audience: pkg.audience || '',
        target_runtime: pkg.target_runtime || '',
        // Existing generated media
        generated_image_url: pkg.generated_image_url || '',
        generated_thumbnail_url: pkg.generated_thumbnail_url || '',
        generated_video_url: pkg.generated_video_url || '',
        generated_audio_url: pkg.generated_audio_url || '',
        // Translation
        translation_language: pkg.translation_language || '',
        translated_script: pkg.translated_script || '',
        translated_caption: pkg.translated_caption || '',
        // Voiceover timing — this IS the slide duration
        has_voiceover: !!vp,
        slide_duration_seconds: durationSeconds,
        voice_start_time: voiceStartTime,
        voice_end_time: voiceEndTime,
        sentence_timeline: sentenceTimeline,
      };
    });

    const totalPresentationDuration = cumulativeTime;

    const llmPrompt = `You are the AI Presentation Director (APD) for a news production system.

You are given ${packages.length} approved news story packages. Each package represents ONE slide in the presentation. Each slide's duration is determined by its voiceover audio — you MUST use the provided slide_duration_seconds, voice_start_time, and voice_end_time to time every visual element.

CRITICAL TIMING RULES:
- Each text_element and image_element MUST have start_time and end_time values expressed in SECONDS relative to the start of THIS scene (0 = beginning of the slide, NOT the beginning of the presentation).
- start_time must be >= 0 and end_time must be <= slide_duration_seconds.
- Use the sentence_timeline (when available) to sync on-screen text with the spoken words — show text overlays as the narrator reaches that part of the script.
- Lower thirds and headlines should appear shortly after the voiceover starts and stay for most of the slide.
- Image elements should timed to appear when the narrator discusses the relevant content.
- CRITICAL — FACT CHECK: Each package includes fact_check_notes. You MUST use these notes to verify that every on-screen text element (headlines, lower thirds, text overlays, quote cards) is factually accurate. If the fact check notes correct or clarify any claim from the script, the on-screen text must reflect the corrected/verified version — never show an unverified claim. If a statistic, date, name, or figure appears in the script, cross-reference it against the fact_check_notes before displaying it on screen. If the fact check notes flag something as uncertain, either omit it from on-screen text or add a "source: pending verification" qualifier.

For each story package, create one presentation scene. For each scene, provide:
1. package_id: The package_id from the input
2. slide_title: A concise on-screen title for this story's slide
3. beat_type: One of [title_reveal, host_intro, emphasis_text, scripture_passage, image_scene, icon_highlight, motion_graphic, quote_card, question_prompt, transition, closing_momentum]
4. visual_theme: Overall visual mood/theme for this scene
5. background_prompt: An AI image generation prompt for the scene background
6. text_elements: JSON array of {text, element_type, start_time, end_time, animation_in, animation_out, position, priority, purpose} — on-screen text overlays timed to the voiceover
7. image_elements: JSON array of {prompt, start_time, end_time, animation_in, animation_out, position, priority, purpose} — image/graphic elements timed to the voiceover
8. animation_plan: JSON describing the overall animation strategy for this scene
9. transition_plan: Transition effect to the next scene (fade, slide_left, zoom, dissolve, none)
10. speaker_notes: Notes for the host/presenter
11. production_notes: Technical production notes
12. ai_reasoning: Explanation of why each visual element was chosen and how timing syncs to the voiceover

Here are the story packages with voiceover timing data:

${JSON.stringify(packageSummaries, null, 2)}

Total presentation duration: ${totalPresentationDuration} seconds.

Return a JSON object with:
{
  "scenes": [
    {
      "package_id": "<package_id>",
      "slide_title": "...",
      "beat_type": "...",
      "visual_theme": "...",
      "background_prompt": "...",
      "text_elements": "[...]",
      "image_elements": "[...]",
      "animation_plan": "{...}",
      "transition_plan": "...",
      "speaker_notes": "...",
      "production_notes": "...",
      "ai_reasoning": "..."
    }
  ]
}`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          scenes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                package_id: { type: "string" },
                slide_title: { type: "string" },
                beat_type: { type: "string" },
                visual_theme: { type: "string" },
                background_prompt: { type: "string" },
                text_elements: { type: "string", description: "JSON array of {text, element_type, start_time, end_time, animation_in, animation_out, position, priority, purpose} where start_time/end_time are in seconds relative to scene start" },
                image_elements: { type: "string", description: "JSON array of {prompt, start_time, end_time, animation_in, animation_out, position, priority, purpose} where start_time/end_time are in seconds relative to scene start" },
                animation_plan: { type: "string" },
                transition_plan: { type: "string" },
                speaker_notes: { type: "string" },
                production_notes: { type: "string" },
                ai_reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    const scenes = llmResponse.scenes || [];

    // Delete any existing scenes for these packages so we start fresh (regeneration replaces, not appends)
    const existingConfigIds = packages.map(p => p.id);
    for (const configId of existingConfigIds) {
      try {
        await base44.asServiceRole.entities.PresentationScene.deleteMany({ configuration_id: configId });
      } catch (delErr) {
        console.error(`Failed to clear old scenes for ${configId}:`, delErr.message);
      }
    }

    // Create PresentationScene records — each slide MUST be created successfully before the presentation is complete
    const createdScenes = [];
    const failedSlides = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const pkg = packages.find(p => p.id === scene.package_id) || packages[i];
      if (!pkg) {
        failedSlides.push({ index: i, reason: 'No matching package', package_id: scene.package_id });
        continue;
      }

      try {
        const summary = packageSummaries[i];
        const created = await base44.asServiceRole.entities.PresentationScene.create({
          configuration_id: pkg.id,
          section_id: pkg.article_id || '',
          section_order: i,
          order: i,
          slide_id: `slide_${Date.now()}_${i}`,
          slide_title: scene.slide_title || summary?.article_title || `Story ${i + 1}`,
          beat_type: scene.beat_type || 'emphasis_text',
          voice_start_time: summary?.voice_start_time ?? null,
          voice_end_time: summary?.voice_end_time ?? null,
          duration_seconds: summary?.slide_duration_seconds ?? null,
          visual_theme: scene.visual_theme || '',
          background_prompt: scene.background_prompt || pkg.image_prompt || '',
          text_elements: scene.text_elements || '[]',
          image_elements: scene.image_elements || '[]',
          animation_plan: scene.animation_plan || '{}',
          transition_plan: scene.transition_plan || 'fade',
          speaker_notes: scene.speaker_notes || '',
          production_notes: scene.production_notes || '',
          ai_reasoning: scene.ai_reasoning || '',
          generated_image_url: pkg.generated_image_url || '',
          status: 'generated'
        });
        createdScenes.push(created);
      } catch (createErr) {
        console.error(`Failed to create scene for package ${pkg.id}:`, createErr.message);
        failedSlides.push({ index: i, reason: createErr.message, package_id: pkg.id });
      }
    }

    // Verify ALL slides were created before declaring the presentation complete
    if (failedSlides.length > 0) {
      return Response.json({
        success: false,
        error: `Presentation incomplete: ${failedSlides.length} of ${packages.length} slides failed to create.`,
        scenes_created: createdScenes.length,
        failed_slides: failedSlides
      }, { status: 500 });
    }

    // ==========================================================
    // STEP 2: CREATE UNIFIED STORIES PRESENTATION (Database-First Architecture)
    // Create StoriesPresentation + StorySlide + SlideElement records so the
    // unified Editor can open and edit this presentation alongside all other
    // production profiles.
    // ==========================================================
    const ppId = `PP-NEWS-${Date.now().toString(36).toUpperCase()}`;
    const presentationTitle = `News Presentation — ${new Date().toLocaleDateString()}`;
    let cumulativeStartMs = 0;
    const storySlideIds = [];

    const unifiedPresentation = await base44.asServiceRole.entities.StoriesPresentation.create({
      title: presentationTitle,
      production_profile: 'news',
      pp_id: ppId,
      story_slide_ids: JSON.stringify([]),
      story_package_ids: JSON.stringify(packages.map(p => p.id)),
      master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
      presentation_metadata: JSON.stringify({
        title: presentationTitle,
        production_profile: 'news',
        creator: user.full_name || user.email,
        creator_id: user.id,
        generation_timestamp: new Date().toISOString(),
        apd_version: '2.0',
        presentation_version: 1,
      }),
      playback_settings: JSON.stringify({
        resolution: '1920x1080',
        aspect_ratio: '16:9',
        frame_rate: 30,
        playback_mode: 'interactive',
        transition_defaults: 'fade',
        motion_defaults: 'subtle',
        export_options: ['mp4'],
        theme_version: '1.0',
      }),
      presentation_version: 1,
      status: 'generating',
      producer_id: user.id,
      qa_scores: JSON.stringify({}),
      confidence_score: 0,
      qa_result: 'pending',
      showcase_status: 'none',
      total_runtime_ms: 0,
      story_count: packages.length,
    });

    const masterTimelineEvents = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const pkg = packages[i];
      const summary = packageSummaries[i];
      const slideDurationMs = Math.round((summary?.slide_duration_seconds || 30) * 1000);

      // Parse text_elements and image_elements JSON strings from the scene
      let textEls = [];
      let imageEls = [];
      try { textEls = JSON.parse(scene.text_elements || '[]'); } catch {}
      try { imageEls = JSON.parse(scene.image_elements || '[]'); } catch {}

      // Create the StorySlide record
      const slide = await base44.asServiceRole.entities.StorySlide.create({
        stories_presentation_id: unifiedPresentation.id,
        story_package_id: pkg.id,
        story_order: i,
        slide_number: i + 1,
        slide_type: i === 0 ? 'title_slide' : (i === scenes.length - 1 ? 'closing_slide' : 'content_slide'),
        title: scene.slide_title || summary?.article_title || `Story ${i + 1}`,
        body_text: pkg.story_summary || '',
        speaker_notes: scene.speaker_notes || '',
        transition: scene.transition_plan || 'fade',
        slide_start_ms: cumulativeStartMs,
        duration_ms: slideDurationMs,
        slide_timeline: JSON.stringify({
          slide_start_ms: cumulativeStartMs,
          slide_end_ms: cumulativeStartMs + slideDurationMs,
          slide_duration_ms: slideDurationMs,
          voice_audio_url: summary?.has_voiceover ? (vpMap[pkg.voice_package_id]?.voice_audio_url || '') : '',
        }),
        slide_metadata: JSON.stringify({
          headline: scene.slide_title || summary?.article_title || `Story ${i + 1}`,
          story_summary: pkg.story_summary || '',
          duration_ms: slideDurationMs,
          scene_count: 1,
          voice_package_reference: pkg.voice_package_id || null,
        }),
        status: 'generated',
        version: 1,
      });

      storySlideIds.push(slide.id);
      masterTimelineEvents.push({
        event_type: 'slide_start',
        slide_id: slide.id,
        start_time: cumulativeStartMs,
        end_time: cumulativeStartMs + slideDurationMs,
      });

      // ── Create SlideElement records for text elements ──
      const FONT_MAP_NEWS = {
        'font-heading': 'Poppins, sans-serif', 'font-body': 'Inter, sans-serif',
        'font-display': 'Oswald, sans-serif', 'font-mono': '"JetBrains Mono", monospace',
        'font-condensed': 'Archivo, sans-serif', 'font-serif': '"Playfair Display", serif',
      };
      const COLOR_MAP_NEWS = {
        primary: 'hsl(270 80% 65%)', accent: 'hsl(25 95% 60%)', emerald: 'hsl(152 60% 50%)',
        cyan: 'hsl(190 80% 55%)', gold: 'hsl(45 95% 55%)', rose: 'hsl(300 80% 65%)',
        white: 'hsl(0 0% 95%)', muted: 'hsl(220 10% 65%)', crimson: 'hsl(0 72% 55%)',
      };
      const TYPE_MAP_NEWS = {
        headline: { type: 'text', w: 800, h: 100, fontSize: 48, font: 'font-heading' },
        body_text: { type: 'text', w: 900, h: 200, fontSize: 24, font: 'font-body' },
        lower_third: { type: 'lower_third', w: 900, h: 60, fontSize: 20, font: 'font-condensed' },
        statistic: { type: 'text', w: 600, h: 150, fontSize: 72, font: 'font-display' },
        quote: { type: 'text', w: 700, h: 150, fontSize: 28, font: 'font-serif' },
        caption: { type: 'caption', w: 600, h: 40, fontSize: 18, font: 'font-body' },
        talking_point_card: { type: 'text', w: 500, h: 120, fontSize: 22, font: 'font-body' },
        default: { type: 'text', w: 600, h: 100, fontSize: 20, font: 'font-body' },
      };

      let elIdx = 0;
      for (const te of textEls) {
        const elemType = te.element_type || 'body_text';
        const config = TYPE_MAP_NEWS[elemType] || TYPE_MAP_NEWS.default;
        const startMs = Math.round((te.start_time || 0) * 1000);
        const endMs = Math.round((te.end_time || slideDurationMs / 1000) * 1000);
        const animType = te.animation_in || 'fade_in';
        const exitType = te.animation_out || null;
        const colorTheme = te.priority === 'high' ? 'accent' : elemType === 'headline' ? 'primary' : 'white';
        const colorVal = COLOR_MAP_NEWS[colorTheme] || COLOR_MAP_NEWS.white;

        // Position by element type — vertical layout
        const pos = (() => {
          if (elemType === 'lower_third') return { x: 190, y: 640, w: config.w, h: config.h };
          if (elemType === 'caption') return { x: 340, y: 670, w: config.w, h: config.h };
          if (elemType === 'headline') return { x: 240, y: 40 + elIdx * 120, w: config.w, h: config.h };
          return { x: 190, y: 160 + elIdx * 120, w: config.w, h: config.h };
        })();

        try {
          await base44.asServiceRole.entities.SlideElement.create({
            slide_id: slide.id,
            presentation_id: unifiedPresentation.id,
            pp_id: ppId,
            type: config.type,
            content: te.text || '',
            x: pos.x, y: pos.y, width: pos.w, height: pos.h,
            rotation: 0, opacity: 100, z_index: elIdx + 1,
            style: JSON.stringify({
              fontSize: config.fontSize,
              fontFamily: FONT_MAP_NEWS[config.font] || 'Inter, sans-serif',
              color: colorVal,
              bold: elemType === 'headline' || elemType === 'statistic',
              italic: elemType === 'quote',
              align: 'center',
              role: elemType === 'headline' ? 'title' : elemType === 'body_text' ? 'body' : undefined,
              backgroundColor: 'transparent',
              borderRadius: 0,
              border: 'none',
              boxShadow: 'none',
              textShadow: 'none',
              filter: 'none',
              backdropFilter: 'none',
              padding: 12,
            }),
            // ── First-class fields ──
            entrance_type: animType,
            entrance_duration: 500,
            entrance_delay: startMs,
            exit_type: exitType,
            ambient_animation: 'none',
            visual_effects: JSON.stringify([]),
            color_theme: colorTheme,
            font_style: config.font,
            start_ms: startMs,
            end_ms: endMs,
            // Legacy JSON
            animation: JSON.stringify({ type: animType, duration_ms: 500, delay_ms: startMs }),
            timing: JSON.stringify({ start_ms: startMs, end_ms: endMs }),
            locked: false, visible: true, version: 1,
          });
          elIdx++;
        } catch {}
      }

      // ── Create SlideElement records for image elements ──
      for (const ie of imageEls) {
        const startMs = Math.round((ie.start_time || 0) * 1000);
        const endMs = Math.round((ie.end_time || slideDurationMs / 1000) * 1000);
        const animType = ie.animation_in || 'fade_in';
        const exitType = ie.animation_out || null;
        const pos = { x: 390, y: 160 + elIdx * 120, w: 500, h: 350 };

        try {
          await base44.asServiceRole.entities.SlideElement.create({
            slide_id: slide.id,
            presentation_id: unifiedPresentation.id,
            pp_id: ppId,
            type: 'image',
            content: pkg.generated_image_url || '',
            x: pos.x, y: pos.y, width: pos.w, height: pos.h,
            rotation: 0, opacity: 100, z_index: elIdx + 1,
            style: JSON.stringify({}),
            // ── First-class fields ──
            entrance_type: animType,
            entrance_duration: 500,
            entrance_delay: startMs,
            exit_type: exitType,
            ambient_animation: 'none',
            visual_effects: JSON.stringify([]),
            color_theme: 'white',
            font_style: 'font-body',
            start_ms: startMs,
            end_ms: endMs,
            // Legacy JSON
            animation: JSON.stringify({ type: animType, duration_ms: 500, delay_ms: startMs }),
            timing: JSON.stringify({ start_ms: startMs, end_ms: endMs }),
            locked: false, visible: true, version: 1,
          });
          elIdx++;
        } catch {}
      }

      cumulativeStartMs += slideDurationMs;
    }

    // ── Finalize the unified presentation ──
    const masterTimeline = {
      events: masterTimelineEvents,
      total_duration_ms: cumulativeStartMs,
      slide_count: storySlideIds.length,
    };

    const updatedUnified = await base44.asServiceRole.entities.StoriesPresentation.update(unifiedPresentation.id, {
      story_slide_ids: JSON.stringify(storySlideIds),
      slide_order: JSON.stringify(storySlideIds),
      master_timeline: JSON.stringify(masterTimeline),
      presentation_metadata: JSON.stringify({
        title: presentationTitle,
        production_profile: 'news',
        creator: user.full_name || user.email,
        creator_id: user.id,
        generation_timestamp: new Date().toISOString(),
        apd_version: '2.0',
        presentation_version: 1,
        runtime_ms: cumulativeStartMs,
        story_count: storySlideIds.length,
      }),
      total_runtime_ms: cumulativeStartMs,
      status: 'generated',
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: `Generated ${createdScenes.length} presentation scenes and ${storySlideIds.length} unified slides from ${packages.length} approved packages.`,
      scenes_created: createdScenes.length,
      scene_ids: createdScenes.map(s => s.id),
      presentation_id: unifiedPresentation.id,
      story_slide_ids: storySlideIds,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});