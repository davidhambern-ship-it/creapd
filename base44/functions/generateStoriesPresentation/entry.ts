import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════
// SCENE GRAPH RESPONSE SCHEMA (used by critique loop re-generation)
// ═══════════════════════════════════════════════════════════
const SCENE_GRAPH_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scene_id: { type: "string" },
          scene_order: { type: "number" },
          scene_type: { type: "string" },
          scene_purpose: { type: "string" },
          scene_start_time: { type: "number" },
          scene_end_time: { type: "number" },
          camera_behavior: { type: "string" },
          camera_target: { type: "string" },
          motion_intensity: { type: "string" },
          background_design: { type: "string" },
          transition_type: { type: "string" },
          layers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                layer_type: { type: "string" },
                z_order: { type: "number" },
                elements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      element_type: { type: "string" },
                      content: { type: "string" },
                      position_x: { type: "number" },
                      position_y: { type: "number" },
                      scale: { type: "number" },
                      opacity: { type: "number" },
                      entrance_animation: { type: "string" },
                      exit_animation: { type: "string" },
                      font_style: { type: "string" },
                      color_theme: { type: "string" },
                      visual_effects: { type: "array", items: { type: "string" } },
                      ambient_animation: { type: "string" },
                      start_time: { type: "number" },
                      end_time: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    decision_rationale: { type: "string" },
    confidence_score: { type: "number" }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { story_package_ids, production_profile, presentation_title, resolution, aspect_ratio, presentation_id: existing_presentation_id } = body;

    const screenResolution = resolution || '1920x1080';
    const screenAspectRatio = aspect_ratio || '16:9';

    if (!story_package_ids || !Array.isArray(story_package_ids) || story_package_ids.length === 0) {
      return Response.json({ error: 'At least one Story Package ID is required' }, { status: 400 });
    }
    if (!production_profile) {
      return Response.json({ error: 'Production Profile is required' }, { status: 400 });
    }

    // ==========================================================
    // REGENERATION: Load existing manually-edited elements for preservation
    // If presentation_id is provided, this is a regeneration. We load all
    // existing SlideElements and build a preservation map of elements the
    // producer has manually edited (version > 1 or qa_status === 'approved').
    // These overrides are merged into the new APD-generated elements.
    // ==========================================================
    const overrideMap = {}; // key: `${story_package_id}::${content}` → element fields
    let isRegeneration = false;
    if (existing_presentation_id) {
      isRegeneration = true;
      let existingSlides = [];
      try {
        existingSlides = await base44.asServiceRole.entities.StorySlide.filter(
          { stories_presentation_id: existing_presentation_id }, 'slide_number', 100
        );
      } catch {}
      for (const slide of existingSlides) {
        let existingEls = [];
        try {
          existingEls = await base44.asServiceRole.entities.SlideElement.filter({ slide_id: slide.id });
        } catch {}
        for (const el of (existingEls || [])) {
          if (el.qa_status === 'approved' || (el.version || 1) > 1) {
            const key = `${slide.story_package_id}::${(el.content || '').trim()}`;
            overrideMap[key] = {
              x: el.x, y: el.y, width: el.width, height: el.height,
              rotation: el.rotation, opacity: el.opacity, z_index: el.z_index,
              style: el.style,
              entrance_type: el.entrance_type, entrance_duration: el.entrance_duration,
              entrance_delay: el.entrance_delay, exit_type: el.exit_type,
              ambient_animation: el.ambient_animation, visual_effects: el.visual_effects,
              color_theme: el.color_theme, font_style: el.font_style,
              animation: el.animation,
              locked: el.locked, visible: el.visible,
              qa_status: el.qa_status, version: el.version,
            };
          }
        }
      }
    }

    // ==========================================================
    // STEP 1: VALIDATION STATE
    // ==========================================================
    const validationResults = [];
    const storyPackages = [];
    const voicePackages = [];

    for (const pkgId of story_package_ids) {
      const pkg = await base44.asServiceRole.entities.ProductionPackage.get(pkgId);
      if (!pkg) {
        validationResults.push({ package_id: pkgId, error: 'Story Package not found' });
        continue;
      }
      if (pkg.status !== 'approved' && pkg.status !== 'generated') {
        validationResults.push({ package_id: pkgId, error: `Story Package not approved (status: ${pkg.status})` });
        continue;
      }
      if (!pkg.voice_package_id) {
        validationResults.push({ package_id: pkgId, error: 'No Voice Package attached' });
        continue;
      }

      const vp = await base44.asServiceRole.entities.VoicePackage.get(pkg.voice_package_id);
      if (!vp) {
        validationResults.push({ package_id: pkgId, error: 'Voice Package not found' });
        continue;
      }
      if (vp.status !== 'generated' && vp.status !== 'regenerating') {
        validationResults.push({ package_id: pkgId, error: `Voice Package not ready (status: ${vp.status})` });
        continue;
      }

      storyPackages.push(pkg);
      voicePackages.push(vp);
    }

    if (storyPackages.length === 0) {
      return Response.json({
        error: 'Validation failed — no Story Packages passed validation',
        validation_results: validationResults
      }, { status: 422 });
    }

    // ==========================================================
    // STEP 2: CREATE OR UPDATE STORIES PRESENTATION
    // ==========================================================
    const title = presentation_title || `${production_profile.toUpperCase()} Presentation — ${new Date().toLocaleDateString()}`;

    let presentation;
    if (isRegeneration) {
      // Regeneration mode — update existing presentation, preserve manual overrides
      try {
        presentation = await base44.asServiceRole.entities.StoriesPresentation.get(existing_presentation_id);
      } catch {
        presentation = await base44.asServiceRole.entities.StoriesPresentation.update(existing_presentation_id, {
          title: presentation_title || title,
          status: 'generating',
        });
      }
      // Clean up old slides and elements (manual overrides already captured in overrideMap)
      let oldSlides = [];
      try {
        oldSlides = await base44.asServiceRole.entities.StorySlide.filter(
          { stories_presentation_id: existing_presentation_id }, 'slide_number', 100
        );
      } catch {}
      for (const oldSlide of oldSlides) {
        try {
          await base44.asServiceRole.entities.SlideElement.deleteMany({ slide_id: oldSlide.id });
        } catch {}
        try {
          await base44.asServiceRole.entities.StorySlide.delete(oldSlide.id);
        } catch {}
      }
      // Reset presentation state for regeneration
      presentation = await base44.asServiceRole.entities.StoriesPresentation.update(existing_presentation_id, {
        title: presentation_title || title,
        story_package_ids: JSON.stringify(storyPackages.map(p => p.id)),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        status: 'generating',
        presentation_metadata: JSON.stringify({
          title: presentation_title || title,
          production_profile,
          creator: user.full_name || user.email,
          creator_id: user.id,
          generation_timestamp: new Date().toISOString(),
          apd_version: '1.0',
          presentation_version: (presentation.presentation_version || 1) + 1,
          regenerated: true,
        }),
      });
    } else {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.create({
        title,
        production_profile,
        story_slide_ids: JSON.stringify([]),
        story_package_ids: JSON.stringify(storyPackages.map(p => p.id)),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        presentation_metadata: JSON.stringify({
          title,
          production_profile,
          creator: user.full_name || user.email,
          creator_id: user.id,
          generation_timestamp: new Date().toISOString(),
          apd_version: '1.0',
          presentation_version: 1
        }),
      playback_settings: JSON.stringify({
        resolution: screenResolution,
        aspect_ratio: screenAspectRatio,
        frame_rate: 30,
        playback_mode: 'interactive',
        transition_defaults: 'fade',
        motion_defaults: 'subtle',
        export_options: ['mp4'],
        theme_version: '1.0'
      }),
      opening_sequence: JSON.stringify({
        branding: 'CREAPD',
        production_profile,
        program_title: title,
        intro_animation: 'fade_in',
        theme: production_profile
      }),
      closing_sequence: JSON.stringify({
        branding: 'CREAPD',
        outro_animation: 'fade_out'
      }),
      presentation_version: 1,
      status: 'generating',
      producer_id: user.id,
      producer_metadata: JSON.stringify({
        review_state: 'pending',
        approval_status: 'pending',
        locked: false
      }),
      export_metadata: JSON.stringify({ export_status: 'none' }),
      qa_scores: JSON.stringify({}),
      confidence_score: 0,
      qa_result: 'pending',
      showcase_status: 'none',
      total_runtime_ms: 0,
      story_count: storyPackages.length
    });
    }

    // ==========================================================
    // STEP 3: GENERATE STORY SLIDES (one per Story Package)
    // ==========================================================
    const storySlideIds = [];
    let cumulativeStartMs = 0;
    const masterTimelineEvents = [];
    const directorLog = []; // Step 3: Cinematic Memory — tracks visual patterns across slides

    for (let i = 0; i < storyPackages.length; i++) {
      const pkg = storyPackages[i];
      const vp = voicePackages[i];

      // Parse Voice Package timing data
      let sentenceTimeline = [];
      let paragraphTimeline = [];
      let pauseTimeline = [];
      let totalDurationMs = (vp.total_duration_seconds || 0) * 1000;

      try { sentenceTimeline = JSON.parse(vp.sentence_timeline || '[]'); } catch (e) {}
      try { paragraphTimeline = JSON.parse(vp.paragraph_timeline || '[]'); } catch (e) {}
      try { pauseTimeline = JSON.parse(vp.pause_timeline || '[]'); } catch (e) {}

      // Parse image variations (unique image pool with IDs)
      let imagePool = [];
      try { imagePool = JSON.parse(pkg.image_variations || '[]'); } catch (e) {}
      if (imagePool.length === 0 && pkg.generated_image_url) {
        imagePool = [{ id: `img_fallback_${i}`, url: pkg.generated_image_url }];
      }

      // ==========================================================
      // STEP 4: AI REASONING — Generate Scene Graph
      // ==========================================================
      // ==========================================================
      // STEP 3.5: VISUAL INTENT ANALYSIS (Step 1 — Semantic Transcript)
      // Pre-process the script into a Visual Intent Map before scene graph
      // generation. This gives the APD explicit visual cues per narration
      // segment rather than relying on the LLM to infer visual needs.
      // ==========================================================
      let visualIntentMap = [];
      try {
        const intentResponse = await base44.asServiceRole.functions.invoke('analyzeVisualIntent', {
          headline: pkg.headline_suggestions || pkg.article_id || 'Untitled Story',
          story_summary: pkg.story_summary || '',
          teleprompter_script: vp.teleprompter_script || pkg.teleprompter_script || '',
          talking_points: pkg.talking_points || '',
          sentence_timeline: sentenceTimeline,
          production_profile: production_profile,
          fact_check_notes: pkg.fact_check_notes || '',
        });
        visualIntentMap = intentResponse.data?.visual_intent_map || intentResponse.visual_intent_map || [];
      } catch (e) {
        // Non-fatal: continue without visual intent map if analysis fails
      }

      const sceneGraphPrompt = buildSceneGraphPrompt(pkg, vp, production_profile, sentenceTimeline, i, storyPackages.length, screenResolution, screenAspectRatio, visualIntentMap, directorLog);

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: sceneGraphPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scene_id: { type: "string" },
                  scene_order: { type: "number" },
                  scene_type: { type: "string" },
                  scene_purpose: { type: "string" },
                  scene_start_time: { type: "number" },
                  scene_end_time: { type: "number" },
                  camera_behavior: { type: "string" },
                  camera_target: { type: "string" },
                  motion_intensity: { type: "string" },
                  background_design: { type: "string" },
                  transition_type: { type: "string" },
                  layers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        layer_type: { type: "string" },
                        z_order: { type: "number" },
                        elements: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              element_type: { type: "string" },
                              content: { type: "string" },
                              position_x: { type: "number" },
                              position_y: { type: "number" },
                              scale: { type: "number" },
                              opacity: { type: "number" },
                              entrance_animation: { type: "string" },
                              exit_animation: { type: "string" },
                              font_style: { type: "string" },
                              color_theme: { type: "string" },
                              visual_effects: { type: "array", items: { type: "string" } },
                              ambient_animation: { type: "string" },
                              start_time: { type: "number" },
                              end_time: { type: "number" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            decision_rationale: { type: "string" },
            confidence_score: { type: "number" }
          }
        },
        model: 'gpt_5_4'
      });

      // ── Calculate TRUE audio duration from sentence timeline ──
      // The sentence timeline is the ground truth — vp.total_duration_seconds can be a rough estimate
      const sentenceEnds = sentenceTimeline.map(s => (s.end_time || 0) * 1000);
      const trueAudioDurationMs = sentenceEnds.length > 0
        ? Math.max(...sentenceEnds, totalDurationMs)
        : totalDurationMs;

      let sceneGraphData = enforceAnimationVariety(typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse);

      // ── Sync scene graph to actual audio timeline ──
      // This is the critical step: the audio is the master clock, so we snap
      // scene boundaries and element times to sentence boundaries
      sceneGraphData = syncSceneGraphToAudio(sceneGraphData, sentenceTimeline, trueAudioDurationMs);

      // ==========================================================
      // STEP 4.5: ITERATIVE CRITIQUE (Step 2 — Draft → Critique → Refine)
      // Internal QA pass: check scene graph against Visual Intent Map and
      // style rules. Deterministic fixes applied in-place (background variety,
      // transition variety, safe area). Critical issues trigger LLM
      // re-generation with critique feedback (max 2 iterations).
      // ==========================================================
      let critiqueResult = critiqueSceneGraph(sceneGraphData, visualIntentMap, sentenceTimeline, trueAudioDurationMs);
      let critiqueIterations = 0;
      const MAX_CRITIQUE_ITERATIONS = 2;

      while (critiqueResult.issues.length > 0 && critiqueIterations < MAX_CRITIQUE_ITERATIONS) {
        critiqueIterations++;
        const critiquePrompt = sceneGraphPrompt + '\n\n## PREVIOUS DRAFT CRITIQUE — Issues Found\nThe previous scene graph draft had these issues. You MUST fix ALL of them:\n' + JSON.stringify(critiqueResult.issues, null, 2) + '\n\nRe-generate the FULL scene graph with these issues fixed. Do not repeat the same mistakes.';

        const critiqueLlmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: critiquePrompt,
          response_json_schema: SCENE_GRAPH_RESPONSE_SCHEMA,
          model: 'gpt_5_4',
        });

        sceneGraphData = enforceAnimationVariety(typeof critiqueLlmResponse === 'string' ? JSON.parse(critiqueLlmResponse) : critiqueLlmResponse);
        sceneGraphData = syncSceneGraphToAudio(sceneGraphData, sentenceTimeline, trueAudioDurationMs);
        critiqueResult = critiqueSceneGraph(sceneGraphData, visualIntentMap, sentenceTimeline, trueAudioDurationMs);
      }

      let imgIdx = 0;
      // Build the complete scene graph object
      const sceneGraph = {
        slide_id: `slide_${i + 1}`,
        story_package_id: pkg.id,
        voice_package_id: vp.id,
        scenes: (sceneGraphData.scenes || []).map((scene, sIdx) => ({
          scene_id: scene.scene_id || `scene_${i + 1}_${sIdx + 1}`,
          scene_order: scene.scene_order || sIdx + 1,
          scene_type: scene.scene_type || 'emphasis_text',
          scene_purpose: scene.scene_purpose || '',
          scene_start_time: scene.scene_start_time || 0,
          scene_end_time: scene.scene_end_time || trueAudioDurationMs,
          scene_duration: (scene.scene_end_time || trueAudioDurationMs) - (scene.scene_start_time || 0),
          camera_state: {
            behavior: scene.camera_behavior || 'static',
            target: scene.camera_target || ''
          },
          motion_state: {
            intensity: scene.motion_intensity || 'low',
            environmental_effects: []
          },
          background_design: scene.background_design || 'dark_gradient',
          transition_type: scene.transition_type || 'dissolve',
          layers: (scene.layers || []).map((layer, lIdx) => ({
            layer_id: `layer_${i + 1}_${sIdx + 1}_${lIdx}`,
            layer_type: layer.layer_type || 'background',
            z_order: layer.z_order !== undefined ? layer.z_order : lIdx,
            elements: (layer.elements || []).map((elem, eIdx) => {
              let assetRef = null;
              let assetId = null;
              if (elem.element_type === 'image') {
                if (imagePool.length > 0) {
                  const assigned = imagePool[imgIdx % imagePool.length];
                  imgIdx++;
                  assetRef = assigned.url;
                  assetId = assigned.id;
                } else {
                  assetRef = pkg.generated_image_url || '';
                }
              }
              return {
                element_id: `elem_${i + 1}_${sIdx + 1}_${lIdx}_${eIdx}`,
                element_type: elem.element_type || 'body_text',
                content: elem.content || '',
                position: { x: elem.position_x !== undefined ? elem.position_x : 0.5, y: elem.position_y !== undefined ? elem.position_y : 0.5 },
                scale: elem.scale !== undefined ? elem.scale : 1.0,
                rotation: 0,
                opacity: elem.opacity !== undefined ? elem.opacity : 1.0,
                visibility: true,
                font_style: elem.font_style || '',
                color_theme: elem.color_theme || 'white',
                visual_effects: elem.visual_effects || [],
                ambient_animation: elem.ambient_animation || 'none',
                entrance_animation: { type: elem.entrance_animation || 'fade', duration_ms: 500 },
                exit_animation: { type: elem.exit_animation || 'fade', duration_ms: 500 },
                timeline_events: [{
                  event_type: 'appear',
                  start_time: elem.start_time || 0,
                  end_time: elem.end_time || trueAudioDurationMs
                }],
                asset_reference: assetRef,
                asset_id: assetId,
              };
            })
          }))
        })),
        decision_rationale: sceneGraphData.decision_rationale || '',
        confidence_score: sceneGraphData.confidence_score || 80
      };

      // ── Image Asset Validation ──
      const imageElementCount = (sceneGraph.scenes || []).reduce((acc, scene) =>
        acc + (scene.layers || []).reduce((la, layer) =>
          la + (layer.elements || []).filter(e => e.element_type === 'image').length, 0
        ), 0
      );
      const availableImages = imagePool.length;
      if (imageElementCount > availableImages) {
        const shortfall = imageElementCount - availableImages;
        return Response.json({
          error: `Insufficient images for Slide ${i + 1} — needs ${imageElementCount} but only ${availableImages} available`,
          error_code: 'INSUFFICIENT_IMAGES',
          instruction: `Generate ${shortfall} additional unique image(s) for this slide via the Develop Image Worker`,
          slide_index: i,
          slide_title: pkg.headline_suggestions || pkg.article_id || `Slide ${i + 1}`,
          production_package_id: pkg.id,
          required_image_count: imageElementCount,
          available_image_count: availableImages,
          shortfall,
          existing_image_ids: imagePool.map(img => img.id),
        }, { status: 422 });
      }

      // Build slide timeline from voice package
      const slideTimeline = {
        slide_start_ms: cumulativeStartMs,
        slide_end_ms: cumulativeStartMs + trueAudioDurationMs,
        slide_duration_ms: trueAudioDurationMs,
        sentence_count: sentenceTimeline.length,
        paragraph_count: paragraphTimeline.length,
        pause_count: pauseTimeline.length,
        voice_audio_url: vp.voice_audio_url || ''
      };

      // Create Story Slide
      const slide = await base44.asServiceRole.entities.StorySlide.create({
        stories_presentation_id: presentation.id,
        story_package_id: pkg.id,
        story_order: i,
        voice_package_id: vp.id,
        scene_graph: JSON.stringify(sceneGraph),
        slide_timeline: JSON.stringify(slideTimeline),
        slide_metadata: JSON.stringify({
          headline: pkg.headline_suggestions || pkg.article_id || `Story ${i + 1}`,
          story_summary: pkg.story_summary || '',
          duration_ms: trueAudioDurationMs,
          scene_count: sceneGraph.scenes.length,
          element_count: sceneGraph.scenes.reduce((acc, s) => acc + s.layers.reduce((la, l) => la + l.elements.length, 0), 0),
          voice_package_reference: vp.id
        }),
        slide_start_ms: cumulativeStartMs,
        duration_ms: trueAudioDurationMs,
        status: 'generated',
        version: 1
      });

      storySlideIds.push(slide.id);

      // ==========================================================
      // STEP 3.5: PERSIST SLIDE ELEMENTS (Database-First Architecture)
      // Create persistent SlideElement records with first-class animation/effect/timing fields
      // so the Editor can query and update them directly without parsing scene_graph JSON.
      // ==========================================================
      const dbElements = [];
      for (const scene of (sceneGraph.scenes || [])) {
        for (const layer of (scene.layers || [])) {
          for (const elem of (layer.elements || [])) {
            const elType = (typeMapFn || (e => 'text'))(elem.element_type);
            const color = (COLOR_MAP_DB || {})[elem.color_theme] || (COLOR_MAP_DB || {}).white;
            const fxStyles = getDbVisualStyles(elem.visual_effects || [], color);

            const styleObj = {
              fontSize: FONT_SIZE_MAP_DB[elem.element_type] || FONT_SIZE_MAP_DB.default,
              fontFamily: FONT_MAP_DB[elem.font_style] || 'Inter, sans-serif',
              color: color.text,
              bold: elem.element_type === 'statistic' || elem.element_type === 'headline',
              italic: elem.element_type === 'quote',
              align: 'center',
              role: elem.element_type === 'headline' ? 'title' : elem.element_type === 'body_text' ? 'body' : undefined,
              backgroundColor: fxStyles.backgroundColor || 'transparent',
              borderRadius: fxStyles.borderRadius || 0,
              border: fxStyles.border || 'none',
              boxShadow: fxStyles.boxShadow || 'none',
              textShadow: fxStyles.textShadow || 'none',
              filter: fxStyles.filter || 'none',
              backdropFilter: fxStyles.backdropFilter || 'none',
              padding: 12,
            };

            // Compute position using same logic as loadEditorData
            const pos = computeElementPosition(elem, elem.element_type, dbElements.length);

            const tlEvents = elem.timeline_events || [];
            const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
            const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;

            try {
              // ── MANUAL OVERRIDE PRESERVATION ──
              // Check if the producer manually edited this element in a previous
              // generation. If so, preserve their position/style/animation overrides
              // and only take timing from the new APD scene graph.
              const contentKey = `${pkg.id}::${(elem.asset_reference || elem.content || '').trim()}`;
              const override = overrideMap[contentKey];

              const created = await base44.asServiceRole.entities.SlideElement.create({
                slide_id: slide.id,
                presentation_id: presentation.id,
                pp_id: presentation.pp_id || null,
                type: elType,
                content: elem.asset_reference || elem.content || '',
                x: override ? override.x : pos.x,
                y: override ? override.y : pos.y,
                width: override ? override.width : pos.w,
                height: override ? override.height : pos.h,
                rotation: override ? override.rotation : (elem.rotation || 0),
                opacity: override ? override.opacity : Math.round((elem.opacity ?? 1) * 100),
                z_index: override ? override.z_index : (elem.z_order ?? dbElements.length),
                style: override ? override.style : JSON.stringify(styleObj),
                // ── First-class animation fields ──
                entrance_type: override ? override.entrance_type : (elem.entrance_animation?.type || 'fade_in'),
                entrance_duration: override ? override.entrance_duration : (elem.entrance_animation?.duration_ms || 500),
                entrance_delay: override ? override.entrance_delay : startMs,
                exit_type: override ? override.exit_type : (elem.exit_animation?.type || null),
                ambient_animation: override ? override.ambient_animation : (elem.ambient_animation || 'none'),
                // ── First-class visual effect fields ──
                visual_effects: override ? override.visual_effects : JSON.stringify(elem.visual_effects || []),
                color_theme: override ? override.color_theme : (elem.color_theme || 'white'),
                font_style: override ? override.font_style : (elem.font_style || 'font-body'),
                // ── First-class timing fields ──
                start_ms: startMs,
                end_ms: endMs,
                // Legacy JSON fields (kept for backward compatibility)
                animation: override ? override.animation : JSON.stringify({ type: elem.entrance_animation?.type || 'fade_in', duration_ms: elem.entrance_animation?.duration_ms || 500, delay_ms: startMs }),
                timing: tlEvents.length > 0 ? JSON.stringify({ start_ms: startMs, end_ms: endMs }) : null,
                locked: override ? override.locked : false,
                visible: override ? override.visible : (elem.visibility !== false),
                version: override ? (override.version || 1) : 1,
                qa_status: override ? override.qa_status : 'not_reviewed',
              });
              dbElements.push(created);
            } catch (e) {
              // Non-fatal: element persistence failure shouldn't break presentation generation
            }
          }
        }
      }

      // Record AI Decision
      await base44.asServiceRole.entities.APDDecisionRecord.create({
        stories_presentation_id: presentation.id,
        story_slide_id: slide.id,
        decision_type: 'presentation_strategy',
        decision_inputs: JSON.stringify({
          headline: pkg.headline_suggestions || pkg.article_id || '',
          story_summary: (pkg.story_summary || '').substring(0, 500),
          tone: pkg.tone,
          voice_duration_ms: trueAudioDurationMs,
          sentence_count: sentenceTimeline.length
        }),
        decision_rationale: sceneGraphData.decision_rationale || 'APD generated scene graph based on story analysis',
        model_version: 'gpt_5_mini',
        prompt_version: 'apd_v1.0',
        temperature: 0.7,
        confidence_score: sceneGraphData.confidence_score || 80,
        decision_summary: `Generated ${sceneGraph.scenes.length} scenes for Story Slide ${i + 1}`
      });

      // Evaluate deterministic QA for this slide
      const slideQA = evaluateDeterministicQA(sceneGraph, vp, trueAudioDurationMs);

      // Update slide with QA results in metadata
      await base44.asServiceRole.entities.StorySlide.update(slide.id, {
        slide_metadata: JSON.stringify({
          headline: pkg.headline_suggestions || pkg.article_id || `Story ${i + 1}`,
          story_summary: pkg.story_summary || '',
          duration_ms: trueAudioDurationMs,
          scene_count: sceneGraph.scenes.length,
          element_count: sceneGraph.scenes.reduce((acc, s) => acc + s.layers.reduce((la, l) => la + l.elements.length, 0), 0),
          voice_package_reference: vp.id,
          qa_scores: slideQA
        })
      });

      // Add to master timeline
      masterTimelineEvents.push({
        event_type: 'slide_start',
        slide_id: slide.id,
        start_time: cumulativeStartMs,
        end_time: cumulativeStartMs + trueAudioDurationMs
      });

      cumulativeStartMs += trueAudioDurationMs;

      // Step 3: Record visual patterns for Director's Log (Cinematic Memory)
      directorLog.push(extractDirectorLogEntry(sceneGraph, i));
    }

    // ==========================================================
    // STEP 5: ASSEMBLE STORIES PRESENTATION
    // ==========================================================
    const masterTimeline = {
      events: masterTimelineEvents,
      total_duration_ms: cumulativeStartMs,
      slide_count: storySlideIds.length
    };

    // ==========================================================
    // STEP 6: QUALITY ASSURANCE (Real Evaluation)
    // ==========================================================

    // Collect per-slide QA scores from slide metadata
    const slideQAScores = [];
    for (const slideId of storySlideIds) {
      const slide = await base44.asServiceRole.entities.StorySlide.get(slideId);
      const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
      if (meta.qa_scores) slideQAScores.push(meta.qa_scores);
    }

    // Aggregate deterministic QA scores across all slides
    const avg = (key) => slideQAScores.length > 0
      ? Math.round(slideQAScores.reduce((a, s) => a + (s[key] || 0), 0) / slideQAScores.length)
      : 0;

    const deterministicQA = {
      story_integrity: avg('story_integrity'),
      timeline_synchronization: avg('timeline_synchronization'),
      readability: avg('readability'),
      technical_integrity: avg('technical_integrity')
    };

    // AI-based QA evaluation
    let aiQA = { communication: 80, motion: 80, consistency: 80 };
    try {
      aiQA = await evaluateAIQA(base44, title, production_profile, storySlideIds);
    } catch (e) {
      // Fall back to defaults if AI QA fails
    }

    const qaScores = {
      story_integrity: deterministicQA.story_integrity,
      timeline_synchronization: deterministicQA.timeline_synchronization,
      communication: aiQA.communication,
      readability: deterministicQA.readability,
      motion: aiQA.motion,
      technical_integrity: deterministicQA.technical_integrity,
      consistency: aiQA.consistency
    };

    // Production Confidence Score formula
    const confidenceScore = Math.round(
      qaScores.story_integrity * 0.20 +
      qaScores.timeline_synchronization * 0.20 +
      qaScores.communication * 0.20 +
      qaScores.readability * 0.15 +
      qaScores.motion * 0.10 +
      qaScores.technical_integrity * 0.10 +
      qaScores.consistency * 0.05
    );

    const qaResult = confidenceScore >= 90 ? 'pass' : confidenceScore >= 80 ? 'warning' : 'fail';

    // Update Stories Presentation
    const updatedPresentation = await base44.asServiceRole.entities.StoriesPresentation.update(presentation.id, {
      story_slide_ids: JSON.stringify(storySlideIds),
      master_timeline: JSON.stringify(masterTimeline),
      presentation_metadata: JSON.stringify({
        title,
        production_profile,
        creator: user.full_name || user.email,
        creator_id: user.id,
        generation_timestamp: new Date().toISOString(),
        apd_version: '1.0',
        presentation_version: 1,
        runtime_ms: cumulativeStartMs,
        story_count: storySlideIds.length
      }),
      qa_scores: JSON.stringify(qaScores),
      confidence_score: confidenceScore,
      qa_result: qaResult,
      total_runtime_ms: cumulativeStartMs,
      status: 'generated',
      completed_at: new Date().toISOString()
    });

    // ==========================================================
    // STEP 7: RETURN COMPLETED PRESENTATION
    // ==========================================================
    return Response.json({
      status: 'success',
      presentation: {
        id: updatedPresentation.id,
        title: updatedPresentation.title,
        production_profile: updatedPresentation.production_profile,
        status: 'generated',
        story_count: storySlideIds.length,
        total_runtime_ms: cumulativeStartMs,
        confidence_score: confidenceScore,
        qa_result: qaResult,
        story_slide_ids: storySlideIds,
        validation_results: validationResults
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ==========================================================
// ELEMENT POSITION COMPUTATION (mirrors loadEditorData layout)
// ==========================================================
const CANVAS_W_DB = 1280;
const CANVAS_H_DB = 720;

const FONT_MAP_DB = {
  'font-heading': 'Poppins, sans-serif',
  'font-body': 'Inter, sans-serif',
  'font-display': 'Oswald, sans-serif',
  'font-mono': '"JetBrains Mono", monospace',
  'font-condensed': 'Archivo, sans-serif',
  'font-serif': '"Playfair Display", serif',
};

const COLOR_MAP_DB = {
  primary:   { text: 'hsl(270 80% 65%)', glow: 'hsl(270 80% 60% / 0.4)',  border: 'hsl(270 80% 60% / 0.5)',  bg: 'hsl(270 80% 60% / 0.08)' },
  accent:    { text: 'hsl(25 95% 60%)',  glow: 'hsl(25 95% 55% / 0.4)',   border: 'hsl(25 95% 55% / 0.5)',   bg: 'hsl(25 95% 55% / 0.08)' },
  emerald:   { text: 'hsl(152 60% 50%)', glow: 'hsl(152 60% 45% / 0.4)',  border: 'hsl(152 60% 45% / 0.5)',  bg: 'hsl(152 60% 45% / 0.08)' },
  cyan:      { text: 'hsl(190 80% 55%)', glow: 'hsl(190 80% 55% / 0.4)',  border: 'hsl(190 80% 55% / 0.5)',  bg: 'hsl(190 80% 55% / 0.08)' },
  gold:      { text: 'hsl(45 95% 55%)',  glow: 'hsl(45 95% 55% / 0.4)',   border: 'hsl(45 95% 55% / 0.5)',   bg: 'hsl(45 95% 55% / 0.08)' },
  rose:      { text: 'hsl(300 80% 65%)', glow: 'hsl(300 80% 60% / 0.4)',  border: 'hsl(300 80% 60% / 0.5)',  bg: 'hsl(300 80% 60% / 0.08)' },
  white:     { text: 'hsl(0 0% 95%)',    glow: 'hsl(0 0% 95% / 0.2)',     border: 'hsl(0 0% 100% / 0.15)',   bg: 'hsl(0 0% 100% / 0.05)' },
  muted:     { text: 'hsl(220 10% 65%)', glow: 'hsl(220 10% 65% / 0.2)',  border: 'hsl(220 10% 30% / 0.4)',  bg: 'hsl(220 10% 20% / 0.1)' },
  crimson:   { text: 'hsl(0 72% 55%)',   glow: 'hsl(0 72% 51% / 0.4)',    border: 'hsl(0 72% 51% / 0.5)',    bg: 'hsl(0 72% 51% / 0.08)' },
};

const FONT_SIZE_MAP_DB = {
  headline: 48, body_text: 24, statistic: 72, quote: 28,
  callout: 22, talking_point_card: 22, discussion_response: 22,
  lower_third: 20, caption: 18, icon: 16, chart: 16, graphic: 16, default: 20,
};

const TYPE_SIZES_DB = {
  headline: { w: 800, h: 100 }, body_text: { w: 900, h: 200 },
  statistic: { w: 600, h: 150 }, quote: { w: 700, h: 150 },
  talking_point_card: { w: 500, h: 120 }, discussion_response: { w: 500, h: 120 },
  lower_third: { w: 900, h: 60 }, callout: { w: 500, h: 100 },
  caption: { w: 600, h: 40 }, image: { w: 500, h: 350 },
  icon: { w: 80, h: 80 }, chart: { w: 400, h: 300 }, graphic: { w: 500, h: 350 },
  default: { w: 600, h: 100 },
};

function typeMapFn(elementType) {
  const map = {
    headline: 'text', body_text: 'text', image: 'image',
    talking_point_card: 'text', discussion_response: 'text',
    lower_third: 'lower_third', statistic: 'text', quote: 'text',
    callout: 'text', caption: 'caption',
    icon: 'icon', chart: 'chart', graphic: 'image',
  };
  return map[elementType] || 'text';
}

function getDbVisualStyles(effects, color) {
  const styles = {};
  const fx = effects || [];
  if (fx.includes('glass_panel')) {
    styles.backgroundColor = color.bg;
    styles.backdropFilter = 'blur(12px)';
    styles.borderRadius = '12px';
    styles.border = `1px solid ${color.border}`;
  }
  if (fx.includes('glow_border')) {
    styles.border = `1px solid ${color.border}`;
    styles.boxShadow = `0 0 16px ${color.glow}, inset 0 0 12px ${color.glow}`;
    styles.borderRadius = '12px';
  }
  if (fx.includes('neon_shadow')) {
    styles.textShadow = `0 0 8px ${color.text}, 0 0 24px ${color.glow}`;
  }
  if (fx.includes('drop_shadow')) {
    styles.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
  }
  if (fx.includes('gradient_border')) {
    styles.border = `1px solid ${color.border}`;
    styles.boxShadow = `0 0 1px ${color.text}, 0 0 12px ${color.glow}`;
    styles.borderRadius = '12px';
  }
  if (fx.includes('inner_glow')) {
    const existing = styles.boxShadow || '';
    styles.boxShadow = `${existing} inset 0 0 20px ${color.glow}`.trim();
  }
  return styles;
}

function computeElementPosition(elem, elementType, idx) {
  const baseSize = TYPE_SIZES_DB[elementType] || TYPE_SIZES_DB.default;
  // Position priority: canvas_position (absolute px) > position (normalized 0-1) > vertical layout
  if (elem.canvas_position && elem.canvas_size) {
    return {
      x: Math.round(elem.canvas_position.x || 0),
      y: Math.round(elem.canvas_position.y || 0),
      w: Math.round(elem.canvas_size.w || baseSize.w),
      h: Math.round(elem.canvas_size.h || baseSize.h),
    };
  }
  if (elem.position) {
    const scaleFactor = Math.max(0.5, Math.min(1.5, elem.scale || 1));
    const w = Math.max(30, Math.round(baseSize.w * scaleFactor));
    const h = Math.max(20, Math.round(baseSize.h * scaleFactor));
    const rawX = Math.max(0.05, Math.min(0.95, elem.position.x ?? 0.5));
    const rawY = Math.max(0.05, Math.min(0.95, elem.position.y ?? 0.5));
    return {
      x: Math.round(rawX * CANVAS_W_DB - w / 2),
      y: Math.round(rawY * CANVAS_H_DB - h / 2),
      w, h,
    };
  }
  // Vertical layout fallback — distribute by type
  const cursorY = 40 + idx * 120;
  if (elementType === 'lower_third') {
    return { x: 190, y: CANVAS_H_DB - 80, w: 900, h: 60 };
  }
  if (elementType === 'caption') {
    return { x: 340, y: CANVAS_H_DB - 50, w: 600, h: 40 };
  }
  if (elementType === 'headline') {
    return { x: 240, y: 40, w: 800, h: 100 };
  }
  return { x: 340, y: cursorY, w: baseSize.w, h: baseSize.h };
}

// ==========================================================
// ANIMATION VARIETY ENFORCER
// ==========================================================
function enforceAnimationVariety(sceneGraphData) {
  const ALT_POOL = ['dissolve', 'reveal', 'slide_up', 'scale_bounce', 'expand', 'zoom_in', 'fade_bounce', 'wipe', 'typewriter'];
  for (const scene of (sceneGraphData.scenes || [])) {
    const counts = {};
    let altIdx = 0;
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        const anim = elem.entrance_animation || 'fade';
        counts[anim] = (counts[anim] || 0) + 1;
        if (counts[anim] > 2) {
          const replacement = ALT_POOL[altIdx % ALT_POOL.length];
          counts[replacement] = (counts[replacement] || 0) + 1;
          counts[anim]--;
          elem.entrance_animation = replacement;
          altIdx++;
        }
      }
    }
  }
  return sceneGraphData;
}

// ==========================================================
// SCENE GRAPH PROMPT BUILDER
// ==========================================================
function buildSceneGraphPrompt(pkg, vp, productionProfile, sentenceTimeline, slideIndex, totalSlides, screenResolution, screenAspectRatio, visualIntentMap, directorLog) {
  const headline = pkg.headline_suggestions || pkg.article_id || 'Untitled Story';
  const script = vp.teleprompter_script || pkg.teleprompter_script || '';
  const storySummary = pkg.story_summary || '';
  const talkingPoints = pkg.talking_points || '';
  const factCheckNotes = pkg.fact_check_notes || '';
  const visualSuggestions = pkg.visual_suggestions || '';
  const brollSuggestions = pkg.broll_suggestions || '';
  const lowerThirdText = pkg.lower_third_text || '';
  const producerNotes = pkg.producer_notes || '';
  const tone = pkg.tone || 'professional';
  const totalDurationMs = (vp.total_duration_seconds || 0) * 1000;

  const sentences = sentenceTimeline.map(s => ({
    text: s.sentence_text || '',
    start: s.start_time || 0,
    end: s.end_time || 0
  }));

  // Step 1: Visual Intent Map injection — gives the APD explicit visual cues
  const visualIntentBlock = visualIntentMap && visualIntentMap.length > 0
    ? `\nVISUAL INTENT MAP (Semantic analysis of the narration — each segment tells you what visual is needed at that point):\n${JSON.stringify(visualIntentMap, null, 2)}\nCRITICAL: You MUST create elements that match the suggested_element_types for each segment. Every segment with visual_cue "statistic" MUST have a statistic element. Every segment with visual_cue "image" should have an image element. Match element start_time values to segment start_time values.`
    : '';

  // Step 3: Director's Log injection — prevents visual repetition across slides
  const directorLogBlock = directorLog && directorLog.length > 0
    ? `\nCROSS-SLIDE DIRECTOR'S LOG (Cinematic Memory — visual patterns already used on preceding slides):\n${JSON.stringify(directorLog, null, 2)}\nCRITICAL: Avoid repeating the same background_design, transition_type, or dominant color_theme from the previous 2 slides. Create visual rhythm by contrasting this slide's style with what came before. If the previous slide was high-energy, make this one calmer. If the previous slide was data-heavy, make this one more narrative.`
    : '';

  return `You are the CREAPD AI Presentation Director (APD). Your job is to transform an approved Story Package into a professionally directed Story Slide.

CREAPD APD DIRECTING RULES:
1. Story always comes before presentation. Every visual must improve communication.
2. One Story Package = One Story Slide. Never split or merge.
3. Voiceover Audio is the master timeline. All timing derives from the Voice Package.
4. Story understanding always comes before presentation construction.
5. Facts are never altered. Never invent facts, rewrite scripts, or contradict Fact Check Notes.
6. Every visual must have purpose. Visual decoration alone never justifies inclusion.
7. Images are never backgrounds by default — background placement is a directing decision.
8. Motion exists to guide attention, not decorate.
9. Every Story Slide must feel alive — never static.
10. APD directs, it does not decorate.

DISPLAY SCREEN SPECIFICATION:
- Resolution: ${screenResolution} pixels
- Aspect Ratio: ${screenAspectRatio}
- Screen Width: ${screenResolution.split('x')[0]}px
- Screen Height: ${screenResolution.split('x')[1]}px

SAFE AREA RULES (CRITICAL — ALL ELEMENTS MUST FIT ON SCREEN):
1. All element positions use normalized coordinates (0.0 to 1.0). Origin is top-left (0,0), bottom-right is (1,1).
2. SAFE AREA: Keep ALL element positions within x: 0.08 to 0.92 and y: 0.08 to 0.92. NEVER place an element at x > 0.92, x < 0.08, y > 0.92, or y < 0.08.
3. Element scale should be between 0.8 and 1.3. Never use scale > 1.5.
4. No two text elements should overlap. If placing multiple text elements in the same scene, stagger their positions vertically (e.g., headline at y=0.25, body at y=0.55, lower_third at y=0.88).
5. Headlines should be centered horizontally (x=0.5) and placed in the upper third (y=0.15 to 0.30).
6. Body text should be centered horizontally (x=0.5) and placed in the middle (y=0.45 to 0.60).
7. Lower thirds are exempt from safe area x-rules — they anchor to bottom-left (use bottom positioning).
8. Images should not exceed 60% of screen width — use scale 0.8 to 1.0 for images.
9. Statistics should be centered (x=0.5, y=0.4 to 0.5) with scale 1.0 to 1.2.
10. When in doubt, center the element (x=0.5) — centered elements never overflow.

PRESENTATION CONTEXT:
- Production Profile: ${productionProfile}
- Slide ${slideIndex + 1} of ${totalSlides}
- Story Headline: ${headline}
- Tone: ${tone}
- Total Narration Duration: ${totalDurationMs}ms (${(totalDurationMs / 1000).toFixed(1)} seconds)
${visualIntentBlock}${directorLogBlock}
STORY PACKAGE DATA:
- Headline: ${headline}
- Story Summary: ${storySummary}
- Teleprompter Script: ${script.substring(0, 2000)}
- Talking Points: ${talkingPoints.substring(0, 1000)}
- Fact Check Notes: ${factCheckNotes.substring(0, 1000)}
- Visual Suggestions: ${visualSuggestions.substring(0, 500)}
- B-Roll Suggestions: ${brollSuggestions.substring(0, 500)}
- Lower Third Text: ${lowerThirdText.substring(0, 500)}
- Producer Notes: ${producerNotes.substring(0, 500)}

VOICE PACKAGE SENTENCE TIMELINE (timing in milliseconds from slide start):
${JSON.stringify(sentences.slice(0, 30), null, 2)}

CRITICAL TIMING RULES:
- The sentence timeline above is the MASTER CLOCK. Total audio duration: ${totalDurationMs}ms.
- Scene boundaries MUST align with sentence boundaries. A scene should start when a new topic/idea begins in the narration.
- Each scene's scene_start_time should match a sentence's start_time, and scene_end_time should match a sentence's end_time.
- Element start_time values should match the sentence start_time when that element's content is being discussed.
- NEVER create a scene that extends beyond ${totalDurationMs}ms — the audio IS the timeline.
- The LAST scene must end at exactly ${totalDurationMs}ms so no audio is left uncovered.

AVAILABLE IMAGE ASSET: ${pkg.generated_image_url || 'None'}

INSTRUCTIONS:
Analyze the story using the APD Decision Hierarchy: Story → Meaning → Facts → Voice → Presentation Strategy → Visual Strategy → Motion Strategy → Assets → Animation → Story Slide.

Generate a Scene Graph for this Story Slide. Create 2-6 Presentation Scenes based on natural communication changes (topic shifts, new subjects, statistics, quotes, discussion points, emotional shifts). Each scene must have a clear purpose.

For each scene, determine:
- Camera behavior (static, slow_push, pull_back, pan_left, pan_right, tilt, drift, parallax, focus_shift)
- Motion intensity (low, medium, high)
- Background design (choose from the STYLE GUIDE background options — each scene MUST use a different one)
- Transition type (how this scene transitions IN from the previous scene: "fade", "dissolve", "slide_left", "slide_right", "zoom", "cut") — the FIRST scene of each slide should use "dissolve" or "fade"; vary transitions between scenes
- Layers with elements (use the layer hierarchy: background, environmental_effects, primary_imagery, secondary_imagery, graphics, text, lower_third, foreground_effects)

Element types: image, headline, body_text, talking_point_card, discussion_response, lower_third, chart, logo, icon, callout, statistic, quote.

STYLE GUIDE — VISUAL DESIGN, ANIMATION & TYPOGRAPHY (MANDATORY):
Each element MUST include entrance_animation, exit_animation, font_style, color_theme, visual_effects (array), and ambient_animation. Each scene MUST include background_design. Use ONLY the values listed below.

COLOR PALETTES — Assign each element a color_theme token:
- "primary" — deep purple hsl(270 80% 60%) — for headlines, key callouts, branding
- "accent" — vibrant orange hsl(25 95% 55%) — for statistics, emphasis, highlights
- "emerald" — teal green hsl(152 60% 45%) — for positive data, success indicators
- "cyan" — bright cyan hsl(190 80% 55%) — for technical data, charts, metrics
- "gold" — warm gold hsl(45 95% 55%) — for premium elements, awards, achievements
- "rose" — rose pink hsl(300 80% 60%) — for quotes, emotional content, features
- "white" — pure white hsl(0 0% 95%) — for body text, clean readable text
- "muted" — soft gray hsl(220 10% 65%) — for secondary text, captions, timestamps
- "crimson" — deep red hsl(0 72% 51%) — for warnings, alerts, breaking content
COLOR VARIETY RULE: Never assign the same color_theme to more than 60% of elements in a scene. Mix colors to create visual contrast and rhythm.

BACKGROUND DESIGNS — Each scene MUST include a background_design:
- "gradient_orb" — soft drifting radial gradient orbs (purple/orange/emerald)
- "particle_field" — floating particle dots rising upward
- "grid_floor" — perspective grid floor at bottom with scan lines
- "glassmorphism" — frosted glass panels with subtle blur
- "neon_glow" — dark background with neon glow accents in corners
- "scan_lines" — horizontal scan line sweep across screen
- "circuit_pattern" — digital circuit board pattern overlay
- "data_stream" — binary rain falling effect
- "energy_rings" — concentric rotating energy rings
- "gradient_mesh" — multi-color gradient mesh background
- "dark_gradient" — simple dark gradient (navy to black)
- "warm_gradient" — warm orange to purple gradient
BACKGROUND VARIETY RULE: Each scene in a slide MUST use a different background_design. Never repeat the same background across scenes within a slide.

SCENE TRANSITIONS — Each scene MUST include a transition_type (how it transitions IN from the previous scene):
- "fade" — smooth opacity fade-in
- "dissolve" — blur-to-focus dissolve (DEFAULT for first scene of each slide)
- "slide_left" — slide in from right
- "slide_right" — slide in from left
- "zoom" — quick zoom from large to normal
- "cut" — instant cut (no transition — use for rapid scene changes)
TRANSITION RULES:
1. The FIRST scene of each slide should use "dissolve" or "fade" (smooth entrance)
2. NEVER use the same transition_type on consecutive scenes — vary them
3. Match transition to scene energy: "zoom" for high-energy, "dissolve" for emotional, "cut" for urgency, "slide_left" for informational
4. "cut" should be used sparingly — max once per slide

ENTRANCE ANIMATIONS — Each element MUST include one:
- "fade" — smooth opacity fade-in (body_text, narration)
- "slide" — slide in from right (headlines, talking_point_card)
- "slide_left" — slide in from left (lower_third, secondary content)
- "slide_up" — slide in from bottom (statistics, key numbers)
- "slide_down" — slide in from top (drop quotes, banners)
- "scale" — zoom in from small to normal (statistics, callouts)
- "scale_bounce" — zoom in with elastic bounce (emphasis elements)
- "reveal" — fade-in with upward drift (quotes, important text)
- "float" — gentle floating loop, continuous (images, icons)
- "dissolve" — blur-to-focus transition (scene transitions)
- "wipe" — left-to-right wipe reveal (data bars, charts)
- "expand" — expand from center outward (cards, panels)
- "zoom_in" — quick zoom from large to normal (impact moments)
- "fade_bounce" — fade in with slight bounce at end (playful elements)
- "dissolve_in" — blur dissolve entrance (emotional transitions)
- "typewriter" — text types on screen character-by-character (body_text, quotes, talking points — use for dramatic text reveal)
ANIMATION VARIETY RULE: Never use the same entrance_animation for more than 2 elements in the same scene. You decide which animation best fits each element — use your creative judgment to create choreographic rhythm and visual interest.

EXIT ANIMATIONS:
- "fade_out" — opacity fade-out
- "slide_out" — slide out to right
- "slide_out_left" — slide out to left
- "scale_out" — zoom out to small
- "dissolve_out" — blur-to-blur exit

VISUAL EFFECTS — Each element can include a visual_effects array. Choose effects that enhance the element's communication — you decide what looks best:
- "glass_panel" — frosted glass background with blur
- "glow_border" — glowing colored border
- "neon_shadow" — neon glow text shadow
- "gradient_border" — subtle gradient border
- "drop_shadow" — standard drop shadow for depth
- "inner_glow" — inner glow effect
You decide which effects (if any) to apply to each element. Not every element needs visual effects — use them where they enhance communication. An empty array is acceptable for elements that should be clean and simple.

AMBIENT ANIMATIONS — Each element can include an ambient_animation (continuous effect that persists AFTER the entrance animation completes). You decide which elements need ambient motion:
- "none" — no ambient animation
- "pulse" — subtle opacity/brightness pulsing
- "glow_breathe" — glow intensity breathing in and out
- "shimmer" — light sweep across element
- "subtle_float" — very subtle vertical floating
- "text_shimmer" — text glow intensity pulsing
- "border_pulse" — border glow pulsing
You decide which ambient_animation (if any) fits each element. Use "none" where stillness is appropriate. Not every element needs ambient motion — use it purposefully.

FONT STYLES:
- "font-heading" — Poppins, bold (headlines, titles)
- "font-display" — Oswald, condensed bold (statistics, large numbers, banners)
- "font-body" — Inter, regular (body_text, narration)
- "font-mono" — JetBrains Mono (data, technical labels, timestamps)
- "font-serif" — Playfair Display, elegant serif (quotes, literary text)
- "font-condensed" — Archivo, condensed (lower thirds, captions)
FONT MATCHING RULE: Match font to content purpose. Never use font-body for headlines or font-heading for body text.

Use normalized coordinates (0.0 to 1.0) for element positions. Origin is top-left (0,0), bottom-right is (1,1).

CRITICAL: All elements MUST fit within the display screen. Respect the Safe Area Rules above — positions must be within x: 0.08–0.92, y: 0.08–0.92. No element should ever be positioned where it would overflow off-screen.

All timing must be in milliseconds and synchronized with the Voice Package sentence timeline. Elements should appear when their relevant narration begins and disappear when no longer relevant.

Return a JSON object with:
- scenes: array of scene objects (each with scene_id, scene_order, scene_type, scene_purpose, scene_start_time, scene_end_time, camera_behavior, camera_target, motion_intensity, background_design, transition_type, layers with elements)
- Each element MUST include: element_type, content, position_x, position_y, scale, opacity, entrance_animation, exit_animation, font_style, color_theme, visual_effects (array of strings), ambient_animation (string), start_time, end_time
- decision_rationale: explanation of your directing decisions
- confidence_score: 0-100 confidence that this slide communicates the story effectively

CRITICAL REMINDER: Every element MUST have visual_effects (at least 2) and ambient_animation. Slides must look visually rich with glass panels, glowing borders, neon shadows, and continuous ambient motion. A slide where text just fades in and sits static is a FAILURE.`;
}

// ==========================================================
// AUDIO SYNC — Snap scene graph timing to voice package timeline
// ==========================================================

/**
 * Post-processes the LLM-generated scene graph to enforce audio-first timing.
 *
 * The voice package sentence timeline is the master clock. This function:
 * 1. Clamps all scene/element times to the actual audio duration
 * 2. Snaps scene boundaries to sentence boundaries (so scenes start/end
 *    when narration sentences start/end)
 * 3. Snaps element start_times to the nearest sentence start_time
 * 4. Extends the last scene to cover the full audio duration
 * 5. Removes gaps where no scene covers a portion of audio
 */
function syncSceneGraphToAudio(sceneGraphData, sentenceTimeline, trueAudioDurationMs) {
  if (!sceneGraphData || !sceneGraphData.scenes) return sceneGraphData;

  const sentences = Array.isArray(sentenceTimeline) ? sentenceTimeline : [];
  const sentenceStartsMs = sentences.map(s => (s.start_time || 0) * 1000);
  const sentenceEndsMs = sentences.map(s => (s.end_time || 0) * 1000);

  // Sort scenes by start time
  const scenes = (sceneGraphData.scenes || []).slice().sort(
    (a, b) => (a.scene_start_time || 0) - (b.scene_start_time || 0)
  );

  if (scenes.length === 0) return sceneGraphData;

  // ── Step 1: Snap scene boundaries to sentence boundaries ──
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const rawStart = scene.scene_start_time || 0;
    const rawEnd = scene.scene_end_time || trueAudioDurationMs;

    // First scene always starts at 0
    if (i === 0) {
      scene.scene_start_time = 0;
    } else {
      // Snap start to nearest sentence boundary
      scene.scene_start_time = snapToNearest(rawStart, sentenceStartsMs, 2000);
    }

    // Last scene always ends at true audio duration
    if (i === scenes.length - 1) {
      scene.scene_end_time = trueAudioDurationMs;
    } else {
      // Snap end to nearest sentence boundary
      scene.scene_end_time = snapToNearest(rawEnd, sentenceEndsMs, 2000);
    }

    // Ensure no zero-duration scenes
    if (scene.scene_end_time <= scene.scene_start_time) {
      scene.scene_end_time = scene.scene_start_time + 2000;
    }

    // Update scene_duration
    scene.scene_duration = scene.scene_end_time - scene.scene_start_time;

    // ── Step 2: Clamp and snap element times within each scene ──
    const sceneStart = scene.scene_start_time;
    const sceneEnd = scene.scene_end_time;

    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        // Elements use start_time/end_time at the top level (from LLM)
        let elemStart = elem.start_time || sceneStart;
        let elemEnd = elem.end_time || sceneEnd;

        // Clamp to scene boundaries
        elemStart = Math.max(sceneStart, Math.min(elemStart, sceneEnd - 500));
        elemEnd = Math.max(elemEnd, elemStart + 500);
        elemEnd = Math.min(elemEnd, sceneEnd);

        // Snap element start to nearest sentence start (within 1.5s tolerance)
        // This makes elements appear exactly when the relevant narration begins
        const snappedStart = snapToNearest(elemStart, sentenceStartsMs, 1500);
        if (snappedStart >= sceneStart && snappedStart <= sceneEnd) {
          elemStart = snappedStart;
        }

        elem.start_time = elemStart;
        elem.end_time = elemEnd;
      }
    }
  }

  // ── Step 3: Fix gaps between scenes ──
  // If there's a gap > 1s between scene[i].end and scene[i+1].start,
  // extend scene[i].end to scene[i+1].start
  for (let i = 0; i < scenes.length - 1; i++) {
    const gap = scenes[i + 1].scene_start_time - scenes[i].scene_end_time;
    if (gap > 1000) {
      // Extend elements in scene[i] to cover the gap
      scenes[i].scene_end_time = scenes[i + 1].scene_start_time;
      scenes[i].scene_duration = scenes[i].scene_end_time - scenes[i].scene_start_time;
      for (const layer of (scenes[i].layers || [])) {
        for (const elem of (layer.elements || [])) {
          if (elem.end_time < scenes[i].scene_end_time) {
            elem.end_time = scenes[i].scene_end_time;
          }
        }
      }
    }
  }

  sceneGraphData.scenes = scenes;
  return sceneGraphData;
}

