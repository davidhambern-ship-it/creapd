import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * RPP-AI-001 §12 — Automated Pipeline Orchestrator (v3)
 *
 * Implements event-driven department handoffs:
 *
 *   Dossier Dept  →  Develop Dept  →  Packet Dept
 *   (dossier_qa)     (building+qa)     (assembling)
 *
 * The pipeline pauses at each QA gate. The onQualityReportPass
 * automation resumes it when the Controller marks the asset as "pass".
 *
 * Stages:
 *   approving       → auto-approve pending research points
 *   dossier_qa      → run QA on the dossier via dispatchWorker → PAUSE
 *                     (onQualityReportPass resumes from develop_planning)
 *   develop_planning→ run developPlanningWorker + build packages + QA each → PAUSE
 *                     (onQualityReportPass resumes from assembling)
 *   assembling      → run packetAssemblyWorker + buildResearchPacket → complete
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

      // If topic has a dossier, run QA on it (Dossier → Develop gate)
      if (topic.dossier_id) {
        stage = 'dossier_qa';
      } else {
        // No dossier — skip directly to develop
        stage = 'develop_planning';
      }
    }

    // ═══ Stage 2: Dossier QA (Dossier Department exit gate) ═══
    if (stage === 'dossier_qa') {
      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'dossier_qa' });

      // Check if dossier already has a passed QualityReport
      const existingReports = await base44.asServiceRole.entities.QualityReport.filter({
        asset_id: topic.dossier_id,
        asset_type: 'ResearchDossier',
        status: 'pass',
      });

      if (existingReports && existingReports.length > 0) {
        // Dossier already passed QA — proceed to Develop
        stage = 'develop_planning';
      } else {
        // Run QA on the dossier via dispatchWorker
        const dossier = await base44.asServiceRole.entities.ResearchDossier.get(topic.dossier_id);
        if (!dossier) {
          // Dossier missing — skip QA
          stage = 'develop_planning';
        } else {
          const dossierContent = dossier.executive_summary || dossier.research_query || JSON.stringify(dossier);
          try {
            await base44.asServiceRole.functions.invoke('dispatchWorker', {
              worker_id: 'dossier_organizer',
              department: 'dossier',
              pre_generated_content: dossierContent,
              asset_id: topic.dossier_id,
              asset_type: 'ResearchDossier',
              production_id: topic_id,
              quality_mode: 'standard',
            });
          } catch (qaErr) {
            console.error('Dossier QA failed:', qaErr.message);
          }

          // Pause — onQualityReportPass will resume from develop_planning
          return Response.json({
            success: true,
            topic_id,
            stage: 'dossier_qa',
            message: 'Dossier QA submitted. Pipeline will auto-advance to Develop when Controller passes it.',
          });
        }
      }
    }

    // ═══ Stage 3: Develop Planning + Package Building + Per-package QA ═══
    if (stage === 'develop_planning' || stage === 'building' || stage === 'qa') {
      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'building' });

      const buildConfig = {
        tone: config?.tone || 'educational',
        reading_style: config?.reading_style || 'documentary',
        audience: config?.target_audience || 'General Public',
        target_runtime: config?.total_show_runtime ? `${config.total_show_runtime} minutes` : '1 Minute',
      };

      // ── Run developPlanningWorker to create presentation structure ──
      let presentationPlan = null;
      if (topic.dossier_id) {
        try {
          const dossier = await base44.asServiceRole.entities.ResearchDossier.get(topic.dossier_id);
          const planRes = await base44.asServiceRole.functions.invoke('developPlanningWorker', {
            dossier: JSON.stringify({
              executive_summary: dossier?.executive_summary,
              key_facts: dossier?.key_facts,
              context_and_background: dossier?.context_and_background,
              timeline: dossier?.timeline,
              coverage_angles: dossier?.coverage_angles,
            }),
            configuration_id: topic.configuration_id,
            target_slide_count: 10,
          });
          presentationPlan = planRes?.data?.presentation_points || planRes?.presentation_points || null;
        } catch (err) {
          console.error('developPlanningWorker failed:', err.message);
        }
      }

      // ── Build packages for each point + run QA ──
      const allPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
        { topic_id }, 'order'
      );

      const pointsToBuild = allPoints.filter(p =>
        p.status === 'approved' || (p.status === 'used' && !p.package_id)
      );

      for (const point of pointsToBuild) {
        try {
          const buildRes = await base44.asServiceRole.functions.invoke('buildResearchProduction', {
            research_point_id: point.id,
            tone: buildConfig.tone,
            reading_style: buildConfig.reading_style,
            audience: buildConfig.audience,
            target_runtime: buildConfig.target_runtime,
          });
          const pkg = buildRes?.data?.package || buildRes?.package;
          if (!pkg) continue;

          // Run QA on the package via dispatchWorker
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
            console.error('Package QA failed for point', point.id, qaErr.message);
          }
        } catch (err) {
          console.error('Build failed for point', point.id, err.message);
        }
      }

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
        // Pause — onQualityReportPass will resume from assembling
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
          message: 'Develop Department: packages built, waiting for QA. Packet assembly auto-triggers when all pass.',
        });
      }

      stage = 'assembling';
    }

    // ═══ Stage 4: Packet Assembly ═══
    if (stage === 'assembling') {
      await base44.asServiceRole.entities.ResearchTopic.update(topic_id, { pipeline_stage: 'assembling' });

      // ── Run packetAssemblyWorker ──
      let assemblyMap = null;
      try {
        const usedPoints = await base44.asServiceRole.entities.ResearchPoint.filter(
          { topic_id, status: 'used' }, 'order'
        );
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