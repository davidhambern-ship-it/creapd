import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * AI Presentation Director (APD)
 *
 * Analyzes each StorySlide's Story Package + Voice Package and produces an
 * intelligent scene_graph with camera behavior, scene structure, motion
 * strategy, and synchronized element timing.
 *
 * Creates APDDecisionRecord entries for traceability.
 *
 * Follows the APD Specification: Story → Meaning → Facts → Voice →
 * Presentation Strategy → Visual Strategy → Motion Strategy → Slide.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_id } = await req.json();
    if (!presentation_id) {
      return Response.json({ error: 'presentation_id is required' }, { status: 400 });
    }

    // ── Load presentation ──
    const presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    if (!presentation) {
      return Response.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // ── Load slides in order ──
    let slideOrder = [];
    try { slideOrder = JSON.parse(presentation.slide_order || '[]'); } catch {}
    let slides = await base44.asServiceRole.entities.StorySlide.filter(
      { stories_presentation_id: presentation_id }, 'slide_number', 50
    );
    if (!slides || slides.length === 0) {
      return Response.json({ error: 'No slides found in presentation' }, { status: 400 });
    }
    if (slideOrder.length > 0) {
      const map = {};
      slides.forEach(s => { map[s.id] = s; });
      slides = slideOrder.map(id => map[id]).filter(Boolean);
    }

    // ── Load all elements for these slides ──
    const allElements = await base44.asServiceRole.entities.SlideElement.filter(
      { presentation_id }, 'z_index', 500
    );
    const elementMap = {};
    (allElements || []).forEach(el => {
      if (!elementMap[el.slide_id]) elementMap[el.slide_id] = [];
      elementMap[el.slide_id].push(el);
    });

    // ── Load production packages ──
    let packageIds = [];
    try { packageIds = JSON.parse(presentation.story_package_ids || '[]'); } catch {}
    const pkgMap = {};
    if (packageIds.length > 0) {
      const allPkgs = await base44.asServiceRole.entities.ProductionPackage.filter({}, '-created_date', 200);
      (allPkgs || []).forEach(p => { if (packageIds.includes(p.id)) pkgMap[p.id] = p; });
    }

    // ── Load voice packages ──
    const allVPs = await base44.asServiceRole.entities.VoicePackage.filter(
      { source_type: 'production_package' }, '-created_date', 200
    );
    const vpMap = {};
    (allVPs || []).forEach(vp => { if (vp.source_id && !vpMap[vp.source_id]) vpMap[vp.source_id] = vp; });

    let totalConfidence = 0;
    let directedCount = 0;

    // ── Direct each slide ──
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const elements = elementMap[slide.id] || [];
      const pkg = pkgMap[slide.story_package_id] || null;
      const vp = slide.voice_package_id
        ? (await base44.asServiceRole.entities.VoicePackage.get(slide.voice_package_id))
        : (pkg ? vpMap[pkg.id] : null);

      const sceneGraph = await directSlide(base44, {
        slide,
        elements,
        pkg,
        vp,
        slideIndex: i,
        totalSlides: slides.length,
        presentationTitle: presentation.title,
      });

      totalConfidence += sceneGraph.confidence_score || 0;
      directedCount++;

      // ── Save scene_graph to slide ──
      await base44.asServiceRole.entities.StorySlide.update(slide.id, {
        scene_graph: JSON.stringify({
          transition: sceneGraph.transition || 'fade',
          scenes: sceneGraph.scenes || [],
        }),
        slide_timeline: JSON.stringify({
          ...(parseJSON(slide.slide_timeline, {})),
          apd_directed: true,
          scene_count: (sceneGraph.scenes || []).length,
          story_intent: sceneGraph.story_intent,
          presentation_strategy: sceneGraph.presentation_strategy,
          // Store sentence timeline + audio URL so the editor timeline can show
          // sentence snap markers and play the voiceover
          sentence_timeline: sentenceSummaries,
          voice_audio_url: vp?.audio_url || vp?.merged_audio_url || null,
          duration_ms: totalDuration * 1000,
        }),
        slide_metadata: JSON.stringify({
          ...parseJSON(slide.slide_metadata, {}),
          apd_directed: true,
          apd_confidence: sceneGraph.confidence_score,
          apd_story_intent: sceneGraph.story_intent,
        }),
        status: 'approved',
      });

      // ── Sync APD timing back to SlideElement records ──
      // The scene graph contains timing + animation for each element.
      // Write those back to the SlideElement records so the editor timeline
      // reflects the APD's direction.
      const sceneElements = [];
      for (const scene of (sceneGraph.scenes || [])) {
        for (const layer of (scene.layers || [])) {
          for (const elem of (layer.elements || [])) {
            sceneElements.push(elem);
          }
        }
      }
      for (const elem of sceneElements) {
        // Match by content or element_id to existing SlideElement
        const match = elements.find(e =>
          e.id === elem.element_id ||
          (elem.content && e.content && e.content.trim() === elem.content.trim()) ||
          (elem.asset_reference && e.content && e.content === elem.asset_reference)
        );
        if (!match) continue;

        const tlEvents = elem.timeline_events || [];
        const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
        const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;
        const animType = elem.entrance_animation?.type || 'fade_in';
        const animDelay = elem.entrance_animation?.delay_ms ?? startMs;
        const animDur = elem.entrance_animation?.duration_ms ?? Math.max(500, endMs - startMs);

        const updates = {};
        if (startMs !== 0 || endMs !== 0) {
          updates.timing = JSON.stringify({ start_ms: startMs, end_ms: endMs });
        }
        updates.animation = JSON.stringify({
          type: animType, delay_ms: animDelay, duration_ms: animDur,
        });
        await base44.asServiceRole.entities.SlideElement.update(match.id, updates);
      }

      // ── Create APDDecisionRecords ──
      for (const decision of (sceneGraph.decisions || [])) {
        await base44.asServiceRole.entities.APDDecisionRecord.create({
          stories_presentation_id: presentation_id,
          story_slide_id: slide.id,
          decision_type: decision.decision_type,
          decision_inputs: JSON.stringify({
            slide_title: slide.title,
            slide_index: i,
            story_package_id: slide.story_package_id,
            voice_package_id: vp?.id || null,
            tone: pkg?.tone || 'educational',
            audience: pkg?.audience || 'General Public',
          }),
          decision_rationale: decision.rationale,
          decision_summary: decision.summary,
          confidence_score: sceneGraph.confidence_score || 0,
          model_version: 'gpt_5_mini',
          prompt_version: 'apd-v1',
          temperature: 0.7,
        });
      }
    }

    // ── Update presentation with APD metadata ──
    const avgConfidence = directedCount > 0 ? Math.round(totalConfidence / directedCount) : 0;
    const existingMeta = parseJSON(presentation.presentation_metadata, {});
    await base44.asServiceRole.entities.StoriesPresentation.update(presentation_id, {
      confidence_score: avgConfidence,
      qa_result: avgConfidence >= 80 ? 'pass' : (avgConfidence >= 60 ? 'warning' : 'fail'),
      presentation_metadata: JSON.stringify({
        ...existingMeta,
        apd_directed: true,
        apd_confidence: avgConfidence,
        apd_directed_slides: directedCount,
        apd_version: '1.0',
      }),
      status: 'approved',
    });

    return Response.json({
      presentation_id,
      directed_slides: directedCount,
      confidence_score: avgConfidence,
      qa_result: avgConfidence >= 80 ? 'pass' : (avgConfidence >= 60 ? 'warning' : 'fail'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── APD Core: Direct one slide ──
async function directSlide(base44, { slide, elements, pkg, vp, slideIndex, totalSlides, presentationTitle }) {
  // Build the story package context for the LLM
  const sentenceTimeline = parseJSON(vp?.sentence_timeline, '[]');
  const pauseTimeline = parseJSON(vp?.pause_timeline, '[]');
  const totalDuration = vp?.total_duration_seconds || (slide.duration_ms / 1000) || 30;

  // Summarize element assets available — include current timeline state
  const elementSummary = elements.map(el => {
    const elTiming = parseJSON(el.timing, {});
    const elAnim = parseJSON(el.animation, {});
    return {
      id: el.id,
      type: el.type,
      content_preview: (el.content || '').substring(0, 100),
      has_media: el.type === 'image' || el.type === 'video',
      current_position: { x: el.x, y: el.y },
      current_size: { w: el.width, h: el.height },
      current_timing: {
        start_ms: elTiming.start_ms ?? 0,
        end_ms: elTiming.end_ms ?? 0,
      },
      current_animation: {
        type: elAnim.type || 'fade_in',
        delay_ms: elAnim.delay_ms ?? 0,
        duration_ms: elAnim.duration_ms ?? 500,
      },
    };
  });

  // Build sentence summaries for scene timing
  const sentenceSummaries = (Array.isArray(sentenceTimeline) ? sentenceTimeline : []).map((s, idx) => ({
    index: idx,
    text: (s.sentence_text || '').substring(0, 120),
    start_time: s.start_time || 0,
    end_time: s.end_time || 0,
    duration: s.duration || 0,
  }));

  // Determine available visual assets from the package
  const imageUrl = pkg?.generated_image_url || '';
  const lowerThird = pkg?.lower_third_text || '';
  const talkingPoints = pkg?.talking_points || '';
  const factCheckNotes = pkg?.fact_check_notes || '';
  const visualSuggestions = pkg?.visual_suggestions || '';
  const brollSuggestions = pkg?.broll_suggestions || '';

  const isTitleSlide = slideIndex === 0;
  const isClosingSlide = slideIndex === totalSlides - 1;

  const prompt = `You are the AI Presentation Director (APD) for CREAPD. Your job is to direct one Story Slide by creating an intelligent scene graph that synchronizes visuals, camera movement, and text with voiceover narration.

# APD DIRECTING PRINCIPLES
1. Story Before Presentation — every visual decision must support story communication
2. Voice Drives Everything — the voiceover timeline is the master clock; never guess timing
3. One Story Package = One Story Slide — this is one slide, not multiple
4. Scenes are determined by narration changes (new topic, person, statistic, quote), NOT by time intervals
5. Camera movement supports narration — never use camera motion merely for visual activity
6. Motion exists to guide attention — never decorate without purpose
7. Every Story Slide must feel alive — maintain continuous visual life during narration
8. Images are NEVER backgrounds by default — background placement is a directing decision

# COMMUNICATION HIERARCHY
1. Voiceover (highest priority)
2. Visual Storytelling
3. Supporting Graphics
4. Motion
5. Decorative Effects (lowest priority)

# SLIDE CONTEXT
- Presentation: "${presentationTitle}"
- Slide ${slideIndex + 1} of ${totalSlides}
- Slide Type: ${isTitleSlide ? 'title_slide' : (isClosingSlide ? 'closing_slide' : 'content_slide')}
- Slide Title: "${slide.title || ''}"
- Slide Duration: ${totalDuration} seconds

# STORY PACKAGE (source of truth — do NOT alter facts)
- Headline: ${slide.title || ''}
- Story Summary: ${(pkg?.story_summary || '').substring(0, 500)}
- Teleprompter Script: ${(pkg?.teleprompter_script || slide.body_text || '').substring(0, 800)}
- Tone: ${pkg?.tone || 'educational'}
- Audience: ${pkg?.audience || 'General Public'}
- Lower Third Text: ${lowerThird}
- Talking Points: ${talkingPoints.substring(0, 300)}
- Fact Check Notes: ${factCheckNotes.substring(0, 300)}
- Visual Suggestions: ${visualSuggestions.substring(0, 300)}
- B-Roll Suggestions: ${brollSuggestions.substring(0, 200)}
- Story Image Available: ${imageUrl ? 'YES' : 'NO'}
- Image URL: ${imageUrl || 'none'}

# VOICE PACKAGE TIMELINE (master clock)
- Total Duration: ${totalDuration}s
- Sentence Count: ${sentenceSummaries.length}
- Sentence Timeline: ${JSON.stringify(sentenceSummaries.slice(0, 20))}
- Pause Timeline: ${JSON.stringify((Array.isArray(pauseTimeline) ? pauseTimeline : []).slice(0, 10))}

# EXISTING SLIDE ELEMENTS (already placed on canvas — you may reposition)
${JSON.stringify(elementSummary)}

# CURRENT TIMELINE STATE (producer may have manually edited these — respect them)
Each element already has timing and animation on the timeline:
${JSON.stringify(elementSummary.map(e => ({
  id: e.id, type: e.type,
  timing: e.current_timing,
  animation: e.current_animation,
})))}

# YOUR TASK
Analyze this story package and direct the slide. Produce a scene_graph that:
1. Divides the slide into 2-5 scenes based on narration content changes (NOT time intervals)
2. Assigns camera behavior to each scene (static, slow_push, zoom_in, zoom_out, pan_left, pan_right, drift)
3. Places elements at normalized positions (0-1 scale) within each scene
4. SYNCHRONIZES element visibility with the voiceover sentence timeline — each text element's timeline_events MUST align with the sentence boundaries above. When a sentence is spoken, the corresponding text should be visible. Use the sentence start_time/end_time as the element's timeline_events.
5. Applies entrance animations (fade_in, slide_in, scale_in, gentle_float) with delay_ms matching the sentence start_time
6. Animation duration_ms should match the sentence duration — text appears for exactly as long as the sentence is spoken
7. If the producer has already set timing on an element, PRESERVE it unless it conflicts with the sentence timeline
8. Varies layout from other slides — avoid repetition

Element types you can use: headline, body_text, image, talking_point_card, discussion_response, lower_third, statistic, quote, caption

For each scene, provide a scene_objective answering: "What should the audience understand during this moment?"

Camera behaviors: static, slow_push, zoom_in, zoom_out, pan_left, pan_right, drift
Animation types: fade_in, slide_in, scale_in, gentle_float, fade_out, slide_out

Provide your directing decisions with rationale for: presentation_strategy, visual_storytelling, scene_creation, camera_selection, motion_selection, layout_variation, emotional_pacing.`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    model: 'gpt_5_mini',
    response_json_schema: {
      type: 'object',
      properties: {
        story_intent: {
          type: 'string',
          description: 'Primary communication objective (inform, explain, teach, inspire, warn, etc.)',
        },
        presentation_strategy: {
          type: 'string',
          description: 'Overall approach to presenting this story',
        },
        transition: {
          type: 'string',
          enum: ['fade', 'slide_left', 'slide_right', 'zoom', 'dissolve', 'none'],
          description: 'Transition into this slide',
        },
        scenes: {
          type: 'array',
          description: 'Presentation scenes determined by narration content changes',
          items: {
            type: 'object',
            properties: {
              scene_type: {
                type: 'string',
                enum: ['title_reveal', 'host_intro', 'emphasis_text', 'image_scene', 'quote_card', 'statistic', 'discussion', 'transition', 'closing'],
              },
              scene_start_time: { type: 'number', description: 'Start time in milliseconds' },
              scene_end_time: { type: 'number', description: 'End time in milliseconds' },
              scene_objective: { type: 'string', description: 'What the audience should understand' },
              camera_state: {
                type: 'object',
                properties: {
                  behavior: {
                    type: 'string',
                    enum: ['static', 'slow_push', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'drift'],
                  },
                  rationale: { type: 'string' },
                },
              },
              layers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    layer_id: { type: 'string' },
                    z_order: { type: 'number' },
                    elements: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          element_id: { type: 'string', description: 'Unique ID for this element' },
                          element_type: {
                            type: 'string',
                            enum: ['headline', 'body_text', 'image', 'talking_point_card', 'discussion_response', 'lower_third', 'statistic', 'quote', 'caption'],
                          },
                          content: { type: 'string', description: 'Text content or image URL' },
                          position: {
                            type: 'object',
                            properties: {
                              x: { type: 'number', description: 'Normalized 0-1' },
                              y: { type: 'number', description: 'Normalized 0-1' },
                            },
                          },
                          scale: { type: 'number', description: '0.5-1.5' },
                          opacity: { type: 'number', description: '0-1' },
                          asset_reference: { type: 'string', description: 'Image URL if element_type is image' },
                          entrance_animation: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['fade_in', 'slide_in', 'scale_in', 'gentle_float'] },
                              delay_ms: { type: 'number', description: 'Delay before animation starts in ms — should match the sentence start_time' },
                              duration_ms: { type: 'number', description: 'Animation duration in ms — should match the sentence duration' },
                            },
                          },
                          timeline_events: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                start_time: { type: 'number', description: 'ms' },
                                end_time: { type: 'number', description: 'ms' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        confidence_score: {
          type: 'number',
          description: '0-100 confidence in this direction',
        },
        decisions: {
          type: 'array',
          description: 'APD directing decisions with rationale',
          items: {
            type: 'object',
            properties: {
              decision_type: {
                type: 'string',
                enum: ['presentation_strategy', 'visual_storytelling', 'scene_creation', 'camera_selection', 'motion_selection', 'layout_variation', 'emotional_pacing', 'audience_engagement'],
              },
              rationale: { type: 'string' },
              summary: { type: 'string' },
            },
          },
        },
      },
      required: ['story_intent', 'presentation_strategy', 'transition', 'scenes', 'confidence_score', 'decisions'],
    },
  });

  // Ensure scene times are within slide duration
  const maxMs = totalDuration * 1000;
  const scenes = (response.scenes || []).map(s => ({
    ...s,
    scene_start_time: Math.max(0, Math.min(s.scene_start_time || 0, maxMs)),
    scene_end_time: Math.min(s.scene_end_time || maxMs, maxMs),
  }));

  // If no scenes were generated, create a fallback single-scene slide
  if (scenes.length === 0) {
    scenes.push({
      scene_type: isTitleSlide ? 'title_reveal' : (isClosingSlide ? 'closing' : 'emphasis_text'),
      scene_start_time: 0,
      scene_end_time: maxMs,
      scene_objective: response.presentation_strategy || 'Present the story',
      camera_state: { behavior: 'slow_push', rationale: 'Gentle push to maintain engagement' },
      layers: [{
        layer_id: 'main',
        z_order: 0,
        elements: elements.map(el => ({
          element_id: el.id,
          element_type: el.type === 'text' ? 'body_text' : (el.type === 'image' ? 'image' : el.type),
          content: el.content || '',
          position: { x: 0.5, y: 0.5 },
          scale: 1,
          opacity: 1,
          asset_reference: el.type === 'image' ? el.content : '',
          entrance_animation: { type: 'fade_in' },
          timeline_events: [{ start_time: 0, end_time: maxMs }],
        })),
      }],
    });
  }

  return {
    story_intent: response.story_intent || 'inform',
    presentation_strategy: response.presentation_strategy || '',
    transition: response.transition || 'fade',
    scenes,
    confidence_score: response.confidence_score || 70,
    decisions: response.decisions || [],
  };
}