import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §12 — Entity Automation: QualityReport → Pass Handler
 *
 * Fires when a QualityReport's status is updated to "pass" by the
 * Controller Decision Engine. Checks whether ALL ResearchPoints for
 * the associated topic now have QA-passed packages. If so, triggers
 * packet assembly via rppAutoAdvance (resume_from: 'assembling').
 *
 * This is the event-driven department handoff: the pipeline auto-resumes
 * the moment the last QA report passes, without producer intervention.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only act on QualityReport status === 'pass'
    if (!data || data.status !== 'pass') {
      return Response.json({ skipped: true, reason: 'QualityReport status is not pass' });
    }

    // Only handle ProductionPackage assets (research points)
    if (data.asset_type !== 'ProductionPackage') {
      return Response.json({ skipped: true, reason: `Asset type ${data.asset_type} not handled by this automation` });
    }

    const pointId = data.asset_id;
    if (!pointId) {
      return Response.json({ skipped: true, reason: 'No asset_id on QualityReport' });
    }

    // Find the ResearchPoint
    const point = await base44.asServiceRole.entities.ResearchPoint.get(pointId);
    if (!point) {
      return Response.json({ skipped: true, reason: 'ResearchPoint not found' });
    }

    const topicId = point.topic_id;
    if (!topicId) {
      return Response.json({ skipped: true, reason: 'ResearchPoint has no topic_id' });
    }

    // Get all used points for this topic (used = has a package)
    const allPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
      { topic_id: topicId, status: 'used' },
      'order'
    );

    if (!allPoints || allPoints.length === 0) {
      return Response.json({ skipped: true, reason: 'No used points found for topic' });
    }

    // Check if all points have QA-passed packages
    const pointIds = allPoints.map(p => p.id);
    const passedReports = await base44.asServiceRole.entities.QualityReport.filter({
      production_id: topicId,
      asset_type: 'ProductionPackage',
      status: 'pass',
    });

    const passedPointIds = new Set(
      (passedReports || []).map(r => r.asset_id)
    );

    const allPassed = pointIds.every(id => passedPointIds.has(id));

    if (!allPassed) {
      return Response.json({
        skipped: true,
        reason: 'Not all points have QA-passed packages yet',
        points_total: pointIds.length,
        points_passed: passedPointIds.size,
      });
    }

    // All points passed QA — trigger packet assembly
    const topic = await base44.asServiceRole.entities.ResearchTopic.get(topicId);

    // Don't trigger if already assembling or complete
    if (topic?.pipeline_stage === 'assembling' || topic?.pipeline_stage === 'complete') {
      return Response.json({
        skipped: true,
        reason: `Topic already at stage: ${topic.pipeline_stage}`,
      });
    }

    await base44.asServiceRole.entities.ResearchTopic.update(topicId, {
      pipeline_stage: 'assembling',
    });

    // Fire-and-forget — resume the pipeline from the assembling stage
    base44.asServiceRole.functions.invoke('rppAutoAdvance', {
      topic_id: topicId,
      resume_from: 'assembling',
    }).catch(err => {
      console.error('rppAutoAdvance resume failed:', err.message);
    });

    return Response.json({
      success: true,
      topic_id: topicId,
      all_points_passed: true,
      assembly_triggered: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});