/**
 * Snaps a time value to the nearest value in a list of snap points.
 * Only snaps if within `toleranceMs` of a snap point.
 */
function snapToNearest(value, snapPoints, toleranceMs) {
  if (!snapPoints || snapPoints.length === 0) return value;

  let nearest = snapPoints[0];
  let minDist = Math.abs(value - nearest);

  for (const point of snapPoints) {
    const dist = Math.abs(value - point);
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  }

  return minDist <= toleranceMs ? nearest : value;
}

// ==========================================================
// QA EVALUATION HELPERS
// ==========================================================

function evaluateDeterministicQA(sceneGraph, voicePackage, totalDurationMs) {
  const scenes = sceneGraph.scenes || [];

  // Story integrity: each scene should have content
  let storyIntegrity = 100;
  for (const scene of scenes) {
    const hasContent = (scene.layers || []).some(l => (l.elements || []).some(e => e.content));
    if (!hasContent) storyIntegrity -= 20;
  }
  if (scenes.length === 0) storyIntegrity = 0;
  storyIntegrity = Math.max(0, storyIntegrity);

  // Timeline synchronization: scene times within voice duration
  let timelineSync = 100;
  for (const scene of scenes) {
    if ((scene.scene_end_time || 0) > totalDurationMs + 1000) timelineSync -= 15;
    if ((scene.scene_start_time || 0) < 0) timelineSync -= 10;
  }

  // Dead time detection: gaps > 3 seconds between scenes
  let lastEnd = 0;
  let deadTimeSeconds = 0;
  for (const scene of scenes) {
    const start = scene.scene_start_time || 0;
    if (start > lastEnd + 3000) {
      deadTimeSeconds += (start - lastEnd - 3000) / 1000;
    }
    lastEnd = Math.max(lastEnd, scene.scene_end_time || 0);
  }
  if (deadTimeSeconds > 5) timelineSync -= 15;
  if (deadTimeSeconds > 10) timelineSync -= 15;
  timelineSync = Math.max(0, timelineSync);

  // Readability: text length checks
  let readability = 100;
  for (const scene of scenes) {
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        if (elem.content && elem.content.length > 200) readability -= 5;
        if (elem.element_type === 'headline' && elem.content && elem.content.length > 80) readability -= 5;
        if (elem.element_type === 'body_text' && elem.content && elem.content.length > 300) readability -= 5;
      }
    }
  }
  readability = Math.max(0, readability);

  // Technical integrity: missing assets, valid structure
  let technicalIntegrity = 100;
  if (scenes.length === 0) technicalIntegrity = 0;
  for (const scene of scenes) {
    if (!scene.layers) technicalIntegrity -= 20;
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        if (elem.element_type === 'image' && !elem.asset_reference) technicalIntegrity -= 10;
      }
    }
  }
  technicalIntegrity = Math.max(0, technicalIntegrity);

  return {
    story_integrity: storyIntegrity,
    timeline_synchronization: timelineSync,
    readability,
    technical_integrity: technicalIntegrity,
    dead_time_seconds: Math.round(deadTimeSeconds)
  };
}

