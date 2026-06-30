import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { article_id, asset_types, tone, reading_style, audience, target_runtime, custom_prompt, prompt_template_id, preferred_text_model, content_domain } = body;

    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.entities.Article.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });

    // Look up content domain configuration (defaults to 'news')
    const domainKey = content_domain || 'news';
    const domains = await base44.asServiceRole.entities.ContentDomain.filter({ domain_key: domainKey });
    const domain = domains && domains.length > 0 ? domains[0] : null;

    // Parse asset types and descriptions from domain config, or fall back to news defaults
    let ALL_ASSETS, ASSET_DESCRIPTIONS;
    if (domain && domain.asset_types && domain.asset_descriptions) {
      try {
        ALL_ASSETS = JSON.parse(domain.asset_types);
        ASSET_DESCRIPTIONS = JSON.parse(domain.asset_descriptions);
      } catch {
        ALL_ASSETS = ['teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions', 'broll_suggestions', 'social_caption', 'fact_check_notes'];
        ASSET_DESCRIPTIONS = {
          teleprompter_script: 'A broadcast-ready teleprompter script written for on-air reading.',
          story_summary: 'A concise internal story summary.',
          talking_points: '3-5 discussion talking points for the host.',
          lower_third_text: 'Suggested lower-third graphic text.',
          headline_suggestions: '2-3 alternative headline suggestions.',
          image_prompt: 'A detailed prompt for AI image generation.',
          thumbnail_prompt: 'A detailed prompt for generating a thumbnail image.',
          visual_suggestions: 'Visual production suggestions.',
          broll_suggestions: 'B-roll footage suggestions.',
          social_caption: 'A social media caption.',
          fact_check_notes: 'Factual elements requiring verification.'
        };
      }
    } else {
      ALL_ASSETS = ['teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions', 'image_prompt', 'thumbnail_prompt', 'visual_suggestions', 'broll_suggestions', 'social_caption', 'fact_check_notes'];
      ASSET_DESCRIPTIONS = {
        teleprompter_script: 'A broadcast-ready teleprompter script written for on-air reading.',
        story_summary: 'A concise internal story summary.',
        talking_points: '3-5 discussion talking points for the host.',
        lower_third_text: 'Suggested lower-third graphic text.',
        headline_suggestions: '2-3 alternative headline suggestions.',
        image_prompt: 'A detailed prompt for AI image generation.',
        thumbnail_prompt: 'A detailed prompt for generating a thumbnail image.',
        visual_suggestions: 'Visual production suggestions.',
        broll_suggestions: 'B-roll footage suggestions.',
        social_caption: 'A social media caption.',
        fact_check_notes: 'Factual elements requiring verification.'
      };
    }

    const requestedAssets = (asset_types && asset_types.length > 0) ? asset_types : ALL_ASSETS;
    const assetListText = requestedAssets.map(a => `- ${a}: ${ASSET_DESCRIPTIONS[a] || a}`).join('\n');

    // Build the prompt — custom prompt > prompt template > domain default
    let prompt;
    let promptTemplate = null;

    if (prompt_template_id) {
      try { promptTemplate = await base44.entities.PromptTemplate.get(prompt_template_id); } catch {}
    }

    if (custom_prompt && custom_prompt.trim()) {
      prompt = custom_prompt
        .replace(/\{title\}/g, article.title || '')
        .replace(/\{summary\}/g, article.summary || 'No summary available')
        .replace(/\{excerpt\}/g, article.full_text_excerpt || 'No excerpt available')
        .replace(/\{source\}/g, article.source_name || article.publication || 'Unknown')
        .replace(/\{category\}/g, article.category || 'general')
        .replace(/\{tone\}/g, tone || 'professional')
        .replace(/\{reading_style\}/g, reading_style || 'broadcast_news')
        .replace(/\{audience\}/g, audience || 'General Public')
        .replace(/\{target_runtime\}/g, target_runtime || '1 Minute')
        .replace(/\{asset_list\}/g, assetListText);
    } else if (promptTemplate && promptTemplate.content) {
      prompt = promptTemplate.content
        .replace(/\{title\}/g, article.title || '')
        .replace(/\{summary\}/g, article.summary || 'No summary available')
        .replace(/\{excerpt\}/g, article.full_text_excerpt || 'No excerpt available')
        .replace(/\{source\}/g, article.source_name || article.publication || 'Unknown')
        .replace(/\{category\}/g, article.category || 'general')
        .replace(/\{tone\}/g, tone || 'professional')
        .replace(/\{reading_style\}/g, reading_style || 'broadcast_news')
        .replace(/\{audience\}/g, audience || 'General Public')
        .replace(/\{target_runtime\}/g, target_runtime || '1 Minute')
        .replace(/\{asset_list\}/g, assetListText);
    } else if (domain && domain.production_prompt) {
      // Use domain-specific default prompt
      prompt = domain.production_prompt
        .replace(/\{title\}/g, article.title || '')
        .replace(/\{summary\}/g, article.summary || 'No summary available')
        .replace(/\{source\}/g, article.source_name || article.publication || 'Unknown')
        .replace(/\{category\}/g, article.category || 'general')
        .replace(/\{tone\}/g, tone || 'professional')
        .replace(/\{reading_style\}/g, reading_style || 'broadcast_news')
        .replace(/\{audience\}/g, audience || domain.default_audience || 'General Public')
        .replace(/\{target_runtime\}/g, target_runtime || domain.default_target_runtime || '1 Minute')
        .replace(/\{asset_list\}/g, assetListText);
    } else {
      // Ultimate fallback — news-style prompt
      prompt = `You are a professional broadcast producer. Generate production assets for the following story.

STORY DETAILS:
Title: ${article.title}
Source: ${article.source_name || article.publication || 'Unknown'}
Summary: ${article.summary || 'No summary available'}
Category: ${article.category || 'general'}

PRODUCTION SETTINGS:
Tone: ${tone || 'professional'}
Reading Style: ${reading_style || 'broadcast_news'}
Audience: ${audience || 'General Public'}
Target Runtime: ${target_runtime || '1 Minute'}

Generate the following production assets:

${assetListText}

Also estimate the reading time of the script as "estimated_runtime".

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
    if (preferred_text_model && preferred_text_model !== 'automatic') {
      llmOptions.model = preferred_text_model;
    }

    const llmResponse = await base44.integrations.Core.InvokeLLM(llmOptions);

    const existing = await base44.entities.ProductionPackage.filter({ article_id });
    let pkg;

    const updateFields = {};
    requestedAssets.forEach(a => { updateFields[a] = llmResponse[a] || ''; });
    updateFields.estimated_runtime = llmResponse.estimated_runtime || '';
    updateFields.tone = tone || 'professional';
    updateFields.reading_style = reading_style || 'broadcast_news';
    updateFields.audience = audience || (domain ? domain.default_audience : 'General Public') || 'General Public';
    updateFields.target_runtime = target_runtime || (domain ? domain.default_target_runtime : '1 Minute') || '1 Minute';
    updateFields.status = 'generated';

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