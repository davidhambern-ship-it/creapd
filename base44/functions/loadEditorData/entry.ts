import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseSceneGraphElements(sceneGraphStr, slideId) {
  let sg;
  try { sg = JSON.parse(sceneGraphStr || 'null'); } catch { return []; }
  if (!sg || !Array.isArray(sg.scenes)) return [];

  const merged = [];
  const seenContent = new Set();
  let idCounter = 0;

  const typeMap = {
    headline: 'text', body_text: 'text', image: 'image',
    talking_point_card: 'text', discussion_response: 'text',
    lower_third: 'lower_third', statistic: 'text', quote: 'text',
    callout: 'text', caption: 'caption',
  };

  const FONT_MAP = {
    'font-heading': 'Poppins, sans-serif',
    'font-body': 'Inter, sans-serif',
    'font-display': 'Oswald, sans-serif',
    'font-mono': '"JetBrains Mono", monospace',
    'font-condensed': 'Archivo, sans-serif',
    'font-serif': '"Playfair Display", serif',
  };

  const COLOR_MAP = {
    primary:   { text: 'hsl(270 80% 65%)', glow: 'hsl(270 80% 60% / 0.4)',  border: 'hsl(270 80% 60% / 0.5)',  bg: 'hsl(270 80% 60% / 0.08)' },
    accent:    { text: 'hsl(25 95% 60%)',  glow: 'hsl(25 95% 55% / 0.4)',   border: 'hsl(25 95% 55% / 0.5)',   bg: 'hsl(25 95% 55% / 0.08)' },
    emerald:   { text: 'hsl(152 60% 50%)', glow: 'hsl(152 60% 45% / 0.4)',  border: 'hsl(152 60% 45% / 0.5)',  bg: 'hsl(152 60% 45% / 0.08)' },
    cyan:      { text: 'hsl(190 80% 55%)', glow: 'hsl(190 80% 55% / 0.4)',  border: 'hsl(190 80% 55% / 0.5)',  bg: 'hsl(190 80% 55% / 0.08)' },
    gold:      { text: 'hsl(45 95% 55%)',  glow: 'hsl(45 95% 55% / 0.4)',   border: 'hsl(45 95% 55% / 0.5)',   bg: 'hsl(45 95% 55% / 0.08)' },
    rose:      { text: 'hsl(300 80% 65%)', glow: 'hsl(300 80% 60% / 0.4)',  border: 'hsl(300 80% 60% / 0.5)',  bg: 'hsl(300 80% 60% / 0.08)' },
    white:     { text: 'hsl(0 0% 95%)',    glow: 'hsl(0 0% 95% / 0.2)',     border: 'hsl(0 0% 100% / 0.15)',   bg: 'hsl(0 0% 100% / 0.05)' },
    muted:     { text: 'hsl(220 10% 65%)', glow: 'hsl(220 10% 65% / 0.2)',  border: 'hsl(220 10% 30% / 0.4)',  bg: 'hsl(220 10% 20% / 0.1)' },
    crimson:   { text: 'hsl(0 72% 55%)',   glow: 'hsl(0 72% 51% / 0.4)',    border: 'hsl(0 72% 51% / 0.5)',    bg: 'hsl(0 72% 51% / 0.08)' },
  };

  const FONT_SIZE_MAP = {
    headline: 48, body_text: 24, statistic: 72, quote: 28,
    callout: 22, talking_point_card: 22, discussion_response: 22,
    lower_third: 20, caption: 18, default: 20,
  };

  const TYPE_SIZES = {
    headline: { w: 800, h: 100 }, body_text: { w: 900, h: 200 },
    statistic: { w: 600, h: 150 }, quote: { w: 700, h: 150 },
    talking_point_card: { w: 500, h: 120 }, discussion_response: { w: 500, h: 120 },
    lower_third: { w: 900, h: 60 }, callout: { w: 500, h: 100 },
    caption: { w: 600, h: 40 }, image: { w: 500, h: 350 },
    default: { w: 600, h: 100 },
  };

  function getVisualStyles(effects, color) {
    const styles = {};
    const fx = effects || [];
    if (fx.includes('glass_panel')) {
      styles.backgroundColor = color.bg;
      styles.backdropFilter = 'blur(12px)';
      styles.borderRadius = '12px';
      styles.border = `1px solid ${color.border}`;
    }
    if (fx.includes('glow_border')) {
      styles.border = `1px solid ${color.border}`;
      styles.boxShadow = `0 0 16px ${color.glow}, inset 0 0 12px ${color.glow}`;
      styles.borderRadius = '12px';
    }
    if (fx.includes('neon_shadow')) {
      styles.textShadow = `0 0 8px ${color.text}, 0 0 24px ${color.glow}`;
    }
    if (fx.includes('drop_shadow')) {
      styles.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
    }
    if (fx.includes('gradient_border')) {
      styles.border = `1px solid ${color.border}`;
      styles.boxShadow = `0 0 1px ${color.text}, 0 0 12px ${color.glow}`;
      styles.borderRadius = '12px';
    }
    if (fx.includes('inner_glow')) {
      const existing = styles.boxShadow || '';
      styles.boxShadow = `${existing} inset 0 0 20px ${color.glow}`.trim();
    }
    return styles;
  }

  for (const scene of sg.scenes) {
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        const rawContent = elem.asset_reference || elem.content || '';
        if (!rawContent || typeof rawContent !== 'string') continue;
        let content = rawContent
          .replace(/<font:([^>]+)>/gi, '')
          .replace(/<anim:([^>]+)>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
        if (!content) continue;
        const contentKey = content.toLowerCase();
        if (seenContent.has(contentKey)) continue;
        seenContent.add(contentKey);

        const elType = typeMap[elem.element_type] || 'text';
        const scaleFactor = Math.max(0.5, Math.min(1.5, elem.scale || 1));

        // Derive size from element type × scale
        const baseSize = TYPE_SIZES[elem.element_type] || TYPE_SIZES.default;
        let w = Math.max(30, Math.round(baseSize.w * scaleFactor));
        let h = Math.max(20, Math.round(baseSize.h * scaleFactor));

        // Position — scene graph uses normalized 0-1 CENTER coordinates
        const cp = elem.position || {};
        const rawX = cp.x != null ? Math.max(0.05, Math.min(0.95, cp.x)) : 0.5;
        const rawY = cp.y != null ? Math.max(0.05, Math.min(0.95, cp.y)) : 0.5;
        // Convert center position to top-left corner for absolute positioning
        const px = Math.round(rawX * CANVAS_W - w / 2);
        const py = Math.round(rawY * CANVAS_H - h / 2);

        // Map color theme
        const color = COLOR_MAP[elem.color_theme] || COLOR_MAP.white;

        // Map font style
        const fontFamily = FONT_MAP[elem.font_style] || 'Inter, sans-serif';

        // Map visual effects to CSS styles
        const fxStyles = getVisualStyles(elem.visual_effects || [], color);

        const styleObj = {
          fontSize: FONT_SIZE_MAP[elem.element_type] || FONT_SIZE_MAP.default,
          fontFamily,
          color: color.text,
          bold: elem.element_type === 'statistic' || elem.element_type === 'headline',
          italic: elem.element_type === 'quote',
          align: 'center',
          backgroundColor: fxStyles.backgroundColor || 'transparent',
          borderRadius: fxStyles.borderRadius || 0,
          border: fxStyles.border || 'none',
          boxShadow: fxStyles.boxShadow || 'none',
          textShadow: fxStyles.textShadow || 'none',
          filter: fxStyles.filter || 'none',
          backdropFilter: fxStyles.backdropFilter || 'none',
          padding: 12,
          ambientAnimation: elem.ambient_animation || 'none',
        };

        const animType = elem.entrance_animation?.type || 'fade_in';
        const animDur = elem.entrance_animation?.duration_ms || 500;
        const tlEvents = elem.timeline_events || [];
        const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
        const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;

        merged.push({
          id: elem.element_id || `sg-${slideId}-${idCounter++}`,
          slide_id: slideId,
          type: elType,
          content,
          x: px,
          y: py,
          width: w,
          height: h,
          rotation: elem.rotation || 0,
          opacity: Math.round((elem.opacity ?? 1) * 100),
          z_index: elem.z_order ?? idCounter,
          style: JSON.stringify(styleObj),
          animation: JSON.stringify({ type: animType, duration_ms: animDur, delay_ms: startMs }),
          timing: tlEvents.length > 0 ? JSON.stringify({ start_ms: startMs, end_ms: endMs }) : null,
          locked: false,
          visible: elem.visibility !== false,
        });
      }
    }
  }

  return merged;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuthed) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { presentation_id } = body;
    if (!presentation_id) return Response.json({ error: 'presentation_id required' }, { status: 400 });

    // Load presentation (service role — bypasses RLS for service-created records)
    let presentation;
    try {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    } catch {
      const results = await base44.asServiceRole.entities.StoriesPresentation.filter({ id: presentation_id }, '-created_date', 1);
      presentation = results?.[0];
    }
    if (!presentation) return Response.json({ error: 'Presentation not found' }, { status: 404 });

    // Load slides
    const slideIds = JSON.parse(presentation.slide_order || presentation.story_slide_ids || '[]');
    const slides = [];
    if (slideIds.length > 0) {
      for (const sid of slideIds) {
        try {
          const s = await base44.asServiceRole.entities.StorySlide.get(sid);
          if (s) slides.push(s);
        } catch {
          try {
            const results = await base44.asServiceRole.entities.StorySlide.filter({ id: sid }, 'slide_number', 1);
            if (results?.[0]) slides.push(results[0]);
          } catch {}
        }
      }
    }

    // Load elements for all slides — try DB first, then parse scene_graph
    const elementsBySlide = {};
    for (const slide of slides) {
      let els = [];
      try {
        els = await base44.asServiceRole.entities.SlideElement.filter({ slide_id: slide.id });
      } catch {
        els = [];
      }
      // If no DB elements, parse scene_graph server-side
      if ((!els || els.length === 0) && slide.scene_graph) {
        els = parseSceneGraphElements(slide.scene_graph, slide.id);
      }
      elementsBySlide[slide.id] = els || [];
    }

    return Response.json({ presentation, slides, elementsBySlide });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});