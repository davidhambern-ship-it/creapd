import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id } = body;
    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    // Fetch all message sections
    const sections = await base44.asServiceRole.entities.SpiritualMessageSection.filter(
      { configuration_id },
      'order'
    );
    if (!sections || sections.length === 0) {
      return Response.json({ error: 'No message sections found. Generate the message first.' }, { status: 400 });
    }

    // Fetch config
    const config = await base44.asServiceRole.entities.SpiritualProductionConfiguration.get(configuration_id);

    // Build script with cumulative timing
    function estimateSpeakingTime(text) {
      if (!text) return 5;
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(3, Math.round((words / 130) * 60));
    }

    let currentTime = 0;
    const scriptData = sections.map((section, idx) => {
      const duration = section.voice_duration_seconds || section.estimated_duration_seconds || estimateSpeakingTime(section.content);
      const start = currentTime;
      const end = currentTime + duration;
      currentTime = end;
      return {
        section_index: idx,
        section_id: section.id,
        section_type: section.section_type,
        title: section.title,
        slide_title: section.slide_title,
        content: section.content,
        scripture_references: section.scripture_references || '',
        start_time: start,
        end_time: end,
        duration: duration,
        has_voice: !!section.voice_url,
        has_image: !!section.generated_image_url
      };
    });

    const totalDuration = currentTime;
    const totalMin = Math.floor(totalDuration / 60);
    const totalSec = totalDuration % 60;

    // Format time helper
    function fmt(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    // Build the script text for the LLM — truncate content to keep prompt manageable
    const scriptText = scriptData.map(s => {
      const content = (s.content || '').substring(0, 800);
      return `[Section ${s.section_index + 1}] ${s.title}
Time: ${fmt(s.start_time)}–${fmt(s.end_time)} (${s.duration}s) | Type: ${s.section_type}
Scripture: ${s.scripture_references || 'None'} | Voice: ${s.has_voice} | Image: ${s.has_image}
Content: ${content}`;
    }).join('\n---\n');

    const prompt = `You are the Presentation Director — an AI system that transforms a spoken message script into a timed visual presentation that feels like a video, not a slideshow.

PRODUCTION CONTEXT:
- Title: ${config.production_name || 'Untitled'}
- Type: ${config.production_type || 'Sermon'}
- Faith Tradition: ${config.faith_tradition || 'Christianity'}
- Speaker Tone: ${config.speaker_tone || 'Inspirational'}
- Target Runtime: ${config.target_runtime || '30 Minutes'}
- Total Duration: ${totalDuration} seconds (${totalMin}:${String(totalSec).padStart(2, '0')})

FULL SCRIPT WITH TIMING:
${scriptText}

YOUR TASK:
1. READ the full script carefully.
2. ANALYZE the voiceover timing for each section.
3. BREAK the script into narrative beats (visual scenes). A single section may contain multiple beats. Each beat is a distinct visual moment.
4. For each beat, DETERMINE which visual elements are needed:
   - title: Large headline reveal (e.g., the message title, section title)
   - emphasis: Important phrases from the script that should appear with emphasis
   - scripture_passage: Display the ACTUAL passage text (not just the reference). Include the full verse text.
   - image: Describe a visual scene that supports the message content
   - icon: Simple symbolic visual
   - motion_graphic: Animated concept (world map, split-screen, glowing lines, network, etc.)
   - quote_card: Full-screen inspirational quote
   - question_prompt: Full-screen reflection question
   - transition: Visual bridge between sections
   - closing: Final words with momentum
5. ASSIGN each visual element:
   - start_time: Seconds from the SCENE's start (0 = scene begins). This is relative to the scene, not global.
   - end_time: Seconds from the SCENE's start (when element should disappear)
   - animation_in: fade, zoom, slide_left, slide_right, pop, dissolve, word_by_word, typewriter, lower_third
   - animation_out: fade_out, slide_out_left, slide_out_right, dissolve_out, none
   - position: center, top, bottom, left, right, full_screen, lower_third
   - priority: 1-10 (higher = more important)
   - purpose: Why this element is here (one sentence)

ANIMATION RULES:
- Text should appear when the voiceover reaches the matching phrase
- Important words should animate with emphasis (word_by_word or pop)
- Questions should appear as full-screen reflection prompts
- Scripture passages MUST include the actual passage text, not just the reference
- Visuals should support the message, not decorate it
- Keep motion elegant, not chaotic
- Avoid dumping too much text on screen at once — one idea per beat
- Each beat should feel like a video scene, not a static slide

BACKGROUND PROMPTS:
- Describe a visual scene for the background that supports the message content
- Do NOT use random backgrounds — every visual must connect to the script
- Example: "Cinematic split-screen: left side shows a warm town square with people gathering, right side shows a glowing digital network with interconnected nodes, dramatic lighting"

SCRIPTURE ELEMENTS:
- Include the reference (e.g., "Matthew 28:19")
- Include the ACTUAL passage text (e.g., "Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit")
- If you know the passage, include it. If unsure, include your best knowledge and add "[Verify]" at the end

TRANSITION PLAN:
- Describe how this scene transitions to the next (fade, dissolve, slide, zoom, none)

AI REASONING:
- Explain WHY each visual element was chosen and how it supports the message

OUTPUT: A JSON object with a "scenes" array. Each scene represents one narrative beat.
- voice_start_time and voice_end_time are GLOBAL times (seconds from presentation start)
- Element start_time and end_time are SCENE-RELATIVE (0 = scene begins)`;

    // Call LLM with JSON schema — nested arrays stored as JSON strings to avoid strict schema validation
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt + '\n\nFor text_elements, image_elements, scripture_elements: output a JSON array as a STRING value (e.g. "[{\\"text\\": \\"Hello\\", \\"start_time\\": 0, \\"end_time\\": 5, \\"animation_in\\": \\"fade\\"}]"). Each element in these arrays must include all assigned properties (text/prompt/reference, start_time, end_time, animation_in, animation_out, position, priority, purpose).',
      response_json_schema: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slide_id: { type: 'string' },
                slide_title: { type: 'string' },
                section_index: { type: 'number' },
                beat_type: { type: 'string' },
                voice_start_time: { type: 'number' },
                voice_end_time: { type: 'number' },
                visual_theme: { type: 'string' },
                background_prompt: { type: 'string' },
                text_elements: { type: 'string' },
                image_elements: { type: 'string' },
                scripture_elements: { type: 'string' },
                transition_plan: { type: 'string' },
                speaker_notes: { type: 'string' },
                production_notes: { type: 'string' },
                ai_reasoning: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const scenes = llmResponse.scenes || [];

    if (scenes.length === 0) {
      return Response.json({ error: 'AI returned no scenes. Try again.' }, { status: 500 });
    }

    // Delete existing presentation scenes for this config
    await base44.asServiceRole.entities.PresentationScene.deleteMany({ configuration_id });

    // Create new scenes — text_elements/image_elements/scripture_elements are JSON strings from the LLM
    const sceneRecords = scenes.map((scene, idx) => {
      const sectionIdx = Math.min(scene.section_index || 0, sections.length - 1);
      const section = sections[sectionIdx];
      const startTime = scene.voice_start_time || 0;
      const endTime = scene.voice_end_time || (startTime + 5);

      // The LLM outputs these as JSON strings; validate and normalize
      function normalizeJsonArray(val) {
        if (!val) return '[]';
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val);
            return JSON.stringify(Array.isArray(parsed) ? parsed : []);
          } catch {
            return '[]';
          }
        }
        return JSON.stringify(Array.isArray(val) ? val : []);
      }

      return {
        configuration_id,
        section_id: section?.id || sections[0].id,
        section_order: sectionIdx,
        order: idx,
        slide_id: scene.slide_id || `scene_${idx}`,
        slide_title: scene.slide_title || `Scene ${idx + 1}`,
        beat_type: scene.beat_type || 'emphasis_text',
        voice_start_time: startTime,
        voice_end_time: endTime,
        duration_seconds: Math.max(1, endTime - startTime),
        visual_theme: scene.visual_theme || '',
        background_prompt: scene.background_prompt || '',
        text_elements: normalizeJsonArray(scene.text_elements),
        image_elements: normalizeJsonArray(scene.image_elements),
        scripture_elements: normalizeJsonArray(scene.scripture_elements),
        animation_plan: JSON.stringify({}),
        transition_plan: scene.transition_plan || '',
        speaker_notes: scene.speaker_notes || '',
        production_notes: scene.production_notes || '',
        ai_reasoning: scene.ai_reasoning || '',
        status: 'generated'
      };
    });

    const created = await base44.asServiceRole.entities.PresentationScene.bulkCreate(sceneRecords);

    return Response.json({
      success: true,
      scenes_created: created.length,
      total_duration: totalDuration,
      message: `Generated ${created.length} timed visual scenes for ${fmt(totalDuration)} presentation`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});