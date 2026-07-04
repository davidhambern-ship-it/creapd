import {
  Newspaper, Church, Mic2, Music, Trophy, ChefHat
} from 'lucide-react';

export const PRODUCTION_PROFILES = [
  {
    key: 'news',
    label: 'News Production',
    shortLabel: 'News',
    description: 'Daily news briefings, breaking news, story queues, teleprompter scripts, and broadcast production packages.',
    icon: Newspaper,
    available: true,
    path: '/dashboard',
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
    path: '/music/dashboard',
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
    available: false,
    path: null,
    gradient: 'from-orange-500/20 to-red-500/10',
    accent: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/20',
    spotlightFeature: 'Game Desk',
    spotlightDescription: 'Build sports shows with previews, recaps, scores, and commentary.',
    workflow: [],
    outputs: '',
    examples: []
  },
  {
    key: 'cooking',
    label: 'Cooking Production',
    shortLabel: 'Cooking',
    description: 'Recipe shows, cooking tutorials, ingredient spotlights, and culinary entertainment programs.',
    icon: ChefHat,
    available: false,
    path: null,
    gradient: 'from-green-500/20 to-emerald-500/10',
    accent: 'text-green-400',
    accentBg: 'bg-green-500/10',
    accentBorder: 'border-green-500/20',
    spotlightFeature: 'Recipe Studio',
    spotlightDescription: 'Build cooking shows with recipes, techniques, and step-by-step tutorials.',
    workflow: [],
    outputs: '',
    examples: []
  },
];

export const ACTIVE_PROFILES = PRODUCTION_PROFILES.filter(p => p.available);
export const COMING_SOON_PROFILES = PRODUCTION_PROFILES.filter(p => !p.available);

export function getProfileByKey(key) {
  return PRODUCTION_PROFILES.find(p => p.key === key);
}