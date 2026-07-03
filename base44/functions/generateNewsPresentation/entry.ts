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
        story_summary: pkg.story_summary || '',
        teleprompter_script: pkg.teleprompter_script || pkg.show_script || '',
        talking_points: pkg.talking_points || '',
        lower_third_text: pkg.lower_third_text || '',
        headline_suggestions: pkg.headline_suggestions || '',
        image_prompt: pkg.image_prompt || '',
        visual_suggestions: pkg.visual_suggestions || '',
        broll_suggestions: pkg.broll_suggestions || '',
        fact_check_notes: pkg.fact_check_notes || '',
        tone: pkg.tone || 'professional',
        generated_image_url: pkg.generated_image_url || '',
        generated_thumbnail_url: pkg.generated_thumbnail_url || '',
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

    // Create PresentationScene records
    let createdCount = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const pkg = packages.find(p => p.id === scene.package_id) || packages[i];
      if (!pkg) continue;

      try {
        const summary = packageSummaries[i];
        await base44.asServiceRole.entities.PresentationScene.create({
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
        createdCount++;
      } catch (createErr) {
        console.error(`Failed to create scene for package ${pkg.id}:`, createErr.message);
      }
    }

    return Response.json({
      success: true,
      message: `Generated ${createdCount} presentation scenes from ${packages.length} approved packages.`,
      scenes_created: createdCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});