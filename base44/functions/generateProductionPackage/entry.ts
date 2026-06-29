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
    const { article_id, asset_types, tone, reading_style, audience, target_runtime } = body;

    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.entities.Article.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });

    const requestedAssets = (asset_types && asset_types.length > 0) ? asset_types : ALL_ASSETS;

    const assetListText = requestedAssets.map(a => `- ${a}: ${ASSET_DESCRIPTIONS[a] || a}`).join('\n');

    const prompt = `You are a professional broadcast producer. Generate production assets for the following news story.

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

    const responseSchema = {
      type: 'object',
      properties: {
        ...Object.fromEntries(requestedAssets.map(a => [a, { type: 'string' }])),
        estimated_runtime: { type: 'string' }
      },
      required: [...requestedAssets, 'estimated_runtime']
    };

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      model: 'gpt_5_mini'
    });

    const existing = await base44.entities.ProductionPackage.filter({ article_id });
    let pkg;

    const updateFields = {};
    requestedAssets.forEach(a => { updateFields[a] = llmResponse[a] || ''; });
    // Per PRD 7.19: runtime estimate only updates when the teleprompter script is generated or edited
    if (requestedAssets.includes('teleprompter_script')) {
      updateFields.estimated_runtime = llmResponse.estimated_runtime || '';
    }
    updateFields.tone = tone || 'professional';
    updateFields.reading_style = reading_style || 'broadcast_news';
    updateFields.audience = audience || 'General Public';
    updateFields.target_runtime = target_runtime || '1 Minute';
    updateFields.status = 'generated';

    if (existing && existing.length > 0) {
      pkg = await base44.entities.ProductionPackage.update(existing[0].id, updateFields);
    } else {
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