import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §12 — Automated Pipeline Orchestrator
 *
 * Fires automatically after extractResearchPoints completes.
 * Chains the remaining stages without producer intervention:
 *
 *   1. Auto-approve pending research points
 *   2. For each approved point → buildResearchProduction (generates ProductionPackage)
 *   3. buildResearchPacket (assembles StoriesPresentation + StorySlides)
 *   4. Update topic status → 'packet_ready'
 *
 * Per §12, department handoffs are operational decisions that do not
 * require creative judgment — only the Research Assignment (§4) and
 * final presentation approval (§8) require the producer.
 */

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { topic_id } = await req.json();
    if (!topic_id) return Response.json({ error: 'topic_id is required' }, { status: 400 });

    // ── Fetch topic + config ──
    const topic = await base44.asServiceRole.entities.ResearchTopic.get(topic_id);
    if (!topic) return Response.json({ error: 'ResearchTopic not found' }, { status: 404 });

    const config = topic.configuration_id
      ? await base44.asServiceRole.entities.ResearchProductionConfiguration.get(topic.configuration_id)
      : null;

    // ── Stage 1: Auto-approve pending research points ──
    const pendingPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
      { topic_id, status: 'pending' },
      'order'
    );

    if (!pendingPoints || pendingPoints.length === 0) {
      // Maybe already approved — check
      const approvedPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id, status: 'approved' },
        'order'
      );
      if (!approvedPoints || approvedPoints.length === 0) {
        return Response.json({ error: 'No research points found for this topic' }, { status: 400 });
      }
    } else {
      // Batch approve: pending → approved
      const pointIds = pendingPoints.map(p => p.id);
      await base44.asServiceRole.entities.ResearchPoint.updateMany(
        { topic_id, status: 'pending' },
        { $set: { status: 'approved', is_selected: true } }
      );
    }

    // ── Stage 2: Generate ProductionPackage for each approved point ──
    const approvedPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
      { topic_id, status: 'approved' },
      'order'
    );

    const buildConfig = {
      tone: config?.tone || 'educational',
      reading_style: config?.reading_style || 'documentary',
      audience: config?.target_audience || 'General Public',
      target_runtime: config?.total_show_runtime ? `${config.total_show_runtime} minutes` : '1 Minute',
    };

    let packagesBuilt = 0;
    const buildErrors = [];

    for (const point of approvedPoints) {
      // Skip if this point already has a package
      if (point.package_id && point.status === 'used') {
        packagesBuilt++;
        continue;
      }
      try {
        const res = await base44.functions.invoke('buildResearchProduction', {
          research_point_id: point.id,
          tone: buildConfig.tone,
          reading_style: buildConfig.reading_style,
          audience: buildConfig.audience,
          target_runtime: buildConfig.target_runtime,
        });
        if (res?.data?.package || res?.package) {
          packagesBuilt++;
        }
      } catch (err) {
        buildErrors.push({ point_id: point.id, title: point.title, error: err.message });
      }
    }

    if (packagesBuilt === 0) {
      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, {
        status: 'failed',
      });
      return Response.json({
        error: 'All production package builds failed',
        build_errors: buildErrors,
      }, { status: 500 });
    }

    // ── Stage 3: Assemble the Production Packet ──
    let presentation = null;
    try {
      const packetRes = await base44.functions.invoke('buildResearchPacket', {
        configuration_id: topic.configuration_id,
        presentation_title: `${config?.production_name || topic.title} — Research Presentation`,
      });
      presentation = packetRes?.data?.presentation || packetRes?.presentation || null;
    } catch (err) {
      buildErrors.push({ stage: 'packet_assembly', error: err.message });
    }

    // ── Stage 4: Update topic status ──
    await base44.asServiceRole.entities.ResearchTopic.update(topic_id, {
      status: presentation ? 'packet_ready' : 'developed',
    });

    return Response.json({
      success: true,
      topic_id,
      points_approved: approvedPoints.length,
      packages_built: packagesBuilt,
      presentation_id: presentation?.id || null,
      build_errors: buildErrors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});