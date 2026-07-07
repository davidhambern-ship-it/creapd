import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * CREAPD QA Worker — Rubric-Based Quality Evaluation
 *
 * Evaluates a production asset against the appropriate PA-RUB rubric,
 * generates a standardized Quality Report, and invokes the Controller
 * Decision Engine to determine the next workflow action.
 *
 * Pipeline:
 *   1. Receive asset reference + rubric ID
 *   2. Fetch asset content from the appropriate entity
 *   3. Build rubric-specific evaluation prompt
 *   4. Invoke LLM with structured JSON schema
 *   5. Persist Quality Report
 *   6. Invoke Controller Decision Engine
 *   7. Return the Controller's decision
 */

// ── Rubric Definitions ──────────────────────────────────────────────────────

const RUBRIC_DEFINITIONS = {
  'PA-RUB-001': {
    name: 'Master Rubric',
    assetType: 'ProductionPackage',
    categories: ['accuracy', 'clarity', 'brand_consistency', 'technical_integrity', 'educational_value', 'accessibility'],
    evaluationFocus: 'Overall production quality, governance compliance, and educational effectiveness across all asset types.',
  },
  'PA-RUB-002': {
    name: 'Presentation Point Rubric',
    assetType: 'ResearchPoint',
    categories: ['accuracy', 'clarity', 'relevance', 'educational_value', 'newsworthiness', 'source_quality'],
    evaluationFocus: 'Factual accuracy, educational clarity, relevance to the topic, and strength of supporting sources.',
  },
  'PA-RUB-003': {
    name: 'StorySlide Rubric',
    assetType: 'StorySlide',
    categories: ['accuracy', 'clarity', 'educational_value', 'visual_hierarchy', 'content_density', 'brand_consistency'],
    evaluationFocus: 'Slide structure, educational alignment with Presentation Points, visual organization, and content density.',
  },
  'PA-RUB-004': {
    name: 'Script Rubric',
    assetType: 'PresentationScript',
    categories: ['accuracy', 'clarity', 'tone', 'brand_consistency', 'technical_integrity', 'pacing'],
    evaluationFocus: 'Anti-AI tone filter, rhythm and pacing controls, narrative clarity, and educational alignment.',
  },
  'PA-RUB-005': {
    name: 'Image Rubric',
    assetType: 'ImageAsset',
    categories: ['accuracy', 'educational_value', 'visual_clarity', 'negative_space', 'technical_integrity', 'brand_consistency'],
    evaluationFocus: 'Educational clarity, negative space for slide overlays, resolution quality, and brand alignment.',
  },
  'PA-RUB-006': {
    name: 'Voice Rubric',
    assetType: 'VoicePackage',
    categories: ['accuracy', 'clarity', 'emotional_alignment', 'pacing', 'wpm_compliance', 'technical_integrity'],
    evaluationFocus: 'Word-Per-Minute targets, emotional alignment with content, natural delivery, and audio technical quality.',
  },
  'PA-RUB-007': {
    name: 'Video Rubric',
    assetType: 'VideoAsset',
    categories: ['accuracy', 'educational_value', 'motion_purpose', 'narration_synchronization', 'runtime_efficiency', 'technical_integrity'],
    evaluationFocus: 'Motion must serve a functional purpose, narration synchronization markers, and runtime efficiency.',
  },
  'PA-RUB-008': {
    name: 'Layout Rubric',
    assetType: 'Layout',
    categories: ['visual_hierarchy', 'information_organization', 'balance', 'eye_flow', 'content_density', 'media_placement', 'typography', 'responsiveness', 'accessibility', 'presentation_cohesion'],
    evaluationFocus: 'Visual hierarchy, 5-second comprehension test, whitespace as intentional design, and responsive adaptability.',
  },
};

// ── Asset Fetchers ──────────────────────────────────────────────────────────

async function fetchAssetContent(base44, assetType, assetId) {
  const entityMap = {
    'ResearchPoint': 'ResearchPoint',
    'StorySlide': 'StorySlide',
    'PresentationScript': 'ProductionPackage',
    'ImageAsset': 'ImageAsset',
    'VoicePackage': 'VoicePackage',
    'VideoAsset': 'ImageAsset',
    'Layout': 'StorySlide',
    'ProductionPackage': 'ProductionPackage',
  };

  const entityName = entityMap[assetType];
  if (!entityName) return null;

  try {
    return await base44.asServiceRole.entities[entityName].get(assetId);
  } catch {
    return null;
  }
}