async function evaluateAIQA(base44, title, productionProfile, storySlideIds) {
  const slidesData = [];
  for (let i = 0; i < storySlideIds.length; i++) {
    const slide = await base44.asServiceRole.entities.StorySlide.get(storySlideIds[i]);
    const sg = (() => { try { return JSON.parse(slide.scene_graph || '{}'); } catch { return {}; } })();
    const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
    slidesData.push({
      headline: meta.headline,
      scene_count: sg.scenes?.length || 0,
      scene_types: (sg.scenes || []).map(s => s.scene_type),
      camera_behaviors: (sg.scenes || []).map(s => s.camera_state?.behavior),
      motion_intensities: (sg.scenes || []).map(s => s.motion_state?.intensity),
      element_types: (sg.scenes || []).flatMap(s =>
        (s.layers || []).flatMap(l => (l.elements || []).map(e => e.element_type))
      )
    });
  }

  const prompt = `You are a QA evaluator for CREAPD Stories Presentations. Evaluate the following presentation data and score each category 0-100.

Presentation Title: ${title}
Production Profile: ${productionProfile}
Slide Count: ${storySlideIds.length}

Slides Data:
${JSON.stringify(slidesData, null, 2)}

Score these categories (0-100):
- communication: How clearly does the presentation communicate the stories? Consider scene types, element types, and content structure.
- motion: Are camera behaviors and motion intensities appropriate? All static is boring (lower score); too much high-intensity motion is distracting (lower score).
- consistency: Is the presentation visually consistent across slides? Similar scene structures and element types indicate good consistency.

Return only the JSON object.`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        communication: { type: "number" },
        motion: { type: "number" },
        consistency: { type: "number" }
      }
    },
    model: 'gpt_5_mini'
  });

  return typeof response === 'string' ? JSON.parse(response) : response;
}

