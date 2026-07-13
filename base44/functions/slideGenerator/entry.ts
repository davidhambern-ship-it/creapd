import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * SlideGenerator — Central Presentation Synthesis Engine
 *
 * The "personal assistant" to the APD orchestrator. Takes a Content Manifest
 * (produced by any domain — News, Music, Spiritual, Research, etc.) and
 * orchestrates the Develop Department worker agency to produce a complete
 * presentation with StorySlide + SlideElement records.
 *
 * Two modes:
 *   - full_pipeline: Planning Worker generates presentation_points from a dossier,
 *     then workers fan out
 *   - assembly: presentation_points (slides) are pre-mapped by the domain worker;
 *     SlideGenerator skips Planning and runs only the workers flagged
 *
 * Worker fan-out:
 *   Phase 1 — Resolve Content (Planning or prebuilt)
 *   Phase 2 — Fan Out (Script + Design + Image + Video in parallel)
 *   Phase 3 — Voice Chain (Voice Worker after Script)
 *   Phase 4 — Synthesize (merge outputs → SlideElement records)
 *   Phase 5 — Override Merge (regeneration: preserve manual edits)
 *   Phase 6 — Persist (bulk create slides + elements)
 *   Phase 7 — Return summary
 */

// ═══════════════════════════════════════════════════════════
// CANVAS + STYLE CONSTANTS (single source of truth)
// ═══════════════════════════════════════════════════════════

const CANVAS_W = 1280;
const CANVAS_H = 720;

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
  lower_third: 20, caption: 18, icon: 16, chart: 16, graphic: 16, image: 16,
  default: 20,
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

const ELEMENT_TYPE_MAP = {
  headline: 'text', body_text: 'text', image: 'image',
  talking_point_card: 'text', discussion_response: 'text',
  lower_third: 'lower_third', statistic: 'text', quote: 'text',
  callout: 'text', caption: 'caption',
  icon: 'icon', chart: 'chart', graphic: 'image',
};

const VISUAL_EFFECT_STYLES = {
  glass_panel: (c) => ({ backgroundColor: c.bg, backdropFilter: 'blur(12px)', borderRadius: '12px', border: `1px solid ${c.border}` }),
  glow_border: (c) => ({ border: `1px solid ${c.border}`, boxShadow: `0 0 16px ${c.glow}, inset 0 0 12px ${c.glow}`, borderRadius: '12px' }),
  neon_shadow: (c) => ({ textShadow: `0 0 8px ${c.text}, 0 0 24px ${c.glow}` }),
  drop_shadow: () => ({ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }),
  gradient_border: (c) => ({ border: `1px solid ${c.border}`, boxShadow: `0 0 1px ${c.text}, 0 0 12px ${c.glow}`, borderRadius: '12px' }),
  inner_glow: (c, existing) => ({ boxShadow: `${existing || ''} inset 0 0 20px ${c.glow}`.trim() }),
};

// ═══════════════════════════════════════════════════════════
// LAYOUT ENGINE — distribute elements across canvas by type
// ═══════════════════════════════════════════════════════════

