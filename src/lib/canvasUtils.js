export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const SNAP_THRESHOLD = 6;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;

export function parseStyle(el) {
  try { return JSON.parse(el?.style || '{}'); } catch { return {}; }
}

export function getBounds(el) {
  return { x: el.x || 0, y: el.y || 0, width: el.width || 0, height: el.height || 0 };
}

export function getCenter(el) {
  const b = getBounds(el);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function calculateSnapGuides(dragRect, elements, excludeId, snapEnabled = true) {
  if (!snapEnabled) return { guides: [], snapX: 0, snapY: 0 };

  const guides = [];
  let snapX = 0, snapY = 0;

  const dragLeft = dragRect.x;
  const dragRight = dragRect.x + dragRect.width;
  const dragCenterX = dragRect.x + dragRect.width / 2;
  const dragTop = dragRect.y;
  const dragBottom = dragRect.y + dragRect.height;
  const dragCenterY = dragRect.y + dragRect.height / 2;

  const targets = [
    { x: 0, y: 0 },
    { x: CANVAS_W, y: CANVAS_H },
    { x: CANVAS_W / 2, y: CANVAS_H / 2 },
  ];

  for (const el of elements) {
    if (el.id === excludeId) continue;
    if (el.visible === false) continue;
    const ex = el.x || 0, ey = el.y || 0;
    const ew = el.width || 0, eh = el.height || 0;
    targets.push(
      { x: ex, y: ey },
      { x: ex + ew, y: ey + eh },
      { x: ex + ew / 2, y: ey + eh / 2 },
    );
  }

  // X-axis
  const xPoints = [dragLeft, dragRight, dragCenterX];
  let bestX = null;
  let bestXDist = SNAP_THRESHOLD;
  for (const t of targets) {
    for (const px of xPoints) {
      const dist = Math.abs(px - t.x);
      if (dist < bestXDist) { bestXDist = dist; bestX = { target: t.x, source: px }; }
    }
  }
  if (bestX) {
    snapX = bestX.target - bestX.source;
    guides.push({ type: 'vertical', x: bestX.target });
  }

  // Y-axis
  const yPoints = [dragTop, dragBottom, dragCenterY];
  let bestY = null;
  let bestYDist = SNAP_THRESHOLD;
  for (const t of targets) {
    for (const py of yPoints) {
      const dist = Math.abs(py - t.y);
      if (dist < bestYDist) { bestYDist = dist; bestY = { target: t.y, source: py }; }
    }
  }
  if (bestY) {
    snapY = bestY.target - bestY.source;
    guides.push({ type: 'horizontal', y: bestY.target });
  }

  return { guides, snapX, snapY };
}

export function calculateFit(containerW, containerH, mode) {
  const pad = 80;
  const availW = Math.max(1, containerW - pad);
  const availH = Math.max(1, containerH - pad);

  if (mode === 'fit_width') {
    const zoom = clampZoom(availW / CANVAS_W);
    return { zoom, panX: pad / 2, panY: Math.max(0, (containerH - CANVAS_H * zoom) / 2) };
  }
  const zoom = clampZoom(Math.min(availW / CANVAS_W, availH / CANVAS_H));
  return { zoom, panX: (containerW - CANVAS_W * zoom) / 2, panY: (containerH - CANVAS_H * zoom) / 2 };
}

export function clampZoom(z) {
  return Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX);
}

export function zoomAtPoint(rect, mouseX, mouseY, currentZoom, currentPanX, currentPanY, newZoom) {
  const clamped = clampZoom(newZoom);
  const slideX = (mouseX - rect.left - currentPanX) / currentZoom;
  const slideY = (mouseY - rect.top - currentPanY) / currentZoom;
  return {
    zoom: clamped,
    panX: mouseX - rect.left - slideX * clamped,
    panY: mouseY - rect.top - slideY * clamped,
  };
}

export function screenToSlide(clientX, clientY, stageRect, zoom) {
  return {
    x: (clientX - stageRect.left) / zoom,
    y: (clientY - stageRect.top) / zoom,
  };
}

export function ensureTitleBodyElements(els, slide) {
  if (!slide) return els;
  const enriched = [...els];

  const hasTitle = enriched.some(e => parseStyle(e).role === 'title');
  if (!hasTitle && slide.title) {
    const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
    const fonts = meta.fonts || {};
    enriched.push({
      id: `sg-title-${slide.id || Date.now()}`,
      slide_id: slide.id,
      type: 'text',
      content: slide.title,
      x: 60, y: 40, width: 1160, height: 70,
      rotation: 0, opacity: 100, z_index: 50,
      style: JSON.stringify({
        role: 'title',
        fontSize: fonts.titleSize || 48,
        fontFamily: fonts.titleFont || 'Poppins, sans-serif',
        color: fonts.titleColor || '#fff',
        bold: fonts.titleBold !== false,
        italic: fonts.titleItalic || false,
        align: fonts.titleAlign || 'left',
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }),
      locked: false, visible: true,
    });
  }

  const hasBody = enriched.some(e => parseStyle(e).role === 'body');
  if (!hasBody && slide.body_text) {
    const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
    const fonts = meta.fonts || {};
    enriched.push({
      id: `sg-body-${slide.id || Date.now()}`,
      slide_id: slide.id,
      type: 'text',
      content: slide.body_text,
      x: 60, y: 120, width: 1160, height: 500,
      rotation: 0, opacity: 100, z_index: 50,
      style: JSON.stringify({
        role: 'body',
        fontSize: fonts.bodySize || 24,
        fontFamily: fonts.bodyFont || 'Inter, sans-serif',
        color: fonts.bodyColor || '#e0e0e0',
        bold: fonts.bodyBold || false,
        italic: fonts.bodyItalic || false,
        align: fonts.bodyAlign || 'left',
      }),
      locked: false, visible: true,
    });
  }

  return enriched;
}