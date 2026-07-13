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

  const FONT_SIZE_MAP = {
    headline: 48, body_text: 24, statistic: 72, quote: 28,
    callout: 22, talking_point_card: 22, discussion_response: 22,
    lower_third: 20, caption: 18, default: 20,
  };

  const SG_W = 1920, SG_H = 1080;
  const scaleX = CANVAS_W / SG_W;
  const scaleY = CANVAS_H / SG_H;

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

        const cp = elem.canvas_position || elem.position || {};
        const cs = elem.canvas_size || {};
        const px = Math.round((cp.x ?? 0.5 * SG_W) * (typeof cp.x === 'number' && cp.x > 1 ? scaleX : 1));
        const py = Math.round((cp.y ?? 0.5 * SG_H) * (typeof cp.y === 'number' && cp.y > 1 ? scaleY : 1));

        const elType = typeMap[elem.element_type] || 'text';
        let w = cs.w ? Math.round(cs.w * scaleX) : 600;
        let h = cs.h ? Math.round(cs.h * scaleY) : 100;
        if (elType === 'image' && !cs.w) { w = 500; h = 350; }
        if (elType === 'lower_third' && !cs.w) { w = 800; h = 50; }
        w = Math.max(30, w);
        h = Math.max(20, h);

        const so = elem.style_overrides || {};
        const fontSizeStr = so.fontSize || '';
        const fontSizeNum = parseInt(String(fontSizeStr).replace('px', ''), 10);

        const styleObj = {
          fontSize: fontSizeNum || FONT_SIZE_MAP[elem.element_type] || FONT_SIZE_MAP.default,
          fontFamily: 'Inter, sans-serif',
          color: so.color || '#fff',
          bold: so.bold ?? (elem.element_type === 'statistic' || elem.element_type === 'headline'),
          italic: so.italic ?? (elem.element_type === 'quote'),
          align: so.align || 'center',
          backgroundColor: 'transparent',
          borderRadius: 0,
          padding: 8,
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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