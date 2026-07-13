import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
          sentence_timeline: sceneGraph.sentence_summaries || [],
          voice_audio_url: vp?.audio_url || vp?.merged_audio_url || null,
          duration_ms: sceneGraph.total_duration_ms || (slide.duration_ms || 5000),
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
        // Clean content of any markup tags the LLM may have injected
        const cleaned = cleanContent(elem.content || '');
        const cleanContentStr = cleaned.content;

        // Match by element_id, asset_reference, or content (cleaned)
        const match = elements.find(e =>
          e.id === elem.element_id ||
          (elem.asset_reference && e.content && e.content === elem.asset_reference) ||
          (cleanContentStr && e.content && e.content.trim() === cleanContentStr) ||
          (cleanContentStr && e.content && cleanContent(e.content).content.trim() === cleanContentStr)
        );
        if (!match) continue;

        // ── MANUAL OVERRIDE PRESERVATION ──
        // If the producer has manually edited this element (version > 1 or
        // qa_status === 'approved'), preserve position, style, and animation
        // overrides. Only update timing fields so the APD can still sync
        // element visibility to the voiceover timeline.
        const isManuallyEdited = match.qa_status === 'approved' || (match.version || 1) > 1;
        if (isManuallyEdited) {
          const tlEventsSafe = elem.timeline_events || [];
          const safeStartMs = tlEventsSafe.length > 0 ? tlEventsSafe[0].start_time : 0;
          const safeEndMs = tlEventsSafe.length > 0 ? tlEventsSafe[0].end_time : 0;
          const safeUpdates = {};
          if (safeStartMs !== 0 || safeEndMs !== 0) {
            safeUpdates.timing = JSON.stringify({ start_ms: safeStartMs, end_ms: safeEndMs });
            safeUpdates.start_ms = safeStartMs;
            safeUpdates.end_ms = safeEndMs;
          }
          if (Object.keys(safeUpdates).length > 0) {
            await base44.asServiceRole.entities.SlideElement.update(match.id, safeUpdates);
          }
          continue;
        }

        const tlEvents = elem.timeline_events || [];
        const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
        const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;

        // Build animation in the categorized format the timeline parses:
        // { entrance: {type, start_ms, delay_ms, duration_ms}, emphasis: {...}, exit: {...} }
        const animObj = {};
        const ent = elem.entrance_animation || {};
        const emph = elem.emphasis_animation || null;
        const exit = elem.exit_animation || null;
        const entType = cleaned.anim || ent.type || 'fade_in';
        const entDelay = ent.delay_ms ?? startMs;
        const entDur = ent.duration_ms ?? Math.max(500, endMs - startMs);
        animObj.entrance = { type: entType, start_ms: entDelay, delay_ms: entDelay, duration_ms: entDur };
        if (emph && emph.type) {
          animObj.emphasis = { type: emph.type, start_ms: emph.delay_ms ?? (startMs + entDur), delay_ms: emph.delay_ms ?? (startMs + entDur), duration_ms: emph.duration_ms || 500 };
        }
        if (exit && exit.type) {
          animObj.exit = { type: exit.type, start_ms: exit.delay_ms ?? Math.max(0, endMs - 500), delay_ms: exit.delay_ms ?? Math.max(0, endMs - 500), duration_ms: exit.duration_ms || 500 };
        }

        const updates = {};
        if (cleanContentStr && match.content !== cleanContentStr &&
            cleanContent(match.content).content !== cleanContentStr) {
          updates.content = cleanContentStr;
        }
        if (startMs !== 0 || endMs !== 0) {
          updates.timing = JSON.stringify({ start_ms: startMs, end_ms: endMs });
        }
        updates.animation = JSON.stringify(animObj);

        // ── First-class fields (database-first architecture) ──
        updates.entrance_type = entType;
        updates.entrance_duration = entDur;
        updates.entrance_delay = entDelay;
        if (exit && exit.type) updates.exit_type = exit.type;
        if (elem.ambient_animation) updates.ambient_animation = elem.ambient_animation;
        if (elem.visual_effects) {
          try { updates.visual_effects = JSON.stringify(elem.visual_effects); } catch {}
        }
        if (elem.color_theme) updates.color_theme = elem.color_theme;
        if (elem.font_style || cleaned.font) {
          updates.font_style = elem.font_style || match.font_style || 'font-body';
        }
        updates.start_ms = startMs;
        updates.end_ms = endMs;

        // Apply canvas position/size/z_index/opacity from the scene graph
        if (elem.canvas_position) {
          if (elem.canvas_position.x != null) updates.x = Math.round(elem.canvas_position.x);
          if (elem.canvas_position.y != null) updates.y = Math.round(elem.canvas_position.y);
        }
        if (elem.canvas_size) {
          if (elem.canvas_size.w != null) updates.width = Math.round(elem.canvas_size.w);
          if (elem.canvas_size.h != null) updates.height = Math.round(elem.canvas_size.h);
        }
        if (elem.z_order != null) updates.z_index = elem.z_order;
        if (elem.opacity != null) updates.opacity = Math.round(elem.opacity * 100);

        // If the LLM extracted a font directive, apply it to the element style
        const existingStyle = parseJSON(match.style, {});
        const styleUpdates = {};
        if (cleaned.font) styleUpdates.fontFamily = cleaned.font;
        if (elem.style_overrides) {
          if (elem.style_overrides.fontSize) styleUpdates.fontSize = elem.style_overrides.fontSize;
          if (elem.style_overrides.color) styleUpdates.color = elem.style_overrides.color;
          if (elem.style_overrides.bold != null) styleUpdates.bold = elem.style_overrides.bold;
          if (elem.style_overrides.align) styleUpdates.align = elem.style_overrides.align;
        }
        if (Object.keys(styleUpdates).length > 0) {
          updates.style = JSON.stringify({ ...existingStyle, ...styleUpdates });
        }

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

