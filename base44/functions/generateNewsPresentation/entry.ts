import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Fetch all requested packages
    const allPackages = await base44.asServiceRole.entities.ProductionPackage.list('-created_date', 200);
    const packages = allPackages.filter(p => package_ids.includes(p.id));

    if (packages.length === 0) {
      return Response.json({ error: 'No packages found for the provided IDs.' }, { status: 404 });
    }

    // Fetch associated articles
    const articleIds = [...new Set(packages.map(p => p.article_id).filter(Boolean))];
    const allArticles = await base44.asServiceRole.entities.Article.list('-created_date', 200);
    const articleMap = {};
    allArticles.forEach(a => { if (articleIds.includes(a.id)) articleMap[a.id] = a; });

    // Build a summary of each package for the LLM
    const packageSummaries = packages.map((pkg, idx) => {
      const article = articleMap[pkg.article_id] || {};
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
        estimated_runtime: pkg.estimated_runtime || '1 Minute',
        tone: pkg.tone || 'professional',
        generated_image_url: pkg.generated_image_url || '',
        generated_thumbnail_url: pkg.generated_thumbnail_url || '',
      };
    });

    const llmPrompt = `You are the AI Presentation Director (APD) for a news production system.

You are given ${packages.length} approved news story packages. Your job is to design a timed visual presentation that synchronizes each story's voiceover script with on-screen visual elements.

For each story package, create one presentation scene. For each scene, provide:
1. slide_title: A concise on-screen title for this story's slide
2. beat_type: One of [title_reveal, host_intro, emphasis_text, scripture_passage, image_scene, icon_highlight, motion_graphic, quote_card, question_prompt, transition, closing_momentum]
3. visual_theme: Overall visual mood/theme for this scene
4. background_prompt: An AI image generation prompt for the scene background
5. text_elements: JSON array of {text, element_type, animation_in, animation_out, position, purpose} — on-screen text overlays
6. image_elements: JSON array of {prompt, animation_in, animation_out, position, purpose} — image/graphic elements to show
7. animation_plan: JSON describing the overall animation strategy for this scene
8. transition_plan: Transition effect to the next scene (fade, slide_left, zoom, dissolve, none)
9. speaker_notes: Notes for the host/presenter
10. production_notes: Technical production notes
11. ai_reasoning: Explanation of why each visual element was chosen

Here are the story packages:

${JSON.stringify(packageSummaries, null, 2)}

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
                text_elements: { type: "string" },
                image_elements: { type: "string" },
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
        await base44.asServiceRole.entities.PresentationScene.create({
          configuration_id: pkg.id,
          section_id: pkg.article_id || '',
          section_order: i,
          order: i,
          slide_id: `slide_${Date.now()}_${i}`,
          slide_title: scene.slide_title || packageSummaries[i]?.article_title || `Story ${i + 1}`,
          beat_type: scene.beat_type || 'emphasis_text',
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