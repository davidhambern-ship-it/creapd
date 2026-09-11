import {
  Newspaper, Church, Mic2, Music, Trophy, ChefHat, Brush, FlaskConical
} from 'lucide-react';

// Canonical CREAPD terminology: Production Studio.
// Legacy aliases remain at the bottom of this file while older pages migrate.
export const PRODUCTION_STUDIOS = [
  {
    key: 'news',
    label: 'News Studio',
    shortLabel: 'News',
    description: 'Daily news briefings, breaking news, story queues, teleprompter scripts, and broadcast production packages.',
    icon: Newspaper,
    available: true,
    path: '/news/dashboard',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    spotlightFeature: 'Story Manager',
    spotlightDescription: 'Turn approved stories into complete broadcast-ready Production Packages with scripts, voice, media, fact checks, and everything the Presentation Studio needs.',
    workflow: [
      'Select or import stories into the Story Queue',
      'Generate a complete Production Package with AI workers',
      'Generate voiceover, thumbnail, story image, and supporting media',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Teleprompter scripts, voiceovers, thumbnails, story images, production assets, approved Production Packages',
    examples: ['Daily News Briefing', 'Breaking News Report', 'Weekly Recap Show']
  },
  {
    key: 'spiritual',
    label: 'Spiritual Studio',
    shortLabel: 'Spiritual',
    description: 'Sermons, Bible studies, devotionals, worship services, prayer meetings, and faith-based content for any tradition.',
    icon: Church,
    available: true,
    path: '/spiritual/dashboard',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/20',
    spotlightFeature: 'Message Builder',
    spotlightDescription: 'Build meaningful messages from Scripture, teaching materials, narration, visuals, and complete Production Packages ready for the Presentation Studio.',
    workflow: [
      'Research scripture, topics, and study materials',
      'Build the message structure, narration, and teaching assets',
      'Generate voiceovers and visual assets',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Sermon scripts, scripture references, voiceovers, teaching materials, study guides, approved Production Packages',
    examples: ['Sunday Sermon', 'Bible Study Session', 'Daily Devotional']
  },
  {
    key: 'talk',
    label: 'Talk Studio',
    shortLabel: 'Talk',
    description: 'Talk shows, interview programs, panel discussions, and conversation-driven content.',
    icon: Mic2,
    available: true,
    path: '/talk/dashboard',
    gradient: 'from-pink-500/20 to-rose-500/10',
    accent: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/20',
    spotlightFeature: 'Topic Builder',
    spotlightDescription: 'Develop show topics, talking points, host notes, episode structures, media, and approved Production Packages.',
    workflow: [
      'Choose a topic and define the show format',
      'Generate talking points, host notes, questions, and segment assets',
      'Generate voice and media assets for each segment',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Topic outlines, talking points, host notes, episode structures, media assets, approved Production Packages',
    examples: ['Interview Show', 'Panel Discussion', 'Daily Talk Show']
  },
  {
    key: 'music',
    label: 'Music Studio',
    shortLabel: 'Music',
    description: 'Radio shows, music shows, playlist-based livestreams, countdown shows, and artist spotlights.',
    icon: Music,
    available: true,
    path: '/music/configure',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/20',
    spotlightFeature: 'Music Show Builder',
    spotlightDescription: 'Build radio-ready rundowns, host scripts, playlists, commentary segments, media assets, and complete Production Packages.',
    workflow: [
      'Configure your Show and brand',
      'Research music topics and build the rundown',
      'Generate host scripts and playlist segments',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Show scripts, playlist segments, artist facts, host notes, show rundowns, approved Production Packages',
    examples: ['Morning Radio Show', 'Artist Spotlight', 'Countdown Show']
  },
  {
    key: 'sports',
    label: 'Sports Studio',
    shortLabel: 'Sports',
    description: 'Game previews, recaps, scoreboard updates, athlete interviews, and sports commentary shows.',
    icon: Trophy,
    available: true,
    path: '/sports/dashboard',
    gradient: 'from-orange-500/20 to-red-500/10',
    accent: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/20',
    spotlightFeature: 'Game Desk',
    spotlightDescription: 'Build sports programs with game research, previews, recaps, statistics, scripts, voiceovers, and complete Production Packages.',
    workflow: [
      'Select sports and define the show format',
      'Generate matchups, research, athlete profiles, and analysis',
      'Generate host scripts, co-host scripts, voiceovers, and graphics',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Game previews, key matchups, stats, scripts, voiceovers, show rundowns, approved Production Packages',
    examples: ['Game Preview', 'Post-Game Analysis', 'Scoreboard Show']
  },
  {
    key: 'cooking',
    label: 'Cooking Studio',
    shortLabel: 'Cooking',
    description: 'Recipe shows, cooking tutorials, ingredient spotlights, and culinary entertainment programs.',
    icon: ChefHat,
    available: true,
    path: '/cooking/dashboard',
    gradient: 'from-green-500/20 to-emerald-500/10',
    accent: 'text-green-400',
    accentBg: 'bg-green-500/10',
    accentBorder: 'border-green-500/20',
    spotlightFeature: 'Recipe Studio',
    spotlightDescription: 'Build cooking programs with recipes, ingredient spotlights, technique demos, scripts, voiceovers, visuals, and complete Production Packages.',
    workflow: [
      'Select cuisines and define the show format',
      'Generate recipes, research, and ingredient spotlights',
      'Generate scripts, voiceovers, graphics, and demonstration assets',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Recipes, cooking instructions, ingredient guides, scripts, voiceovers, demonstration assets, approved Production Packages',
    examples: ['Step-by-Step Tutorial', 'Cuisine Exploration', 'Ingredient Spotlight']
  },
  {
    key: 'research',
    label: 'Research Studio',
    shortLabel: 'Research',
    description: 'Deep research investigations, synthesized findings, evidence, and production-ready assets from any topic.',
    icon: FlaskConical,
    available: true,
    path: '/research/dashboard',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    spotlightFeature: 'Point Card System',
    spotlightDescription: 'Define research topics, run deep research, extract structured Point Cards, and generate complete Production Packages from approved findings.',
    workflow: [
      'Define research topics and production parameters',
      'Run deep research and build verified dossiers',
      'Extract and approve structured Point Cards',
      'Generate, review, and approve complete Production Packages',
      'Send approved packages to the Presentation Studio for direction and editing'
    ],
    outputs: 'Research dossiers, Point Cards, teleprompter scripts, talking points, fact-check notes, visual assets, approved Production Packages',
    examples: ['Deep Investigation', 'Expert Briefing', 'Research-Driven Documentary']
  },
  {
    key: 'cosmo',
    label: 'Cosmo Studio',
    shortLabel: 'Cosmo',
    description: 'Health & beauty shows, skincare tutorials, wellness programs, product reviews, and cosmetic education content.',
    icon: Brush,
    available: true,
    path: '/cosmo/dashboard',
    gradient: 'from-pink-500/20 to-fuchsia-500/10',
    accent: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/20',
    spotlightFeature: 'Beauty Studio',
    spotlightDescription: 'Build health and beauty programs with research, tutorials, expert interviews, scripts, voiceovers, visuals, and complete Production Packages.',
    workflow: [
      'Select health and beauty topics and define the show format',
      'Generate research, topic summaries, and talking points',
      'Generate scripts, voiceovers, tutorials, and media assets',
      'Approve the Production Package and send a copy to the Presentation Studio',
      'Direct, edit, rehearse, present, or export inside the Presentation Editor'
    ],
    outputs: 'Topic summaries, talking points, scripts, voiceovers, tutorial assets, show rundowns, approved Production Packages',
    examples: ['Skincare Tutorial', 'Product Review', 'Wellness Q&A']
  },
];

export const ACTIVE_STUDIOS = PRODUCTION_STUDIOS.filter(studio => studio.available);
export const COMING_SOON_STUDIOS = PRODUCTION_STUDIOS.filter(studio => !studio.available);

export function getStudioByKey(key) {
  return PRODUCTION_STUDIOS.find(studio => studio.key === key);
}

// Legacy aliases for pages that have not been renamed internally yet.
export const PRODUCTION_PROFILES = PRODUCTION_STUDIOS;
export const ACTIVE_PROFILES = ACTIVE_STUDIOS;
export const COMING_SOON_PROFILES = COMING_SOON_STUDIOS;
export const getProfileByKey = getStudioByKey;
