import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * CREAPD Controller Decision Engine — CTRL-001
 *
 * Implements the deterministic decision pipeline defined in the
 * Controller Decision Engine Specification.
 *
 * The Controller never evaluates the production asset itself.
 * It evaluates only the standardized Quality Report returned by the QA Worker.
 *
 * Pipeline (Sections 5-16):
 *   1. Receive Quality Report
 *   2. Validate Report
 *   3. Evaluate Overall Threshold
 *   4. Evaluate Critical Categories
 *   5. Evaluate Revision Count
 *   6. Evaluate Confidence
 *   7. Analyze Recommendations & Route to Worker
 *   8. Determine Action
 *   9. Execute Workflow (log + update report status)
 */

// ── Thresholds (mirrors src/lib/creapd/controllerConstants.js) ──────────────

const QUALITY_MODE_THRESHOLDS = {
  draft: 75,
  standard: 85,
  professional: 92,
  broadcast: 97,
};

const CRITICAL_CATEGORIES = {
  accuracy: 95,
  technical_integrity: 95,
  copyright_compliance: 100,
  copyright: 100,
  accessibility: 85,
  brand_consistency: 90,
  educational_value: 90,
};

const MIN_CONFIDENCE = 85;
const DEFAULT_MAX_ITERATIONS = 5;

const DECISIONS = {
  PASS: 'pass',
  REVISE: 'revise',
  ESCALATE: 'escalate',
  PRODUCER_REVIEW: 'producer_review',
  INVALID_REPORT: 'invalid_report',
};

const WORKER_ROUTING = {
  PresentationPoint: 'Research Worker',
  StorySlide: 'StorySlide Worker',
  PresentationScript: 'Script Worker',
  ImageAsset: 'Image Worker',
  VoicePackage: 'Voice Worker',
  VideoAsset: 'Video Worker',
  Layout: 'Layout Worker',
  ProductionPackage: 'Packet Worker',
};

const RECOMMENDATION_KEYWORD_ROUTING = [
  { keywords: ['image', 'visual quality', 'resolution', 'artifact'], worker: 'Image Worker' },
  { keywords: ['narration', 'voice', 'wpm', 'runtime', 'pacing', 'speech'], worker: 'Voice Worker' },
  { keywords: ['layout', 'hierarchy', 'whitespace', 'eye flow', 'balance'], worker: 'Layout Worker' },
  { keywords: ['script', 'redundancy', 'tone', 'wording', 'narrative'], worker: 'Script Worker' },
  { keywords: ['research', 'statistic', 'fact', 'citation', 'missing data'], worker: 'Research Worker' },
  { keywords: ['slide', 'storyslide', 'point'], worker: 'StorySlide Worker' },
  { keywords: ['video', 'motion', 'synchronization', 'animation'], worker: 'Video Worker' },
];

// ── Helper Functions ────────────────────────────────────────────────────────

function routeRecommendation(assetType, recommendationText) {
  const typeWorker = WORKER_ROUTING[assetType];
  if (typeWorker) return typeWorker;
  const lower = (recommendationText || '').toLowerCase();
  for (const route of RECOMMENDATION_KEYWORD_ROUTING) {
    if (route.keywords.some(kw => lower.includes(kw))) return route.worker;
  }
  return typeWorker || 'Generation Worker';
}

