/**
 * AUTOPILOT Master Script — Guided Production Cycle
 *
 * This is the script the CREAPr Engine executes when a user is in
 * AUTOPILOT mode and lands on the Home page. It walks the producer
 * through the full News production pipeline:
 *
 *   Home → Story Queue → Production Packages → Presentations → Export
 *
 * The engine navigates real routes, narrates each step, and pauses
 * for user approval at key decision gates.
 *
 * Future versions will:
 *  - Branch based on the active Show Profile (news, music, talk, etc.)
 *  - Invoke real backend functions (fetchStories, generateProductionPackage, etc.)
 *  - Use ElevenLabs voice cloning for narration instead of browser TTS
 */
export const autopilotMasterScript = {
  id: 'autopilot-master',
  name: 'AUTOPILOT Production Cycle',
  description: 'Guides the producer through the full production pipeline with narration and approval gates.',
  steps: [
    // ── Welcome ──
    {
      action: 'narrate',
      payload: {
        text: "Welcome to CREAPD. I'm CREAP, your AI co-producer. I'll guide you through your first production cycle.",
        speech: "Welcome to CREAPD. I'm CREAP, your AI co-producer. I'll guide you through your first production cycle.",
        auto_advance: true,
        duration: 6000,
      },
    },
    {
      action: 'narrate',
      payload: {
        text: "First, let's check the Story Queue for the latest articles.",
        speech: "First, let's check the Story Queue for the latest articles.",
        auto_advance: true,
        duration: 3500,
      },
    },

    // ── Story Queue ──
    {
      action: 'navigate',
      target: '/news/storyqueue',
      payload: { wait_ms: 2000 },
    },
    {
      action: 'narrate',
      payload: {
        text: "This is your Story Queue. I've loaded the latest articles here. Each story is scored and categorized so you can quickly see what matters most.",
        speech: "This is your Story Queue. I've loaded the latest articles here. Each story is scored and categorized so you can quickly see what matters most.",
        auto_advance: true,
        duration: 6000,
      },
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
      action: 'narrate',
      payload: {
        text: "Great. Let me take you to the Production Packages. Each package includes a teleprompter script, talking points, and visual suggestions.",
        speech: "Great. Let me take you to the Production Packages. Each package includes a teleprompter script, talking points, and visual suggestions.",
        auto_advance: true,
        duration: 6000,
      },
    },
    {
      action: 'navigate',
      target: '/news/productionpackages',
      payload: { wait_ms: 2000 },
    },
    {
      action: 'narrate',
      payload: {
        text: "Here are your production packages. You can review the scripts, edit talking points, and generate images for each story.",
        speech: "Here are your production packages. You can review the scripts, edit talking points, and generate images for each story.",
        auto_advance: true,
        duration: 5500,
      },
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
      action: 'narrate',
      payload: {
        text: "Creating your presentation now. This combines all your story packages into a single, sequenced presentation.",
        speech: "Creating your presentation now. This combines all your story packages into a single, sequenced presentation.",
        auto_advance: true,
        duration: 4500,
      },
    },
    {
      action: 'navigate',
      target: '/news/presentations',
      payload: { wait_ms: 2000 },
    },
    {
      action: 'narrate',
      payload: {
        text: "Your presentation is ready for review. You can preview it here, rearrange slides, and adjust the timeline before exporting.",
        speech: "Your presentation is ready for review. You can preview it here, rearrange slides, and adjust the timeline before exporting.",
        auto_advance: true,
        duration: 6000,
      },
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
      payload: { wait_ms: 2000 },
    },
    {
      action: 'narrate',
      payload: {
        text: "All done! Your production is ready to export and share. I'll be here whenever you need me — just say the word.",
        speech: "All done! Your production is ready to export and share. I'll be here whenever you need me — just say the word.",
        auto_advance: false,
      },
    },
  ],
};

export default autopilotMasterScript;