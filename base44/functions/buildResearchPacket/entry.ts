import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-POC-001 — Packet Department
 *
 * Constructs the final Production Packet from all approved production assets.
 * Per the canonical specification:
 *   - Consumes all production assets from the Develop Department
 *   - Does NOT generate content — its responsibility is assembly
 *   - Creates individual StorySlide records
 *   - Creates the master StoriesPresentation entity
 *   - The generated presentation remains fully editable
 */

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { configuration_id, presentation_title } = body;

    if (!configuration_id) {
      return Response.json({ error: 'configuration_id is required' }, { status: 400 });
    }

    // ── Fetch all research points with packages for this configuration ──
    const points = await base44.asServiceRole.entities.ResearchPoint.filter(
      { configuration_id },
      'order'
    );

    if (!points || points.length === 0) {
      return Response.json({
        error: 'No research points found. Complete research and develop stages first.'
      }, { status: 400 });
    }

    // ── Fetch production packages for these points ──
    const pointIds = points.map(p => p.id);
    const allPackages = await base44.asServiceRole.entities.ProductionPackage.filter(
      { source_entity_type: 'ResearchPoint' },
      '-created_date',
      200
    );

    const packages = (allPackages || []).filter(pkg =>
      pointIds.includes(pkg.source_entity_id) &&
      (pkg.status === 'generated' || pkg.status === 'edited' || pkg.status === 'approved')
    );

    if (packages.length === 0) {
      return Response.json({
        error: 'No production packages found. Generate assets in the Develop stage first.'
      }, { status: 400 });
    }

    // ── Fetch topics and dossiers for packet metadata ──
    const topics = await base44.asServiceRole.entities.ResearchTopic.filter(
      { configuration_id },
      '-created_date'
    );

    const dossierIds = (topics || []).map(t => t.dossier_id).filter(Boolean);
    let dossiers = [];
    if (dossierIds.length > 0) {
      const allDossiers = await base44.asServiceRole.entities.ResearchDossier.filter(
        {},
        '-created_date',
        100
      );
      dossiers = (allDossiers || []).filter(d => dossierIds.includes(d.id) && d.status === 'ready');
    }

    // ── Check for existing presentation (idempotent) ──
    const existingPresentations = await base44.asServiceRole.entities.StoriesPresentation.filter(
      { production_profile: 'research' },
      '-created_date',
      10
    );

    const config = await base44.asServiceRole.entities.ResearchProductionConfiguration.get(configuration_id);
    const existingForConfig = (existingPresentations || []).find(p => {
      try {
        const meta = JSON.parse(p.presentation_metadata || '{}');
        return meta.configuration_id === configuration_id;
      } catch { return false; }
    });

    // ── Create the master StoriesPresentation ──
    const title = presentation_title || config?.production_name
      ? `${config.production_name} — Research Presentation`
      : `Research Presentation — ${new Date().toLocaleDateString()}`;

    let presentation;

    if (existingForConfig) {
      // Update existing presentation
      presentation = await base44.asServiceRole.entities.StoriesPresentation.update(
        existingForConfig.id,
        {
          title,
          story_package_ids: JSON.stringify(packages.map(p => p.id)),
          status: 'generated',
          presentation_metadata: JSON.stringify({
            title,
            production_profile: 'research',
            configuration_id,
            creator: user.full_name || user.email,
            creator_id: user.id,
            generated_at: new Date().toISOString(),
            package_count: packages.length,
            dossier_count: dossiers.length,
          }),
        }
      );
    } else {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.create({
        title,
        production_profile: 'research',
        story_package_ids: JSON.stringify(packages.map(p => p.id)),
        story_slide_ids: JSON.stringify([]),
        master_timeline: JSON.stringify({ events: [], total_duration_ms: 0 }),
        presentation_metadata: JSON.stringify({
          title,
          production_profile: 'research',
          configuration_id,
          creator: user.full_name || user.email,
          creator_id: user.id,
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
        status: 'generated',
        story_count: packages.length,
        completed_at: new Date().toISOString(),
      });
    }

    // ── Delete old slides for this presentation (if updating) ──
    const oldSlides = await base44.asServiceRole.entities.StorySlide.filter(
      { stories_presentation_id: presentation.id },
      'story_order'
    );
    if (oldSlides && oldSlides.length > 0) {
      await Promise.all(oldSlides.map(s =>
        base44.asServiceRole.entities.StorySlide.delete(s.id)
      ));
    }

    // ── Create StorySlides for each package ──
    const slideIds = [];
    let currentTimeMs = 0;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const point = points.find(p => p.id === pkg.source_entity_id);

      const slideMetadata = {
        headline: point?.title || pkg.headline_suggestions || `Slide ${i + 1}`,
        story_summary: pkg.story_summary || point?.content?.substring(0, 200) || '',
        duration_ms: 0,
        scene_count: 1,
        element_count: 0,
        voice_package_reference: pkg.voice_package_id || null,
        source_point_id: point?.id || null,
        source_point_type: point?.point_type || 'finding',
      };

      const sceneGraph = {
        presentation_scenes: [{
          scene_id: `scene_${i + 1}`,
          layers: [{
            layer_id: 'background',
            elements: [{
              element_id: 'headline',
              type: 'text',
              content: slideMetadata.headline,
              position: { x: 50, y: 15, unit: '%' },
              style: { fontSize: 'large', fontWeight: 'bold' },
            }, {
              element_id: 'script',
              type: 'text',
              content: pkg.teleprompter_script || '',
              position: { x: 50, y: 50, unit: '%' },
              style: { fontSize: 'medium' },
            }],
          }],
          timeline_events: [],
          camera_state: { zoom: 1.0, pan: { x: 0, y: 0 } },
          motion_state: { active: false },
        }],
        camera_state: { zoom: 1.0, pan: { x: 0, y: 0 } },
        motion_state: { active: false },
        synchronization_data: { voice_package_id: pkg.voice_package_id || null },
        playback_instructions: { auto_advance: true, transition: 'fade' },
      };

      const slide = await base44.asServiceRole.entities.StorySlide.create({
        stories_presentation_id: presentation.id,
        story_package_id: pkg.id,
        story_order: i,
        voice_package_id: pkg.voice_package_id || null,
        scene_graph: JSON.stringify(sceneGraph),
        slide_timeline: JSON.stringify({
          start_time: currentTimeMs,
          end_time: currentTimeMs,
          scene_boundaries: [{ scene_id: `scene_${i + 1}`, start: currentTimeMs, end: currentTimeMs }],
          element_entrances: [],
          element_exits: [],
        }),
        slide_metadata: JSON.stringify(slideMetadata),
        slide_start_ms: currentTimeMs,
        duration_ms: 0,
        status: 'generated',
        is_derived: false,
        version: 1,
      });

      slideIds.push(slide.id);
    }

    // ── Update the presentation with slide IDs ──
    presentation = await base44.asServiceRole.entities.StoriesPresentation.update(
      presentation.id,
      {
        story_slide_ids: JSON.stringify(slideIds),
        story_count: slideIds.length,
        completed_at: new Date().toISOString(),
      }
    );

    return Response.json({
      presentation,
      slides_created: slideIds.length,
      slide_ids: slideIds,
      packages_included: packages.length,
      dossiers_included: dossiers.length,
      packet_contents: {
        stories_presentation: presentation,
        story_slides: slideIds,
        production_packages: packages.map(p => p.id),
        research_dossiers: dossiers.map(d => d.id),
        research_topics: (topics || []).map(t => t.id),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});