// ==========================================================
// STEP 2 HELPER: SCENE GRAPH CRITIQUE
// Evaluates the generated scene graph against the Visual Intent
// Map and style rules. Applies deterministic fixes in-place
// (background variety, transition variety, safe area) and
// returns remaining issues that require LLM re-generation.
// ==========================================================
function critiqueSceneGraph(sceneGraphData, visualIntentMap, sentenceTimeline, trueAudioDurationMs) {
  const issues = [];
  const scenes = sceneGraphData.scenes || [];

  // ── Deterministic Fix 1: Background variety ──
  const ALL_BG = ['gradient_orb', 'particle_field', 'grid_floor', 'glassmorphism', 'neon_glow', 'scan_lines', 'circuit_pattern', 'data_stream', 'energy_rings', 'gradient_mesh', 'dark_gradient', 'warm_gradient'];
  const usedBg = new Set();
  for (const scene of scenes) {
    if (usedBg.has(scene.background_design)) {
      const available = ALL_BG.find(b => !usedBg.has(b));
      if (available) {
        scene.background_design = available;
        usedBg.add(available);
      }
    } else {
      usedBg.add(scene.background_design);
    }
  }

  // ── Deterministic Fix 2: Transition variety ──
  const ALL_TRANSITIONS = ['fade', 'dissolve', 'slide_left', 'slide_right', 'zoom', 'cut'];
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].transition_type === scenes[i - 1].transition_type) {
      const available = ALL_TRANSITIONS.find(t => t !== scenes[i].transition_type);
      if (available) scenes[i].transition_type = available;
    }
  }

  // ── Deterministic Fix 3: Safe area compliance ──
  for (const scene of scenes) {
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        if (elem.position_x !== undefined) {
          if (elem.position_x < 0.08) elem.position_x = 0.08;
          if (elem.position_x > 0.92) elem.position_x = 0.92;
        }
        if (elem.position_y !== undefined) {
          if (elem.position_y < 0.08) elem.position_y = 0.08;
          if (elem.position_y > 0.92) elem.position_y = 0.92;
        }
      }
    }
  }

  // ── Critical Check 1: Visual intent coverage ──
  // Each segment with a non-"text_only" visual_cue should have at least one
  // matching element type in its time range. Missing elements trigger LLM re-gen.
  if (visualIntentMap && visualIntentMap.length > 0) {
    const allElements = scenes.flatMap(s =>
      (s.layers || []).flatMap(l => (l.elements || []))
    );
    for (const segment of visualIntentMap) {
      if (segment.visual_cue === 'text_only' || !segment.suggested_element_types) continue;
      const segmentElements = allElements.filter(e =>
        (e.start_time || 0) >= segment.start_time - 2000 &&
        (e.start_time || 0) < segment.end_time + 2000
      );
      for (const suggestedType of segment.suggested_element_types) {
        const hasType = segmentElements.some(e => e.element_type === suggestedType);
        if (!hasType) {
          issues.push({
            severity: 'medium',
            issue: `Segment "${(segment.segment_text || '').substring(0, 60)}..." expected element type "${suggestedType}" but none found at ${segment.start_time}-${segment.end_time}ms`,
            fix: `Add a ${suggestedType} element timed to ${segment.start_time}ms`,
          });
        }
      }
    }
  }

  // ── Critical Check 2: Scenes without content ──
  for (const scene of scenes) {
    const hasContent = (scene.layers || []).some(l =>
      (l.elements || []).some(e => e.content)
    );
    if (!hasContent) {
      issues.push({
        severity: 'high',
        issue: `Scene ${scene.scene_id || '?'} has no content elements`,
        fix: 'Add at least one text element to this scene',
      });
    }
  }

  // ── Critical Check 3: Sparse scenes (fewer than 2 elements) ──
  for (const scene of scenes) {
    const elemCount = (scene.layers || []).reduce((acc, l) =>
      acc + (l.elements || []).length, 0
    );
    if (elemCount < 2) {
      issues.push({
        severity: 'medium',
        issue: `Scene ${scene.scene_id || '?'} has only ${elemCount} element(s) — too sparse`,
        fix: 'Add supporting elements (talking_point_card, callout, lower_third)',
      });
    }
  }

  return { issues, fixed_in_place: true };
}

// ==========================================================
// STEP 3 HELPER: DIRECTOR'S LOG ENTRY EXTRACTION
// Extracts a compact summary of visual patterns used on a slide
// so subsequent slides can avoid repeating them.
// ==========================================================
function extractDirectorLogEntry(sceneGraph, slideIndex) {
  const scenes = sceneGraph.scenes || [];
  return {
    slide_index: slideIndex,
    backgrounds: scenes.map(s => s.background_design).filter(Boolean),
    transitions: scenes.map(s => s.transition_type).filter(Boolean),
    color_themes: scenes.flatMap(s =>
      (s.layers || []).flatMap(l =>
        (l.elements || []).map(e => e.color_theme).filter(Boolean)
      )
    ),
    animation_types: scenes.flatMap(s =>
      (s.layers || []).flatMap(l =>
        (l.elements || []).map(e =>
          typeof e.entrance_animation === 'object'
            ? e.entrance_animation?.type
            : e.entrance_animation
        ).filter(Boolean)
      )
    ),
    scene_count: scenes.length,
    scene_types: scenes.map(s => s.scene_type).filter(Boolean),
  };
}