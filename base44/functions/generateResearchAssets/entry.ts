import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ASSET_LABELS = {
  teleprompter_script: 'Teleprompter Script',
  show_script: 'Long-form Show Script',
  story_summary: 'Story Summary',
  talking_points: 'Talking Points',
  discussion_questions: 'Discussion Questions',
  presentation_outline: 'Presentation Outline',
  slide_prompts: 'Slide Prompts',
  image_prompts: 'Image Prompts',
  thumbnail_prompt: 'Thumbnail Prompt',
  lower_third_text: 'Lower Third Text',
  social_captions: 'Social Captions',
  broll_suggestions: 'B-Roll Suggestions',
  visual_suggestions: 'Visual Suggestions',
  producer_notes: 'Producer Notes',
  voice_package: 'Voice Package',
  runtime_recommendations: 'Runtime Recommendations',
  fact_callouts: 'Fact Callouts',
  quote_cards: 'Quote Cards',
  interview_questions: 'Interview Questions',
  audience_engagement: 'Audience Engagement',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, asset_types } = await req.json();
    if (!project_id || !asset_types || !Array.isArray(asset_types) || asset_types.length === 0) {
      return Response.json({ error: 'project_id and asset_types array are required' }, { status: 400 });
    }

    const dossiers = await base44.entities.ResearchDossier.filter({ project_id });
    const dossier = dossiers && dossiers.length > 0 ? dossiers[0] : null;

    if (!dossier || dossier.status !== 'approved') {
      return Response.json({ error: 'An approved Research Dossier is required before generating assets' }, { status: 400 });
    }

    const project = await base44.entities.ResearchProject.get(project_id);
    const dossierContext = [
      `Executive Summary: ${dossier.executive_summary || 'N/A'}`,
      `Background: ${dossier.background || 'N/A'}`,
      `Key Facts: ${dossier.key_facts || '[]'}`,
      `Important People: ${dossier.important_people || '[]'}`,
      `Statistics: ${dossier.statistics || '[]'}`,
      `Areas of Debate: ${dossier.areas_of_debate || '[]'}`,
    ].join('\n\n');

    const results = [];

    for (const assetType of asset_types) {
      const label = ASSET_LABELS[assetType] || assetType;

      const existing = await base44.entities.ProductionAsset.filter({ project_id, asset_type: assetType });
      if (existing && existing.length > 0) {
        await base44.entities.ProductionAsset.update(existing[0].id, { status: 'generating' });
      }

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a production writer at a professional content production institute.\n\nBased on the following Research Dossier, generate a professional ${label}.\n\nDossier:\n${dossierContext}\n\nProject: ${project?.production_name || 'Research Production'}\nResearch Question: ${project?.research_question || 'N/A'}\n\nGenerate a complete, production-ready ${label}. Make it professional, accurate, and ready for immediate use in production.`,
      });

      const content = typeof llmRes === 'string' ? llmRes : JSON.stringify(llmRes, null, 2);

      if (existing && existing.length > 0) {
        const updated = await base44.entities.ProductionAsset.update(existing[0].id, {
          content,
          status: 'generated',
          title: label,
        });
        results.push(updated);
      } else {
        const created = await base44.entities.ProductionAsset.create({
          project_id,
          asset_type: assetType,
          title: label,
          content,
          status: 'generated',
        });
        results.push(created);
      }
    }

    const totalAssets = await base44.entities.ProductionAsset.filter({ project_id });
    const progress = Math.min(100, Math.round((totalAssets.length / 20) * 100));
    await base44.entities.ResearchProject.update(project_id, {
      status: 'developing',
      progress_develop: progress,
    });

    return Response.json({ assets: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});