import { generateStructuredGatewayResponse } from './aiGateway.js';

const MAX_REVISIONS = 5;
const CANVAS_W = 1280;
const CANVAS_H = 720;

const DESIGN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visual_intent: { type: 'string' },
    layout_instructions: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          slide_index: { type: 'integer' },
          instructions: { type: 'string' },
        },
        required: ['slide_index', 'instructions'],
      },
    },
    typography_instructions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        caption: { type: 'string' },
      },
      required: ['title', 'body', 'caption'],
    },
    color_instructions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        background: { type: 'string' },
        text: { type: 'string' },
        accent: { type: 'string' },
      },
      required: ['background', 'text', 'accent'],
    },
    animation_instructions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string' },
        duration_ms: { type: 'integer' },
      },
      required: ['type', 'duration_ms'],
    },
    transition_instructions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string' },
        duration_ms: { type: 'integer' },
      },
      required: ['type', 'duration_ms'],
    },
    timing_recommendations: {
      type: 'object',
      additionalProperties: false,
      properties: {
        slide_duration_ms: { type: 'integer' },
        element_stagger_ms: { type: 'integer' },
      },
      required: ['slide_duration_ms', 'element_stagger_ms'],
    },
    operator_instructions: {
      type: 'array',
      maxItems: 10,
      items: { type: 'string' },
    },
    asset_recommendations: {
      type: 'array',
      maxItems: 8,
      items: { type: 'string' },
    },
    design_rationale: { type: 'string' },
  },
  required: [
    'visual_intent',
    'layout_instructions',
    'typography_instructions',
    'color_instructions',
    'animation_instructions',
    'transition_instructions',
    'timing_recommendations',
    'operator_instructions',
    'asset_recommendations',
    'design_rationale',
  ],
};

const OPERATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    commands: {
      type: 'array',
      maxItems: 18,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target_slide: { type: 'string' },
          target_element: { type: 'string' },
          operation: { type: 'string' },
          parameters: { type: 'string' },
          reason: { type: 'string' },
          expected_result: { type: 'string' },
        },
        required: ['target_slide', 'target_element', 'operation', 'parameters', 'reason', 'expected_result'],
      },
    },
  },
  required: ['commands'],
};

const QUALITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall_score: { type: 'number' },
    pass_fail: { type: 'string', enum: ['pass', 'fail'] },
    rubric_scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        typography: { type: 'number' },
        spacing: { type: 'number' },
        alignment: { type: 'number' },
        safe_margins: { type: 'number' },
        color_consistency: { type: 'number' },
        theme_consistency: { type: 'number' },
        animation: { type: 'number' },
        transitions: { type: 'number' },
        overlap: { type: 'number' },
        flow: { type: 'number' },
        polish: { type: 'number' },
      },
      required: [
        'typography', 'spacing', 'alignment', 'safe_margins', 'color_consistency',
        'theme_consistency', 'animation', 'transitions', 'overlap', 'flow', 'polish',
      ],
    },
    issues: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          responsible_worker: { type: 'string', enum: ['design_specialist', 'operator', 'asset_worker', 'presentation_director'] },
          recommended_fix: { type: 'string' },
        },
        required: ['description', 'severity', 'responsible_worker', 'recommended_fix'],
      },
    },
    revision_required: { type: 'boolean' },
    responsible_worker: { type: 'string' },
    approval_recommendation: { type: 'string' },
  },
  required: [
    'overall_score', 'pass_fail', 'rubric_scores', 'issues',
    'revision_required', 'responsible_worker', 'approval_recommendation',
  ],
};

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function trim(value, max = 800) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function compactPackageSnapshot(presentation) {
  const sourcePayload = asObject(presentation?.source_payload);
  const studio = asObject(sourcePayload.presentation_studio);
  const pkg = asObject(studio.package_snapshot);
  return {
    source_studio: studio.source_studio || presentation?.production_profile || null,
    package_id: studio.source_package_id || pkg.id || null,
    title: trim(pkg.title || pkg.source_point_title || presentation?.title, 180),
    story_summary: trim(pkg.story_summary, 700),
    talking_points: trim(pkg.talking_points, 700),
    lower_third_text: trim(pkg.lower_third_text, 240),
    visual_suggestions: trim(pkg.visual_suggestions, 600),
    broll_suggestions: trim(pkg.broll_suggestions, 500),
    fact_check_notes: trim(pkg.fact_check_notes, 600),
    story_image_url: pkg.generated_image_url || null,
    voice_audio_url: pkg.generated_audio_url || null,
  };
}

function compactDirectorPlan(presentation) {
  const plan = asObject(presentation?.director_plan);
  const scenes = Array.isArray(plan.scenes) ? plan.scenes.slice(0, 12) : [];
  return {
    title: plan.title || presentation?.title || null,
    total_runtime_seconds: plan.total_runtime_seconds || null,
    scene_count: scenes.length,
    scenes: scenes.map(scene => ({
      slide_id: scene.slide_id || null,
      slide_title: trim(scene.slide_title, 120),
      beat_type: scene.beat_type || null,
      scene_purpose: trim(scene.scene_purpose, 220),
      duration_seconds: scene.duration_seconds || null,
      visual_theme: trim(scene.visual_theme, 180),
      transition_plan: scene.transition_plan || null,
      production_notes: trim(scene.production_notes, 260),
    })),
  };
}

