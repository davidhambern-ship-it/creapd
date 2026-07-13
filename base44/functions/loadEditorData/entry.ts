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
    icon: 'icon', chart: 'chart', graphic: 'image',
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
    lower_third: 20, caption: 18, icon: 16, chart: 16, graphic: 16, default: 20,
  };

  const TYPE_SIZES = {
    headline: { w: 800, h: 100 }, body_text: { w: 900, h: 200 },
    statistic: { w: 600, h: 150 }, quote: { w: 700, h: 150 },
    talking_point_card: { w: 500, h: 120 }, discussion_response: { w: 500, h: 120 },
    lower_third: { w: 900, h: 60 }, callout: { w: 500, h: 100 },
    caption: { w: 600, h: 40 }, image: { w: 500, h: 350 },
    icon: { w: 80, h: 80 }, chart: { w: 400, h: 300 }, graphic: { w: 500, h: 350 },
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

  // First pass: collect all raw elements in order
  const rawElems = [];
  for (const scene of sg.scenes) {
    for (const layer of (scene.layers || [])) {
      for (const elem of (layer.elements || [])) {
        const rawContent = elem.asset_reference || elem.content || '';
        const isVisualType = ['icon', 'chart', 'graphic', 'image'].includes(elem.element_type);
        if (!rawContent && !isVisualType) continue;
        let content = rawContent
          ? rawContent
            .replace(/<font:([^>]+)>/gi, '')
            .replace(/<anim:([^>]+)>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim()
          : '';
        if (!content && !isVisualType) continue;
        const contentKey = (content || elem.element_id || '').toLowerCase();
        if (seenContent.has(contentKey)) continue;
        seenContent.add(contentKey);
        rawElems.push({ elem, content: content || elem.element_type, idx: rawElems.length });
      }
    }
  }

  // Detect source canvas dimensions — APD may generate coordinates for a larger canvas (e.g., 1920×1080)
  let srcCanvasW = CANVAS_W, srcCanvasH = CANVAS_H;
  for (const { elem } of rawElems) {
    if (elem.canvas_position && elem.canvas_size) {
      const right = (elem.canvas_position.x || 0) + (elem.canvas_size.w || 0);
      const bottom = (elem.canvas_position.y || 0) + (elem.canvas_size.h || 0);
      if (right > srcCanvasW) srcCanvasW = right;
      if (bottom > srcCanvasH) srcCanvasH = bottom;
    }
  }
  const coordScale = Math.min(CANVAS_W / srcCanvasW, CANVAS_H / srcCanvasH);

  // Layout algorithm — distribute elements across canvas by type
  const layoutPositions = (() => {
    const pos = {};
    let cursorY = 40;

    const headline = rawElems.find(r => r.elem.element_type === 'headline');
    const bodyTexts = rawElems.filter(r => r.elem.element_type === 'body_text');
    const cards = rawElems.filter(r => r.elem.element_type === 'talking_point_card' || r.elem.element_type === 'discussion_response');
    const lowerThirds = rawElems.filter(r => r.elem.element_type === 'lower_third');
    const captions = rawElems.filter(r => r.elem.element_type === 'caption');
    const statistics = rawElems.filter(r => r.elem.element_type === 'statistic');
    const quotes = rawElems.filter(r => r.elem.element_type === 'quote');
    const callouts = rawElems.filter(r => r.elem.element_type === 'callout');
    const images = rawElems.filter(r => r.elem.element_type === 'image');

    if (headline) {
      pos[headline.idx] = { x: 240, y: cursorY, w: 800, h: 100 };
      cursorY += 120;
    }
    for (const bt of bodyTexts) {
      pos[bt.idx] = { x: 190, y: cursorY, w: 900, h: 200 };
      cursorY += 220;
    }
    for (const stat of statistics) {
      pos[stat.idx] = { x: 340, y: cursorY, w: 600, h: 150 };
      cursorY += 170;
    }
    for (const q of quotes) {
      pos[q.idx] = { x: 290, y: cursorY, w: 700, h: 150 };
      cursorY += 170;
    }

    if (cards.length > 0) {
      const cardW = 500, cardH = 120, gap = 20;
      const cols = cards.length <= 1 ? 1 : cards.length === 2 ? 2 : cards.length <= 4 ? 2 : 3;
      const rows = Math.ceil(cards.length / cols);
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = Math.round((CANVAS_W - totalW) / 2);
      const bottomReserve = (lowerThirds.length > 0 || captions.length > 0) ? 100 : 40;
      const availH = CANVAS_H - cursorY - bottomReserve;
      const totalH = rows * cardH + (rows - 1) * gap;
      let actualH = cardH;
      if (totalH > availH && rows > 0) {
        actualH = Math.max(60, Math.floor((availH - (rows - 1) * gap) / rows));
      }
      const startY = cursorY + Math.max(0, Math.round((availH - rows * actualH - (rows - 1) * gap) / 2));
      cards.forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        pos[card.idx] = {
          x: startX + col * (cardW + gap),
          y: startY + row * (actualH + gap),
          w: cardW, h: actualH,
        };
      });
      cursorY = startY + rows * actualH + (rows - 1) * gap + 20;
    }

    for (const c of callouts) {
      pos[c.idx] = { x: 390, y: cursorY, w: 500, h: 100 };
      cursorY += 120;
    }
    for (const img of images) {
      pos[img.idx] = { x: 390, y: cursorY, w: 500, h: 350 };
      cursorY += 370;
    }
    for (const lt of lowerThirds) {
      pos[lt.idx] = { x: 190, y: CANVAS_H - 80, w: 900, h: 60 };
    }
    for (const cap of captions) {
      pos[cap.idx] = { x: 340, y: CANVAS_H - 50, w: 600, h: 40 };
    }
    const laid = new Set(Object.keys(pos).map(Number));
    for (const r of rawElems) {
      if (!laid.has(r.idx)) {
        pos[r.idx] = { x: 340, y: cursorY, w: 600, h: 100 };
        cursorY += 120;
      }
    }
    return pos;
  })();

  // Second pass: create elements with computed positions
  for (const { elem, content, idx } of rawElems) {
    const elType = typeMap[elem.element_type] || 'text';

    // Position priority: canvas_position (absolute px, may need scaling) > position (normalized 0-1) > layout algorithm
    let pos;
    if (elem.canvas_position && elem.canvas_size) {
      pos = {
        x: Math.round((elem.canvas_position.x || 0) * coordScale),
        y: Math.round((elem.canvas_position.y || 0) * coordScale),
        w: Math.round((elem.canvas_size.w || (TYPE_SIZES[elem.element_type] || TYPE_SIZES.default).w) * coordScale),
        h: Math.round((elem.canvas_size.h || (TYPE_SIZES[elem.element_type] || TYPE_SIZES.default).h) * coordScale),
      };
    } else if (elem.position) {
      const scaleFactor = Math.max(0.5, Math.min(1.5, elem.scale || 1));
      const baseSize = TYPE_SIZES[elem.element_type] || TYPE_SIZES.default;
      const w = Math.max(30, Math.round(baseSize.w * scaleFactor));
      const h = Math.max(20, Math.round(baseSize.h * scaleFactor));
      const rawX = Math.max(0.05, Math.min(0.95, elem.position.x ?? 0.5));
      const rawY = Math.max(0.05, Math.min(0.95, elem.position.y ?? 0.5));
      pos = {
        x: Math.round(rawX * CANVAS_W - w / 2),
        y: Math.round(rawY * CANVAS_H - h / 2),
        w, h,
      };
    } else {
      pos = layoutPositions[idx] || { x: 340, y: 40 + idx * 120, w: 600, h: 100 };
    }

    const color = COLOR_MAP[elem.color_theme] || COLOR_MAP.white;
    const fontFamily = FONT_MAP[elem.font_style] || 'Inter, sans-serif';
    const fxStyles = getVisualStyles(elem.visual_effects || [], color);

    const styleObj = {
      fontSize: FONT_SIZE_MAP[elem.element_type] || FONT_SIZE_MAP.default,
      fontFamily,
      color: color.text,
      bold: elem.element_type === 'statistic' || elem.element_type === 'headline',
      italic: elem.element_type === 'quote',
      align: 'center',
      role: elem.element_type === 'headline' ? 'title' : elem.element_type === 'body_text' ? 'body' : undefined,
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

    // Merge style_overrides from scene graph (direct CSS values take precedence)
    if (elem.style_overrides) {
      let overrides = elem.style_overrides;
      if (typeof overrides === 'string') { try { overrides = JSON.parse(overrides); } catch { overrides = {}; } }
      if (overrides.fontSize) {
        const m = String(overrides.fontSize).match(/(\d+)/);
        if (m) overrides.fontSize = parseInt(m[1]);
      }
      Object.assign(styleObj, overrides);
    }

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
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
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