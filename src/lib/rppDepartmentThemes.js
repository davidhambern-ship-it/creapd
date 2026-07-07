/**
 * Department Theme System for the Research Production Profile.
 *
 * Each department has its own architectural identity — a different "room"
 * in the same research institute. The workspace reconfigures itself
 * (ambient color, accent, lighting) as the producer moves between departments.
 *
 * Metaphor mapping:
 *   Building     → Research Production Profile
 *   Departments  → Topics, Research, Dossier, Develop, Packet
 *   Shelves      → Categories (Topics)
 *   Books        → Topics / Cards
 *   Librarian    → CREAPr
 */

export const DEPARTMENT_THEMES = {
  lobby: {
    id: 'lobby',
    label: 'Lobby',
    metaphor: 'Reception',
    accentHsl: '190 80% 55%',
    ambientHsl: '190 50% 15%',
    glowHsl: '190 80% 55%',
    lightingMood: 'neutral',
    creaprGreeting: 'Welcome to the Research Institute. Where would you like to begin?',
    description: 'Reception and navigation hub',
  },
  topics: {
    id: 'topics',
    label: 'Topics',
    metaphor: 'The Library',
    accentHsl: '35 90% 60%',
    ambientHsl: '35 60% 12%',
    glowHsl: '35 90% 55%',
    lightingMood: 'warm',
    creaprGreeting: 'Welcome to the Library. What are we exploring today?',
    description: 'Discover and define the research topic',
  },
  research: {
    id: 'research',
    label: 'Research',
    metaphor: 'The Archive',
    accentHsl: '200 85% 60%',
    ambientHsl: '200 50% 12%',
    glowHsl: '200 85% 55%',
    lightingMood: 'cool',
    creaprGreeting: 'Entering the Archive. Research is underway.',
    description: 'Acquire knowledge through deep research',
  },
  dossier: {
    id: 'dossier',
    label: 'Dossier',
    metaphor: 'Briefing Room',
    accentHsl: '270 80% 65%',
    ambientHsl: '270 40% 12%',
    glowHsl: '270 80% 60%',
    lightingMood: 'scholarly',
    creaprGreeting: "Welcome to the Briefing Room. Let's structure what we know.",
    description: 'Transform research into structured knowledge',
  },
  develop: {
    id: 'develop',
    label: 'Develop',
    metaphor: 'Creative Studio',
    accentHsl: '25 95% 58%',
    ambientHsl: '25 60% 12%',
    glowHsl: '25 95% 55%',
    lightingMood: 'energetic',
    creaprGreeting: "Welcome to the Studio. Let's build something great.",
    description: 'Generate production assets from the dossier',
  },
  packet: {
    id: 'packet',
    label: 'Packet',
    metaphor: 'Assembly Room',
    accentHsl: '152 60% 50%',
    ambientHsl: '152 40% 10%',
    glowHsl: '152 60% 45%',
    lightingMood: 'focused',
    creaprGreeting: "Welcome to the Assembly Room. Let's finalize the packet.",
    description: 'Assemble the complete Production Packet',
  },
};

export function getDepartmentThemeFromPath(pathname) {
  if (pathname.includes('/research/topics')) return DEPARTMENT_THEMES.topics;
  if (pathname.includes('/research/manager')) return DEPARTMENT_THEMES.research;
  if (pathname.includes('/research/dossier')) return DEPARTMENT_THEMES.dossier;
  if (pathname.includes('/research/assets')) return DEPARTMENT_THEMES.develop;
  if (pathname.includes('/research/export')) return DEPARTMENT_THEMES.packet;
  return DEPARTMENT_THEMES.lobby;
}