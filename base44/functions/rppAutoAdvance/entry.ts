import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §12 — Automated Pipeline Orchestrator (v2)
 *
 * Chains the remaining stages after extractResearchPoints:
 *
 *   Stage 1: Auto-approve pending research points
 *   Stage 2: Build ProductionPackage per point (buildResearchProduction)
 *            → Run QA via dispatchWorker (Review → QA Worker → QualityReport → Controller)  [#1]
 *   Stage 3: Verify all QA passed → pause if not (entity automation resumes when ready)     [#2]
 *   Stage 4: packetAssemblyWorker creates the assembly map                                  [#3]
 *   Stage 5: buildResearchPacket assembles the final StoriesPresentation + StorySlides
 *
 * Resume/Recovery [#4]: Each stage updates topic.pipeline_stage. If the function
 * fails or is re-invoked, it resumes from the last incomplete stage.
 *
 * Manual approval remains enforced at Research Assignment (§4) and Final
 * Presentation (§8) per project specifications.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { topic_id, resume_from } = await req.json();
    if (!topic_id) return Response.json({ error: 'topic_id is required' }, { status: 400 });

    const topic = await base44.asServiceRole.entities.ResearchTopic.get(topic_id);
    if (!topic) return Response.json({ error: 'ResearchTopic not found' }, { status: 404 });

    const config = topic.configuration_id
      ? await base44.asServiceRole.entities.ResearchProductionConfiguration.get(topic.configuration_id)
      : null;

    // ── Resume logic (#4): pick up from the last stage ──
    let stage = resume_from || topic.pipeline_stage || 'approving';
    if (stage === 'idle') stage = 'approving';
    if (stage === 'complete') {
      return Response.json({ success: true, topic_id, stage: 'complete', message: 'Pipeline already complete' });
    }

    // ═══ Stage 1: Approve pending points ═══
    if (stage === 'approving') {
      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'approving' });

      const pendingPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id, status: 'pending' }, 'order'
      );
      if (pendingPoints && pendingPoints.length > 0) {
        await base44.asServiceRole.entities.ResearchPoint.updateMany(
          { topic_id, status: 'pending' },
          { $set: { status: 'approved', is_selected: true } }
        );
      }
      stage = 'building';
    }

    // ═══ Stage 2: Build packages + run QA (#1) ═══
    if (stage === 'building' || stage === 'qa') {
      const buildConfig = {
        tone: config?.tone || 'educational',
        reading_style: config?.reading_style || 'documentary',
        audience: config?.target_audience || 'General Public',
        target_runtime: config?.total_show_runtime ? `${config.total_show_runtime} minutes` : '1 Minute',
      };

      const allPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id }, 'order'
      );

      // Points that still need packages built
      const pointsToBuild = allPoints.filter(p =>
        p.status === 'approved' || (p.status === 'used' && !p.package_id)
      );

      if (pointsToBuild.length > 0) {
        await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'building' });

        for (const point of pointsToBuild) {
          try {
            // Build production package (multi-model synthesis)
            const buildRes = await base44.asServiceRole.functions.invoke('buildResearchProduction', {
              research_point_id: point.id,
              tone: buildConfig.tone,
              reading_style: buildConfig.reading_style,
              audience: buildConfig.audience,
              target_runtime: buildConfig.target_runtime,
            });
            const pkg = buildRes?.data?.package || buildRes?.package;
            if (!pkg) continue;

            // ── Run QA via dispatchWorker (#1) ──
            // Pass the generated script as pre_generated_content to skip the
            // Generation Worker stage and go straight to Review → QA → QualityReport → Controller.
            // This creates a QualityReport and ControllerLog for every package.
            await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'qa' });
            try {
              await base44.asServiceRole.functions.invoke('dispatchWorker', {
                worker_id: 'develop_script',
                department: 'develop',
                pre_generated_content: pkg.teleprompter_script || pkg.story_summary || JSON.stringify(pkg),
                asset_id: point.id,
                asset_type: 'ProductionPackage',
                production_id: topic_id,
                quality_mode: 'standard',
              });
            } catch (qaErr) {
              // QA failure doesn't block — Controller may have routed to revision.
              // The point still has a package; the assembling stage checks QA status.
              console.error('QA failed for point', point.id, qaErr.message);
            }
          } catch (err) {
            console.error('Build failed for point', point.id, err.message);
          }
        }
      }

      stage = 'assembling';
    }

    // ═══ Stage 3: Verify QA status before assembling ═══
    if (stage === 'assembling') {
      // Check if all used points have QA-passed packages
      const usedPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id, status: 'used' }, 'order'
      );

      const pointIds = usedPoints.map(p => p.id);
      const passedReports = await base44.asServiceRole.entities.QualityReport.filter({
        production_id: topic_id,
        asset_type: 'ProductionPackage',
        status: 'pass',
      });
      const passedIds = new Set((passedReports || []).map(r => r.asset_id));
      const allQA = pointIds.length > 0 && pointIds.every(id => passedIds.has(id));

      if (!allQA) {
        // Not all QA passed — pause here.
        // The entity automation (#2) will resume the pipeline via onQualityReportPass
        // when the last QualityReport status changes to 'pass'.
        await base44.asServiceRole.entities.ResearchTopic.update(topic_id, {
          pipeline_stage: 'qa',
          status: 'in_review',
        });
        return Response.json({
          success: true,
          topic_id,
          stage: 'qa_pending',
          qa_passed: passedIds.size,
          qa_total: pointIds.length,
          message: 'Waiting for QA. Assembly auto-triggers when all reports pass.',
        });
      }

      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'assembling' });

      // ── Run packetAssemblyWorker (#3) ──
      // Creates the assembly map: which assets go on which slide.
      let assemblyMap = null;
      try {
        const packages = [];
        for (const pt of usedPoints) {
          if (pt.package_id) {
            try {
              const pkg = await base44.asServiceRole.entities.ProductionPackage.get(pt.package_id);
              if (pkg) packages.push(pkg);
            } catch {}
          }
        }

        const assemblyRes = await base44.asServiceRole.functions.invoke('packetAssemblyWorker', {
          configuration_id: topic.configuration_id,
          presentation_points: usedPoints.map(p => ({
            title: p.title,
            key_message: p.significance || '',
            content_summary: p.content || '',
            section: p.suggested_segment || 'Feature',
            order: p.order || 0,
          })),
          scripts: packages.map(p => ({
            point_id: p.source_entity_id,
            teleprompter_script: p.teleprompter_script || '',
            talking_points: p.talking_points || '',
          })),
        });
        assemblyMap = assemblyRes?.data?.assembly_map || assemblyRes?.assembly_map || null;
      } catch (err) {
        // Assembly worker is optional — buildResearchPacket can assemble without it
        console.error('packetAssemblyWorker failed:', err.message);
      }

      // ── Build the final packet ──
      let presentation = null;
      try {
        const packetRes = await base44.asServiceRole.functions.invoke('buildResearchPacket', {
          configuration_id: topic.configuration_id,
          presentation_title: `${config?.production_name || topic.title} — Research Presentation`,
        });
        presentation = packetRes?.data?.presentation || packetRes?.presentation || null;
      } catch (err) {
        await base44.asServiceRole.entities.ResearchTopic.update(topic_id, {
          pipeline_stage: 'failed',
          status: 'rejected',
        });
        return Response.json({ error: 'Packet assembly failed', detail: err.message }, { status: 500 });
      }

      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, {
        pipeline_stage: 'complete',
        status: 'packet_ready',
      });

      return Response.json({
        success: true,
        topic_id,
        stage: 'complete',
        presentation_id: presentation?.id || null,
        assembly_map_slides: assemblyMap?.length || 0,
      });
    }

    return Response.json({ success: true, topic_id, stage, message: 'Pipeline stage: ' + stage });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});