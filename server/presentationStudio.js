import { randomUUID } from 'node:crypto';
import { directResearchPresentation } from './researchPresentationDirector.js';

export const PRESENTATION_STUDIO_VERSION = 'presentation-studio-v1';

function studioError(message, code, status = 400, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
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
    } catch {
      return [];
    }
  }
  return [];
}

function studioKey(row) {
  return String(row?.production_studio || row?.production_profile || '').trim().toLowerCase();
}

function packageTitle(pkg) {
  const direct = String(pkg?.title || '').trim();
  if (direct) return direct;

  const headlines = asArray(pkg?.headline_suggestions);
  if (headlines.length) {
    const first = headlines[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first === 'object') {
      const candidate = first.title || first.headline || first.text;
      if (candidate) return String(candidate).trim();
    }
  }

  const summary = String(pkg?.story_summary || '').trim();
  if (summary) return summary.split(/[.!?]/)[0].slice(0, 96) || 'Untitled Presentation';
  return 'Untitled Presentation';
}

function voiceDurationSeconds(pkg) {
  const sourcePayload = asObject(pkg?.source_payload);
  const lastMedia = asObject(sourcePayload.last_media_generation);
  const candidates = [
    sourcePayload.voice_duration_seconds,
    lastMedia.duration_seconds,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 0;
}

function makeSlideId(presentationId) {
  return `${presentationId}:slide:${randomUUID()}`;
}

function makeElementId(presentationId) {
  return `${presentationId}:element:${randomUUID()}`;
}

function elementStyle(overrides = {}) {
  return JSON.stringify({
    fontFamily: 'Inter, sans-serif',
    fontSize: 28,
    color: '#ffffff',
    align: 'left',
    backgroundColor: 'transparent',
    padding: 8,
    ...overrides,
  });
}

function normalizeEditorPresentation(presentation, editorPresentation = {}) {
  return {
    id: presentation.id,
    title: editorPresentation.title || presentation.title || 'Untitled Presentation',
    production_profile: presentation.production_profile,
    production_studio: presentation.production_profile,
    pp_id: editorPresentation.pp_id || presentation.id,
    status: editorPresentation.status || presentation.status || 'editing',
    presentation_version: Number(editorPresentation.presentation_version || 1),
    aspect_ratio: editorPresentation.aspect_ratio || '16:9',
    slide_order: editorPresentation.slide_order || '[]',
    story_slide_ids: editorPresentation.story_slide_ids || '[]',
    source_system: 'creapd-neon-vercel',
    presentation_studio_version: PRESENTATION_STUDIO_VERSION,
    ...editorPresentation,
  };
}

function buildPackageIntakeEditorState(presentation, pkg) {
  const slideId = makeSlideId(presentation.id);
  const durationSeconds = voiceDurationSeconds(pkg);
  const durationMs = durationSeconds > 0 ? Math.round(durationSeconds * 1000) : 5000;
  const title = packageTitle(pkg);
  const summary = String(pkg.story_summary || '').trim();
  const imageUrl = String(pkg.generated_image_url || '').trim();
  const audioUrl = String(pkg.generated_audio_url || '').trim();

  const slide = {
    id: slideId,
    stories_presentation_id: presentation.id,
    presentation_id: presentation.id,
    pp_id: presentation.id,
    slide_number: 1,
    slide_type: 'package_intake',
    title,
    body_text: summary,
    speaker_notes: String(pkg.teleprompter_script || pkg.show_script || summary || '').trim(),
    transition: 'fade',
    status: 'editing',
    background: JSON.stringify({ color: '#0a0a0a' }),
    timing: JSON.stringify({ duration_ms: durationMs }),
    duration_ms: durationMs,
    slide_timeline: JSON.stringify({
      voice_audio_url: audioUrl || null,
      voice_start_time: 0,
      voice_end_time: durationSeconds || null,
      source_package_id: pkg.id,
    }),
    version: 1,
    source_package_id: pkg.id,
    intake_slide: true,
  };

  const elements = [];

  if (imageUrl) {
    elements.push({
      id: makeElementId(presentation.id),
      presentation_id: presentation.id,
      slide_id: slideId,
      pp_id: presentation.id,
      type: 'image',
      content: imageUrl,
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      rotation: 0,
      opacity: 55,
      z_index: 0,
      style: JSON.stringify({ objectFit: 'cover' }),
      entrance_type: 'fade_in',
      entrance_duration: 600,
      entrance_delay: 0,
      start_ms: 0,
      end_ms: durationMs,
      animation: JSON.stringify({ type: 'fade_in', duration_ms: 600, delay_ms: 0 }),
      timing: JSON.stringify({ start_ms: 0, end_ms: durationMs }),
      locked: false,
      visible: true,
    });
  }

  elements.push({
    id: makeElementId(presentation.id),
    presentation_id: presentation.id,
    slide_id: slideId,
    pp_id: presentation.id,
    type: 'text',
    content: title,
    x: 90,
    y: 90,
    width: 1100,
    height: 150,
    rotation: 0,
    opacity: 100,
    z_index: 10,
    style: elementStyle({ fontFamily: 'Poppins, sans-serif', fontSize: 54, bold: true, role: 'title', align: 'center' }),
    entrance_type: 'fade_in',
    entrance_duration: 600,
    entrance_delay: 100,
    start_ms: 100,
    end_ms: durationMs,
    animation: JSON.stringify({ type: 'fade_in', duration_ms: 600, delay_ms: 100 }),
    timing: JSON.stringify({ start_ms: 100, end_ms: durationMs }),
    locked: false,
    visible: true,
  });

  if (summary) {
    elements.push({
      id: makeElementId(presentation.id),
      presentation_id: presentation.id,
      slide_id: slideId,
      pp_id: presentation.id,
      type: 'text',
      content: summary,
      x: 190,
      y: 320,
      width: 900,
      height: 220,
      rotation: 0,
      opacity: 100,
      z_index: 11,
      style: elementStyle({ fontSize: 28, role: 'body', align: 'center' }),
      entrance_type: 'fade_in',
      entrance_duration: 500,
      entrance_delay: 500,
      start_ms: 500,
      end_ms: durationMs,
      animation: JSON.stringify({ type: 'fade_in', duration_ms: 500, delay_ms: 500 }),
      timing: JSON.stringify({ start_ms: 500, end_ms: durationMs }),
      locked: false,
      visible: true,
    });
  }

  const editorPresentation = normalizeEditorPresentation(presentation, {
    title,
    slide_order: JSON.stringify([slideId]),
    story_slide_ids: JSON.stringify([slideId]),
    story_count: 1,
  });

  return {
    presentation: editorPresentation,
    slides: [slide],
    elements_by_slide: {
      [slideId]: elements,
    },
    active_slide_id: slideId,
    revision: 1,
  };
}

function scenePosition(position, type) {
  if (position === 'lower_third' || type === 'lower_third') return { x: 160, y: 610, width: 960, height: 70 };
  if (position === 'top') return { x: 140, y: 55, width: 1000, height: 120 };
  if (position === 'bottom') return { x: 170, y: 530, width: 940, height: 130 };
  if (position === 'left') return { x: 80, y: 210, width: 540, height: 260 };
  if (position === 'right') return { x: 660, y: 210, width: 540, height: 260 };
  return { x: 190, y: 245, width: 900, height: 210 };
}

function editorAnimationName(value) {
  const key = String(value || '').trim().toLowerCase();
  const map = {
    fade: 'fade_in',
    dissolve: 'fade_in',
    zoom: 'zoom_in',
    pop: 'pop',
    slide_left: 'slide_left',
    slide_right: 'slide_right',
    lower_third: 'slide_left',
    typewriter: 'typewriter',
    word_by_word: 'word_by_word',
  };
  return map[key] || key || 'fade_in';
}

function buildEditorStateFromDirectorPlan(presentation, plan) {
  const scenes = Array.isArray(plan?.scenes) ? plan.scenes : [];
  const slides = [];
  const elementsBySlide = {};

  scenes.forEach((scene, index) => {
    const slideId = `${presentation.id}:slide:${String(index + 1).padStart(3, '0')}`;
    const durationMs = Math.max(1000, Math.round(Number(scene.duration_seconds || 5) * 1000));
    const title = String(scene.slide_title || `Scene ${index + 1}`);
    const imageUrl = String(
      scene.generated_image_url ||
      scene.image_elements?.find?.(item => item?.url)?.url ||
      '',
    ).trim();

    const slide = {
      id: slideId,
      stories_presentation_id: presentation.id,
      presentation_id: presentation.id,
      pp_id: presentation.id,
      slide_number: index + 1,
      slide_type: scene.beat_type || 'content',
      title,
      body_text: '',
      speaker_notes: String(scene.speaker_notes || '').trim(),
      transition: scene.transition_plan || 'fade',
      status: 'editing',
      background: JSON.stringify({ color: '#0a0a0a' }),
      timing: JSON.stringify({ duration_ms: durationMs }),
      duration_ms: durationMs,
      slide_timeline: JSON.stringify({
        voice_audio_url: scene.audio_url || null,
        voice_start_time: scene.voice_start_time ?? scene.audio_start_time ?? null,
        voice_end_time: scene.voice_end_time ?? scene.audio_end_time ?? null,
        source_package_id: scene.package_id || null,
      }),
      version: 1,
      source_package_id: scene.package_id || null,
      scene_purpose: scene.scene_purpose || null,
      production_notes: scene.production_notes || null,
    };

    const elements = [];
    if (imageUrl) {
      elements.push({
        id: `${presentation.id}:element:${String(index + 1).padStart(3, '0')}:background`,
        presentation_id: presentation.id,
        slide_id: slideId,
        pp_id: presentation.id,
        type: 'image',
        content: imageUrl,
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        rotation: 0,
        opacity: 70,
        z_index: 0,
        style: JSON.stringify({ objectFit: 'cover' }),
        entrance_type: editorAnimationName(scene.image_elements?.[0]?.animation_in || 'dissolve'),
        entrance_duration: 700,
        entrance_delay: 0,
        exit_type: scene.image_elements?.[0]?.animation_out || null,
        start_ms: 0,
        end_ms: durationMs,
        animation: JSON.stringify({ type: editorAnimationName(scene.image_elements?.[0]?.animation_in || 'dissolve'), duration_ms: 700, delay_ms: 0 }),
        timing: JSON.stringify({ start_ms: 0, end_ms: durationMs }),
        locked: false,
        visible: true,
      });
    }

    (scene.text_elements || []).forEach((item, itemIndex) => {
      const type = item.element_type === 'lower_third' ? 'lower_third' : 'text';
      const pos = scenePosition(item.position, item.element_type);
      const startMs = Math.max(0, Math.round(Number(item.start_time || 0) * 1000));
      const endMs = Math.min(durationMs, Math.max(startMs + 500, Math.round(Number(item.end_time || scene.duration_seconds || 5) * 1000)));
      const anim = editorAnimationName(item.animation_in);
      elements.push({
        id: `${presentation.id}:element:${String(index + 1).padStart(3, '0')}:${String(itemIndex + 1).padStart(2, '0')}`,
        presentation_id: presentation.id,
        slide_id: slideId,
        pp_id: presentation.id,
        type,
        content: String(item.text || ''),
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        opacity: 100,
        z_index: 10 + itemIndex,
        style: elementStyle({
          fontFamily: item.element_type === 'headline' ? 'Poppins, sans-serif' : 'Inter, sans-serif',
          fontSize: item.element_type === 'headline' ? 48 : item.element_type === 'lower_third' ? 22 : 30,
          bold: item.element_type === 'headline',
          role: item.element_type === 'headline' ? 'title' : undefined,
          align: 'center',
        }),
        entrance_type: anim,
        entrance_duration: 500,
        entrance_delay: startMs,
        exit_type: item.animation_out || null,
        start_ms: startMs,
        end_ms: endMs,
        animation: JSON.stringify({ type: anim, duration_ms: 500, delay_ms: startMs }),
        timing: JSON.stringify({ start_ms: startMs, end_ms: endMs }),
        locked: false,
        visible: true,
      });
    });

    slides.push(slide);
    elementsBySlide[slideId] = elements;
  });

  const slideIds = slides.map(slide => slide.id);
  return {
    presentation: normalizeEditorPresentation(presentation, {
      title: plan?.title || presentation.title,
      slide_order: JSON.stringify(slideIds),
      story_slide_ids: JSON.stringify(slideIds),
      story_count: slides.length,
      presentation_version: Number(asObject(asObject(presentation.source_payload).presentation_studio)?.editor_state?.presentation?.presentation_version || 1) + 1,
    }),
    slides,
    elements_by_slide: elementsBySlide,
    active_slide_id: slideIds[0] || null,
    revision: Number(asObject(asObject(presentation.source_payload).presentation_studio)?.editor_state?.revision || 0) + 1,
  };
}

async function getOwnedPresentation(sql, ownerUserId, presentationId) {
  const [presentation] = await sql`
    SELECT *
    FROM creapd.presentations
    WHERE id = ${String(presentationId)}
      AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;
  return presentation || null;
}

async function writeEditorState(sql, ownerUserId, presentation, editorState, extraStudio = {}) {
  const sourcePayload = asObject(presentation.source_payload);
  const studioPayload = asObject(sourcePayload.presentation_studio);
  const nextStudio = {
    ...studioPayload,
    ...extraStudio,
    editor_state: editorState,
    editor_updated_at: new Date().toISOString(),
    version: PRESENTATION_STUDIO_VERSION,
  };
  const nextPayload = {
    ...sourcePayload,
    presentation_studio: nextStudio,
  };

  const [updated] = await sql`
    UPDATE creapd.presentations
    SET
      title = ${String(editorState?.presentation?.title || presentation.title || 'Untitled Presentation')},
      status = ${String(editorState?.presentation?.status || presentation.status || 'editing')},
      source_payload = ${JSON.stringify(nextPayload)}::jsonb,
      updated_at = now()
    WHERE id = ${String(presentation.id)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;

  return updated || presentation;
}

export async function handoffPackageToPresentationStudio({ sql, ownerUserId, packageId, approve = false }) {
  const id = String(packageId || '').trim();
  if (!id) throw studioError('Production Package is required.', 'PACKAGE_ID_REQUIRED', 400);

  let [pkg] = await sql`
    SELECT *
    FROM creapd.production_packages
    WHERE id = ${id}
      AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;

  if (!pkg) throw studioError('Production Package not found.', 'PACKAGE_NOT_FOUND', 404);

  if (approve && pkg.status !== 'approved') {
    const approvalPayload = asObject(pkg.source_payload);
    const [approved] = await sql`
      UPDATE creapd.production_packages
      SET
        status = 'approved',
        source_payload = ${JSON.stringify({
          ...approvalPayload,
          package_approval: {
            status: 'approved',
            approved_at: new Date().toISOString(),
            destination: 'presentation_studio',
          },
        })}::jsonb,
        updated_at = now()
      WHERE id = ${id}
        AND owner_user_id = ${String(ownerUserId)}
      RETURNING *
    `;
    pkg = approved || pkg;
  }

  if (pkg.status !== 'approved') {
    throw studioError(
      'Approve the Production Package before sending it to the Presentation Studio.',
      'PACKAGE_APPROVAL_REQUIRED',
      409,
    );
  }

  const [existing] = await sql`
    SELECT p.*
    FROM creapd.presentations p
    JOIN creapd.presentation_packages pp ON pp.presentation_id = p.id
    WHERE pp.production_package_id = ${id}
      AND p.owner_user_id = ${String(ownerUserId)}
      AND COALESCE(p.source_payload->'presentation_studio'->>'handoff_type', '') = 'production_package'
    ORDER BY p.created_at DESC
    LIMIT 1
  `;

  if (existing) {
    const payload = asObject(existing.source_payload);
    const state = asObject(asObject(payload.presentation_studio).editor_state);
    return { presentation: existing, editor_state: state, package: pkg, reused: true };
  }

  const presentationId = randomUUID();
  const title = packageTitle(pkg);
  const now = new Date().toISOString();
  const packageSnapshot = JSON.parse(JSON.stringify(pkg));
  const sourceStudio = studioKey(pkg);

  const baseSourcePayload = {
    presentation_studio: {
      version: PRESENTATION_STUDIO_VERSION,
      handoff_type: 'production_package',
      handoff_status: 'received',
      handed_off_at: now,
      source_studio: sourceStudio,
      source_package_id: pkg.id,
      package_snapshot: packageSnapshot,
      package_snapshot_created_at: now,
    },
  };

  const [presentation] = await sql`
    INSERT INTO creapd.presentations (
      id, owner_user_id, production_profile, show_id, episode_id, title, status,
      presentation_mode, director_plan, timeline, output_config,
      source_system, source_entity_type, source_entity_id, source_payload
    ) VALUES (
      ${presentationId}, ${String(ownerUserId)}, ${sourceStudio}, ${pkg.show_id || null}, ${pkg.episode_id || null},
      ${title}, 'editing', 'studio', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
      'creapd-neon-vercel', 'ProductionPackage', ${pkg.id}, ${JSON.stringify(baseSourcePayload)}::jsonb
    )
    RETURNING *
  `;

  await sql`
    INSERT INTO creapd.presentation_packages (
      presentation_id, production_package_id, position, role, settings
    ) VALUES (
      ${presentation.id}, ${pkg.id}, 0, 'primary', '{}'::jsonb
    )
    ON CONFLICT (presentation_id, production_package_id) DO NOTHING
  `;

  const editorState = buildPackageIntakeEditorState(presentation, pkg);
  const updatedPresentation = await writeEditorState(sql, ownerUserId, presentation, editorState, {
    handoff_status: 'received',
    package_snapshot: packageSnapshot,
  });

  return {
    presentation: updatedPresentation,
    editor_state: editorState,
    package: pkg,
    reused: false,
  };
}

export async function loadPresentationStudioEditor({ sql, ownerUserId, presentationId }) {
  const presentation = await getOwnedPresentation(sql, ownerUserId, presentationId);
  if (!presentation) throw studioError('Presentation not found.', 'PRESENTATION_NOT_FOUND', 404);

  const sourcePayload = asObject(presentation.source_payload);
  const studioPayload = asObject(sourcePayload.presentation_studio);
  let editorState = asObject(studioPayload.editor_state);

  if (!editorState.presentation || !Array.isArray(editorState.slides)) {
    const [pkg] = await sql`
      SELECT pkg.*
      FROM creapd.production_packages pkg
      JOIN creapd.presentation_packages pp ON pp.production_package_id = pkg.id
      WHERE pp.presentation_id = ${String(presentation.id)}
        AND pkg.owner_user_id = ${String(ownerUserId)}
      ORDER BY pp.position ASC
      LIMIT 1
    `;

    editorState = pkg
      ? buildPackageIntakeEditorState(presentation, pkg)
      : {
          presentation: normalizeEditorPresentation(presentation),
          slides: [],
          elements_by_slide: {},
          revision: 1,
        };

    await writeEditorState(sql, ownerUserId, presentation, editorState);
  }

  return {
    presentation: normalizeEditorPresentation(presentation, editorState.presentation),
    slides: editorState.slides || [],
    elementsBySlide: {},
    editor_state: editorState,
    source: 'neon',
    presentation_studio: true,
  };
}

function presentationIdFromChildId(value, marker) {
  const text = String(value || '');
  const index = text.indexOf(marker);
  if (index <= 0) return null;
  return text.slice(0, index);
}

async function mutateEditorState({ sql, ownerUserId, presentationId, mutate }) {
  const presentation = await getOwnedPresentation(sql, ownerUserId, presentationId);
  if (!presentation) throw studioError('Presentation not found.', 'PRESENTATION_NOT_FOUND', 404);

  const sourcePayload = asObject(presentation.source_payload);
  const studioPayload = asObject(sourcePayload.presentation_studio);
  const editorState = asObject(studioPayload.editor_state);
  const safeState = {
    presentation: normalizeEditorPresentation(presentation, asObject(editorState.presentation)),
    slides: Array.isArray(editorState.slides) ? [...editorState.slides] : [],
    elements_by_slide: asObject(editorState.elements_by_slide),
    active_slide_id: editorState.active_slide_id || null,
    revision: Number(editorState.revision || 0),
  };

  const result = await mutate(safeState, presentation);
  safeState.revision += 1;
  safeState.presentation.presentation_version = Number(safeState.presentation.presentation_version || 1) + 1;

  const updatedPresentation = await writeEditorState(sql, ownerUserId, presentation, safeState);
  return { result, editor_state: safeState, presentation: updatedPresentation };
}

export async function updateEditorPresentation({ sql, ownerUserId, presentationId, patch }) {
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      state.presentation = { ...state.presentation, ...(patch || {}) };
      return state.presentation;
    },
  });
}

export async function createEditorSlide({ sql, ownerUserId, presentationId, slide }) {
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      const id = makeSlideId(presentationId);
      const created = {
        ...(slide || {}),
        id,
        stories_presentation_id: presentationId,
        presentation_id: presentationId,
        pp_id: state.presentation.pp_id || presentationId,
        slide_number: state.slides.length + 1,
        version: 1,
      };
      state.slides.push(created);
      state.elements_by_slide = { ...state.elements_by_slide, [id]: [] };
      return created;
    },
  });
}

export async function updateEditorSlide({ sql, ownerUserId, slideId, patch }) {
  const presentationId = presentationIdFromChildId(slideId, ':slide:');
  if (!presentationId) throw studioError('Owned slide id is invalid.', 'EDITOR_SLIDE_ID_INVALID', 400);
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      const index = state.slides.findIndex(slide => slide.id === slideId);
      if (index < 0) throw studioError('Slide not found.', 'EDITOR_SLIDE_NOT_FOUND', 404);
      state.slides[index] = { ...state.slides[index], ...(patch || {}) };
      return state.slides[index];
    },
  });
}

export async function deleteEditorSlide({ sql, ownerUserId, slideId }) {
  const presentationId = presentationIdFromChildId(slideId, ':slide:');
  if (!presentationId) throw studioError('Owned slide id is invalid.', 'EDITOR_SLIDE_ID_INVALID', 400);
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      state.slides = state.slides.filter(slide => slide.id !== slideId);
      const nextElements = { ...state.elements_by_slide };
      delete nextElements[slideId];
      state.elements_by_slide = nextElements;
      return { id: slideId, deleted: true };
    },
  });
}

export async function listEditorElements({ sql, ownerUserId, slideId }) {
  const presentationId = presentationIdFromChildId(slideId, ':slide:');
  if (!presentationId) return [];
  const presentation = await getOwnedPresentation(sql, ownerUserId, presentationId);
  if (!presentation) return [];
  const state = asObject(asObject(asObject(presentation.source_payload).presentation_studio).editor_state);
  const map = asObject(state.elements_by_slide);
  return Array.isArray(map[slideId]) ? map[slideId] : [];
}

export async function createEditorElement({ sql, ownerUserId, presentationId, element }) {
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      const slideId = String(element?.slide_id || '').trim();
      if (!slideId) throw studioError('slide_id is required.', 'EDITOR_SLIDE_ID_REQUIRED', 400);
      const id = makeElementId(presentationId);
      const created = {
        ...(element || {}),
        id,
        presentation_id: presentationId,
        pp_id: state.presentation.pp_id || presentationId,
        slide_id: slideId,
      };
      const list = Array.isArray(state.elements_by_slide[slideId]) ? [...state.elements_by_slide[slideId]] : [];
      list.push(created);
      state.elements_by_slide = { ...state.elements_by_slide, [slideId]: list };
      return created;
    },
  });
}

export async function updateEditorElement({ sql, ownerUserId, elementId, patch }) {
  const presentationId = presentationIdFromChildId(elementId, ':element:');
  if (!presentationId) throw studioError('Owned element id is invalid.', 'EDITOR_ELEMENT_ID_INVALID', 400);
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      const slideId = String(patch?.slide_id || '').trim();
      const candidateSlides = slideId ? [slideId] : Object.keys(state.elements_by_slide);
      for (const candidate of candidateSlides) {
        const list = Array.isArray(state.elements_by_slide[candidate]) ? [...state.elements_by_slide[candidate]] : [];
        const index = list.findIndex(element => element.id === elementId);
        if (index >= 0) {
          list[index] = { ...list[index], ...(patch || {}) };
          state.elements_by_slide = { ...state.elements_by_slide, [candidate]: list };
          return list[index];
        }
      }
      throw studioError('Element not found.', 'EDITOR_ELEMENT_NOT_FOUND', 404);
    },
  });
}

export async function deleteEditorElements({ sql, ownerUserId, slideId, elementIds }) {
  const presentationId = presentationIdFromChildId(slideId, ':slide:');
  if (!presentationId) throw studioError('Owned slide id is invalid.', 'EDITOR_SLIDE_ID_INVALID', 400);
  const ids = new Set((elementIds || []).map(String));
  return mutateEditorState({
    sql,
    ownerUserId,
    presentationId,
    mutate: async state => {
      const list = Array.isArray(state.elements_by_slide[slideId]) ? state.elements_by_slide[slideId] : [];
      state.elements_by_slide = {
        ...state.elements_by_slide,
        [slideId]: list.filter(element => !ids.has(String(element.id))),
      };
      return { deleted: ids.size };
    },
  });
}

export async function directPresentationStudioProject({ sql, ownerUserId, presentationId }) {
  const presentation = await getOwnedPresentation(sql, ownerUserId, presentationId);
  if (!presentation) throw studioError('Presentation not found.', 'PRESENTATION_NOT_FOUND', 404);

  const packages = await sql`
    SELECT pkg.*
    FROM creapd.production_packages pkg
    JOIN creapd.presentation_packages pp ON pp.production_package_id = pkg.id
    WHERE pp.presentation_id = ${String(presentation.id)}
      AND pkg.owner_user_id = ${String(ownerUserId)}
    ORDER BY pp.position ASC, pkg.created_at ASC
  `;

  if (!packages.length) {
    throw studioError('This Presentation Studio project has no Production Package.', 'PRESENTATION_PACKAGE_REQUIRED', 409);
  }

  const sourceStudio = studioKey(presentation);
  if (sourceStudio !== 'research') {
    throw studioError(
      `Presentation Director migration is not enabled for the ${sourceStudio || 'unknown'} Studio yet.`,
      'STUDIO_DIRECTOR_MIGRATION_PENDING',
      409,
      { production_studio: sourceStudio || null },
    );
  }

  const configId = packages[0]?.configuration_id;
  const [configuration] = await sql`
    SELECT *
    FROM creapd.research_production_configurations
    WHERE id = ${String(configId || '')}
      AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;

  if (!configuration) {
    throw studioError('Research configuration not found for this package.', 'RESEARCH_CONFIGURATION_NOT_FOUND', 404);
  }

  const plan = await directResearchPresentation({ config: configuration, packages });
  const editorState = buildEditorStateFromDirectorPlan(presentation, plan);
  const sourcePayload = asObject(presentation.source_payload);
  const studioPayload = asObject(sourcePayload.presentation_studio);
  const nextPayload = {
    ...sourcePayload,
    presentation_studio: {
      ...studioPayload,
      handoff_status: 'in_production',
      director_last_run_at: new Date().toISOString(),
      director_version: plan.version || null,
      editor_state: editorState,
      version: PRESENTATION_STUDIO_VERSION,
    },
  };

  const [updated] = await sql`
    UPDATE creapd.presentations
    SET
      title = ${String(plan.title || presentation.title || 'Untitled Presentation')},
      status = 'editing',
      director_plan = ${JSON.stringify(plan)}::jsonb,
      timeline = ${JSON.stringify(plan.master_timeline || {})}::jsonb,
      source_payload = ${JSON.stringify(nextPayload)}::jsonb,
      updated_at = now()
    WHERE id = ${String(presentation.id)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;

  return {
    presentation: updated || presentation,
    director_plan: plan,
    editor_state: editorState,
  };
}
