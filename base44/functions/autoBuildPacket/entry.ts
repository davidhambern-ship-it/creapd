import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Auto-Build Presentation — Packet Department
 *
 * Assembles a fully editable StoriesPresentation from research production packages.
 * Creates StorySlide records AND individual SlideElement records (title text, body
 * text, lower third, image) so every element is editable in the Presentation Editor.
 *
 * This is the final stage of the Auto-Build pipeline.
 */

function generatePpId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PP-${ts}-${rand}`;
}

const SLIDE_DURATION_MS = 30000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { configuration_id, presentation_title } = await req.json();
    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    // ── Fetch research points (ordered) ──
    const points = await base44.asServiceRole.entities.ResearchPoint.filter(
      { configuration_id }, 'order'
    );
    if (!points || points.length === 0) {
      return Response.json({ error: 'No research points found. Complete research and develop stages first.' }, { status: 400 });
    }

    // ── Fetch production packages for these points ──
    const pointIds = points.map(p => p.id);
    const allPackages = await base44.asServiceRole.entities.ProductionPackage.filter(
      { source_entity_type: 'ResearchPoint' }, '-created_date', 200
    );
    const packages = (allPackages || []).filter(pkg =>
      pointIds.includes(pkg.source_entity_id) &&
      ['generated', 'edited', 'approved'].includes(pkg.status)
    );
    if (packages.length === 0) {
      return Response.json({ error: 'No production packages found. Generate assets in the Develop stage first.' }, { status: 400 });
    }

    // ── Fetch config ──
    const config = await base44.asServiceRole.entities.ResearchProductionConfiguration.get(configuration_id);

    // ── Fetch VoicePackages for all packages ──
    const allVPs = await base44.asServiceRole.entities.VoicePackage.filter(
      { source_type: 'production_package' }, '-created_date', 200
    );
    const vpMap = {};
    for (const vp of (allVPs || [])) {
      if (vp.source_id && !vpMap[vp.source_id]) {
        vpMap[vp.source_id] = vp;
      }
    }

    // ── Fetch topics for dossier metadata ──
    const topics = await base44.asServiceRole.entities.ResearchTopic.filter(
      { configuration_id }, '-created_date'
    );
    const dossierIds = (topics || []).map(t => t.dossier_id).filter(Boolean);
    let dossiers = [];
    if (dossierIds.length > 0) {
      const allDossiers = await base44.asServiceRole.entities.ResearchDossier.filter({}, '-created_date', 100);
      dossiers = (allDossiers || []).filter(d => dossierIds.includes(d.id) && d.status === 'ready');
    }

    // ── Create StoriesPresentation ──
    const ppId = generatePpId();
    const title = presentation_title || `${config?.production_name || 'Auto-Built'} — Presentation`;

    const presentation = await base44.entities.StoriesPresentation.create({
      title,
      pp_id: ppId,
      production_profile: 'research',
      story_package_ids: JSON.stringify(packages.map(p => p.id)),
      story_slide_ids: JSON.stringify([]),
      slide_order: JSON.stringify([]),
      master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
      presentation_metadata: JSON.stringify({
        title,
        production_profile: 'research',
        configuration_id,
        creator: user.full_name || user.email,
        creator_id: user.id,
        auto_built: true,
        generated_at: new Date().toISOString(),
        package_count: packages.length,
        dossier_count: dossiers.length,
      }),
      playback_settings: JSON.stringify({
        resolution: '1920x1080',
        aspect_ratio: '16:9',
        frame_rate: 30,
        playback_mode: 'sequential',
        transition_defaults: { type: 'fade', duration_ms: 500 },
      }),
      producer_id: user.id,
      status: 'generating',
      story_count: packages.length,
    });

    // ── Create slides + elements ──
    const slideIds = [];
    const masterTimelineEvents = [];
    let currentTimeMs = 0;

    // Determine theme colors from config tone
    const toneColors = {
      professional: { bg: '#0a0f1e', primary: '#3b82f6', text: '#ffffff' },
      conversational: { bg: '#1a1a2e', primary: '#7c3aed', text: '#ffffff' },
      energetic: { bg: '#0c0c0c', primary: '#f97316', text: '#ffffff' },
      serious: { bg: '#0a0a0a', primary: '#ef4444', text: '#ffffff' },
      investigative: { bg: '#0f0f1a', primary: '#6366f1', text: '#ffffff' },
      educational: { bg: '#0a1628', primary: '#06b6d4', text: '#ffffff' },
      inspirational: { bg: '#1a0a2e', primary: '#8b5cf6', text: '#ffffff' },
      neutral: { bg: '#0a0a0a', primary: '#7c3aed', text: '#ffffff' },
      urgent: { bg: '#1a0a0a', primary: '#ef4444', text: '#ffffff' },
      humorous: { bg: '#0a1a0a', primary: '#22c55e', text: '#ffffff' },
    };
    const colors = toneColors[config?.tone] || toneColors.educational;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const point = points.find(p => p.id === pkg.source_entity_id);
      const vp = vpMap[pkg.id] || null;

      const slideTitle = point?.title || pkg.headline_suggestions || `Slide ${i + 1}`;
      const slideBody = pkg.teleprompter_script || pkg.story_summary || point?.content || '';
      const speakerNotes = pkg.talking_points || pkg.producer_notes || '';
      const lowerThird = pkg.lower_third_text || '';
      const imageUrl = pkg.generated_image_url || '';

      // Use real VP duration if available, otherwise fallback to default
      const slideDurationMs = vp ? Math.round((vp.total_duration_seconds || 0) * 1000) : SLIDE_DURATION_MS;

      // Determine slide type
      let slideType = 'content_slide';
      if (i === 0) slideType = 'title_slide';
      if (i === packages.length - 1) slideType = 'closing_slide';

      // ── Create StorySlide ──
      const slide = await base44.entities.StorySlide.create({
        stories_presentation_id: presentation.id,
        pp_id: ppId,
        story_package_id: pkg.id,
        slide_number: i,
        story_order: i,
        slide_type: slideType,
        title: slideTitle,
        body_text: slideBody.substring(0, 2000),
        speaker_notes: speakerNotes,
        background: JSON.stringify({ color: colors.bg, type: 'solid' }),
        transition: i === 0 ? 'fade' : (config?.tone === 'energetic' ? 'slide_left' : 'fade'),
        animations: JSON.stringify({ entrance: 'fade_in', exit: 'fade_out' }),
        timing: JSON.stringify({ start_ms: currentTimeMs, duration_ms: slideDurationMs }),
        slide_metadata: JSON.stringify({
          headline: slideTitle,
          story_summary: pkg.story_summary || '',
          source_point_id: point?.id,
          source_point_type: point?.point_type,
          auto_built: true,
          duration_ms: slideDurationMs,
          has_voiceover: !!vp,
        }),
        slide_start_ms: currentTimeMs,
        duration_ms: slideDurationMs,
        voice_package_id: vp?.id || null,
        slide_timeline: vp ? JSON.stringify({
          voice_audio_url: vp.voice_audio_url,
          sentence_timeline: vp.sentence_timeline,
          word_timeline: vp.word_timeline,
          paragraph_timeline: vp.paragraph_timeline,
          pause_timeline: vp.pause_timeline,
          total_duration_seconds: vp.total_duration_seconds,
        }) : null,
        status: 'generated',
        version: 1,
      });

      slideIds.push(slide.id);
      masterTimelineEvents.push({
        event_type: 'slide_start',
        slide_id: slide.id,
        start_time: currentTimeMs,
        end_time: currentTimeMs + slideDurationMs,
      });
      currentTimeMs += slideDurationMs;

      // ── Create SlideElements (fully editable) ──
      let zIndex = 1;

      // Image element (behind text, if exists)
      if (imageUrl) {
        await base44.entities.SlideElement.create({
          slide_id: slide.id,
          presentation_id: presentation.id,
          pp_id: ppId,
          type: 'image',
          content: imageUrl,
          x: 240,
          y: 140,
          width: 800,
          height: 380,
          rotation: 0,
          opacity: 90,
          z_index: 0,
          style: JSON.stringify({
            borderRadius: 12,
            borderWidth: 0,
            borderColor: 'transparent',
          }),
          animation: JSON.stringify({ type: 'fade_in', duration_ms: 600, delay_ms: 200 }),
          visible: true,
          locked: false,
        });
      }

      // Title text element
      await base44.entities.SlideElement.create({
        slide_id: slide.id,
        presentation_id: presentation.id,
        pp_id: ppId,
        type: 'text',
        content: slideTitle,
        x: 80,
        y: 40,
        width: 1120,
        height: 80,
        rotation: 0,
        opacity: 100,
        z_index: zIndex++,
        style: JSON.stringify({
          fontSize: i === 0 ? 48 : 36,
          fontFamily: 'Poppins',
          color: colors.text,
          bold: true,
          italic: false,
          underline: false,
          align: 'center',
          backgroundColor: 'transparent',
          borderRadius: 0,
          borderWidth: 0,
          borderColor: 'transparent',
          padding: 0,
        }),
        animation: JSON.stringify({ type: 'fade_in', duration_ms: 500, delay_ms: 0 }),
        visible: true,
        locked: false,
      });

      // Body text element
      if (slideBody) {
        const bodyY = imageUrl ? 540 : 150;
        const bodyHeight = imageUrl ? 150 : 420;
        await base44.entities.SlideElement.create({
          slide_id: slide.id,
          presentation_id: presentation.id,
          pp_id: ppId,
          type: 'text',
          content: slideBody.substring(0, 1500),
          x: 80,
          y: bodyY,
          width: 1120,
          height: bodyHeight,
          rotation: 0,
          opacity: 100,
          z_index: zIndex++,
          style: JSON.stringify({
            fontSize: 18,
            fontFamily: 'Inter',
            color: '#e0e0e0',
            bold: false,
            italic: false,
            underline: false,
            align: 'left',
            backgroundColor: 'transparent',
            borderRadius: 0,
            borderWidth: 0,
            borderColor: 'transparent',
            padding: 0,
          }),
          animation: JSON.stringify({ type: 'fade_in', duration_ms: 500, delay_ms: 300 }),
          visible: true,
          locked: false,
        });
      }

      // Lower third element
      if (lowerThird) {
        await base44.entities.SlideElement.create({
          slide_id: slide.id,
          presentation_id: presentation.id,
          pp_id: ppId,
          type: 'lower_third',
          content: lowerThird,
          x: 40,
          y: 640,
          width: 800,
          height: 50,
          rotation: 0,
          opacity: 100,
          z_index: zIndex++,
          style: JSON.stringify({
            fontSize: 16,
            fontFamily: 'Inter',
            color: '#ffffff',
            bold: false,
            italic: false,
            underline: false,
            align: 'left',
            backgroundColor: colors.primary,
            borderRadius: 6,
            borderWidth: 0,
            borderColor: 'transparent',
            padding: 10,
          }),
          animation: JSON.stringify({ type: 'slide_in', duration_ms: 400, delay_ms: 600 }),
          visible: true,
          locked: false,
        });
      }

      // Section badge (for non-title slides)
      if (point?.suggested_segment && i > 0) {
        await base44.entities.SlideElement.create({
          slide_id: slide.id,
          presentation_id: presentation.id,
          pp_id: ppId,
          type: 'caption',
          content: point.suggested_segment,
          x: 80,
          y: 15,
          width: 200,
          height: 30,
          rotation: 0,
          opacity: 80,
          z_index: zIndex++,
          style: JSON.stringify({
            fontSize: 11,
            fontFamily: 'Inter',
            color: colors.primary,
            bold: true,
            italic: false,
            underline: false,
            align: 'left',
            backgroundColor: 'transparent',
            borderRadius: 0,
            borderWidth: 0,
            borderColor: 'transparent',
            padding: 0,
          }),
          animation: JSON.stringify({ type: 'fade_in', duration_ms: 300, delay_ms: 100 }),
          visible: true,
          locked: false,
        });
      }
    }

    // ── Update presentation with slide IDs + timeline ──
    const updated = await base44.entities.StoriesPresentation.update(presentation.id, {
      story_slide_ids: JSON.stringify(slideIds),
      slide_order: JSON.stringify(slideIds),
      master_timeline: JSON.stringify({
        events: masterTimelineEvents,
        total_duration_ms: currentTimeMs,
        slide_count: slideIds.length,
      }),
      presentation_metadata: JSON.stringify({
        title,
        production_profile: 'research',
        configuration_id,
        creator: user.full_name || user.email,
        creator_id: user.id,
        auto_built: true,
        generated_at: new Date().toISOString(),
        slide_count: slideIds.length,
        package_count: packages.length,
        dossier_count: dossiers.length,
      }),
      total_runtime_ms: currentTimeMs,
      story_count: slideIds.length,
      status: 'generated',
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      presentation_id: presentation.id,
      slide_count: slideIds.length,
      presentation: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});