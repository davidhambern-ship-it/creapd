import { generateStructuredGatewayResponse } from './aiGateway.js';
import { runPresentationStudioWorkers } from './presentationStudioWorkers.js';

const TEXT_REWRITE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
  },
  required: ['content'],
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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

function trim(value, max = 1200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function actionError(message, code, status = 400) {
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
  if (!presentation) {
    throw actionError('Presentation Studio project not found.', 'PRESENTATION_NOT_FOUND', 404);
  }
  return presentation;
}

function studioContext(presentation) {
  const sourcePayload = asObject(presentation.source_payload);
  const studio = asObject(sourcePayload.presentation_studio);
  const packageSnapshot = asObject(studio.package_snapshot);
  const directorPlan = asObject(presentation.director_plan);
  const editorState = asObject(studio.editor_state);

  return { sourcePayload, studio, packageSnapshot, directorPlan, editorState };
}

function serializeEditorState(presentation, editorState) {
  const slides = asArray(editorState.slides);
  const elementMap = asObject(editorState.elements_by_slide);
  const activeSlideId = String(editorState.active_slide_id || '');
  const activeSlideIndex = Math.max(0, slides.findIndex(slide => String(slide?.id || '') === activeSlideId));

  return {
    title: editorState?.presentation?.title || presentation.title || 'Untitled',
    production_profile: presentation.production_profile || null,
    production_studio: presentation.production_profile || null,
    aspect_ratio: editorState?.presentation?.aspect_ratio || '16:9',
    active_slide_index: activeSlideIndex,
    slides: slides.map((slide, index) => ({
      index,
      id: slide.id,
      title: trim(slide.title, 180),
      body_text: trim(slide.body_text, 600),
      slide_type: slide.slide_type || 'content_slide',
      transition: slide.transition || 'fade',
      timing: asObject(slide.timing),
      background: asObject(slide.background),
      speaker_notes: trim(slide.speaker_notes, 500),
    })),
    elements: slides.flatMap((slide, slideIndex) => {
      const elements = asArray(elementMap[slide.id]);
      return elements.map(element => ({
        id: element.id,
        slide_id: slide.id,
        slide_index: slideIndex,
        type: element.type,
        content: trim(element.content, 300),
        x: Number(element.x || 0),
        y: Number(element.y || 0),
        width: Number(element.width || 0),
        height: Number(element.height || 0),
        rotation: Number(element.rotation || 0),
        opacity: element.opacity ?? 100,
        z_index: Number(element.z_index || 0),
        style: asObject(element.style),
        timing: asObject(element.timing),
        animation: asObject(element.animation),
        visible: element.visible !== false,
      }));
    }),
  };
}

function compactPackageSnapshot(packageSnapshot, presentation) {
  return {
    title: trim(packageSnapshot.title || packageSnapshot.source_point_title || presentation.title, 180),
    story_summary: trim(packageSnapshot.story_summary, 800),
    talking_points: trim(packageSnapshot.talking_points, 800),
    lower_third_text: trim(packageSnapshot.lower_third_text, 260),
    fact_check_notes: trim(packageSnapshot.fact_check_notes, 700),
    teleprompter_script: trim(packageSnapshot.teleprompter_script || packageSnapshot.show_script, 2200),
  };
}

function compactDirectorPlan(directorPlan) {
  const scenes = asArray(directorPlan.scenes).slice(0, 12);
  return {
    title: directorPlan.title || null,
    total_runtime_seconds: directorPlan.total_runtime_seconds || null,
    scenes: scenes.map(scene => ({
      slide_id: scene.slide_id || null,
      slide_title: trim(scene.slide_title, 140),
      beat_type: scene.beat_type || null,
      scene_purpose: trim(scene.scene_purpose, 220),
      duration_seconds: scene.duration_seconds || null,
      production_notes: trim(scene.production_notes, 260),
    })),
  };
}

export async function rewritePresentationStudioText({
  sql,
  ownerUserId,
  presentationId,
  content,
}) {
  const presentation = await getPresentation(sql, ownerUserId, presentationId);
  const { studio, packageSnapshot, directorPlan } = studioContext(presentation);
  if (!studio.handoff_type) {
    throw actionError('This is not an owned Presentation Studio handoff project.', 'PRESENTATION_STUDIO_PROJECT_REQUIRED', 409);
  }

  const currentText = trim(content, 1400);
  if (!currentText) {
    throw actionError('Text content is required.', 'PRESENTATION_TEXT_REQUIRED', 400);
  }

  const result = await generateStructuredGatewayResponse({
    prompt: `You are the Copy Specialist working inside the CREAPD Presentation Studio.\n\nCHAIN OF COMMAND\n- The approved Production Package is the factual source of truth.\n- The Presentation Director/APD controls story intent and presentation strategy.\n- You are editing one viewer-facing text element only.\n\nRULES\n1. Improve clarity, grammar, brevity, rhythm, and on-screen readability.\n2. Preserve the exact factual meaning, names, dates, numbers, quotations, and claims.\n3. Do not invent facts, context, statistics, people, quotes, or conclusions.\n4. Do not turn the text into production instructions.\n5. Return only the improved viewer-facing wording in the content field.\n6. If the current wording is already strong, make the smallest useful change.\n\nAPPROVED PACKAGE SNAPSHOT\n${JSON.stringify(compactPackageSnapshot(packageSnapshot, presentation))}\n\nPRESENTATION DIRECTOR PLAN\n${JSON.stringify(compactDirectorPlan(directorPlan))}\n\nCURRENT ELEMENT TEXT\n${currentText}`,
    schema: TEXT_REWRITE_SCHEMA,
    schemaName: 'creapd_presentation_text_rewrite_v1',
    maxOutputTokens: 260,
    timeoutMs: 18000,
  });

  return {
    content: trim(result.data?.content, 1400),
    model: result.model,
    source: 'owned_presentation_studio',
  };
}

export async function runPresentationStudioQa({ sql, ownerUserId, presentationId }) {
  const presentation = await getPresentation(sql, ownerUserId, presentationId);
  const { studio, editorState } = studioContext(presentation);
  if (!studio.handoff_type) {
    throw actionError('This is not an owned Presentation Studio handoff project.', 'PRESENTATION_STUDIO_PROJECT_REQUIRED', 409);
  }
  if (!editorState.presentation || !asArray(editorState.slides).length) {
    throw actionError('The Presentation Studio project has no editor state to review.', 'PRESENTATION_EDITOR_STATE_REQUIRED', 409);
  }

  const result = await runPresentationStudioWorkers({
    sql,
    ownerUserId,
    presentationId,
    action: 'review',
    presentationData: serializeEditorState(presentation, editorState),
    revisionContext: null,
    revisionCount: 0,
  });

  // runPresentationStudioWorkers records its own audit entry first. Re-read the
  // row before persisting QA so we preserve that worker history.
  const fresh = await getPresentation(sql, ownerUserId, presentationId);
  const freshContext = studioContext(fresh);
  const quality = result.quality_report || {};
  const qaResult = quality.pass_fail === 'pass' ? 'pass' : 'fail';
  const nextEditorState = {
    ...freshContext.editorState,
    presentation: {
      ...asObject(freshContext.editorState.presentation),
      qa_result: qaResult,
      qa_scores: JSON.stringify(quality.rubric_scores || {}),
      confidence_score: Number(quality.overall_score || 0),
    },
  };
  const completedAt = new Date().toISOString();
  const nextPayload = {
    ...freshContext.sourcePayload,
    presentation_studio: {
      ...freshContext.studio,
      editor_state: nextEditorState,
      qa_report: quality,
      qa_completed_at: completedAt,
      qa_status: qaResult,
    },
  };

  const [updated] = await sql`
    UPDATE creapd.presentations
    SET source_payload = ${JSON.stringify(nextPayload)}::jsonb,
        updated_at = now()
    WHERE id = ${String(presentationId)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;

  return {
    quality_report: quality,
    qa_result: qaResult,
    presentation: nextEditorState.presentation,
    record: updated || fresh,
    source: 'owned_presentation_studio',
  };
}

export async function sharePresentationStudioProject({
  sql,
  ownerUserId,
  presentationId,
  visibility = 'team',
}) {
  const presentation = await getPresentation(sql, ownerUserId, presentationId);
  const context = studioContext(presentation);
  if (!context.studio.handoff_type) {
    throw actionError('This is not an owned Presentation Studio handoff project.', 'PRESENTATION_STUDIO_PROJECT_REQUIRED', 409);
  }

  const sharedAt = new Date().toISOString();
  const safeVisibility = ['team', 'private'].includes(String(visibility)) ? String(visibility) : 'team';
  const share = {
    shared: true,
    visibility: safeVisibility,
    shared_at: sharedAt,
    presentation_id: presentation.id,
    route: `/editor/${presentation.id}`,
  };
  const nextPayload = {
    ...context.sourcePayload,
    presentation_studio: {
      ...context.studio,
      share,
    },
  };

  await sql`
    UPDATE creapd.presentations
    SET source_payload = ${JSON.stringify(nextPayload)}::jsonb,
        updated_at = now()
    WHERE id = ${String(presentation.id)}
      AND owner_user_id = ${String(ownerUserId)}
  `;

  return {
    ...share,
    source: 'owned_presentation_studio',
  };
}
