import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 — Worker Dispatch Pipeline (Sections 10-11)
 *
 * Implements the canonical QA pipeline:
 *   Generation Worker → Review Worker → QA Worker → Quality Report → Controller Decision Engine
 *
 * No Worker may approve its own work (Canonical Rule #9).
 * Controllers evaluate Quality Reports, not assets (Section 11).
 * Controllers never rewrite assets — they delegate revisions (Section 11).
 */

const CAPABILITY_MODELS = {
  reasoning: { preferred: ['gpt_5_4', 'gpt_5_5', 'claude_sonnet_4_6'], fallback: 'gpt_5_mini' },
  deep_research: { preferred: ['gemini_3_flash', 'gemini_3_1_pro'], fallback: 'gemini_3_flash' },
  long_form_writing: { preferred: ['claude_opus_4_6', 'claude_opus_4_7', 'claude_sonnet_4_6'], fallback: 'claude_sonnet_4_6' },
  creative_generation: { preferred: ['gpt_5_mini', 'gemini_3_flash'], fallback: 'gpt_5_mini' },
  organization: { preferred: ['claude_sonnet_4_6', 'gpt_5_4'], fallback: 'gpt_5_mini' },
  intent_mapping: { preferred: ['gpt_5_mini', 'gemini_3_flash'], fallback: 'gpt_5_mini' },
  quality_assurance: { preferred: ['claude_sonnet_4_6', 'gpt_5_4'], fallback: 'gpt_5_mini' },
};

function getModelForCapability(capability) {
  const cap = CAPABILITY_MODELS[capability];
  if (!cap) return 'gpt_5_mini';
  return cap.preferred[0] || cap.fallback;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      worker_id,        // e.g. 'research_fact', 'develop_script'
      department,       // e.g. 'research', 'develop'
      task_prompt,      // The actual instruction for the generation worker
      asset_type,       // e.g. 'PresentationPoint', 'PresentationScript'
      asset_id,         // ID of the asset being evaluated (for QA stages)
      quality_mode,     // 'draft' | 'standard' | 'professional' | 'broadcast'
      skip_qa,          // Skip the Review→QA→Controller pipeline (for non-asset tasks like topic mapping)
      configuration_id, // Research production configuration
    } = body;

    if (!worker_id || !department) {
      return Response.json({
        error: 'worker_id and department are required',
      }, { status: 400 });
    }

    // ── Stage 1: Generation Worker ──
    if (!task_prompt) {
      return Response.json({
        error: 'task_prompt is required for generation',
      }, { status: 400 });
    }

    const workerCapabilities = {
      'topics_intent_mapper': { capability: 'intent_mapping' },
      'research_fact': { capability: 'deep_research' },
      'research_historical': { capability: 'deep_research' },
      'research_statistics': { capability: 'deep_research' },
      'research_source_verification': { capability: 'reasoning' },
      'research_visual': { capability: 'deep_research' },
      'research_debate': { capability: 'reasoning' },
      'research_entity': { capability: 'reasoning' },
      'dossier_organizer': { capability: 'organization' },
      'develop_planning': { capability: 'organization' },
      'develop_script': { capability: 'long_form_writing' },
      'develop_image': { capability: 'creative_generation' },
      'develop_video': { capability: 'creative_generation' },
      'develop_voice': { capability: 'long_form_writing' },
      'develop_design': { capability: 'creative_generation' },
      'packet_assembly': { capability: 'organization' },
      'packet_export': { capability: 'organization' },
    };

    const workerCap = workerCapabilities[worker_id];
    if (!workerCap) {
      return Response.json({ error: `Unknown worker: ${worker_id}` }, { status: 400 });
    }

    const genModel = getModelForCapability(workerCap.capability);

    const generationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: task_prompt,
      model: genModel,
      add_context_from_internet: workerCap.capability === 'deep_research',
    });

    // ── Skip QA for non-asset tasks (e.g. topic intent mapping, research dispatch) ──
    if (skip_qa) {
      return Response.json({
        pipeline_stage: 'generation_complete',
        worker_id,
        department,
        generation_result: generationResult,
        qa_skipped: true,
      });
    }

    // ── Stage 2: Review Worker ──
    // Review Worker critiques the generated asset (Canonical Rule #4, #9)
    const reviewModel = getModelForCapability('reasoning');
    const reviewPrompt = `You are a Review Worker in the CREAPD AI Studio pipeline.

Your job is to critique the following generated asset. You may NOT approve it — that is the QA Worker's job.

ASSET TYPE: ${asset_type || 'Unknown'}
WORKER THAT GENERATED THIS: ${worker_id}

GENERATED CONTENT:
${typeof generationResult === 'string' ? generationResult : JSON.stringify(generationResult, null, 2)}

Provide a critique identifying:
1. Strengths
2. Weaknesses
3. Missing elements
4. Suggested improvements

Do not rewrite the asset. Only critique it.`;

    const reviewResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: reviewPrompt,
      model: reviewModel,
    });

    // ── Stage 3: QA Worker ──
    // QA Worker evaluates against standardized rubrics (PA-RUB-001 through PA-RUB-008)
    const qaModel = getModelForCapability('quality_assurance');
    const qaPrompt = `You are a QA Worker in the CREAPD AI Studio pipeline.

Evaluate the following asset against quality standards. Return a JSON object with:

{
  "overall_score": <0-100>,
  "classification": "<draft|standard|professional|broadcast_ready|needs_revision|failed>",
  "scores": { "accuracy": <0-100>, "clarity": <0-100>, "completeness": <0-100> },
  "recommendations": ["<improvement 1>", "<improvement 2>"],
  "confidence": <0-100>,
  "revision_required": <boolean>
}

QUALITY MODE: ${quality_mode || 'standard'}

ASSET TYPE: ${asset_type || 'Unknown'}

GENERATED CONTENT:
${typeof generationResult === 'string' ? generationResult : JSON.stringify(generationResult, null, 2)}

REVIEW CRITIQUE:
${typeof reviewResult === 'string' ? reviewResult : JSON.stringify(reviewResult, null, 2)}`;

    const qaResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: qaPrompt,
      model: qaModel,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_score: { type: 'number' },
          classification: { type: 'string' },
          scores: { type: 'object' },
          recommendations: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
          revision_required: { type: 'boolean' },
        },
      },
    });

    // ── Stage 4: Quality Report ──
    const qualityReport = await base44.asServiceRole.entities.QualityReport.create({
      asset_id: asset_id || worker_id,
      asset_type: asset_type || 'PresentationPoint',
      department,
      overall_score: qaResult.overall_score || 0,
      classification: qaResult.classification || 'draft',
      status: qaResult.revision_required ? 'revise' : 'pass',
      scores: JSON.stringify(qaResult.scores || {}),
      recommendations: JSON.stringify(qaResult.recommendations || []),
      confidence: qaResult.confidence || 0,
      revision_required: qaResult.revision_required || false,
      review_iteration: 1,
      maximum_iterations: 5,
      production_profile: 'research',
      quality_mode: quality_mode || 'standard',
    });

    // ── Stage 5: Controller Decision Engine ──
    // Controller evaluates the Quality Report (not the asset itself) — Section 11
    let controllerDecision;
    try {
      const ctrlRes = await base44.asServiceRole.functions.invoke('controllerDecisionEngine', {
        quality_report_id: qualityReport.id,
        asset_type: asset_type || 'PresentationPoint',
        department,
        production_profile: 'research',
        quality_mode: quality_mode || 'standard',
      });
      controllerDecision = ctrlRes.data || ctrlRes;
    } catch (ctrlErr) {
      // If controller fails, default to pass/revise based on QA result
      controllerDecision = {
        decision: qaResult.revision_required ? 'revise' : 'pass',
        reason: `Controller unavailable — defaulted based on QA result: ${ctrlErr.message}`,
        quality_report_id: qualityReport.id,
      };
    }

    return Response.json({
      pipeline_complete: true,
      worker_id,
      department,
      stages: {
        generation: { model: genModel, result: generationResult },
        review: { model: reviewModel, result: reviewResult },
        qa: { model: qaModel, result: qaResult },
        quality_report: { id: qualityReport.id, score: qualityReport.overall_score },
        controller_decision: controllerDecision,
      },
      controller_action: controllerDecision.decision || 'pass',
      requires_revision: controllerDecision.decision === 'revise',
      assigned_worker_for_revision: controllerDecision.assigned_worker || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});