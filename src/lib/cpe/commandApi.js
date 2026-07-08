// ════════════════════════════════════════════════════════
// CPE-AI-001: CPE Command API
// Structured commands for the Presentation Editor Operator Worker
// The Operator must communicate exclusively through this API.
// ════════════════════════════════════════════════════════

export const CPE_COMMANDS = {
  UPDATE_TEXT: 'update_text',
  MOVE_ELEMENT: 'move_element',
  RESIZE_ELEMENT: 'resize_element',
  ROTATE_ELEMENT: 'rotate_element',
  REPLACE_IMAGE: 'replace_image',
  REPLACE_ICON: 'replace_icon',
  APPLY_TYPOGRAPHY: 'apply_typography',
  APPLY_COLOR: 'apply_color',
  APPLY_TRANSITION: 'apply_transition',
  APPLY_ANIMATION: 'apply_animation',
  UPDATE_TIMING: 'update_timing',
  UPDATE_SPEAKER_NOTES: 'update_speaker_notes',
  ADD_SLIDE: 'add_slide',
  DELETE_SLIDE: 'delete_slide',
  DUPLICATE_SLIDE: 'duplicate_slide',
  REORDER_SLIDE: 'reorder_slide',
  RUN_PREVIEW: 'run_preview',
  RUN_QA: 'run_qa',
};

export const COMMAND_LIST = Object.values(CPE_COMMANDS);

function safeParse(str) {
  try { return JSON.parse(str || 'null') ?? null; } catch { return null; }
}

// ── Serialize presentation state for AI processing ──
export function serializePresentation(presentation, slides, elements, activeIndex) {
  return {
    title: presentation?.title || 'Untitled',
    production_profile: presentation?.production_profile || 'news',
    aspect_ratio: presentation?.aspect_ratio || '16:9',
    active_slide_index: activeIndex ?? 0,
    slides: (slides || []).map((s, i) => ({
      index: i,
      id: s.id,
      title: s.title || '',
      body_text: (s.body_text || '').slice(0, 500),
      slide_type: s.slide_type || 'content_slide',
      transition: s.transition || 'fade',
      timing: safeParse(s.timing),
      background: safeParse(s.background),
      speaker_notes: (s.speaker_notes || '').slice(0, 300),
    })),
    elements: (elements || []).map(el => ({
      id: el.id,
      slide_index: activeIndex ?? 0,
      type: el.type,
      content: typeof el.content === 'string' ? el.content.slice(0, 200) : '',
      x: el.x || 0,
      y: el.y || 0,
      width: el.width || 200,
      height: el.height || 100,
      rotation: el.rotation || 0,
      opacity: el.opacity ?? 100,
      z_index: el.z_index || 0,
      style: safeParse(el.style),
      timing: safeParse(el.timing),
      animation: safeParse(el.animation),
    })),
  };
}

// ── Execute a single command against the editor context ──
// ctx must contain: updateElement, updateSlide, elements, addSlide, deleteSlide,
//                   duplicateSlide, reorderSlides, runPreview, runQA
export function executeCommand(cmd, ctx) {
  const {
    updateElement, updateSlide, elements,
    addSlide, deleteSlide, duplicateSlide, reorderSlides,
    runPreview, runQA,
  } = ctx;

  switch (cmd.operation) {
    case CPE_COMMANDS.UPDATE_TEXT:
      if (cmd.target_element) {
        updateElement(cmd.target_element, { content: cmd.parameters.text }, { silent: true });
      }
      break;

    case CPE_COMMANDS.MOVE_ELEMENT:
      if (cmd.target_element) {
        updateElement(cmd.target_element, { x: cmd.parameters.x, y: cmd.parameters.y }, { silent: true });
      }
      break;

    case CPE_COMMANDS.RESIZE_ELEMENT:
      if (cmd.target_element) {
        updateElement(cmd.target_element, {
          width: cmd.parameters.width,
          height: cmd.parameters.height,
        }, { silent: true });
      }
      break;

    case CPE_COMMANDS.ROTATE_ELEMENT:
      if (cmd.target_element) {
        updateElement(cmd.target_element, { rotation: cmd.parameters.rotation }, { silent: true });
      }
      break;

    case CPE_COMMANDS.APPLY_TYPOGRAPHY:
      if (cmd.target_element) {
        const el = elements?.find(e => e.id === cmd.target_element);
        const currentStyle = safeParse(el?.style) || {};
        updateElement(cmd.target_element, {
          style: JSON.stringify({ ...currentStyle, ...cmd.parameters }),
        }, { silent: true });
      }
      break;

    case CPE_COMMANDS.APPLY_COLOR:
      if (cmd.target_element) {
        const el = elements?.find(e => e.id === cmd.target_element);
        const currentStyle = safeParse(el?.style) || {};
        updateElement(cmd.target_element, {
          style: JSON.stringify({ ...currentStyle, ...cmd.parameters }),
        }, { silent: true });
      }
      break;

    case CPE_COMMANDS.APPLY_TRANSITION:
      updateSlide({ transition: cmd.parameters.type });
      break;

    case CPE_COMMANDS.APPLY_ANIMATION:
      if (cmd.target_element) {
        updateElement(cmd.target_element, {
          animation: JSON.stringify(cmd.parameters),
        }, { silent: true });
      }
      break;

    case CPE_COMMANDS.UPDATE_TIMING:
      if (cmd.target_element) {
        updateElement(cmd.target_element, {
          timing: JSON.stringify(cmd.parameters),
        }, { silent: true });
      }
      break;

    case CPE_COMMANDS.UPDATE_SPEAKER_NOTES:
      updateSlide({ speaker_notes: cmd.parameters.notes || '' });
      break;

    case CPE_COMMANDS.REPLACE_IMAGE:
      if (cmd.target_element) {
        updateElement(cmd.target_element, { content: cmd.parameters.url }, { silent: true });
      }
      break;

    case CPE_COMMANDS.REPLACE_ICON:
      if (cmd.target_element) {
        updateElement(cmd.target_element, { content: cmd.parameters.icon }, { silent: true });
      }
      break;

    case CPE_COMMANDS.ADD_SLIDE:
      addSlide?.();
      break;

    case CPE_COMMANDS.DELETE_SLIDE:
      if (cmd.parameters?.slide_index != null) deleteSlide?.(cmd.parameters.slide_index);
      break;

    case CPE_COMMANDS.DUPLICATE_SLIDE:
      if (cmd.parameters?.slide_index != null) duplicateSlide?.(cmd.parameters.slide_index);
      break;

    case CPE_COMMANDS.REORDER_SLIDE:
      if (cmd.parameters?.from != null && cmd.parameters?.to != null) {
        reorderSlides?.(cmd.parameters.from, cmd.parameters.to);
      }
      break;

    case CPE_COMMANDS.RUN_PREVIEW:
      runPreview?.();
      break;

    case CPE_COMMANDS.RUN_QA:
      runQA?.();
      break;

    default:
      console.warn('[CPE Command API] Unknown operation:', cmd.operation);
  }
}

// ── Execute a full command plan (producer protection: single undo point) ──
export function executeCommandPlan(commands, ctx) {
  const executed = [];
  for (const cmd of commands) {
    try {
      executeCommand(cmd, ctx);
      executed.push({ ...cmd, status: 'executed' });
    } catch (err) {
      executed.push({ ...cmd, status: 'failed', error: err.message });
    }
  }
  return executed;
}