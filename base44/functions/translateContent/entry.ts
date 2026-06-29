import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { package_id, target_language, fields } = body;

    if (!package_id) return Response.json({ error: 'package_id is required' }, { status: 400 });
    if (!target_language) return Response.json({ error: 'target_language is required' }, { status: 400 });

    const pkg = await base44.entities.ProductionPackage.get(package_id);
    if (!pkg) return Response.json({ error: 'Package not found' }, { status: 404 });

    // PRD 9.19: Translate scripts, captions, and production notes while preserving tone
    const translateFields = fields || ['teleprompter_script', 'social_caption'];
    const languageNames = {
      es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
      zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', ru: 'Russian',
      en: 'English'
    };
    const languageName = languageNames[target_language] || target_language;

    const sourceTexts = translateFields.map(f => pkg[f]).filter(Boolean);
    if (sourceTexts.length === 0) return Response.json({ error: 'No content to translate' }, { status: 400 });

    const prompt = `You are a professional broadcast translator. Translate the following production assets into ${languageName}.

Preserve the original tone (${pkg.tone || 'professional'}), reading style (${pkg.reading_style || 'broadcast_news'}), and broadcast formatting.

ASSETS TO TRANSLATE:

${translateFields.map(f => `--- ${f} ---\n${pkg[f] || '(empty)'}`).join('\n\n')}

Return a JSON object with these exact string keys: ${translateFields.join(', ')}. Each value should contain the translated text.`;

    const responseSchema = {
      type: 'object',
      properties: Object.fromEntries(translateFields.map(f => [f, { type: 'string' }])),
      required: translateFields
    };

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      model: 'gpt_5_mini'
    });

    const updateFields = {};
    translateFields.forEach(f => { updateFields[f] = llmResponse[f] || ''; });
    // PRD 9.21: Track translation metadata
    updateFields.translation_language = target_language;
    updateFields.translated_script = translateFields.includes('teleprompter_script') ? llmResponse.teleprompter_script : pkg.translated_script;
    updateFields.translated_caption = translateFields.includes('social_caption') ? llmResponse.social_caption : pkg.translated_caption;
    updateFields.translated_at = new Date().toISOString();

    const updated = await base44.entities.ProductionPackage.update(package_id, updateFields);

    return Response.json({ package: updated, translated_fields: translateFields, language: target_language });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});