function extractAssetText(asset, assetType) {
  if (!asset) return 'Asset could not be retrieved.';

  const parts = [];
  switch (assetType) {
    case 'ResearchPoint':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.content) parts.push(`Content: ${asset.content}`);
      if (asset.key_facts) parts.push(`Key Facts: ${asset.key_facts}`);
      if (asset.sources_used) parts.push(`Sources: ${asset.sources_used}`);
      break;
    case 'StorySlide':
      if (asset.slide_title) parts.push(`Title: ${asset.slide_title}`);
      if (asset.text_elements) parts.push(`Text Elements: ${asset.text_elements}`);
      if (asset.image_elements) parts.push(`Image Elements: ${asset.image_elements}`);
      if (asset.ai_reasoning) parts.push(`AI Reasoning: ${asset.ai_reasoning}`);
      break;
    case 'PresentationScript':
      if (asset.script) parts.push(`Script: ${asset.script}`);
      if (asset.teleprompter_script) parts.push(`Teleprompter Script: ${asset.teleprompter_script}`);
      break;
    case 'ImageAsset':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.source_prompt) parts.push(`Prompt: ${asset.source_prompt}`);
      if (asset.image_url) parts.push(`Image URL: ${asset.image_url}`);
      if (asset.width) parts.push(`Dimensions: ${asset.width}x${asset.height}`);
      break;
    case 'VoicePackage':
      if (asset.teleprompter_script) parts.push(`Script: ${asset.teleprompter_script}`);
      if (asset.transcript) parts.push(`Transcript: ${asset.transcript}`);
      if (asset.runtime_stats) parts.push(`Runtime Stats: ${asset.runtime_stats}`);
      if (asset.total_duration_seconds) parts.push(`Duration: ${asset.total_duration_seconds}s`);
      break;
    case 'Layout':
      if (asset.slide_title) parts.push(`Slide Title: ${asset.slide_title}`);
      if (asset.text_elements) parts.push(`Text Elements: ${asset.text_elements}`);
      if (asset.image_elements) parts.push(`Image Elements: ${asset.image_elements}`);
      if (asset.animation_plan) parts.push(`Animation Plan: ${asset.animation_plan}`);
      break;
    case 'ProductionPackage':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.script) parts.push(`Script: ${asset.script}`);
      if (asset.talking_points) parts.push(`Talking Points: ${asset.talking_points}`);
      if (asset.summary) parts.push(`Summary: ${asset.summary}`);
      break;
    default:
      parts.push(JSON.stringify(asset).slice(0, 3000));
  }
  return parts.join('\n\n');
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      asset_id,
      asset_type,
      rubric_id,
      department,
      production_id,
      production_profile,
      quality_mode = 'standard',
      review_iteration = 1,
      maximum_iterations = 5,
      model = 'claude_sonnet_4_6',
    } = body;

    if (!asset_id || !asset_type || !rubric_id) {
      return Response.json({
        error: 'asset_id, asset_type, and rubric_id are required.',
      }, { status: 400 });
    }

    const rubric = RUBRIC_DEFINITIONS[rubric_id];
    if (!rubric) {
      return Response.json({
        error: `Unknown rubric: ${rubric_id}. Valid: ${Object.keys(RUBRIC_DEFINITIONS).join(', ')}`,
      }, { status: 400 });
    }

    // ── 1. Fetch asset content ──────────────────────────────────────────────
    const asset = await fetchAssetContent(base44, asset_type, asset_id);
    const assetText = extractAssetText(asset, asset_type);

    // ── 2. Build evaluation prompt ──────────────────────────────────────────
    const categoryList = rubric.categories.join(', ');
    const evaluationPrompt = `You are a CREAPD QA Worker evaluating a production asset against the ${rubric.name} (${rubric_id}).

EVALUATION FOCUS:
${rubric.evaluationFocus}

EVALUATION CATEGORIES (score each 0-100):
${categoryList}

QUALITY MODE: ${quality_mode}
(Draft: 75+, Standard: 85+, Professional: 92+, Broadcast: 97+)

ASSET TYPE: ${asset_type}
ASSET ID: ${asset_id}

ASSET CONTENT:
${assetText}

SCORING RULES:
- Score each category independently and objectively.
- "accuracy" must be 95+ if the content is factually correct.
- "technical_integrity" must be 95+ if the asset meets technical specs (resolution, runtime, format).
- "copyright_compliance" / "copyright" must be 100 if no copyright issues exist.
- "accessibility" must be 85+ if the asset meets accessibility standards.
- "educational_value" must be 90+ if the asset clearly serves an educational purpose.
- "brand_consistency" must be 90+ if the asset aligns with brand guidelines.
- If a category does not apply, score it 100.

Provide specific, actionable recommendations for any score below 95.
Set revision_required=true if any score falls below the quality mode threshold or any critical category fails.
Set confidence (0-100) to reflect your certainty in the evaluation.`;

    // ── 3. Build JSON schema for LLM response ───────────────────────────────
    const scoresSchema = {};
    rubric.categories.forEach((cat) => {
      scoresSchema[cat] = { type: 'number', description: `Score 0-100 for ${cat}` };
    });

    const responseSchema = {
      type: 'object',
      properties: {
        overall_score: { type: 'number', description: 'Aggregate quality score 0-100' },
        classification: {
          type: 'string',
          enum: ['draft', 'standard', 'professional', 'broadcast_ready', 'needs_revision', 'failed'],
          description: 'Quality classification label',
        },
        scores: {
          type: 'object',
          properties: scoresSchema,
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific, actionable recommendations for improvement',
        },
        confidence: { type: 'number', description: 'Certainty of evaluation 0-100' },
        revision_required: { type: 'boolean', description: 'Whether revision is needed' },
        reasoning: { type: 'string', description: 'Brief explanation of the evaluation' },
      },
      required: ['overall_score', 'classification', 'scores', 'confidence', 'revision_required'],
    };

    // ── 4. Invoke LLM ────────────────────────────────────────────────────────
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: evaluationPrompt,
      response_json_schema: responseSchema,
      model: 'automatic',
    });

    // InvokeLLM returns a dict when response_json_schema is set
    const evaluation = llmResponse && typeof llmResponse === 'object' ? llmResponse : {};

    // ── 5. Persist Quality Report ────────────────────────────────────────────
    const overallScore = typeof evaluation.overall_score === 'number'
      ? evaluation.overall_score
      : typeof evaluation.overall_score === 'string'
        ? parseFloat(evaluation.overall_score) || 0
        : 0;

    const confidenceScore = typeof evaluation.confidence === 'number'
      ? evaluation.confidence
      : typeof evaluation.confidence === 'string'
        ? parseFloat(evaluation.confidence) || 0
        : 0;

    const qualityReport = await base44.asServiceRole.entities.QualityReport.create({
      asset_id,
      asset_type,
      rubric_id,
      department: department || 'Unassigned',
      overall_score: overallScore,
      classification: evaluation.classification || 'standard',
      status: 'pending',
      scores: JSON.stringify(evaluation.scores || {}),
      recommendations: JSON.stringify(evaluation.recommendations || []),
      confidence: confidenceScore,
      revision_required: evaluation.revision_required || false,
      review_iteration,
      maximum_iterations,
      production_profile: production_profile || null,
      quality_mode,
      production_id: production_id || null,
      story_slide_id: asset_type === 'StorySlide' || asset_type === 'Layout' ? asset_id : null,
    });

    // ── 6. Invoke Controller Decision Engine ──────────────────────────────────
    const controllerResponse = await base44.asServiceRole.functions.invoke(
      'controllerDecisionEngine',
      {
        quality_report_id: qualityReport.id,
        report: {
          asset_id,
          asset_type,
          overall_score: overallScore,
          classification: evaluation.classification || 'standard',
          status: 'pending',
          scores: evaluation.scores || {},
          recommendations: evaluation.recommendations || [],
          confidence: confidenceScore,
          revision_required: evaluation.revision_required || false,
          review_iteration,
          maximum_iterations,
          quality_mode,
        },
        department: department || 'Unassigned',
        production_id: production_id || null,
        production_profile: production_profile || null,
      }
    );

    const controllerDecision = controllerResponse.data || controllerResponse;

    // ── 7. Return combined result ─────────────────────────────────────────────
    return Response.json({
      quality_report_id: qualityReport.id,
      rubric_id,
      asset_id,
      asset_type,
      evaluation: {
        overall_score: overallScore,
        classification: evaluation.classification,
        scores: evaluation.scores,
        recommendations: evaluation.recommendations,
        confidence: confidenceScore,
        revision_required: evaluation.revision_required,
        reasoning: evaluation.reasoning,
      },
      controller_decision: controllerDecision,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});