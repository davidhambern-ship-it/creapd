import {
  Newspaper, Church, Mic2, Music, Trophy, ChefHat, Brush, FlaskConical
} from 'lucide-react';

export const PRODUCTION_PROFILES = [
  {
    key: 'news',
    label: 'News Production',
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
    spotlightDescription: 'Turn approved stories into complete broadcast-ready Story Packages with scripts, voice, media, fact checks, and AI-directed presentations.',
    workflow: [
      'Select or import stories into the Story Queue',
      'Generate a complete Story Package with AI',
      'Generate voiceover, thumbnail, story image, and promo video',
      'Direct the AI Presentation Director (APD) to create a timed presentation',
      'Export or share your finished production'
    ],
    outputs: 'Teleprompter scripts, voiceovers, thumbnails, story images, promo videos, AI-directed presentations',
    examples: ['Daily News Briefing', 'Breaking News Report', 'Weekly Recap Show']
  },
  {
    key: 'spiritual',
    label: 'Spiritual Production',
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
    spotlightDescription: 'Build meaningful messages from Scripture, generate teaching materials, create voiceovers, and direct complete presentation-ready sermons or studies.',
    workflow: [
      'Research scripture, topics, and study materials',
      'Build a Message with sections, narration, and slides',
      'Generate voiceovers and visual assets for each scene',
      'Direct the presentation timeline with the AI Presentation Director',
      'Export or share your finished production'
    ],
    outputs: 'Sermon scripts, scripture references, voiceovers, presentation scenes, teaching materials, study guides',
    examples: ['Sunday Sermon', 'Bible Study Session', 'Daily Devotional']
  },
  {
    key: 'talk',
    label: 'Talk Production',
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
    spotlightDescription: 'Develop show topics, talking points, host notes, episode structures, and presentation-ready discussion segments.',
    workflow: [
      'Choose a topic and define your show format',
      'Generate a show package with talking points and host notes',
      'Generate voice and media assets for each segment',
      'Direct the presentation with the AI Presentation Director',
      'Export or share your finished production'
    ],
    outputs: 'Topic outlines, talking points, host notes, episode structures, presentation segments',
    examples: ['Interview Show', 'Panel Discussion', 'Daily Talk Show']
  },
  {
    key: 'music',
    label: 'Music Production',
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
    spotlightDescription: 'Build radio-ready show rundowns, generate host scripts, manage playlists, and produce music commentary segments.',
    workflow: [
      'Configure your show profile and brand',
      'Research music topics and build your show rundown',
      'Generate host scripts and playlist segments',
      'Produce and assemble media assets',
      'Export your finished show'
    ],
    outputs: 'Show scripts, playlist segments, artist facts, host notes, show rundowns',
    examples: ['Morning Radio Show', 'Artist Spotlight', 'Countdown Show']
  },
  {
    key: 'sports',
    label: 'Sports Production',
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
    spotlightDescription: 'Build sports shows with game previews, recaps, scoreboard updates, athlete interviews, host scripts, voiceovers, and presentation-ready sports content.',
    workflow: [
      'Select sports and define your show format',
      'Generate games, matchups, research, and athlete profiles with AI',
      'Generate host scripts, co-host scripts, and voiceover audios',
      'Build a timed show rundown with game previews and analysis segments',
      'Export or share your finished production'
    ],
    outputs: 'Game previews, key matchups, stats & figures, host scripts, voiceovers, show rundowns, presentation prompts',
    examples: ['Game Preview', 'Post-Game Analysis', 'Scoreboard Show']
  },
  {
    key: 'cooking',
    label: 'Cooking Production',
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
    spotlightDescription: 'Build cooking shows with recipes, ingredient spotlights, technique demos, host scripts, voiceovers, and presentation-ready culinary content.',
    workflow: [
      'Select cuisines and define your show format',
      'Generate recipes, research, and ingredient spotlights with AI',
      'Generate host scripts, co-host scripts, and voiceover audios',
      'Build a timed show rundown with cooking segments',
      'Export or share your finished production'
    ],
    outputs: 'Recipes, cooking instructions, ingredient guides, host scripts, voiceovers, show rundowns, presentation prompts',
    examples: ['Step-by-Step Tutorial', 'Cuisine Exploration', 'Ingredient Spotlight']
  },
  {
    key: 'research',
    label: 'Research Production',
    shortLabel: 'Research',
    description: 'Deep research investigations, multi-model synthesized packages, and evidence-based production assets from any topic.',
    icon: FlaskConical,
    available: true,
    path: '/research/dashboard',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    spotlightFeature: 'Point Card System',
    spotlightDescription: 'Define research topics, run deep AI research with internet context, extract structured Point Cards, and generate multi-model synthesized production packages from approved findings.',
    workflow: [
      'Define research topics and production parameters',
      'Run deep research with internet-sourced context',
      'Extract structured Point Cards from research dossiers',
      'Approve points and generate multi-model synthesized packages',
      'Export or share your research production'
    ],
    outputs: 'Research dossiers, Point Cards, teleprompter scripts, talking points, fact-check notes, visual prompts',
    examples: ['Deep Investigation', 'Expert Briefing', 'Research-Driven Documentary']
  },
  {
    key: 'cosmo',
    label: 'Cosmo Production',
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
    spotlightDescription: 'Build health & beauty shows with topic research, tutorials, expert interviews, host scripts, voiceovers, and presentation-ready wellness content.',
    workflow: [
      'Select health & beauty topics and define your show format',
      'Generate research, topic summaries, and talking points with AI',
      'Generate host scripts, co-host scripts, and voiceover audios',
      'Build a timed show rundown with tutorial and demo segments',
      'Export or share your finished production'
    ],
    outputs: 'Topic summaries, talking points, host scripts, voiceovers, show rundowns, presentation prompts',
    examples: ['Skincare Tutorial', 'Product Review', 'Wellness Q&A']
  },
];

export const ACTIVE_PROFILES = PRODUCTION_PROFILES.filter(p => p.available);
export const COMING_SOON_PROFILES = PRODUCTION_PROFILES.filter(p => !p.available);

export function getProfileByKey(key) {
  return PRODUCTION_PROFILES.find(p => p.key === key);
}