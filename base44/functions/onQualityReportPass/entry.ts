import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §12 — Entity Automation: Department Handoff Router
 *
 * Fires when a QualityReport's status is updated to "pass" by the
 * Controller Decision Engine. Routes the asset to the next department:
 *
 *   ResearchDossier    pass → resume rppAutoAdvance from 'develop_planning' (Dossier → Develop)
 *   ProductionPackage  pass → check all passed → resume from 'assembling'  (Develop → Packet)
 *
 * This is the event-driven department handoff: assets move to the next
 * department the moment the Controller approves them.
 */

const DEPARTMENT_HANDOFF = {
  ResearchDossier: {
    resume_from: 'develop_planning',
    description: 'Dossier passed QA → advancing to Develop Department',
  },
  ProductionPackage: {
    resume_from: 'assembling',
    description: 'Package passed QA → checking if all passed before Packet Department',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data || data.status !== 'pass') {
      return Response.json({ skipped: true, reason: 'QualityReport status is not pass' });
    }

    const handoff = DEPARTMENT_HANDOFF[data.asset_type];
    if (!handoff) {
      return Response.json({ skipped: true, reason: `Asset type ${data.asset_type} has no department handoff` });
    }

    // ── Find the topic associated with this QualityReport ──
    let topicId = data.production_id;

    // For ProductionPackage, asset_id is the ResearchPoint ID
    if (!topicId && data.asset_type === 'ProductionPackage' && data.asset_id) {
      const point = await base44.asServiceRole.entities.ResearchPoint.get(data.asset_id);
      if (!point) {
        return Response.json({ skipped: true, reason: 'ResearchPoint not found' });
      }
      topicId = point.topic_id;
    }

    if (!topicId) {
      return Response.json({ skipped: true, reason: 'Could not determine topic_id for this QualityReport' });
    }

    // ── For ProductionPackage: verify ALL points have passed QA ──
    if (data.asset_type === 'ProductionPackage') {
      const allPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id: topicId, status: 'used' }, 'order'
      );
      const pointIds = (allPoints || []).map(p => p.id);

      const passedReports = await base44.asServiceRole.entities.QualityReport.filter({
        production_id: topicId,
        asset_type: 'ProductionPackage',
        status: 'pass',
      });
      const passedPointIds = new Set((passedReports || []).map(r => r.asset_id));
      const allPassed = pointIds.length > 0 && pointIds.every(id => passedPointIds.has(id));

      if (!allPassed) {
        return Response.json({
          skipped: true,
          reason: 'Not all packages have passed QA yet',
          qa_passed: passedPointIds.size,
          qa_total: pointIds.length,
        });
      }
    }

    // ── Check topic isn't already complete or assembling ──
    const topic = await base44.asServiceRole.entities.ResearchTopic.get(topicId);
    if (topic?.pipeline_stage === 'complete' || topic?.pipeline_stage === 'assembling') {
      return Response.json({
        skipped: true,
        reason: `Topic already at stage: ${topic?.pipeline_stage}`,
      });
    }

    // ── Resume the pipeline from the appropriate stage ──
    base44.asServiceRole.functions.invoke('rppAutoAdvance', {
      topic_id: topicId,
      resume_from: handoff.resume_from,
    }).catch(err => {
      console.error('rppAutoAdvance resume failed:', err.message);
    });

    return Response.json({
      success: true,
      topic_id: topicId,
      asset_type: data.asset_type,
      handoff: handoff.description,
      resume_from: handoff.resume_from,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});