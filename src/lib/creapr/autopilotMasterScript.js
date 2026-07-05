/**
 * AUTOPILOT Master Script — Guided Production Cycle
 *
 * CREAPr IS the tour system. The engine loads TourScript/TourScene
 * entities and plays them directly with full visuals + TTS.
 * The Tour Control Center edits the tours that CREAPr plays.
 *
 * Flow:
 *   Navigate → Play Tour → Approval Gate → repeat
 */
export const autopilotMasterScript = {
  id: 'autopilot-master',
  name: 'AUTOPILOT Production Cycle',
  description: 'Guides the producer through the full production pipeline. CREAPr plays tours and pauses for approval at key gates.',
  steps: [
    // ── Home ──
    {
      action: 'navigate',
      target: '/home',
    },
    {
      action: 'play_tour',
      payload: { route_path: '/home' },
    },

    // ── Story Queue ──
    {
      action: 'navigate',
      target: '/news/storyqueue',
    },
    {
      action: 'play_tour',
      payload: { route_path: '/news/storyqueue' },
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
    },
    {
      action: 'play_tour',
      payload: { route_path: '/news/productionpackages' },
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
    },
    {
      action: 'play_tour',
      payload: { route_path: '/news/presentations' },
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
    },
    {
      action: 'play_tour',
      payload: { route_path: '/news/exportcenter' },
    },
  ],
};

export default autopilotMasterScript;