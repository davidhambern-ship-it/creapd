import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * PP-ARCH-001: Universal Production Department Pipeline Orchestrator
 *
 * Runs or advances the 5-department pipeline for any production profile:
 *   Discovery → Knowledge → Blueprint → Production → Assembly
 *
 * Each department performs exactly one transformation.
 * Every department output becomes the next department's input.
 *
 * Usage:
 *   POST /functions/runDepartmentPipeline
 *   {
 *     action: "init" | "advance" | "advance_to" | "get_status" | "set_status",
 *     production_profile: "music" | "talk" | "cooking" | ...,
 *     configuration_id: "...",
 *     production_name: "..." (for init),
 *     target_department: "discovery" | "knowledge" | ... (for advance_to / set_status),
 *     department_status: "pending" | "in_progress" | "approved" | "skipped" (for set_status),
 *     department_output: "..." (for set_status)
 *   }
 */

const DEPARTMENTS = ['discovery', 'knowledge', 'blueprint', 'production', 'assembly'];

const PROFILE_BUILD_FUNCTIONS = {
  music: 'buildMusicProduction',
  talk: 'buildTalkProduction',
  cooking: 'buildCookingProduction',
  sports: 'buildSportsProduction',
  cosmo: 'buildCosmoProduction',
  spiritual: 'buildSpiritualProduction',
  news: 'buildNewsProduction',
  research: 'buildResearchProduction',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      action,
      production_profile,
      configuration_id,
      production_name,
      target_department,
      department_status,
      department_output,
    } = body;

    if (!production_profile || !configuration_id) {
      return Response.json({ error: 'production_profile and configuration_id are required' }, { status: 400 });
    }

    // Find existing pipeline record
    const existing = await base44.asServiceRole.entities.ProductionDepartment.filter({
      production_profile,
      configuration_id,
    });

    let pipeline = existing && existing.length > 0 ? existing[0] : null;

    // ── INIT ──────────────────────────────────────────────
    if (action === 'init') {
      if (pipeline) {
        return Response.json({ pipeline, message: 'Pipeline already exists' });
      }
      pipeline = await base44.asServiceRole.entities.ProductionDepartment.create({
        production_profile,
        configuration_id,
        production_name: production_name || '',
        current_department: 'discovery',
        discovery_status: 'pending',
        knowledge_status: 'pending',
        blueprint_status: 'pending',
        production_status: 'pending',
        assembly_status: 'pending',
        pipeline_status: 'not_started',
        pipeline_progress: 0,
      });
      return Response.json({ pipeline, message: 'Pipeline initialized' });
    }

    if (!pipeline) {
      return Response.json({ error: 'Pipeline not found. Call init first.' }, { status: 404 });
    }

    // ── GET STATUS ─────────────────────────────────────────
    if (action === 'get_status') {
      return Response.json({ pipeline });
    }

    // ── SET STATUS ─────────────────────────────────────────
    if (action === 'set_status') {
      if (!target_department || !department_status) {
        return Response.json({ error: 'target_department and department_status are required for set_status' }, { status: 400 });
      }
      const statusField = `${target_department}_status`;
      const updates = { [statusField]: department_status };
      if (department_output) {
        updates[`${target_department}_output`] = department_output;
      }
      if (department_status === 'approved') {
        updates[`${target_department}_completed_at`] = new Date().toISOString();
      }

      // Update current department to the next one if this one was approved
      const deptIdx = DEPARTMENTS.indexOf(target_department);
      if (department_status === 'approved' && deptIdx < DEPARTMENTS.length - 1) {
        updates.current_department = DEPARTMENTS[deptIdx + 1];
      }

      // Recalculate pipeline progress
      updates.pipeline_progress = calculateProgress(updates, pipeline);
      updates.pipeline_status = updates.pipeline_progress >= 100 ? 'completed' : 'in_progress';
      if (department_status === 'in_progress' && pipeline.pipeline_status === 'not_started') {
        updates.pipeline_status = 'in_progress';
      }

      pipeline = await base44.asServiceRole.entities.ProductionDepartment.update(pipeline.id, updates);
      return Response.json({ pipeline });
    }

    // ── ADVANCE ────────────────────────────────────────────
    if (action === 'advance' || action === 'advance_to') {
      const target = action === 'advance_to' ? target_department : pipeline.current_department;
      if (!target) {
        return Response.json({ error: 'No target department specified' }, { status: 400 });
      }

      const statusField = `${target}_status`;
      const updates = {
        [statusField]: 'in_progress',
        current_department: target,
        pipeline_status: 'in_progress',
      };

      // Trigger the profile's build function if it exists
      const buildFn = PROFILE_BUILD_FUNCTIONS[production_profile];
      if (buildFn) {
        try {
          await base44.functions.invoke(buildFn, { configuration_id });
        } catch (buildErr) {
          // Build failed — mark department as failed
          updates[statusField] = 'pending';
          updates.pipeline_status = 'failed';
          updates.last_error = buildErr.message;
          updates.last_error_department = target;
          pipeline = await base44.asServiceRole.entities.ProductionDepartment.update(pipeline.id, updates);
          return Response.json({ error: 'Build function failed', details: buildErr.message, pipeline }, { status: 500 });
        }
      }

      // Mark as approved (the build function completed)
      updates[statusField] = 'approved';
      updates[`${target}_completed_at`] = new Date().toISOString();

      // Advance current_department to next
      const deptIdx = DEPARTMENTS.indexOf(target);
      if (deptIdx < DEPARTMENTS.length - 1) {
        updates.current_department = DEPARTMENTS[deptIdx + 1];
      } else {
        updates.pipeline_status = 'completed';
      }

      updates.pipeline_progress = calculateProgress(updates, pipeline);
      if (updates.pipeline_progress >= 100) {
        updates.pipeline_status = 'completed';
      }

      pipeline = await base44.asServiceRole.entities.ProductionDepartment.update(pipeline.id, updates);
      return Response.json({ pipeline });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateProgress(updates, pipeline) {
  let approved = 0;
  for (const dept of DEPARTMENTS) {
    const statusField = `${dept}_status`;
    const status = updates[statusField] || pipeline[statusField] || 'pending';
    if (status === 'approved' || status === 'skipped') approved++;
  }
  return Math.round((approved / DEPARTMENTS.length) * 100);
}