// Strip markup tags like <font:Poppins> or <anim:fade_in> from content text.
// Also extracts font/animation directives and returns them so they can be
// applied to the element's style/animation properties.
function cleanContent(raw) {
  if (!raw || typeof raw !== 'string') return { content: '', font: null, anim: null };
  let content = raw;
  let font = null;
  let anim = null;
  // Extract <font:Name> directives
  content = content.replace(/<font:([^>]+)>/gi, (m, name) => { font = name.trim(); return ''; });
  // Extract <anim:Type> directives
  content = content.replace(/<anim:([^>]+)>/gi, (m, name) => { anim = name.trim(); return ''; });
  // Strip any remaining <...> tags
  content = content.replace(/<[^>]+>/g, '');
  return { content: content.trim(), font, anim };
}

// ── APD Core: Direct one slide ──
// The APD is trained on the actual canvas + timeline data model so its output
// can be synced directly back to SlideElement records and rendered on the
// vertically-stacked track timeline.
async function directSlide(base44, { slide, elements, pkg, vp, slideIndex, totalSlides, presentationTitle }) {
  const sentenceTimeline = parseJSON(vp?.sentence_timeline, '[]');
  const pauseTimeline = parseJSON(vp?.pause_timeline, '[]');
  const totalDuration = vp?.total_duration_seconds || (slide.duration_ms / 1000) || 30;
  const totalDurationMs = Math.round(totalDuration * 1000);

  // ── Build full element summaries with canvas + timeline state ──
  // The APD needs the exact same data the editor timeline shows so it can
  // produce values that map directly back to SlideElement fields.
  const elementSummary = elements.map(el => {
    const elTiming = parseJSON(el.timing, {});
    const elAnim = parseJSON(el.animation, {});
    const elStyle = parseJSON(el.style, {});
    // Flatten animation into the three categories the timeline displays
    const animCats = {};
    if (Array.isArray(elAnim)) {
      elAnim.forEach(a => {
        if (!a.type || a.type === 'none') return;
        const cat = a.category || (a.type.includes('out') || a.type.includes('exit') ? 'exit' : a.type.includes('pulse') || a.type.includes('bounce') ? 'emphasis' : 'entrance');
        animCats[cat] = { type: a.type, start_ms: a.start_ms ?? a.delay_ms ?? 0, duration_ms: a.duration_ms || 500 };
      });
    } else if (elAnim.entrance || elAnim.emphasis || elAnim.exit) {
      if (elAnim.entrance) animCats.entrance = { type: elAnim.entrance.type || 'fade_in', start_ms: elAnim.entrance.start_ms ?? elAnim.entrance.delay_ms ?? 0, duration_ms: elAnim.entrance.duration_ms || 500 };
      if (elAnim.emphasis) animCats.emphasis = { type: elAnim.emphasis.type || 'pulse', start_ms: elAnim.emphasis.start_ms ?? elAnim.emphasis.delay_ms ?? 0, duration_ms: elAnim.emphasis.duration_ms || 500 };
      if (elAnim.exit) animCats.exit = { type: elAnim.exit.type || 'fade_out', start_ms: elAnim.exit.start_ms ?? elAnim.exit.delay_ms ?? 0, duration_ms: elAnim.exit.duration_ms || 500 };
    } else if (elAnim.type && elAnim.type !== 'none') {
      const cat = elAnim.type.includes('out') || elAnim.type.includes('exit') ? 'exit' : elAnim.type.includes('pulse') || elAnim.type.includes('bounce') ? 'emphasis' : 'entrance';
      animCats[cat] = { type: elAnim.type, start_ms: elAnim.delay_ms || 0, duration_ms: elAnim.duration_ms || 500 };
    }
    return {
      id: el.id,
      type: el.type,
      content: (el.content || '').substring(0, 150),
      // Canvas state (pixel coordinates — the editor canvas uses these directly)
      canvas: { x: el.x || 0, y: el.y || 0, width: el.width || 200, height: el.height || 100, z_index: el.z_index || 0, rotation: el.rotation || 0, opacity: el.opacity ?? 100, locked: !!el.locked, visible: el.visible !== false },
      // Style JSON as the inspector edits it
      style: { fontSize: elStyle.fontSize || '', fontFamily: elStyle.fontFamily || '', color: elStyle.color || '', bold: !!elStyle.bold, italic: !!elStyle.italic, align: elStyle.align || 'left', role: elStyle.role || '' },
      // Timeline state — timing clip + animation lanes
      timing: { start_ms: elTiming.start_ms ?? 0, end_ms: elTiming.end_ms ?? totalDurationMs },
      animations: animCats,
    };
  });

  // ── Sentence summaries for scene timing ──
  const sentenceSummaries = (Array.isArray(sentenceTimeline) ? sentenceTimeline : []).map((s, idx) => ({
    index: idx,
    text: (s.sentence_text || '').substring(0, 120),
    start_time: s.start_time || 0,
    end_time: s.end_time || 0,
    duration: s.duration || 0,
  }));

  const imageUrl = pkg?.generated_image_url || '';
  const lowerThird = pkg?.lower_third_text || '';
  const talkingPoints = pkg?.talking_points || '';
  const factCheckNotes = pkg?.fact_check_notes || '';
  const visualSuggestions = pkg?.visual_suggestions || '';
  const brollSuggestions = pkg?.broll_suggestions || '';

  const isTitleSlide = slideIndex === 0;
  const isClosingSlide = slideIndex === totalSlides - 1;

  // Canvas dimensions for positioning (16:9 default: 1920×1080)
  const CANVAS_W = 1920;
  const CANVAS_H = 1080;

  const prompt = `You are the AI Presentation Director (APD) for CREAPD. Your job is to direct one Story Slide by creating an intelligent scene graph that synchronizes visuals, camera movement, and text with voiceover narration.

You are directing a REAL editor canvas and a REAL multi-track timeline. Your output will be written directly into database records that the editor renders. You must use the exact data structures described below.

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

# ── CANVAS DATA MODEL ──
The editor canvas is ${CANVAS_W}×${CANVAS_H} pixels (16:9). Every element has:
- canvas_position: { x, y } — top-left corner in PIXELS (0 to ${CANVAS_W} for x, 0 to ${CANVAS_H} for y)
- canvas_size: { w, h } — width and height in PIXELS
- z_order: integer — stacking order (0 = back, higher = front)
- opacity: 0-1 (1 = fully opaque; the database stores 0-100 but you output 0-1)
- style_overrides: optional { fontSize, color, bold, align } — font properties for text elements

When repositioning elements, use real pixel coordinates. For example:
  - Headline at center-top: canvas_position { x: 200, y: 80 }, canvas_size { w: 1520, h: 120 }
  - Body text at center: canvas_position { x: 300, y: 300 }, canvas_size { w: 1320, h: 400 }
  - Lower third at bottom: canvas_position { x: 100, y: 900 }, canvas_size { w: 1200, h: 80 }
  - Full-screen image: canvas_position { x: 0, y: 0 }, canvas_size { w: ${CANVAS_W}, h: ${CANVAS_H} }
  - Picture-in-picture: canvas_position { x: 1300, y: 80 }, canvas_size { w: 540, h: 360 }

Do NOT use normalized 0-1 positions. Use pixel coordinates.

# ── TIMELINE DATA MODEL ──
The editor displays a vertically-stacked track timeline. Each SlideElement gets its own track row, with nested animation child lanes. The timeline reads these fields:

TIMING (visibility clip — when the element is visible on canvas):
  timing: { "start_ms": <number>, "end_ms": <number> }
  - start_ms: when the element appears (in milliseconds, aligned to voiceover sentences)
  - end_ms: when the element disappears (in milliseconds)
  - If an element should be visible for the entire slide: start_ms=0, end_ms=${totalDurationMs}

ANIMATION (three independent lanes — entrance, emphasis, exit):
  animation: {
    "entrance": { "type": "<anim_type>", "start_ms": <delay>, "delay_ms": <delay>, "duration_ms": <dur> },
    "emphasis": { "type": "<anim_type>", "start_ms": <delay>, "delay_ms": <delay>, "duration_ms": <dur> },  // optional
    "exit":     { "type": "<anim_type>", "start_ms": <delay>, "delay_ms": <delay>, "duration_ms": <dur> }   // optional
  }
  - entrance: how the element enters (plays once at start_ms)
  - emphasis: a mid-visibility emphasis pulse (plays at its own start_ms during the visible window)
  - exit: how the element leaves (plays once before end_ms)
  - start_ms and delay_ms should be the same value for each animation.
  - delay_ms MUST match the sentence start_time from the voiceover timeline.
  - duration_ms should match the sentence duration.

ANIMATION TYPES (use these exact strings):
  - Entrance: "fade_in", "slide_in", "scale_in", "zoom_in", "dissolve_in"
  - Emphasis: "pulse", "bounce", "shake", "gentle_float"
  - Exit: "fade_out", "slide_out", "scale_out", "dissolve_out"

# ── SLIDE CONTEXT ──
- Presentation: "${presentationTitle}"
- Slide ${slideIndex + 1} of ${totalSlides}
- Slide Type: ${isTitleSlide ? 'title_slide' : (isClosingSlide ? 'closing_slide' : 'content_slide')}
- Slide Title: "${slide.title || ''}"
- Slide Duration: ${totalDuration} seconds (${totalDurationMs} ms)

# ── STORY PACKAGE (source of truth — do NOT alter facts) ──
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

# ── VOICE PACKAGE TIMELINE (master clock) ──
- Total Duration: ${totalDuration}s (${totalDurationMs} ms)
- Sentence Count: ${sentenceSummaries.length}
- Sentence Timeline: ${JSON.stringify(sentenceSummaries.slice(0, 25))}
- Pause Timeline: ${JSON.stringify((Array.isArray(pauseTimeline) ? pauseTimeline : []).slice(0, 10))}

# ── EXISTING SLIDE ELEMENTS (already on canvas + timeline — you may reposition and re-time) ──
Each element below has its current canvas position (pixels), style, timing clip, and animation lanes:
${JSON.stringify(elementSummary)}

# ── YOUR TASK ──
Analyze this story package and direct the slide. Produce a scene_graph that:
1. Divides the slide into 2-5 scenes based on narration content changes (NOT time intervals)
2. Assigns camera behavior to each scene (static, slow_push, zoom_in, zoom_out, pan_left, pan_right, drift)
3. For EACH element in each scene, provides:
   - canvas_position: pixel coordinates { x, y } on the ${CANVAS_W}×${CANVAS_H} canvas
   - canvas_size: pixel dimensions { w, h }
   - z_order: stacking integer (background=0, text=10+, overlays=20+)
   - opacity: 0-1
   - timeline_events: [{ start_time, end_time }] in ms — SYNCHRONIZED to voiceover sentence boundaries
   - entrance_animation: { type, delay_ms, duration_ms } — delay_ms MUST match the sentence start_time
   - emphasis_animation: optional { type, delay_ms, duration_ms }
   - exit_animation: optional { type, delay_ms, duration_ms }
4. SYNCHRONIZES element visibility with the voiceover sentence timeline — each text element's timeline_events MUST align with the sentence boundaries above. When a sentence is spoken, the corresponding text should be visible.
5. PRESERVES existing timing if the producer has manually set it — only override if it conflicts with the sentence timeline.
6. Varies layout from other slides — avoid repetition.

# CRITICAL RULES FOR THE content FIELD
- The content field MUST contain PLAIN TEXT ONLY — the actual words that will appear on screen.
- Do NOT include any markup tags, formatting directives, or angle brackets in content.
- BAD: "<font:Poppins>Welcome to Our Presentation"
- GOOD: "Welcome to Our Presentation"
- Font family, animation type, color, etc. go in their respective JSON properties, NOT in the content text.
- For existing elements, use their EXACT original content — do not modify or add tags to it.

Element types you can use: headline, body_text, image, talking_point_card, discussion_response, lower_third, statistic, quote, caption

For each scene, provide a scene_objective answering: "What should the audience understand during this moment?"

Camera behaviors: static, slow_push, zoom_in, zoom_out, pan_left, pan_right, drift

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
                          element_id: { type: 'string', description: 'The existing SlideElement ID from the element list above' },
                          element_type: {
                            type: 'string',
                            enum: ['headline', 'body_text', 'image', 'talking_point_card', 'discussion_response', 'lower_third', 'statistic', 'quote', 'caption'],
                          },
                          content: { type: 'string', description: 'Plain text content or image URL — NO markup tags' },
                          canvas_position: {
                            type: 'object',
                            properties: {
                              x: { type: 'number', description: 'Pixel X (0-' + CANVAS_W + ')' },
                              y: { type: 'number', description: 'Pixel Y (0-' + CANVAS_H + ')' },
                            },
                          },
                          canvas_size: {
                            type: 'object',
                            properties: {
                              w: { type: 'number', description: 'Pixel width' },
                              h: { type: 'number', description: 'Pixel height' },
                            },
                          },
                          z_order: { type: 'number', description: 'Stacking order (0=back, higher=front)' },
                          opacity: { type: 'number', description: '0-1 (1=fully opaque)' },
                          asset_reference: { type: 'string', description: 'Image URL if element_type is image' },
                          style_overrides: {
                            type: 'object',
                            properties: {
                              fontSize: { type: 'string', description: 'CSS font-size, e.g. "48px"' },
                              color: { type: 'string', description: 'CSS color, e.g. "#FFFFFF"' },
                              bold: { type: 'boolean' },
                              align: { type: 'string', enum: ['left', 'center', 'right'] },
                            },
                          },
                          entrance_animation: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['fade_in', 'slide_in', 'scale_in', 'zoom_in', 'dissolve_in', 'gentle_float'] },
                              delay_ms: { type: 'number', description: 'When the entrance plays — MUST match the sentence start_time' },
                              duration_ms: { type: 'number', description: 'Entrance duration in ms' },
                            },
                          },
                          emphasis_animation: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['pulse', 'bounce', 'shake', 'gentle_float'] },
                              delay_ms: { type: 'number', description: 'When the emphasis plays during the visible window' },
                              duration_ms: { type: 'number' },
                            },
                          },
                          exit_animation: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['fade_out', 'slide_out', 'scale_out', 'dissolve_out'] },
                              delay_ms: { type: 'number', description: 'When the exit plays — near end_ms' },
                              duration_ms: { type: 'number' },
                            },
                          },
                          timeline_events: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                start_time: { type: 'number', description: 'ms — when element becomes visible' },
                                end_time: { type: 'number', description: 'ms — when element becomes hidden' },
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
  const maxMs = totalDurationMs;
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
          canvas_position: { x: el.x || 0, y: el.y || 0 },
          canvas_size: { w: el.width || 200, h: el.height || 100 },
          z_order: el.z_index || 0,
          opacity: (el.opacity ?? 100) / 100,
          asset_reference: el.type === 'image' ? el.content : '',
          entrance_animation: { type: 'fade_in', delay_ms: 0, duration_ms: 500 },
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
    sentence_summaries: sentenceSummaries,
    total_duration_ms: totalDurationMs,
  };
}