function computeLayout(rawElems) {
  const positions = {};
  let cursorY = 40;

  const headline = rawElems.find(r => r.element_type === 'headline');
  const bodyTexts = rawElems.filter(r => r.element_type === 'body_text');
  const cards = rawElems.filter(r => ['talking_point_card', 'discussion_response'].includes(r.element_type));
  const lowerThirds = rawElems.filter(r => r.element_type === 'lower_third');
  const captions = rawElems.filter(r => r.element_type === 'caption');
  const statistics = rawElems.filter(r => r.element_type === 'statistic');
  const quotes = rawElems.filter(r => r.element_type === 'quote');
  const callouts = rawElems.filter(r => r.element_type === 'callout');
  const images = rawElems.filter(r => r.element_type === 'image');

  if (headline) {
    positions[headline.idx] = { x: 240, y: cursorY, w: 800, h: 100 };
    cursorY += 120;
  }
  for (const bt of bodyTexts) {
    positions[bt.idx] = { x: 190, y: cursorY, w: 900, h: 200 };
    cursorY += 220;
  }
  for (const stat of statistics) {
    positions[stat.idx] = { x: 340, y: cursorY, w: 600, h: 150 };
    cursorY += 170;
  }
  for (const q of quotes) {
    positions[q.idx] = { x: 290, y: cursorY, w: 700, h: 150 };
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
      positions[card.idx] = {
        x: startX + col * (cardW + gap),
        y: startY + row * (actualH + gap),
        w: cardW, h: actualH,
      };
    });
    cursorY = startY + rows * actualH + (rows - 1) * gap + 20;
  }

  for (const c of callouts) {
    positions[c.idx] = { x: 390, y: cursorY, w: 500, h: 100 };
    cursorY += 120;
  }
  for (const img of images) {
    positions[img.idx] = { x: 390, y: cursorY, w: 500, h: 350 };
    cursorY += 370;
  }
  for (const lt of lowerThirds) {
    positions[lt.idx] = { x: 190, y: CANVAS_H - 80, w: 900, h: 60 };
  }
  for (const cap of captions) {
    positions[cap.idx] = { x: 340, y: CANVAS_H - 50, w: 600, h: 40 };
  }
  const laid = new Set(Object.keys(positions).map(Number));
  for (const r of rawElems) {
    if (!laid.has(r.idx)) {
      positions[r.idx] = { x: 340, y: cursorY, w: 600, h: 100 };
      cursorY += 120;
    }
  }
  return positions;
}

function resolvePosition(elem, elementType, idx, layoutPositions) {
  const baseSize = TYPE_SIZES[elementType] || TYPE_SIZES.default;
  if (elem.canvas_position && elem.canvas_size) {
    return {
      x: Math.round(elem.canvas_position.x || 0),
      y: Math.round(elem.canvas_position.y || 0),
      w: Math.round(elem.canvas_size.w || baseSize.w),
      h: Math.round(elem.canvas_size.h || baseSize.h),
    };
  }
  if (elem.position) {
    const scaleFactor = Math.max(0.5, Math.min(1.5, elem.scale || 1));
    const w = Math.max(30, Math.round(baseSize.w * scaleFactor));
    const h = Math.max(20, Math.round(baseSize.h * scaleFactor));
    const rawX = Math.max(0.05, Math.min(0.95, elem.position.x ?? 0.5));
    const rawY = Math.max(0.05, Math.min(0.95, elem.position.y ?? 0.5));
    return { x: Math.round(rawX * CANVAS_W - w / 2), y: Math.round(rawY * CANVAS_H - h / 2), w, h };
  }
  return layoutPositions[idx] || { x: 340, y: 40 + idx * 120, w: baseSize.w, h: baseSize.h };
}

function getVisualStyles(effects, color) {
  const styles = {};
  const fx = effects || [];
  for (const effectName of fx) {
    const fn = VISUAL_EFFECT_STYLES[effectName];
    if (fn) Object.assign(styles, fn(color, styles.boxShadow));
  }
  return styles;
}

function buildStyleObj(elem, elementType, colorTheme, fontStyle) {
  const color = COLOR_MAP[colorTheme] || COLOR_MAP.white;
  const fontFamily = FONT_MAP[fontStyle] || 'Inter, sans-serif';
  const fxStyles = getVisualStyles(elem.visual_effects || [], color);
  return {
    fontSize: FONT_SIZE_MAP[elementType] || FONT_SIZE_MAP.default,
    fontFamily,
    color: color.text,
    bold: elementType === 'statistic' || elementType === 'headline',
    italic: elementType === 'quote',
    align: 'center',
    role: elementType === 'headline' ? 'title' : elementType === 'body_text' ? 'body' : undefined,
    backgroundColor: fxStyles.backgroundColor || 'transparent',
    borderRadius: fxStyles.borderRadius || 0,
    border: fxStyles.border || 'none',
    boxShadow: fxStyles.boxShadow || 'none',
    textShadow: fxStyles.textShadow || 'none',
    filter: fxStyles.filter || 'none',
    backdropFilter: fxStyles.backdropFilter || 'none',
    padding: 12,
  };
}