function validateQualityReport(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['Quality Report is not a valid object.'] };
  }

  const requiredFields = ['asset_id', 'asset_type', 'overall_score', 'status'];
  for (const field of requiredFields) {
    if (report[field] === undefined || report[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (typeof report.overall_score !== 'number' || report.overall_score < 0 || report.overall_score > 100) {
    errors.push('overall_score must be a number between 0 and 100.');
  }

  if (typeof report.confidence !== 'number' || report.confidence < 0 || report.confidence > 100) {
    errors.push('confidence must be a number between 0 and 100.');
  }

  if (!report.scores || typeof report.scores !== 'object') {
    errors.push('scores object is required.');
  }

  if (!report.classification) {
    errors.push('classification is required.');
  }

  if (report.review_iteration === undefined || typeof report.review_iteration !== 'number') {
    errors.push('review_iteration is required and must be a number.');
  }

  if (report.maximum_iterations === undefined || typeof report.maximum_iterations !== 'number') {
    errors.push('maximum_iterations is required and must be a number.');
  }

  return { valid: errors.length === 0, errors };
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      quality_report_id,
      report,
      department,
      production_id,
      production_profile,
      advance_on_pass = false,
    } = body;

    if (!report) {
      return Response.json({ error: 'Quality Report (report) is required.' }, { status: 400 });
    }

    if (!department) {
      return Response.json({ error: 'department is required.' }, { status: 400 });
    }

    // Parse scores if it's a JSON string
    let scores = report.scores;
    if (typeof scores === 'string') {
      try { scores = JSON.parse(scores); } catch { scores = {}; }
    }
    if (!scores) scores = {};

    // Parse recommendations if it's a JSON string
    let recommendations = report.recommendations;
    if (typeof recommendations === 'string') {
      try { recommendations = JSON.parse(recommendations); } catch { recommendations = []; }
    }
    if (!recommendations) recommendations = [];

    const qualityMode = report.quality_mode || 'standard';
    const requiredThreshold = QUALITY_MODE_THRESHOLDS[qualityMode] || QUALITY_MODE_THRESHOLDS.standard;
    const overallScore = report.overall_score || 0;
    const confidence = report.confidence || 0;
    const currentIteration = report.review_iteration || 1;
    const maxIterations = report.maximum_iterations || DEFAULT_MAX_ITERATIONS;

    // ── Stage 1: Report Validation (Section 6) ──────────────────────────────
    const validation = validateQualityReport({ ...report, scores, recommendations });
    if (!validation.valid) {
      const decision = DECISIONS.INVALID_REPORT;
      const reason = `Invalid Quality Report: ${validation.errors.join('; ')}`;

      const logEntry = await base44.asServiceRole.entities.ControllerLog.create({
        timestamp: new Date().toISOString(),
        department,
        asset_id: report.asset_id || 'unknown',
        asset_type: report.asset_type || 'unknown',
        quality_report_id: quality_report_id || null,
        decision,
        reason,
        quality_score: overallScore,
        confidence,
        revision_count: currentIteration,
        assigned_worker: null,
        result: 'Quality Report returned to QA Worker for correction.',
        production_id: production_id || null,
        production_profile: production_profile || null,
      });

      // Update the QualityReport status if we have its ID
      if (quality_report_id) {
        await base44.asServiceRole.entities.QualityReport.update(quality_report_id, {
          status: 'escalate',
          controller_decision: JSON.stringify({ action: decision, reason, log_id: logEntry.id }),
        });
      }

      return Response.json({
        decision,
        reason,
        log_id: logEntry.id,
        action: 'return_to_qa_worker',
      });
    }

    // ── Stage 2: Overall Quality Threshold (Section 7) ──────────────────────
    let decision = DECISIONS.PASS;
    let reason = `Overall score ${overallScore} meets ${qualityMode} threshold (${requiredThreshold}).`;
    let failedCategories = [];

    if (overallScore < requiredThreshold) {
      decision = DECISIONS.REVISE;
      reason = `Overall score ${overallScore} is below ${qualityMode} threshold (${requiredThreshold}).`;
    }

    // ── Stage 3: Critical Category Evaluation (Section 8) ───────────────────
    for (const [category, minScore] of Object.entries(CRITICAL_CATEGORIES)) {
      const categoryScore = scores[category];
      if (categoryScore !== undefined && categoryScore !== null && typeof categoryScore === 'number') {
        if (categoryScore < minScore) {
          failedCategories.push({ category, score: categoryScore, min: minScore });
          if (decision !== DECISIONS.REVISE) {
            decision = DECISIONS.REVISE;
            reason = `Critical category "${category}" scored ${categoryScore} (minimum: ${minScore}).`;
          }
        }
      }
    }

    // ── Stage 4: Revision Cycle Evaluation (Section 9) ──────────────────────
    if (decision === DECISIONS.REVISE && currentIteration >= maxIterations) {
      decision = DECISIONS.ESCALATE;
      reason = `Maximum revisions (${maxIterations}) reached without passing. Escalating.`;
    }

    // ── Stage 5: Confidence Evaluation (Section 10) ─────────────────────────
    if (decision === DECISIONS.PASS && confidence < MIN_CONFIDENCE) {
      decision = DECISIONS.PRODUCER_REVIEW;
      reason = `Overall score passes (${overallScore}) but confidence (${confidence}) is below minimum (${MIN_CONFIDENCE}). Producer review recommended.`;
    }

    // If revision_required flag is set by QA Worker, force revise
    if (report.revision_required === true && decision === DECISIONS.PASS) {
      decision = DECISIONS.REVISE;
      reason = 'QA Worker flagged revision_required=true.';
    }

    // ── Stage 6: Recommendation Analysis & Worker Routing (Section 11-12) ────
    let assignedWorker = null;
    if (decision === DECISIONS.REVISE) {
      // Route based on the first recommendation, fall back to asset type
      const firstRec = recommendations[0];
      if (firstRec) {
        assignedWorker = routeRecommendation(report.asset_type, firstRec);
      } else {
        assignedWorker = WORKER_ROUTING[report.asset_type] || 'Generation Worker';
      }
    }

    // ── Stage 7: Determine Result Message ───────────────────────────────────
    let result;
    switch (decision) {
      case DECISIONS.PASS:
        result = `Asset approved. Advancing to next department.`;
        break;
      case DECISIONS.REVISE:
        result = `Revision routed to ${assignedWorker}. Surgical update only — unrelated assets preserved.`;
        break;
      case DECISIONS.ESCALATE:
        result = `Asset escalated. Automation paused pending intervention.`;
        break;
      case DECISIONS.PRODUCER_REVIEW:
        result = `Automation paused. Awaiting producer judgment.`;
        break;
      default:
        result = `Decision: ${decision}`;
    }

    // ── Stage 8: Log the Decision (Section 17) ──────────────────────────────
    const logEntry = await base44.asServiceRole.entities.ControllerLog.create({
      timestamp: new Date().toISOString(),
      department,
      asset_id: report.asset_id,
      asset_type: report.asset_type,
      quality_report_id: quality_report_id || null,
      decision,
      reason,
      quality_score: overallScore,
      confidence,
      revision_count: currentIteration,
      assigned_worker: assignedWorker,
      result,
      production_id: production_id || null,
      production_profile: production_profile || null,
    });

    // ── Stage 9: Update Quality Report & Execute Workflow ───────────────────
    const controllerDecision = {
      action: decision,
      reason,
      log_id: logEntry.id,
      assigned_worker: assignedWorker,
      failed_critical_categories: failedCategories,
      evaluated_at: new Date().toISOString(),
    };

    if (quality_report_id) {
      await base44.asServiceRole.entities.QualityReport.update(quality_report_id, {
        status: decision,
        controller_decision: JSON.stringify(controllerDecision),
        assigned_worker: assignedWorker,
      });
    }

    // If pass and advance_on_pass is requested, the caller handles advancement.
    // The Controller's job is to report the decision; the orchestrator acts on it.

    return Response.json({
      decision,
      reason,
      result,
      log_id: logEntry.id,
      assigned_worker: assignedWorker,
      failed_critical_categories: failedCategories,
      controller_decision: controllerDecision,
      quality_report_id: quality_report_id || null,
      can_advance: decision === DECISIONS.PASS && advance_on_pass,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});