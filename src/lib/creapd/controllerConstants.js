/**
 * CREAPD Controller Decision Engine — Shared Constants
 * CTRL-001 Canonical Implementation
 *
 * These constants define the deterministic thresholds, critical categories,
 * and worker routing rules used by every Department Controller.
 * They are shared between the backend decision engine and the frontend UI.
 */

// ── Quality Modes & Overall Thresholds (Section 7) ──────────────────────────

export const QUALITY_MODES = {
  draft: { label: 'Draft', minScore: 75 },
  standard: { label: 'Standard', minScore: 85 },
  professional: { label: 'Professional', minScore: 92 },
  broadcast: { label: 'Broadcast', minScore: 97 },
};

export const DEFAULT_QUALITY_MODE = 'standard';

// ── Critical Categories & Minimum Thresholds (Section 8) ────────────────────

export const CRITICAL_CATEGORIES = {
  accuracy: { label: 'Accuracy', minScore: 95 },
  technical_integrity: { label: 'Technical Integrity', minScore: 95 },
  copyright_compliance: { label: 'Copyright Compliance', minScore: 100 },
  copyright: { label: 'Copyright', minScore: 100 },
  accessibility: { label: 'Accessibility', minScore: 85 },
  brand_consistency: { label: 'Brand Consistency', minScore: 90 },
  educational_value: { label: 'Educational Value', minScore: 90 },
};

// ── Confidence Threshold (Section 10) ───────────────────────────────────────

export const MIN_CONFIDENCE = 85;

// ── Default Maximum Revisions (Section 9) ───────────────────────────────────

export const DEFAULT_MAX_ITERATIONS = 5;

// ── Decision Actions (Section 13) ───────────────────────────────────────────

export const DECISIONS = {
  PASS: 'pass',
  REVISE: 'revise',
  ESCALATE: 'escalate',
  PRODUCER_REVIEW: 'producer_review',
  INVALID_REPORT: 'invalid_report',
};

// ── Worker Routing Map (Section 11) ─────────────────────────────────────────
// Maps asset types and common recommendation keywords to the responsible Worker.

// RPP-AI-001 aligned — maps asset types to canonical worker IDs from aiWorkerRegistry
export const WORKER_ROUTING = {
  PresentationPoint: 'develop_planning',
  StorySlide: 'packet_assembly',
  PresentationScript: 'develop_script',
  ImageAsset: 'develop_image',
  VoicePackage: 'develop_voice',
  VideoAsset: 'develop_video',
  Layout: 'develop_design',
  ProductionPackage: 'packet_assembly',
};

// Keyword-based routing for recommendation analysis (RPP-AI-001 Section 5 & 7 workers)
export const RECOMMENDATION_KEYWORD_ROUTING = [
  { keywords: ['image', 'visual quality', 'resolution', 'artifact'], worker: 'develop_image' },
  { keywords: ['narration', 'voice', 'wpm', 'runtime', 'pacing', 'speech'], worker: 'develop_voice' },
  { keywords: ['layout', 'hierarchy', 'whitespace', 'eye flow', 'balance'], worker: 'develop_design' },
  { keywords: ['script', 'redundancy', 'tone', 'wording', 'narrative'], worker: 'develop_script' },
  { keywords: ['research', 'statistic', 'fact', 'citation', 'missing data'], worker: 'research_fact' },
  { keywords: ['slide', 'storyslide', 'point', 'hierarchy'], worker: 'packet_assembly' },
  { keywords: ['video', 'motion', 'synchronization', 'animation'], worker: 'develop_video' },
];

// ── Classification Labels (for UI) ──────────────────────────────────────────

export const CLASSIFICATION_LABELS = {
  draft: { label: 'Draft', color: 'text-muted-foreground' },
  standard: { label: 'Standard', color: 'text-blue-400' },
  professional: { label: 'Professional', color: 'text-berna-purple' },
  broadcast_ready: { label: 'Broadcast Ready', color: 'text-berna-emerald' },
  needs_revision: { label: 'Needs Revision', color: 'text-berna-orange' },
  failed: { label: 'Failed', color: 'text-destructive' },
};

export const STATUS_LABELS = {
  pass: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' },
  revise: { label: 'In Revision', color: 'text-berna-orange', dot: 'bg-berna-orange' },
  escalate: { label: 'Escalated', color: 'text-destructive', dot: 'bg-destructive' },
  producer_review: { label: 'Producer Review', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  invalid_report: { label: 'Invalid Report', color: 'text-destructive', dot: 'bg-destructive' },
};

// ── Helper: get quality mode config ─────────────────────────────────────────

export function getQualityMode(mode) {
  return QUALITY_MODES[mode] || QUALITY_MODES[DEFAULT_QUALITY_MODE];
}

// ── Helper: route a recommendation to a worker ──────────────────────────────

export function routeRecommendation(assetType, recommendationText) {
  // First try asset-type-based routing
  const typeWorker = WORKER_ROUTING[assetType];
  if (typeWorker) return typeWorker;

  // Fall back to keyword-based routing
  const lower = (recommendationText || '').toLowerCase();
  for (const route of RECOMMENDATION_KEYWORD_ROUTING) {
    if (route.keywords.some(kw => lower.includes(kw))) {
      return route.worker;
    }
  }

  return typeWorker || 'Generation Worker';
}