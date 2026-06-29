import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ASSET_DESCRIPTIONS = {
  teleprompter_script: 'A broadcast-ready teleprompter script written for on-air reading. Use natural pacing, clear sentences, and broadcast formatting.',
  story_summary: 'A concise internal story summary (not for publication) giving the producer a quick understanding of the story.',
  talking_points: '3-5 discussion talking points for the host, emphasizing conversation rather than scripted reading.',
  lower_third_text: 'Suggested lower-third graphic text with a primary headline, secondary headline, and optional supporting line.',
  headline_suggestions: '2-3 alternative headline suggestions that are accurate, clear, and engaging without sensationalizing.',
  image_prompt: 'A detailed prompt suitable for AI image generation systems to create a headline graphic or story illustration.',
  thumbnail_prompt: 'A detailed prompt for generating a thumbnail image for this story.',
  visual_suggestions: 'Visual production suggestions including opening shot, supporting footage, charts, maps, or infographics.',
  broll_suggestions: 'B-roll footage suggestions such as establishing shots, close-ups, wide-angle footage, environmental footage, or product demonstrations.',
  social_caption: 'A social media caption aligned with the story and production style.',
  fact_check_notes: 'Factual elements requiring verification including statistics, dates, names, locations, organizations, and claims.'
};

const ALL_ASSETS = Object.keys(ASSET_DESCRIPTIONS);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, asset_types, tone, reading_style, audience, target_runtime, custom_prompt, prompt_template_id, preferred_text_model } = body;

    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.entities.Article.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });

    const requestedAssets = (asset_types && asset_types.length > 0) ? asset_types : ALL_ASSETS;
    const assetListText = requestedAssets.map(a => `- ${a}: ${ASSET_DESCRIPTIONS[a] || a}`).join('\n');

    // PRD 9.12: If a prompt template or custom prompt is provided, use it instead of the default
    let prompt;
    let promptTemplate = null;

    if (prompt_template_id) {
      try {
        promptTemplate = await base44.entities.PromptTemplate.get(prompt_template_id);
      } catch {}
    }

    if (custom_prompt && custom_prompt.trim()) {
      // PRD 9.12: Producer may edit/replace prompts before generation
      prompt = custom_prompt
        .replace(/\{title\}/g, article.title || '')
        .replace(/\{summary\}/g, article.summary || 'No summary available')
        .replace(/\{excerpt\}/g, article.full_text_excerpt || 'No excerpt available')
        .replace(/\{source\}/g, article.source_name || article.publication || 'Unknown')
        .replace(/\{category\}/g, article.category || 'general')
        .replace(/\{tone\}/g, tone || 'professional')
        .replace(/\{reading_style\}/g, reading_style || 'broadcast_news')
        .replace(/\{audience\}/g, audience || 'General Public')
        .replace(/\{target_runtime\}/g, target_runtime || '1 Minute');
    } else if (promptTemplate && promptTemplate.content) {
      // PRD 9.13: Use prompt template content
      prompt = promptTemplate.content
        .replace(/\{title\}/g, article.title || '')
        .replace(/\{summary\}/g, article.summary || 'No summary available')
        .replace(/\{excerpt\}/g, article.full_text_excerpt || 'No excerpt available')
        .replace(/\{source\}/g, article.source_name || article.publication || 'Unknown')
        .replace(/\{category\}/g, article.category || 'general')
        .replace(/\{tone\}/g, tone || 'professional')
        .replace(/\{reading_style\}/g, reading_style || 'broadcast_news')
        .replace(/\{audience\}/g, audience || 'General Public')
        .replace(/\{target_runtime\}/g, target_runtime || '1 Minute');
    } else {
      prompt = `You are a professional broadcast producer. Generate production assets for the following news story.

STORY DETAILS:
Title: ${article.title}
Source: ${article.source_name || article.publication || 'Unknown'}
Summary: ${article.summary || 'No summary available'}
Excerpt: ${article.full_text_excerpt || 'No excerpt available'}
Category: ${article.category || 'general'}

PRODUCTION SETTINGS:
Tone: ${tone || 'professional'}
Reading Style: ${reading_style || 'broadcast_news'}
Audience: ${audience || 'General Public'}
Target Runtime: ${target_runtime || '1 Minute'}

Generate the following production assets. Each asset must be production-ready, accurate, and professional:

${assetListText}

Also estimate the reading time of the teleprompter script as "estimated_runtime" (e.g. "45 seconds", "1 minute 30 seconds").

Return a JSON object with these exact string keys: ${[...requestedAssets, 'estimated_runtime'].join(', ')}. Each value should be a string with the generated content.`;
    }

    const responseSchema = {
      type: 'object',
      properties: {
        ...Object.fromEntries(requestedAssets.map(a => [a, { type: 'string' }])),
        estimated_runtime: { type: 'string' }
      },
      required: [...requestedAssets, 'estimated_runtime']
    };

    const llmOptions = {
      prompt,
      response_json_schema: responseSchema,
    };
    // PRD 9.8: Use preferred text model if specified
    if (preferred_text_model && preferred_text_model !== 'automatic') {
      llmOptions.model = preferred_text_model;
    }

    const llmResponse = await base44.integrations.Core.InvokeLLM(llmOptions);

    const existing = await base44.entities.ProductionPackage.filter({ article_id });
    let pkg;

    const updateFields = {};
    requestedAssets.forEach(a => { updateFields[a] = llmResponse[a] || ''; });
    if (requestedAssets.includes('teleprompter_script')) {
      updateFields.estimated_runtime = llmResponse.estimated_runtime || '';
    }
    updateFields.tone = tone || 'professional';
    updateFields.reading_style = reading_style || 'broadcast_news';
    updateFields.audience = audience || 'General Public';
    updateFields.target_runtime = target_runtime || '1 Minute';
    updateFields.status = 'generated';

    // PRD 9.21: AI Transparency — track generation metadata
    const now = new Date().toISOString();
    if (existing && existing.length > 0) {
      updateFields.is_regenerated = true;
      updateFields.generation_count = (existing[0].generation_count || 0) + 1;
      updateFields.is_edited = false;
      updateFields.generation_provider = preferred_text_model || 'automatic';
      updateFields.generated_at = now;
      if (prompt_template_id) updateFields.prompt_template_id = prompt_template_id;
      if (custom_prompt) updateFields.custom_prompt = custom_prompt;
      pkg = await base44.entities.ProductionPackage.update(existing[0].id, updateFields);
    } else {
      updateFields.generation_provider = preferred_text_model || 'automatic';
      updateFields.generated_at = now;
      updateFields.generation_count = 1;
      if (prompt_template_id) updateFields.prompt_template_id = prompt_template_id;
      if (custom_prompt) updateFields.custom_prompt = custom_prompt;
      pkg = await base44.entities.ProductionPackage.create({
        article_id,
        ...updateFields
      });
    }

    return Response.json({ package: pkg });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});