function workerError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function getPresentation(sql, ownerUserId, presentationId) {
  const [presentation] = await sql`
    SELECT *
    FROM creapd.presentations
    WHERE id = ${String(presentationId || '')}
      AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;
  if (!presentation) throw workerError('Presentation Studio project not found.', 'PRESENTATION_NOT_FOUND', 404);
  return presentation;
}

async function recordWorkerRun(sql, presentation, ownerUserId, entry) {
  const sourcePayload = asObject(presentation.source_payload);
  const studio = asObject(sourcePayload.presentation_studio);
  const existingRuns = Array.isArray(studio.worker_runs) ? studio.worker_runs : [];
  const workerRuns = [...existingRuns.slice(-19), entry];
  const nextPayload = {
    ...sourcePayload,
    presentation_studio: {
      ...studio,
      worker_runs: workerRuns,
      workers_last_run_at: entry.completed_at,
    },
  };

  await sql`
    UPDATE creapd.presentations
    SET source_payload = ${JSON.stringify(nextPayload)}::jsonb,
        updated_at = now()
    WHERE id = ${String(presentation.id)}
      AND owner_user_id = ${String(ownerUserId)}
  `;
}

function designPrompt({ presentationData, packageContext, directorContext, revisionContext }) {
  const revisionBlock = revisionContext
    ? `\nPRODUCER / QUALITY REVISION DIRECTIVE\n${JSON.stringify(revisionContext).slice(0, 5000)}\n`
    : '';

  return `You are the Design Specialist working inside the CREAPD Presentation Studio.

CHAIN OF COMMAND
- The Presentation Director/APD is the canonical director.
- You are a specialist worker under that direction.
- The approved Production Package snapshot is factual source material and must not be rewritten.
- Producer/manual edits are protected. Improve them surgically; do not replace them wholesale.

JOB
Determine HOW the current presentation should look and move. Do not directly edit the presentation. Produce a compact Design Direction Report for the Editor Operator.

Canvas: ${CANVAS_W}x${CANVAS_H} (16:9)
Safe margins: 60px.

APPROVED PACKAGE SNAPSHOT
${JSON.stringify(packageContext)}

PRESENTATION DIRECTOR PLAN
${JSON.stringify(directorContext)}
${revisionBlock}
CURRENT EDITOR STATE
${JSON.stringify(presentationData).slice(0, 18000)}

Evaluate visual hierarchy, layout, typography, color, motion, transitions, timing, accessibility, asset coverage, and narrative continuity. If a slide lacks meaningful visual support, call that out in asset_recommendations instead of inventing an asset URL. Motion must guide attention, not decorate.`;
}

function operatorPrompt({ presentationData, designReport, packageContext, directorContext, revisionContext }) {
  const revisionBlock = revisionContext
    ? `\nREVISION DIRECTIVE\n${JSON.stringify(revisionContext).slice(0, 5000)}\n`
    : '';

  return `You are the Editor Operator worker inside the CREAPD Presentation Studio.

CHAIN OF COMMAND
Presentation Director/APD → Design Specialist → you, the Operator.
You do not decide the story or facts. You translate approved direction into executable Presentation Editor commands.

Canvas: ${CANVAS_W}x${CANVAS_H}.

APPROVED PACKAGE SNAPSHOT
${JSON.stringify(packageContext)}

PRESENTATION DIRECTOR PLAN
${JSON.stringify(directorContext)}

DESIGN DIRECTION REPORT
${JSON.stringify(designReport)}
${revisionBlock}
CURRENT EDITOR STATE
${JSON.stringify(presentationData).slice(0, 18000)}

ALLOWED COMMANDS
- update_text: {"text":"string"}
- move_element: {"x":number,"y":number}
- resize_element: {"width":number,"height":number}
- rotate_element: {"rotation":number}
- apply_typography: {"fontSize":number,"fontFamily":"string","color":"hex","bold":boolean,"align":"left|center|right"}
- apply_color: {"color":"hex","backgroundColor":"rgba/string"}
- apply_transition: {"type":"fade|slide_left|slide_right|zoom|dissolve|none"}
- apply_animation: {"type":"fade_in|slide_in|zoom_in|dissolve_in","duration_ms":number,"delay_ms":number}
- update_timing: {"start_ms":number,"end_ms":number}
- update_speaker_notes: {"notes":"string"}
- replace_image: {"url":"string"}
- add_slide: {}
- delete_slide: {"slide_index":number}
- duplicate_slide: {"slide_index":number}
- reorder_slide: {"from":number,"to":number}
- run_preview: {}
- run_qa: {}

RULES
1. target_slide and target_element must use actual ids from current state when applicable.
2. parameters MUST be a valid JSON object serialized as a JSON string.
3. Never invent image URLs. Only use URLs present in the approved package/current state.
4. Protect producer edits; make targeted changes.
5. Respect voice/timeline timing from the Director.
6. Focus on the active slide unless an obvious continuity problem requires a small cross-slide correction.`;
}

function qualityPrompt({ presentationData, packageContext, directorContext, revisionContext }) {
  const revisionBlock = revisionContext
    ? `\nPREVIOUS REVIEW / REVISION CONTEXT\n${JSON.stringify(revisionContext).slice(0, 5000)}\n`
    : '';

  return `You are the Quality Specialist inside the CREAPD Presentation Studio.

You review; you never edit. The Presentation Director/APD is the canonical director, and the approved Production Package is the factual source of truth.

Canvas: ${CANVAS_W}x${CANVAS_H}; safe margins: 60px.

APPROVED PACKAGE SNAPSHOT
${JSON.stringify(packageContext)}

PRESENTATION DIRECTOR PLAN
${JSON.stringify(directorContext)}
${revisionBlock}
CURRENT EDITOR STATE
${JSON.stringify(presentationData).slice(0, 18000)}

Score typography, spacing, alignment, safe margins, color consistency, theme consistency, animation, transitions, overlap, narrative flow, and polish. Also verify that every slide has appropriate visual support and that animations/timing are plausible against the Director's voice timeline. Flag factual/story changes as high severity and assign them to presentation_director rather than silently accepting them.`;
}

