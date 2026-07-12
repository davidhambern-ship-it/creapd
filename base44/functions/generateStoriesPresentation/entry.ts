import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { story_package_ids, production_profile, presentation_title, resolution, aspect_ratio } = body;

    const screenResolution = resolution || '1920x1080';
    const screenAspectRatio = aspect_ratio || '16:9';

    if (!story_package_ids || !Array.isArray(story_package_ids) || story_package_ids.length === 0) {
      return Response.json({ error: 'At least one Story Package ID is required' }, { status: 400 });
    }
    if (!production_profile) {
      return Response.json({ error: 'Production Profile is required' }, { status: 400 });
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
    // STEP 2: CREATE STORIES PRESENTATION
    // ==========================================================
    const title = presentation_title || `${production_profile.toUpperCase()} Presentation — ${new Date().toLocaleDateString()}`;

    const presentation = await base44.asServiceRole.entities.StoriesPresentation.create({
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

    // ==========================================================
    // STEP 3: GENERATE STORY SLIDES (one per Story Package)
    // ==========================================================
    const storySlideIds = [];
    let cumulativeStartMs = 0;
    const masterTimelineEvents = [];

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
      const sceneGraphPrompt = buildSceneGraphPrompt(pkg, vp, production_profile, sentenceTimeline, i, storyPackages.length, screenResolution, screenAspectRatio);

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
        model: 'gpt_5_mini'
      });

      const sceneGraphData = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;

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
          scene_end_time: scene.scene_end_time || totalDurationMs,
          scene_duration: (scene.scene_end_time || totalDurationMs) - (scene.scene_start_time || 0),
          camera_state: {
            behavior: scene.camera_behavior || 'static',
            target: scene.camera_target || ''
          },
          motion_state: {
            intensity: scene.motion_intensity || 'low',
            environmental_effects: []
          },
          background_design: scene.background_design || 'dark_gradient',
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
                  end_time: elem.end_time || totalDurationMs
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
        slide_end_ms: cumulativeStartMs + totalDurationMs,
        slide_duration_ms: totalDurationMs,
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
          duration_ms: totalDurationMs,
          scene_count: sceneGraph.scenes.length,
          element_count: sceneGraph.scenes.reduce((acc, s) => acc + s.layers.reduce((la, l) => la + l.elements.length, 0), 0),
          voice_package_reference: vp.id
        }),
        slide_start_ms: cumulativeStartMs,
        duration_ms: totalDurationMs,
        status: 'generated',
        version: 1
      });

      storySlideIds.push(slide.id);

      // Record AI Decision
      await base44.asServiceRole.entities.APDDecisionRecord.create({
        stories_presentation_id: presentation.id,
        story_slide_id: slide.id,
        decision_type: 'presentation_strategy',
        decision_inputs: JSON.stringify({
          headline: pkg.headline_suggestions || pkg.article_id || '',
          story_summary: (pkg.story_summary || '').substring(0, 500),
          tone: pkg.tone,
          voice_duration_ms: totalDurationMs,
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
      const slideQA = evaluateDeterministicQA(sceneGraph, vp, totalDurationMs);

      // Update slide with QA results in metadata
      await base44.asServiceRole.entities.StorySlide.update(slide.id, {
        slide_metadata: JSON.stringify({
          headline: pkg.headline_suggestions || pkg.article_id || `Story ${i + 1}`,
          story_summary: pkg.story_summary || '',
          duration_ms: totalDurationMs,
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
        end_time: cumulativeStartMs + totalDurationMs
      });

      cumulativeStartMs += totalDurationMs;
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
// SCENE GRAPH PROMPT BUILDER
// ==========================================================
function buildSceneGraphPrompt(pkg, vp, productionProfile, sentenceTimeline, slideIndex, totalSlides, screenResolution, screenAspectRatio) {
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

AVAILABLE IMAGE ASSET: ${pkg.generated_image_url || 'None'}

INSTRUCTIONS:
Analyze the story using the APD Decision Hierarchy: Story → Meaning → Facts → Voice → Presentation Strategy → Visual Strategy → Motion Strategy → Assets → Animation → Story Slide.

Generate a Scene Graph for this Story Slide. Create 2-6 Presentation Scenes based on natural communication changes (topic shifts, new subjects, statistics, quotes, discussion points, emotional shifts). Each scene must have a clear purpose.

For each scene, determine:
- Camera behavior (static, slow_push, pull_back, pan_left, pan_right, tilt, drift, parallax, focus_shift)
- Motion intensity (low, medium, high)
- Background design (choose from the STYLE GUIDE background options — each scene MUST use a different one)
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
ANIMATION VARIETY RULE: Never use the same entrance_animation for more than 2 elements in the same scene. Rotate through different animations to create choreographic rhythm. Match animation to element purpose:
- Headlines: "slide", "slide_up", "scale_bounce"
- Body text: "fade", "dissolve", "reveal"
- Statistics: "scale", "scale_bounce", "zoom_in"
- Images: "float", "fade", "dissolve_in"
- Quotes: "reveal", "slide_down", "dissolve"
- Lower thirds: "slide_left", "slide"
- Callouts: "expand", "scale_bounce", "wipe"
- Icons: "float", "scale"

EXIT ANIMATIONS:
- "fade_out" — opacity fade-out
- "slide_out" — slide out to right
- "slide_out_left" — slide out to left
- "scale_out" — zoom out to small
- "dissolve_out" — blur-to-blur exit

VISUAL EFFECTS — Each element MUST include a visual_effects array with at least 2 effects. This is CRITICAL — slides must look rich and polished, not flat:
- "glass_panel" — frosted glass background with blur (cards, callouts, statistics, headlines)
- "glow_border" — glowing colored border (headlines, callouts, statistics, talking_point_card)
- "neon_shadow" — neon glow text shadow (headlines, statistics, emphasis text)
- "gradient_border" — subtle gradient border (quotes, premium elements)
- "drop_shadow" — standard drop shadow for depth (body_text, secondary content)
- "inner_glow" — inner glow effect (panels, large cards)
VISUAL EFFECT RULES:
1. Headlines MUST include: ["glass_panel", "glow_border", "neon_shadow"]
2. Statistics MUST include: ["glass_panel", "neon_shadow"]
3. Quotes MUST include: ["glass_panel", "gradient_border"]
4. Callouts MUST include: ["glass_panel", "glow_border"]
5. Talking point cards MUST include: ["glass_panel", "glow_border"]
6. Body text MUST include: ["drop_shadow"]
7. NEVER leave visual_effects empty — every element needs visual treatment

AMBIENT ANIMATIONS — Each element MUST include an ambient_animation (continuous effect that persists AFTER the entrance animation completes). This keeps slides feeling alive and dynamic — never static:
- "none" — no ambient animation (use sparingly, only for body_text)
- "pulse" — subtle opacity/brightness pulsing (statistics, emphasis elements)
- "glow_breathe" — glow intensity breathing in and out (headlines, neon elements)
- "shimmer" — light sweep across element (premium elements, awards, gold elements)
- "subtle_float" — very subtle vertical floating (images, cards, quotes)
- "text_shimmer" — text glow intensity pulsing (headlines, quotes)
- "border_pulse" — border glow pulsing (callouts, cards)
AMBIENT ANIMATION RULES:
1. At least 60% of elements in each scene MUST have a non-"none" ambient_animation
2. Headlines should use "glow_breathe" or "text_shimmer"
3. Statistics should use "pulse"
4. Quotes should use "subtle_float"
5. Callouts should use "border_pulse"
6. Body text can use "none" (entrance animation is sufficient)
7. NEVER make an entire scene static — at least one element should always be moving

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
- scenes: array of scene objects (each with scene_id, scene_order, scene_type, scene_purpose, scene_start_time, scene_end_time, camera_behavior, camera_target, motion_intensity, background_design, layers with elements)
- Each element MUST include: element_type, content, position_x, position_y, scale, opacity, entrance_animation, exit_animation, font_style, color_theme, visual_effects (array of strings), ambient_animation (string), start_time, end_time
- decision_rationale: explanation of your directing decisions
- confidence_score: 0-100 confidence that this slide communicates the story effectively

CRITICAL REMINDER: Every element MUST have visual_effects (at least 2) and ambient_animation. Slides must look visually rich with glass panels, glowing borders, neon shadows, and continuous ambient motion. A slide where text just fades in and sits static is a FAILURE.`;
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