// ═══════════════════════════════════════════════════════════
// WORKER DISPATCH — invoke a develop worker via base44.functions.invoke
// ═══════════════════════════════════════════════════════════

async function invokeWorker(base44, functionName, payload) {
  try {
    const response = await base44.asServiceRole.functions.invoke(functionName, payload);
    return response.data || response;
  } catch (err) {
    return { error: err.message, worker_id: functionName };
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const manifest = await req.json();
    if (!manifest || !manifest.presentation) {
      return Response.json({ error: 'Content Manifest is required' }, { status: 400 });
    }

    const { presentation: presMeta, generation_flags: flags = {}, slides: prebuiltSlides = [], dossier, brand_profile } = manifest;
    const mode = flags.mode || (dossier ? 'full_pipeline' : 'assembly');

    // ── PHASE 0: Regeneration override map ──
    let overrideMap = {};
    let isRegeneration = false;
    if (presMeta.presentation_id) {
      isRegeneration = true;
      overrideMap = await loadOverrides(base44, presMeta.presentation_id);
    }

    // ── PHASE 1: Resolve presentation_points (the universal currency) ──
    let slides;
    if (mode === 'full_pipeline') {
      const planningResult = await invokeWorker(base44, 'developPlanningWorker', {
        dossier,
        configuration_id: presMeta.production_profile,
        target_slide_count: manifest.target_slide_count || prebuiltSlides.length || 10,
      });
      if (planningResult.error) {
        return Response.json({ error: `Planning Worker failed: ${planningResult.error}` }, { status: 500 });
      }
      slides = (planningResult.presentation_points || []).map((pp, idx) => ({
        order: pp.order || idx + 1,
        title: pp.title || `Slide ${idx + 1}`,
        key_message: pp.key_message || '',
        content_summary: pp.content_summary || '',
        section: pp.section || '',
        domain_content: {},
        prebuilt_assets: {},
        voice: {},
        source_refs: {},
      }));
      // Merge any prebuilt slides (assembly data) by order
      if (prebuiltSlides.length > 0) {
        for (const pb of prebuiltSlides) {
          const match = slides.find(s => s.order === pb.order);
          if (match) {
            match.domain_content = pb.domain_content || {};
            match.prebuilt_assets = pb.prebuilt_assets || {};
            match.voice = pb.voice || {};
            match.source_refs = pb.source_refs || {};
          }
        }
      }
    } else {
      slides = prebuiltSlides;
    }

    if (!slides || slides.length === 0) {
      return Response.json({ error: 'No slides resolved from manifest' }, { status: 400 });
    }

    // ── Prepare presentation_points for workers (stripped of internal fields) ──
    const presentationPoints = slides.map(s => ({
      title: s.title,
      key_message: s.key_message,
      content_summary: s.content_summary,
      section: s.section,
      domain_content: s.domain_content || {},
      prebuilt_assets: s.prebuilt_assets || {},
    }));

    // ── PHASE 1.5: Semantic Asset Fetching — query AssetRegistry before generating images ──
    const semanticAssetMap = {};
    if (flags.generate_images !== false) {
      for (const pp of presentationPoints) {
        const keywords = [pp.title, pp.key_message, pp.content_summary, pp.section].filter(Boolean).join(' ');
        if (!keywords.trim()) continue;
        try {
          const found = await base44.asServiceRole.entities.AssetRegistry.filter(
            { resource_type: 'image', is_active: true, keywords: { $regex: keywords.split(' ').slice(0, 5).join('|'), $options: 'i' } },
            '-updated_date', 5
          ).catch(() => []);
          if (found && found.length > 0) {
            const best = found[0];
            semanticAssetMap[(pp.title || '').toLowerCase()] = {
              image_url: best.cached_file_url || best.preview_url || best.thumbnail_url || '',
              asset_registry_id: best.id,
              source: 'semantic_library',
              title: best.title,
            };
          }
        } catch {}
      }
    }

    // ── PHASE 2: Fan out (Script + Design + Image + Video in parallel) ──
    const workerPromises = [];

    if (flags.generate_scripts !== false) {
      const hasPrebuiltScripts = slides.every(s => s.prebuilt_assets?.teleprompter_script);
      if (!hasPrebuiltScripts) {
        workerPromises.push(
          invokeWorker(base44, 'developScriptWorker', {
            presentation_points: presentationPoints,
            configuration_id: presMeta.production_profile,
            dossier: dossier || null,
            tone: brand_profile?.tone || 'professional',
            audience: brand_profile?.audience || 'General Public',
          }).then(r => ({ worker: 'script', result: r }))
        );
      }
    }

    if (flags.generate_design !== false) {
      workerPromises.push(
        invokeWorker(base44, 'developDesignWorker', {
          presentation_points: presentationPoints,
          configuration_id: presMeta.production_profile,
          brand_profile: brand_profile || null,
          visual_trajectory: [],
        }).then(r => ({ worker: 'design', result: r }))
      );
    }

    if (flags.generate_images !== false) {
      const pointsWithLibraryAssets = presentationPoints.map(pp => {
        const libAsset = semanticAssetMap[(pp.title || '').toLowerCase()];
        if (libAsset?.image_url) {
          return { ...pp, prebuilt_assets: { ...pp.prebuilt_assets, generated_image_url: libAsset.image_url, asset_source: 'semantic_library' } };
        }
        return pp;
      });
      workerPromises.push(
        invokeWorker(base44, 'developImageWorker', {
          presentation_points: pointsWithLibraryAssets,
          configuration_id: presMeta.production_profile,
        }).then(r => ({ worker: 'image', result: r }))
      );
    }

    if (flags.generate_video) {
      workerPromises.push(
        invokeWorker(base44, 'developVideoWorker', {
          presentation_points: presentationPoints,
          configuration_id: presMeta.production_profile,
        }).then(r => ({ worker: 'video', result: r }))
      );
    }

    const workerResults = await Promise.all(workerPromises);

    // Index worker outputs by slide title for merge
    const scriptSpecs = {};
    const designSpecs = {};
    const imageAssets = {};
    const videoAssets = {};
    let kaaeStats = { reused: 0, generated: 0 };

    for (const wr of workerResults) {
      if (!wr || wr.result?.error) continue;
      const items = wr.result.design_specs || wr.result.script_specs || wr.result.image_assets || wr.result.video_assets || [];
      // Script worker returns scripts array (we handle below)
      if (wr.worker === 'script') {
        const scripts = wr.result.scripts || wr.result.script_segments || [];
        for (const s of scripts) {
          scriptSpecs[(s.point_title || s.title || '').toLowerCase()] = s;
        }
      }
      if (wr.worker === 'design') {
        for (const d of (wr.result.design_specs || [])) {
          designSpecs[(d.point_title || '').toLowerCase()] = d;
        }
      }
      if (wr.worker === 'image') {
        for (const ia of (wr.result.image_assets || [])) {
          imageAssets[(ia.point_title || '').toLowerCase()] = ia;
        }
        if (wr.result.kaae_stats) kaaeStats = wr.result.kaae_stats;
      }
      if (wr.worker === 'video') {
        for (const va of (wr.result.video_assets || [])) {
          videoAssets[(va.point_title || '').toLowerCase()] = va;
        }
      }
    }

    // ── PHASE 3: Voice Chain (sequential — needs Script output) ──
    let voiceSpecs = {};
    if (flags.generate_voice !== false) {
      const scriptsForVoice = slides.map((s, idx) => {
        const spec = scriptSpecs[s.title.toLowerCase()] || {};
        return {
          point_title: s.title,
          teleprompter_script: spec.teleprompter_script || s.prebuilt_assets?.teleprompter_script || s.content_summary,
          talking_points: spec.talking_points || s.prebuilt_assets?.talking_points || [],
        };
      });

      const voiceResult = await invokeWorker(base44, 'developVoiceWorker', {
        scripts: scriptsForVoice,
        presentation_points: presentationPoints,
        configuration_id: presMeta.production_profile,
        voice_id: presMeta.voice_id || 'river',
      });

      if (!voiceResult.error) {
        for (const vs of (voiceResult.voice_segments || [])) {
          voiceSpecs[(vs.point_title || '').toLowerCase()] = vs;
        }
      }
    }

    // ── PHASE 4: Synthesize — merge all worker outputs per slide into element specs ──
    const synthesizedSlides = [];
    let cumulativeStartMs = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const titleKey = slide.title.toLowerCase();
      const script = scriptSpecs[titleKey] || {};
      const design = designSpecs[titleKey] || {};
      const image = imageAssets[titleKey] || {};
      const video = videoAssets[titleKey] || {};
      const voice = voiceSpecs[titleKey] || {};

      // ── TEMPORAL FLUIDITY: Dynamic slide duration based on content complexity ──
      const voiceData = slide.voice || {};
      const baseSeconds = voiceData.duration_seconds || voice.estimated_duration_seconds || 25;
      const durationText = script.teleprompter_script || slide.prebuilt_assets?.teleprompter_script || slide.content_summary || '';
      const wordCount = durationText.split(/\s+/).filter(Boolean).length;
      const talkingPointCount = (script.talking_points || parseArray(slide.prebuilt_assets?.talking_points) || []).length;
      const hasImage = !!(image.image_url || image.generated_image_url || slide.prebuilt_assets?.generated_image_url);
      const complexitySeconds = Math.max(0, (wordCount - 30) / 10) * 0.2 + talkingPointCount * 0.4 + (hasImage ? 1.5 : 0);
      const durationMs = Math.round(Math.min(90, Math.max(12, baseSeconds + complexitySeconds)) * 1000);

      // Build raw elements from all sources
      const rawElems = [];

      // Headline from slide title
      if (slide.title) {
        rawElems.push({
          element_type: 'headline',
          content: slide.title,
          color_theme: design.color_scheme?.primary ? 'primary' : 'white',
          font_style: design.typography?.heading ? mapFontName(design.typography.heading) : 'font-heading',
          visual_effects: [],
          entrance_animation: { type: 'fade_in', duration_ms: 500 },
          timeline_events: [{ start_time: 0, end_time: durationMs }],
        });
      }

      // Body text from script/teleprompter
      const bodyText = script.teleprompter_script || slide.prebuilt_assets?.teleprompter_script || slide.content_summary;
      if (bodyText) {
        rawElems.push({
          element_type: 'body_text',
          content: bodyText.substring(0, 500),
          color_theme: 'white',
          font_style: design.typography?.body ? mapFontName(design.typography.body) : 'font-body',
          visual_effects: [],
          entrance_animation: { type: 'fade_in', duration_ms: 500 },
          timeline_events: [{ start_time: 0, end_time: durationMs }],
        });
      }

      // Talking points from script
      const talkingPoints = script.talking_points || parseArray(slide.prebuilt_assets?.talking_points);
      if (Array.isArray(talkingPoints)) {
        for (const tp of talkingPoints.slice(0, 4)) {
          if (!tp || !String(tp).trim()) continue;
          rawElems.push({
            element_type: 'talking_point_card',
            content: String(tp).substring(0, 200),
            color_theme: design.color_scheme?.accent ? 'accent' : 'emerald',
            font_style: 'font-body',
            visual_effects: ['glass_panel'],
            entrance_animation: { type: 'slide_in', duration_ms: 500 },
          });
        }
      }

      // Lower third
      const lowerThird = slide.prebuilt_assets?.lower_third_text || script.lower_third;
      if (lowerThird) {
        rawElems.push({
          element_type: 'lower_third',
          content: String(lowerThird).substring(0, 120),
          color_theme: 'accent',
          font_style: 'font-condensed',
          visual_effects: ['glass_panel'],
          entrance_animation: { type: 'slide_in', duration_ms: 400 },
          timeline_events: [{ start_time: 1000, end_time: durationMs }],
        });
      }

      // Image element — prefer semantic library asset over generated
      const semAsset = semanticAssetMap[titleKey];
      const imageUrl = semAsset?.image_url || image.image_url || image.generated_image_url || slide.prebuilt_assets?.generated_image_url;
      if (imageUrl) {
        rawElems.push({
          element_type: 'image',
          content: imageUrl,
          asset_reference: imageUrl,
          color_theme: 'white',
          font_style: 'font-body',
          visual_effects: [],
          entrance_animation: { type: 'fade_in', duration_ms: 600 },
          timeline_events: [{ start_time: 500, end_time: durationMs }],
        });
      }

      // Assign indices and compute layout
      const indexedElems = rawElems.map((e, idx) => ({ ...e, idx }));
      const layoutPositions = computeLayout(indexedElems);

      // Build final element specs
      const elements = indexedElems.map((elem) => {
        const elementType = elem.element_type;
        const pos = resolvePosition(elem, elementType, elem.idx, layoutPositions);
        const colorTheme = elem.color_theme || 'white';
        const fontStyle = elem.font_style || 'font-body';
        const styleObj = buildStyleObj(elem, elementType, colorTheme, fontStyle);

        const tlEvents = elem.timeline_events || [];
        const startMs = tlEvents.length > 0 ? tlEvents[0].start_time : 0;
        const endMs = tlEvents.length > 0 ? tlEvents[0].end_time : 0;
        const animType = elem.entrance_animation?.type || 'fade_in';
        const animDur = elem.entrance_animation?.duration_ms || 500;

        return {
          type: ELEMENT_TYPE_MAP[elementType] || 'text',
          content: elem.content || '',
          x: pos.x, y: pos.y, width: pos.w, height: pos.h,
          rotation: 0, opacity: 100, z_index: elem.idx + 1,
          style: JSON.stringify(styleObj),
          entrance_type: animType,
          entrance_duration: animDur,
          entrance_delay: startMs,
          exit_type: elem.exit_animation?.type || null,
          ambient_animation: elem.ambient_animation || 'none',
          visual_effects: JSON.stringify(elem.visual_effects || []),
          color_theme: colorTheme,
          font_style: fontStyle,
          start_ms: startMs,
          end_ms: endMs,
          animation: JSON.stringify({ type: animType, duration_ms: animDur, delay_ms: startMs }),
          timing: tlEvents.length > 0 ? JSON.stringify({ start_ms: startMs, end_ms: endMs }) : null,
          locked: false, visible: true, version: 1,
        };
      });

      synthesizedSlides.push({
        slide,
        elements,
        durationMs,
        slideStartMs: cumulativeStartMs,
        design,
        script,
        voice,
      });

      cumulativeStartMs += durationMs;
    }

    // ── PHASE 5: Override merge — preserve manual edits on regeneration ──
    let overridesPreserved = 0;
    if (isRegeneration) {
      for (const synth of synthesizedSlides) {
        for (const el of synth.elements) {
          const pkgId = synth.slide.source_refs?.package_id || synth.slide.source_refs?.article_id || '';
          const key = `${pkgId}::${(el.content || '').trim()}`;
          const override = overrideMap[key];
          if (override) {
            Object.assign(el, {
              x: override.x, y: override.y, width: override.width, height: override.height,
              rotation: override.rotation, opacity: override.opacity, z_index: override.z_index,
              style: override.style,
              entrance_type: override.entrance_type,
              entrance_duration: override.entrance_duration,
              entrance_delay: override.entrance_delay,
              exit_type: override.exit_type,
              ambient_animation: override.ambient_animation,
              visual_effects: override.visual_effects,
              color_theme: override.color_theme,
              font_style: override.font_style,
              animation: override.animation,
              locked: override.locked,
              visible: override.visible,
              qa_status: override.qa_status,
              version: override.version,
            });
            overridesPreserved++;
          }
        }
      }
    }

    // ── PHASE 6: Persist ──
    const ppId = presMeta.pp_id || `PP-${(presMeta.production_profile || 'GEN').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const presentationTitle = presMeta.title || `${presMeta.production_profile?.toUpperCase() || 'Presentation'} — ${new Date().toLocaleDateString()}`;

    let presentation;
    if (isRegeneration) {
      // Clean up old slides + elements
      let oldSlides = [];
      try {
        oldSlides = await base44.asServiceRole.entities.StorySlide.filter(
          { stories_presentation_id: presMeta.presentation_id }, 'slide_number', 100
        );
      } catch {}
      for (const old of oldSlides) {
        try { await base44.asServiceRole.entities.SlideElement.deleteMany({ slide_id: old.id }); } catch {}
        try { await base44.asServiceRole.entities.StorySlide.delete(old.id); } catch {}
      }
      presentation = await base44.asServiceRole.entities.StoriesPresentation.update(presMeta.presentation_id, {
        title: presentationTitle,
        story_package_ids: JSON.stringify(slides.map(s => s.source_refs?.package_id).filter(Boolean)),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        status: 'generating',
        presentation_metadata: JSON.stringify({
          title: presentationTitle,
          production_profile: presMeta.production_profile,
          creator: user.full_name || user.email,
          creator_id: user.id,
          generation_timestamp: new Date().toISOString(),
          slide_generator_version: '1.0',
          presentation_version: 1,
          regenerated: true,
        }),
      });
    } else {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.create({
        title: presentationTitle,
        production_profile: presMeta.production_profile || 'general',
        pp_id: ppId,
        story_slide_ids: JSON.stringify([]),
        story_package_ids: JSON.stringify(slides.map(s => s.source_refs?.package_id).filter(Boolean)),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        presentation_metadata: JSON.stringify({
          title: presentationTitle,
          production_profile: presMeta.production_profile || 'general',
          creator: user.full_name || user.email,
          creator_id: user.id,
          generation_timestamp: new Date().toISOString(),
          slide_generator_version: '1.0',
          presentation_version: 1,
        }),
        playback_settings: JSON.stringify({
          resolution: presMeta.resolution || '1920x1080',
          aspect_ratio: presMeta.aspect_ratio || '16:9',
          frame_rate: 30,
          playback_mode: 'interactive',
          transition_defaults: 'fade',
          motion_defaults: 'subtle',
          export_options: ['mp4'],
          theme_version: '1.0',
        }),
        presentation_version: 1,
        status: 'generating',
        producer_id: user.id,
        qa_scores: JSON.stringify({}),
        confidence_score: 0,
        qa_result: 'pending',
        showcase_status: 'none',
        total_runtime_ms: 0,
        story_count: slides.length,
      });
    }

    // Create StorySlide + SlideElement records
    const storySlideIds = [];
    const masterTimelineEvents = [];
    const allElementRecords = [];

    for (let i = 0; i < synthesizedSlides.length; i++) {
      const synth = synthesizedSlides[i];
      const slide = synth.slide;

      const storySlide = await base44.asServiceRole.entities.StorySlide.create({
        stories_presentation_id: presentation.id,
        story_package_id: slide.source_refs?.package_id || '',
        story_order: i,
        slide_number: i + 1,
        slide_type: i === 0 ? 'title_slide' : (i === synthesizedSlides.length - 1 ? 'closing_slide' : 'content_slide'),
        title: slide.title || `Slide ${i + 1}`,
        body_text: synth.script.teleprompter_script || slide.content_summary || '',
        speaker_notes: synth.script.speaker_notes || synth.voice.pacing_notes || '',
        transition: synth.design.transition_suggestion || 'fade',
        slide_start_ms: synth.slideStartMs,
        duration_ms: synth.durationMs,
        slide_timeline: JSON.stringify({
          slide_start_ms: synth.slideStartMs,
          slide_end_ms: synth.slideStartMs + synth.durationMs,
          slide_duration_ms: synth.durationMs,
          voice_audio_url: slide.voice?.audio_url || '',
        }),
        slide_metadata: JSON.stringify({
          headline: slide.title,
          story_summary: slide.content_summary || '',
          duration_ms: synth.durationMs,
          section: slide.section || '',
          voice_package_reference: slide.voice?.voice_package_id || null,
        }),
        status: 'generated',
        version: 1,
      });

      storySlideIds.push(storySlide.id);
      masterTimelineEvents.push({
        event_type: 'slide_start',
        slide_id: storySlide.id,
        start_time: synth.slideStartMs,
        end_time: synth.slideStartMs + synth.durationMs,
      });

      // Bulk-create elements for this slide
      const elementRecords = synth.elements.map(el => ({
        ...el,
        slide_id: storySlide.id,
        presentation_id: presentation.id,
        pp_id: ppId,
      }));

      if (elementRecords.length > 0) {
        try {
          const created = await base44.asServiceRole.entities.SlideElement.bulkCreate(elementRecords);
          allElementRecords.push(...(created || []));
        } catch {
          // Fallback: create individually
          for (const rec of elementRecords) {
            try {
              const c = await base44.asServiceRole.entities.SlideElement.create(rec);
              allElementRecords.push(c);
            } catch {}
          }
        }
      }
    }

    // Finalize presentation
    const masterTimeline = {
      events: masterTimelineEvents,
      total_duration_ms: cumulativeStartMs,
      slide_count: storySlideIds.length,
    };

    await base44.asServiceRole.entities.StoriesPresentation.update(presentation.id, {
      story_slide_ids: JSON.stringify(storySlideIds),
      slide_order: JSON.stringify(storySlideIds),
      master_timeline: JSON.stringify(masterTimeline),
      total_runtime_ms: cumulativeStartMs,
      story_count: storySlideIds.length,
      status: 'generated',
      completed_at: new Date().toISOString(),
      presentation_metadata: JSON.stringify({
        title: presentationTitle,
        production_profile: presMeta.production_profile || 'general',
        creator: user.full_name || user.email,
        creator_id: user.id,
        generation_timestamp: new Date().toISOString(),
        slide_generator_version: '1.0',
        presentation_version: isRegeneration ? 2 : 1,
        runtime_ms: cumulativeStartMs,
        story_count: storySlideIds.length,
        mode,
        workers_used: workerResults.map(w => w.worker).filter(Boolean),
        kaae_stats: kaaeStats,
      }),
    });

    // ── PHASE 7: Return summary ──
    return Response.json({
      success: true,
      presentation_id: presentation.id,
      slide_count: storySlideIds.length,
      element_count: allElementRecords.length,
      overrides_preserved: overridesPreserved,
      kaae_stats: kaaeStats,
      total_estimated_runtime: Math.round(cumulativeStartMs / 1000),
      workers_executed: workerResults.map(w => w.worker).filter(Boolean),
      mode,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

async function loadOverrides(base44, presentationId) {
  const overrideMap = {};
  try {
    const existingSlides = await base44.asServiceRole.entities.StorySlide.filter(
      { stories_presentation_id: presentationId }, 'slide_number', 100
    );
    for (const slide of (existingSlides || [])) {
      let existingEls = [];
      try {
        existingEls = await base44.asServiceRole.entities.SlideElement.filter({ slide_id: slide.id });
      } catch {}
      for (const el of (existingEls || [])) {
        if (el.qa_status === 'approved' || (el.version || 1) > 1) {
          const key = `${slide.story_package_id}::${(el.content || '').trim()}`;
          overrideMap[key] = {
            x: el.x, y: el.y, width: el.width, height: el.height,
            rotation: el.rotation, opacity: el.opacity, z_index: el.z_index,
            style: el.style,
            entrance_type: el.entrance_type, entrance_duration: el.entrance_duration,
            entrance_delay: el.entrance_delay, exit_type: el.exit_type,
            ambient_animation: el.ambient_animation, visual_effects: el.visual_effects,
            color_theme: el.color_theme, font_style: el.font_style,
            animation: el.animation,
            locked: el.locked, visible: el.visible,
            qa_status: el.qa_status, version: el.version,
          };
        }
      }
    }
  } catch {}
  return overrideMap;
}

function mapFontName(fontName) {
  if (!fontName) return 'font-body';
  const lower = fontName.toLowerCase();
  if (lower.includes('poppins') || lower.includes('heading')) return 'font-heading';
  if (lower.includes('inter') || lower.includes('body')) return 'font-body';
  if (lower.includes('oswald') || lower.includes('display')) return 'font-display';
  if (lower.includes('jetbrains') || lower.includes('mono')) return 'font-mono';
  if (lower.includes('archivo') || lower.includes('condensed')) return 'font-condensed';
  if (lower.includes('playfair') || lower.includes('serif')) return 'font-serif';
  return 'font-body';
}

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(val).split('\n').filter(Boolean);
  }
}