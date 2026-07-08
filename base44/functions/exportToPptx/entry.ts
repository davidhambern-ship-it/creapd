import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import pptxgen from 'npm:pptxgenjs@3.12.0';

/**
 * Exports a StoriesPresentation as a PPTX file compatible with Google Slides.
 * Converts each StorySlide + SlideElements into PowerPoint slides with text,
 * images, shapes, and background colors.
 *
 * Returns the file as a binary download.
 */

function parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function parseStyle(styleStr) {
  return parseJSON(styleStr, {});
}

function safeColor(color) {
  if (!color || color === 'transparent') return undefined;
  // Convert hex #aabbcc to no-hash
  if (color.startsWith('#')) return color.substring(1);
  // Already a named color or rgb — return as-is
  return color;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { presentation_id } = await req.json();
    if (!presentation_id) {
      return Response.json({ error: 'presentation_id is required' }, { status: 400 });
    }

    // ── Load presentation ──
    const presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    if (!presentation) {
      return Response.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // ── Load slides ──
    let slideOrder = [];
    try { slideOrder = JSON.parse(presentation.slide_order || '[]'); } catch {}
    let slides = await base44.asServiceRole.entities.StorySlide.filter(
      { stories_presentation_id: presentation_id }, 'slide_number', 100
    );
    if (!slides || slides.length === 0) {
      return Response.json({ error: 'No slides found' }, { status: 400 });
    }
    if (slideOrder.length > 0) {
      const map = {};
      slides.forEach(s => { map[s.id] = s; });
      slides = slideOrder.map(id => map[id]).filter(Boolean);
    }

    // ── Load all elements ──
    const allElements = await base44.asServiceRole.entities.SlideElement.filter(
      { presentation_id }, 'z_index', 1000
    );
    const elementMap = {};
    (allElements || []).forEach(el => {
      if (!elementMap[el.slide_id]) elementMap[el.slide_id] = [];
      elementMap[el.slide_id].push(el);
    });

    // ── Build PPTX ──
    const pptx = new pptxgen();
    pptx.defineLayout({ name: 'CREAPD_16x9', width: 13.333, height: 7.5 });
    pptx.layout = 'CREAPD_16x9';
    pptx.author = 'CREAPD';
    pptx.title = presentation.title || 'CREAPD Presentation';

    const CANVAS_W = 1280;
    const CANVAS_H = 720;
    const PX_TO_INCH_W = 13.333 / CANVAS_W;
    const PX_TO_INCH_H = 7.5 / CANVAS_H;

    for (const slide of slides) {
      const bg = parseJSON(slide.background, {});
      const bgColor = safeColor(bg.color) || '0a0f1e';

      const pptxSlide = pptx.addSlide();
      if (bgColor && bgColor !== 'transparent') {
        pptxSlide.background = { color: bgColor };
      }

      // ── Built-in title ──
      if (slide.title) {
        const meta = parseJSON(slide.slide_metadata, {});
        const fonts = meta.fonts || {};
        const titleColor = safeColor(fonts.titleColor) || 'FFFFFF';
        pptxSlide.addText(slide.title, {
          x: 0.8,
          y: 0.4,
          w: 11.7,
          h: 1.0,
          fontSize: (fonts.titleSize || 44) * 0.75,
          fontFace: fonts.titleFont || 'Arial',
          bold: fonts.titleBold !== false,
          italic: fonts.titleItalic || false,
          color: titleColor,
          align: fonts.titleAlign || 'left',
          valign: 'top',
        });
      }

      // ── Built-in body text ──
      if (slide.body_text) {
        const meta = parseJSON(slide.slide_metadata, {});
        const fonts = meta.fonts || {};
        const bodyColor = safeColor(fonts.bodyColor) || 'E0E0E0';
        pptxSlide.addText(slide.body_text, {
          x: 0.8,
          y: slide.title ? 1.6 : 0.4,
          w: 11.7,
          h: 5.5,
          fontSize: (fonts.bodySize || 20) * 0.75,
          fontFace: fonts.bodyFont || 'Arial',
          bold: fonts.bodyBold || false,
          italic: fonts.bodyItalic || false,
          color: bodyColor,
          align: fonts.bodyAlign || 'left',
          valign: 'top',
        });
      }

      // ── Slide elements ──
      const els = elementMap[slide.id] || [];
      const sortedEls = [...els].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

      for (const el of sortedEls) {
        if (el.visible === false) continue;
        const style = parseStyle(el.style);
        const x = (el.x || 0) * PX_TO_INCH_W;
        const y = (el.y || 0) * PX_TO_INCH_H;
        const w = (el.width || 200) * PX_TO_INCH_W;
        const h = (el.height || 100) * PX_TO_INCH_H;
        const opacity = (el.opacity ?? 100) / 100;
        const textColor = safeColor(style.color) || 'FFFFFF';
        const bgColor = safeColor(style.backgroundColor);
        const fontSize = ((style.fontSize || 18) * 0.75);
        const fontFace = style.fontFamily || 'Arial';

        if (el.type === 'image' && el.content) {
          try {
            pptxSlide.addImage({
              path: el.content,
              x, y, w, h,
            });
          } catch {
            // Skip broken images
          }
        } else if (el.type === 'text' || el.type === 'caption' || el.type === 'lower_third') {
          const textOpts = {
            x, y, w, h,
            fontSize,
            fontFace,
            color: textColor,
            bold: style.bold || false,
            italic: style.italic || false,
            underline: style.underline ? { style: 'sng' } : undefined,
            align: style.align || 'left',
            valign: 'middle',
            transparency: opacity < 1 ? Math.round((1 - opacity) * 100) : 0,
            margin: (style.padding || 0) * PX_TO_INCH_W,
          };

          if (bgColor && bgColor !== 'transparent') {
            textOpts.fill = { color: bgColor };
            if (style.borderRadius) {
              textOpts.rectRadius = (style.borderRadius || 0) * PX_TO_INCH_W;
              textOpts.lineSpacing = 1;
            }
          }

          if (style.borderWidth > 0 && style.borderColor && style.borderColor !== 'transparent') {
            textOpts.line = { color: safeColor(style.borderColor), width: style.borderWidth };
          }

          pptxSlide.addText(el.content || '', textOpts);
        } else if (el.type === 'shape') {
          const shapeType = style.shapeType || 'rect';
          const shapeOpts = {
            x, y, w, h,
            fill: { color: bgColor || '7C3AED' },
            transparency: opacity < 1 ? Math.round((1 - opacity) * 100) : 0,
            rectRadius: style.borderRadius ? style.borderRadius * PX_TO_INCH_W : undefined,
            line: (style.borderWidth > 0 && style.borderColor && style.borderColor !== 'transparent')
              ? { color: safeColor(style.borderColor), width: style.borderWidth }
              : undefined,
            rotate: el.rotation || 0,
          };

          if (shapeType === 'ellipse' || shapeType === 'circle') {
            pptxSlide.addShape('ellipse', shapeOpts);
          } else if (shapeType === 'triangle') {
            pptxSlide.addShape('triangle', shapeOpts);
          } else if (shapeType === 'line') {
            pptxSlide.addShape('line', { x, y, w, h, line: { color: bgColor || '7C3AED', width: style.borderWidth || 2 } });
          } else {
            pptxSlide.addShape('rect', shapeOpts);
          }
        }
      }
    }

    // ── Generate PPTX as binary ──
    const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
    const uint8 = new Uint8Array(pptxBuffer);

    const safeTitle = (presentation.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeTitle}.pptx"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});