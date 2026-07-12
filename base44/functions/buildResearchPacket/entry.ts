import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-POC-001 — Packet Department (Research Profile)
 *
 * Constructs the final Production Packet from all approved production assets.
 * Upgraded to use the full AI Presentation Director pipeline:
 *   1. Generates a VoicePackage (TTS narration) for each package that lacks one
 *   2. Calls the LLM to design a full scene graph per slide (scenes, camera, elements)
 *   3. Creates StorySlides with voice-synced timing, animations, and layered elements
 *   4. Runs deterministic + AI QA evaluation
 *   5. Assembles the master StoriesPresentation with timeline + confidence score
 */

const CHARS_PER_SECOND = 15;
const SCREEN_RESOLUTION = '1920x1080';
const SCREEN_ASPECT_RATIO = '16:9';

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id, presentation_title } = body;

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    // ── Fetch research points ──
    const points = await base44.asServiceRole.entities.ResearchPoint.filter(
      { configuration_id },
      'order'
    );

    if (!points || points.length === 0) {
      return Response.json({
        error: 'No research points found. Complete research and develop stages first.'
      }, { status: 400 });
    }

    // ── Fetch production packages for these points ──
    const pointIds = points.map(p => p.id);
    const allPackages = await base44.asServiceRole.entities.ProductionPackage.filter(
      { source_entity_type: 'ResearchPoint' },
      '-created_date',
      200
    );

    const packages = (allPackages || []).filter(pkg =>
      pointIds.includes(pkg.source_entity_id) &&
      (pkg.status === 'generated' || pkg.status === 'edited' || pkg.status === 'approved')
    );

    if (packages.length === 0) {
      return Response.json({
        error: 'No production packages found. Generate assets in the Develop stage first.'
      }, { status: 400 });
    }

    // ── Fetch config + topics + dossiers for metadata ──
    const config = await base44.asServiceRole.entities.ResearchProductionConfiguration.get(configuration_id);
    const topics = await base44.asServiceRole.entities.ResearchTopic.filter(
      { configuration_id },
      '-created_date'
    );

    const dossierIds = (topics || []).map(t => t.dossier_id).filter(Boolean);
    let dossiers = [];
    if (dossierIds.length > 0) {
      const allDossiers = await base44.asServiceRole.entities.ResearchDossier.filter(
        {},
        '-created_date',
        100
      );
      dossiers = (allDossiers || []).filter(d => dossierIds.includes(d.id) && d.status === 'ready');
    }

    // ── Check for existing presentation (idempotent) ──
    const existingPresentations = await base44.asServiceRole.entities.StoriesPresentation.filter(
      { production_profile: 'research' },
      '-created_date',
      10
    );

    const existingForConfig = (existingPresentations || []).find(p => {
      try {
        const meta = JSON.parse(p.presentation_metadata || '{}');
        return meta.configuration_id === configuration_id;
      } catch { return false; }
    });

    const title = presentation_title || `${config?.production_name || 'Research'} — Research Presentation`;

    let presentation;
    if (existingForConfig) {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.update(
        existingForConfig.id,
        {
          title,
          story_package_ids: JSON.stringify(packages.map(p => p.id)),
          status: 'generating',
          presentation_metadata: JSON.stringify({
            title,
            production_profile: 'research',
            configuration_id,
            creator: user.full_name || user.email,
            creator_id: user.id,
            generated_at: new Date().toISOString(),
            package_count: packages.length,
            dossier_count: dossiers.length,
          }),
        }
      );
    } else {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.create({
        title,
        production_profile: 'research',
        story_package_ids: JSON.stringify(packages.map(p => p.id)),
        story_slide_ids: JSON.stringify([]),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        presentation_metadata: JSON.stringify({
          title,
          production_profile: 'research',
          configuration_id,
          creator: user.full_name || user.email,
          creator_id: user.id,
          generated_at: new Date().toISOString(),
          package_count: packages.length,
          dossier_count: dossiers.length,
        }),
        playback_settings: JSON.stringify({
          resolution: SCREEN_RESOLUTION,
          aspect_ratio: SCREEN_ASPECT_RATIO,
          frame_rate: 30,
          playback_mode: 'sequential',
          transition_defaults: { type: 'fade', duration_ms: 500 },
        }),
        producer_id: user.id,
        status: 'generating',
        story_count: packages.length,
      });
    }

    // ── Resumable: fetch existing slides (don't delete — skip ones with scene graphs) ──
    const existingSlides = await base44.asServiceRole.entities.StorySlide.filter(
      { stories_presentation_id: presentation.id },
      'story_order'
    );

    // Map: package_id -> existing slide (with scene graph already generated)
    const slidesByPackage = {};
    for (const s of (existingSlides || [])) {
      if (s.story_package_id && s.scene_graph) {
        slidesByPackage[s.story_package_id] = s;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Ensure each package has a VoicePackage (generate if missing)
    // ═══════════════════════════════════════════════════════════════
    const slideIds = [];
    let cumulativeStartMs = 0;
    const masterTimelineEvents = [];
    let slidesProcessed = 0;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const point = points.find(p => p.id === pkg.source_entity_id);
      const scriptText = pkg.teleprompter_script || pkg.story_summary || point?.content || '';

      if (!scriptText) {
        continue;
      }

      // ── Skip if slide already has a scene graph (resumable) ──
      if (slidesByPackage[pkg.id]) {
        const existingSlide = slidesByPackage[pkg.id];
        slideIds.push(existingSlide.id);
        cumulativeStartMs += existingSlide.duration_ms || 0;
        masterTimelineEvents.push({
          event_type: 'slide_start',
          slide_id: existingSlide.id,
          start_time: cumulativeStartMs - (existingSlide.duration_ms || 0),
          end_time: cumulativeStartMs,
        });
        slidesProcessed++;
        continue;
      }

      let vp = null;

      // Use existing VoicePackage if attached
      if (pkg.voice_package_id) {
        vp = await base44.asServiceRole.entities.VoicePackage.get(pkg.voice_package_id);
      }

      // Generate a new VoicePackage if none exists
      if (!vp || vp.status !== 'generated') {
        const speechResult = await base44.asServiceRole.integrations.Core.GenerateSpeech({
          text: scriptText.substring(0, 5000),
          voice: 'river',
          language_code: 'en',
        });
        const audioUrl = speechResult?.url || null;

        // Build estimated sentence timeline
        const sentences = scriptText.match(/[^.!?]+[.!?]*/g) || [scriptText];
        let runningTime = 0;
        const sentenceTimeline = sentences.map((s, idx) => {
          const dur = Math.ceil(s.trim().length / CHARS_PER_SECOND);
          const start = runningTime;
          const end = runningTime + dur;
          runningTime = end;
          return {
            sentence_id: idx,
            sentence_text: s.trim(),
            start_time: +start.toFixed(2),
            end_time: +end.toFixed(2),
            duration: +dur.toFixed(2),
          };
        });

        const estimatedDuration = Math.ceil(scriptText.length / CHARS_PER_SECOND);
        const words = scriptText.trim().split(/\s+/).filter(Boolean);
        const timestampedTranscript = sentenceTimeline.map(s => {
          const mins = Math.floor(s.start_time / 60);
          const secs = Math.floor(s.start_time % 60);
          return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}  ${s.sentence_text}`;
        }).join('\n');

        const newVP = await base44.asServiceRole.entities.VoicePackage.create({
          source_type: 'production_package',
          source_id: pkg.id,
          voice_audio_url: audioUrl,
          teleprompter_script: scriptText,
          transcript: scriptText,
          timestamped_transcript: timestampedTranscript,
          sentence_timeline: JSON.stringify(sentenceTimeline),
          voice_metadata: JSON.stringify({
            voice_id: 'river',
            voice_name: 'River',
            voice_provider: 'generate_speech',
            language: 'en',
            speaking_style: 'narration',
            generation_engine: 'base44 GenerateSpeech',
            generation_date: new Date().toISOString(),
          }),
          runtime_stats: JSON.stringify({
            total_runtime: estimatedDuration,
            total_words: words.length,
            total_sentences: sentenceTimeline.length,
            wpm: Math.round(words.length / Math.max(estimatedDuration / 60, 0.1)),
          }),
          total_duration_seconds: estimatedDuration,
          status: 'generated',
          is_primary: true,
        });

        // Link VP to the package
        await base44.asServiceRole.entities.ProductionPackage.update(pkg.id, {
          voice_package_id: newVP.id,
        });

        vp = newVP;
      }

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: AI Presentation Director — Generate Scene Graph
      // ═══════════════════════════════════════════════════════════════
      const totalDurationMs = (vp.total_duration_seconds || 0) * 1000;
      let sentenceTimeline = [];
      try { sentenceTimeline = JSON.parse(vp.sentence_timeline || '[]'); } catch (e) {}

      let imagePool = [];
      try { imagePool = JSON.parse(pkg.image_variations || '[]'); } catch (e) {}
      if (imagePool.length === 0 && pkg.generated_image_url) {
        imagePool = [{ id: `img_fallback_${i}`, url: pkg.generated_image_url }];
      }

      const sceneGraphPrompt = buildSceneGraphPrompt(pkg, vp, 'research', sentenceTimeline, i, packages.length, SCREEN_RESOLUTION, SCREEN_ASPECT_RATIO);

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: sceneGraphPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            scenes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  scene_id: { type: 'string' },
                  scene_order: { type: 'number' },
                  scene_type: { type: 'string' },
                  scene_purpose: { type: 'string' },
                  scene_start_time: { type: 'number' },
                  scene_end_time: { type: 'number' },
                  camera_behavior: { type: 'string' },
                  camera_target: { type: 'string' },
                  motion_intensity: { type: 'string' },
                  background_design: { type: 'string' },
                  layers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        layer_type: { type: 'string' },
                        z_order: { type: 'number' },
                        elements: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              element_type: { type: 'string' },
                              content: { type: 'string' },
                              position_x: { type: 'number' },
                              position_y: { type: 'number' },
                              scale: { type: 'number' },
                              opacity: { type: 'number' },
                              entrance_animation: { type: 'string' },
                              exit_animation: { type: 'string' },
                              font_style: { type: 'string' },
                              color_theme: { type: 'string' },
                              visual_effects: { type: 'array', items: { type: 'string' } },
                              ambient_animation: { type: 'string' },
                              start_time: { type: 'number' },
                              end_time: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            decision_rationale: { type: 'string' },
            confidence_score: { type: 'number' },
          },
        },
        model: 'gpt_5_mini',
      });

      const sceneGraphData = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;

      // Build the complete scene graph — limit scenes to 5 and truncate content to stay under field size limit
      let imgIdx = 0;
      const sceneGraph = {
        slide_id: `slide_${i + 1}`,
        story_package_id: pkg.id,
        voice_package_id: vp.id,
        scenes: (sceneGraphData.scenes || []).slice(0, 3).map((scene, sIdx) => ({
          scene_id: scene.scene_id || `scene_${i + 1}_${sIdx + 1}`,
          scene_order: scene.scene_order || sIdx + 1,
          scene_type: scene.scene_type || 'emphasis_text',
          scene_purpose: (scene.scene_purpose || '').substring(0, 100),
          scene_start_time: scene.scene_start_time || 0,
          scene_end_time: scene.scene_end_time || totalDurationMs,
          scene_duration: (scene.scene_end_time || totalDurationMs) - (scene.scene_start_time || 0),
          camera_state: {
            behavior: scene.camera_behavior || 'static',
            target: (scene.camera_target || '').substring(0, 50),
          },
          motion_state: {
            intensity: scene.motion_intensity || 'low',
          },
          background_design: scene.background_design || 'dark_gradient',
          layers: (scene.layers || []).slice(0, 3).map((layer, lIdx) => ({
            layer_id: `layer_${i + 1}_${sIdx + 1}_${lIdx}`,
            layer_type: layer.layer_type || 'background',
            z_order: layer.z_order !== undefined ? layer.z_order : lIdx,
            elements: (layer.elements || []).slice(0, 3).map((elem, eIdx) => {
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
                content: (elem.content || '').substring(0, 150),
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
                  end_time: elem.end_time || totalDurationMs,
                }],
                asset_reference: assetRef,
                asset_id: assetId,
              };
            }),
          })),
        })),
        decision_rationale: (sceneGraphData.decision_rationale || '').substring(0, 200),
        confidence_score: sceneGraphData.confidence_score || 80,
      };

      // ── Hard size limit: keep scene graph under 25KB ──
      let sceneGraphStr = JSON.stringify(sceneGraph);
      if (sceneGraphStr.length > 25000) {
        for (const scene of sceneGraph.scenes) {
          scene.scene_purpose = (scene.scene_purpose || '').substring(0, 50);
          scene.camera_state.target = (scene.camera_state.target || '').substring(0, 20);
          for (const layer of (scene.layers || [])) {
            for (const elem of (layer.elements || [])) {
              if (elem.content) elem.content = elem.content.substring(0, 80);
            }
          }
        }
        sceneGraph.decision_rationale = (sceneGraph.decision_rationale || '').substring(0, 100);
        sceneGraphStr = JSON.stringify(sceneGraph);
      }
      if (sceneGraphStr.length > 25000) {
        // Emergency: strip all non-essential fields, keep only structure
        for (const scene of sceneGraph.scenes) {
          delete scene.scene_purpose;
          delete scene.scene_duration;
          scene.camera_state = { behavior: scene.camera_state?.behavior || 'static' };
          scene.motion_state = { intensity: scene.motion_state?.intensity || 'low' };
          for (const layer of (scene.layers || [])) {
            delete layer.layer_id;
            for (const elem of (layer.elements || [])) {
              elem.content = (elem.content || '').substring(0, 30);
              delete elem.rotation;
              delete elem.visibility;
              delete elem.exit_animation;
              delete elem.asset_id;
              if (elem.timeline_events) elem.timeline_events = elem.timeline_events.slice(0, 1);
            }
          }
        }
        sceneGraphStr = JSON.stringify(sceneGraph);
      }

      // Build slide timeline
      const slideTimeline = {
        slide_start_ms: cumulativeStartMs,
        slide_end_ms: cumulativeStartMs + totalDurationMs,
        slide_duration_ms: totalDurationMs,
        sentence_count: sentenceTimeline.length,
        voice_audio_url: vp.voice_audio_url || '',
      };

      // ═══════════════════════════════════════════════════════════════
      // STEP 3: Create StorySlide with full scene graph
      // ═══════════════════════════════════════════════════════════════
      const slideMetadata = {
        headline: point?.title || pkg.headline_suggestions || `Slide ${i + 1}`,
        story_summary: pkg.story_summary || point?.content?.substring(0, 200) || '',
        duration_ms: totalDurationMs,
        scene_count: sceneGraph.scenes.length,
        element_count: sceneGraph.scenes.reduce((acc, s) => acc + s.layers.reduce((la, l) => la + l.elements.length, 0), 0),
        voice_package_reference: vp.id,
        source_point_id: point?.id || null,
        source_point_type: point?.point_type || 'finding',
      };

      const slide = await base44.asServiceRole.entities.StorySlide.create({
        stories_presentation_id: presentation.id,
        story_package_id: pkg.id,
        presentation_point_id: point?.id || null,
        story_order: i,
        slide_number: i,
        voice_package_id: vp.id,
        scene_graph: sceneGraphStr,
        slide_timeline: JSON.stringify(slideTimeline),
        slide_metadata: JSON.stringify(slideMetadata),
        slide_start_ms: cumulativeStartMs,
        duration_ms: totalDurationMs,
        status: 'generated',
        is_derived: false,
        version: 1,
      });

      slideIds.push(slide.id);
      slidesProcessed++;

      // ── Save progress after each slide (resumable on timeout) ──
      await base44.asServiceRole.entities.StoriesPresentation.update(
        presentation.id,
        { story_slide_ids: JSON.stringify(slideIds), story_count: slideIds.length }
      );

      // Record AI decision
      await base44.asServiceRole.entities.APDDecisionRecord.create({
        stories_presentation_id: presentation.id,
        story_slide_id: slide.id,
        decision_type: 'presentation_strategy',
        decision_inputs: JSON.stringify({
          headline: slideMetadata.headline,
          story_summary: (pkg.story_summary || '').substring(0, 500),
          tone: pkg.tone,
          voice_duration_ms: totalDurationMs,
          sentence_count: sentenceTimeline.length,
        }),
        decision_rationale: sceneGraphData.decision_rationale || 'APD generated scene graph based on research point analysis',
        model_version: 'gpt_5_mini',
        prompt_version: 'apd_v1.0',
        temperature: 0.7,
        confidence_score: sceneGraphData.confidence_score || 80,
        decision_summary: `Generated ${sceneGraph.scenes.length} scenes for Slide ${i + 1}`,
      });

      // Deterministic QA for this slide
      const slideQA = evaluateDeterministicQA(sceneGraph, vp, totalDurationMs);
      await base44.asServiceRole.entities.StorySlide.update(slide.id, {
        slide_metadata: JSON.stringify({ ...slideMetadata, qa_scores: slideQA }),
      });

      masterTimelineEvents.push({
        event_type: 'slide_start',
        slide_id: slide.id,
        start_time: cumulativeStartMs,
        end_time: cumulativeStartMs + totalDurationMs,
      });

      cumulativeStartMs += totalDurationMs;
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Aggregate QA + Finalize Presentation
    // ═══════════════════════════════════════════════════════════════
    const masterTimeline = {
      events: masterTimelineEvents,
      total_duration_ms: cumulativeStartMs,
      slide_count: slideIds.length,
    };

    // Collect per-slide QA scores
    const slideQAScores = [];
    for (const slideId of slideIds) {
      const slide = await base44.asServiceRole.entities.StorySlide.get(slideId);
      const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
      if (meta.qa_scores) slideQAScores.push(meta.qa_scores);
    }

    const avg = (key) => slideQAScores.length > 0
      ? Math.round(slideQAScores.reduce((a, s) => a + (s[key] || 0), 0) / slideQAScores.length)
      : 0;

    const deterministicQA = {
      story_integrity: avg('story_integrity'),
      timeline_synchronization: avg('timeline_synchronization'),
      readability: avg('readability'),
      technical_integrity: avg('technical_integrity'),
    };

    let aiQA = { communication: 80, motion: 80, consistency: 80 };
    try {
      aiQA = await evaluateAIQA(base44, title, 'research', slideIds);
    } catch (e) {
      // Fall back to defaults
    }

    const qaScores = {
      story_integrity: deterministicQA.story_integrity,
      timeline_synchronization: deterministicQA.timeline_synchronization,
      communication: aiQA.communication,
      readability: deterministicQA.readability,
      motion: aiQA.motion,
      technical_integrity: deterministicQA.technical_integrity,
      consistency: aiQA.consistency,
    };

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

    presentation = await base44.asServiceRole.entities.StoriesPresentation.update(
      presentation.id,
      {
        story_slide_ids: JSON.stringify(slideIds),
        story_count: slideIds.length,
        master_timeline: JSON.stringify(masterTimeline),
        total_runtime_ms: cumulativeStartMs,
        qa_scores: JSON.stringify(qaScores),
        confidence_score: confidenceScore,
        qa_result: qaResult,
        status: 'generated',
        completed_at: new Date().toISOString(),
      }
    );

    // ── If not all slides processed, return partial status (frontend will retry) ──
    const allProcessed = slidesProcessed >= packages.filter(p => {
      const pt = points.find(pt => pt.id === p.source_entity_id);
      return p.teleprompter_script || p.story_summary || pt?.content;
    }).length;

    if (!allProcessed) {
      return Response.json({
        presentation,
        slides_created: slideIds.length,
        slide_ids: slideIds,
        packages_total: packages.length,
        completed: false,
        message: `Processed ${slideIds.length}/${packages.length} slides. Retrying to continue...`,
      });
    }

    return Response.json({
      presentation,
      slides_created: slideIds.length,
      slide_ids: slideIds,
      packages_included: packages.length,
      voice_packages_generated: packages.filter(p => !p.voice_package_id).length,
      dossiers_included: dossiers.length,
      total_runtime_ms: cumulativeStartMs,
      confidence_score: confidenceScore,
      qa_result: qaResult,
      completed: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ═════════════════════════════════════════════════════════════════
// SCENE GRAPH PROMPT BUILDER
// ═════════════════════════════════════════════════════════════════
function buildSceneGraphPrompt(pkg, vp, productionProfile, sentenceTimeline, slideIndex, totalSlides, screenResolution, screenAspectRatio) {
  const headline = pkg.headline_suggestions || 'Untitled Research Point';
  const script = vp.teleprompter_script || pkg.teleprompter_script || '';
  const storySummary = pkg.story_summary || '';
  const talkingPoints = pkg.talking_points || '';
  const factCheckNotes = pkg.fact_check_notes || '';
  const visualSuggestions = pkg.visual_suggestions || '';
  const lowerThirdText = pkg.lower_third_text || '';
  const producerNotes = pkg.producer_notes || '';
  const tone = pkg.tone || 'educational';
  const totalDurationMs = (vp.total_duration_seconds || 0) * 1000;

  const sentences = sentenceTimeline.map(s => ({
    text: s.sentence_text || '',
    start: s.start_time || 0,
    end: s.end_time || 0,
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

SAFE AREA RULES (CRITICAL — ALL ELEMENTS MUST FIT ON SCREEN):
1. All element positions use normalized coordinates (0.0 to 1.0). Origin is top-left (0,0), bottom-right is (1,1).
2. SAFE AREA: Keep ALL element positions within x: 0.08 to 0.92 and y: 0.08 to 0.92.
3. Element scale should be between 0.8 and 1.3. Never use scale > 1.5.
4. No two text elements should overlap. Stagger positions vertically.
5. Headlines should be centered horizontally (x=0.5) and placed in the upper third (y=0.15 to 0.30).
6. Body text should be centered horizontally (x=0.5) and placed in the middle (y=0.45 to 0.60).
7. Lower thirds anchor to bottom-left.
8. Images should not exceed 60% of screen width — use scale 0.8 to 1.0.

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

Element types: headline, body_text, talking_point_card, discussion_response, lower_third, callout, statistic, quote.
NOTE: Only use element type "image" when a real image asset URL is available (see AVAILABLE IMAGE ASSET above). If no image URL is available, do NOT create image elements. NEVER create image elements to represent backgrounds — backgrounds are handled by the scene-level background_design property only.

CRITICAL CONTENT RULES:
1. NEVER put background design names (e.g. "gradient_orb_background", "particle_field") as element content. These are scene-level properties, not text.
2. NEVER create placeholder content like "test_badge_icon" or "background_image". Every element's content must be real, meaningful text from the story.
3. When the script mentions statistics, numbers, percentages, or data points, create a "statistic" element with the ACTUAL number or data as its content (e.g. "73%", "$2.4M", "1 in 4").
4. When the script contains a quote, create a "quote" element with the actual quoted text.
5. Headlines must contain the actual story headline, not labels like "headline" or "title".
6. Body text must contain actual narration or story content, not descriptions of what should appear.

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

CRITICAL: All elements MUST fit within the display screen. Respect the Safe Area Rules — positions must be within x: 0.08–0.92, y: 0.08–0.92.

All timing must be in milliseconds and synchronized with the Voice Package sentence timeline. Elements should appear when their relevant narration begins and disappear when no longer relevant.

Return a JSON object with:
- scenes: array of scene objects (each with scene_id, scene_order, scene_type, scene_purpose, scene_start_time, scene_end_time, camera_behavior, camera_target, motion_intensity, background_design, layers with elements)
- Each element MUST include: element_type, content, position_x, position_y, scale, opacity, entrance_animation, exit_animation, font_style, color_theme, visual_effects (array of strings), ambient_animation (string), start_time, end_time
- decision_rationale: explanation of your directing decisions
- confidence_score: 0-100 confidence that this slide communicates the story effectively

CRITICAL REMINDER: Every element MUST have visual_effects (at least 2) and ambient_animation. Slides must look visually rich with glass panels, glowing borders, neon shadows, and continuous ambient motion. A slide where text just fades in and sits static is a FAILURE.`;
}

// ═════════════════════════════════════════════════════════════════
// QA EVALUATION HELPERS
// ═════════════════════════════════════════════════════════════════

function evaluateDeterministicQA(sceneGraph, voicePackage, totalDurationMs) {
  const scenes = sceneGraph.scenes || [];

  let storyIntegrity = 100;
  for (const scene of scenes) {
    const hasContent = (scene.layers || []).some(l => (l.elements || []).some(e => e.content));
    if (!hasContent) storyIntegrity -= 20;
  }
  if (scenes.length === 0) storyIntegrity = 0;
  storyIntegrity = Math.max(0, storyIntegrity);

  let timelineSync = 100;
  for (const scene of scenes) {
    if ((scene.scene_end_time || 0) > totalDurationMs + 1000) timelineSync -= 15;
    if ((scene.scene_start_time || 0) < 0) timelineSync -= 10;
  }

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
    dead_time_seconds: Math.round(deadTimeSeconds),
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
      ),
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
      type: 'object',
      properties: {
        communication: { type: 'number' },
        motion: { type: 'number' },
        consistency: { type: 'number' },
      },
    },
    model: 'gpt_5_mini',
  });

  return typeof response === 'string' ? JSON.parse(response) : response;
}