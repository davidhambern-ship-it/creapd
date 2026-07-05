/**
 * AUTOPILOT Master Script — Guided Production Cycle
 *
 * CREAPr IS the tour guide. The tour system (TourScript / TourScene
 * entities + SystemNarrationOverlay) handles all narration, visuals,
 * and TTS. This script only orchestrates navigation and approval gates.
 *
 * Flow:
 *   Home → (tour plays) → Story Queue → (tour plays) → approval gate
 *   → Production Packages → (tour plays) → approval gate
 *   → Presentations → (tour plays) → approval gate
 *   → Export → (tour plays) → done
 *
 * Each navigate step waits for the tour to complete before proceeding.
 */
export const autopilotMasterScript = {
  id: 'autopilot-master',
  name: 'AUTOPILOT Production Cycle',
  description: 'Guides the producer through the full production pipeline. Tour system handles narration; this script handles navigation and approval gates.',
  steps: [
    // ── Home (tour plays automatically on arrival) ──
    {
      action: 'navigate',
      target: '/home',
      payload: { wait_ms: 3000 },
    },

    // ── Story Queue ──
    {
      action: 'navigate',
      target: '/news/storyqueue',
      payload: { wait_ms: 3000 },
    },
    {
      action: 'await_approval',
      payload: {
        prompt: "Ready to review the top stories and generate production packages?",
        approve_label: "Let's do it",
        reject_label: "Skip for now",
      },
    },

    // ── Production Packages ──
    {
      action: 'navigate',
      target: '/news/productionpackages',
      payload: { wait_ms: 3000 },
    },
    {
      action: 'await_approval',
      payload: {
        prompt: "Shall I assemble these packages into a presentation?",
        approve_label: "Create presentation",
        reject_label: "Skip",
      },
    },

    // ── Presentations ──
    {
      action: 'navigate',
      target: '/news/presentations',
      payload: { wait_ms: 3000 },
    },
    {
      action: 'await_approval',
      payload: {
        prompt: "Ready to export your production?",
        approve_label: "Export",
        reject_label: "Not yet",
      },
    },

    // ── Export ──
    {
      action: 'navigate',
      target: '/news/exportcenter',
      payload: { wait_ms: 3000 },
    },
  ],
};

export default autopilotMasterScript;