function parseCommandParameters(commands) {
  return (commands || []).map(command => {
    let parameters = command.parameters;
    if (typeof parameters === 'string') {
      try { parameters = JSON.parse(parameters); } catch { parameters = {}; }
    }
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) parameters = {};
    return { ...command, parameters };
  });
}

export async function runPresentationStudioWorkers({
  sql,
  ownerUserId,
  presentationId,
  action,
  presentationData,
  revisionContext = null,
  revisionCount = 0,
}) {
  const presentation = await getPresentation(sql, ownerUserId, presentationId);
  const sourcePayload = asObject(presentation.source_payload);
  const studio = asObject(sourcePayload.presentation_studio);
  if (!studio.handoff_type) {
    throw workerError('This presentation is not a Presentation Studio handoff project.', 'PRESENTATION_STUDIO_PROJECT_REQUIRED', 409);
  }

  const currentRevision = Math.max(0, Number(revisionCount || 0));
  if (currentRevision >= MAX_REVISIONS) {
    throw workerError('Maximum worker revision limit reached. Escalate to the producer.', 'WORKER_REVISION_LIMIT', 409);
  }

  const packageContext = compactPackageSnapshot(presentation);
  const directorContext = compactDirectorPlan(presentation);
  const completedAt = new Date().toISOString();

  if (action === 'improve') {
    const designGateway = await generateStructuredGatewayResponse({
      prompt: designPrompt({ presentationData, packageContext, directorContext, revisionContext }),
      schema: DESIGN_SCHEMA,
      schemaName: 'creapd_presentation_design_worker_v1',
      maxOutputTokens: 1700,
      timeoutMs: 24000,
    });

    const designReport = designGateway.data;
    const operatorGateway = await generateStructuredGatewayResponse({
      prompt: operatorPrompt({ presentationData, designReport, packageContext, directorContext, revisionContext }),
      schema: OPERATOR_SCHEMA,
      schemaName: 'creapd_presentation_operator_v1',
      maxOutputTokens: 1700,
      timeoutMs: 24000,
    });

    const commandPlan = parseCommandParameters(operatorGateway.data?.commands);
    await recordWorkerRun(sql, presentation, ownerUserId, {
      action: 'improve',
      completed_at: completedAt,
      revision_count: currentRevision,
      design_model: designGateway.model,
      operator_model: operatorGateway.model,
      command_count: commandPlan.length,
    });

    return {
      design_report: designReport,
      command_plan: commandPlan,
      revision_count: currentRevision,
      max_revisions: MAX_REVISIONS,
      source: 'owned_presentation_studio',
    };
  }

  if (action === 'review') {
    const qualityGateway = await generateStructuredGatewayResponse({
      prompt: qualityPrompt({ presentationData, packageContext, directorContext, revisionContext }),
      schema: QUALITY_SCHEMA,
      schemaName: 'creapd_presentation_quality_worker_v1',
      maxOutputTokens: 1600,
      timeoutMs: 26000,
    });

    await recordWorkerRun(sql, presentation, ownerUserId, {
      action: 'review',
      completed_at: completedAt,
      revision_count: currentRevision,
      quality_model: qualityGateway.model,
      overall_score: qualityGateway.data?.overall_score ?? null,
      pass_fail: qualityGateway.data?.pass_fail ?? null,
    });

    return {
      quality_report: qualityGateway.data,
      revision_count: currentRevision,
      max_revisions: MAX_REVISIONS,
      source: 'owned_presentation_studio',
    };
  }

  throw workerError(`Unsupported Presentation Studio worker action: ${action}`, 'WORKER_ACTION_INVALID', 400);
}
