// Sports Production Configuration Options

export const SHOW_FORMAT_OPTIONS = [
  'Game Preview', 'Game Recap', 'Scoreboard Show', 'Athlete Interview',
  'Sports Commentary', 'Fantasy Sports Advice', 'Betting Odds Show', 'Highlight Show',
  'Post-Game Analysis', 'Pre-Game Show', 'Trade Deadline Special', 'Draft Coverage',
  'Offseason Update', 'Sports News Roundup', 'Local Sports Focus', 'Custom Format'
];

export const SPORT_OPTIONS = [
  'NFL Football', 'NBA Basketball', 'MLB Baseball', 'NHL Hockey',
  'College Football', 'College Basketball', 'Soccer (MLS)', 'Soccer (EPL)',
  'Soccer (La Liga)', 'Soccer (Champions League)', 'Golf', 'Tennis',
  'Boxing', 'MMA / UFC', 'NASCAR', 'Formula 1',
  'WNBA', 'NCAA Baseball', 'NCAA Hockey', 'Olympics',
  'WNBA', 'IndyCar', 'WNBA', 'Esports',
  'High School Sports', 'Minor League Baseball', 'NBA G League', 'AHL Hockey',
  ' WNBA', 'WNBA', 'WNBA', 'WNBA'
];

export const TONE_OPTIONS = [
  'Energetic & Analytical', 'Bold & Opinionated', 'Professional & Objective', 'Casual & Conversational',
  'Hype & Excited', 'Data-Driven', 'Storytelling', 'Quick & Punchy'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'ESPN', 'Bleacher Report', 'The Athletic', 'Sports Illustrated',
  'NFL Network', 'NBA.com', 'MLB.com', 'NHL.com',
  'CBS Sports', 'Fox Sports', 'NBC Sports', 'CBS Sports HQ',
  'Athlete Social Media', 'Team Press Releases', 'Local Sports Blogs',
  'Fantasy Sports Sites', 'Betting Odds Sites', 'Sports Analytics Sites',
  'YouTube Sports Channels', 'Sports Podcasts', 'Custom RSS Feed',
  'Custom Website', 'Manual Entry'
];

export const AI_AUTOMATION_OPTIONS = [
  { key: 'Generate Research', label: 'Generate Research' },
  { key: 'Generate Game Summaries', label: 'Generate Game Summaries' },
  { key: 'Generate Talking Points', label: 'Generate Talking Points' },
  { key: 'Generate Discussion Questions', label: 'Generate Discussion Questions' },
  { key: 'Generate Host Intros', label: 'Generate Host Intros' },
  { key: 'Generate Host Outros', label: 'Generate Host Outros' },
  { key: 'Generate Host Script', label: 'Generate Host Script' },
  { key: 'Generate Co-Host Script', label: 'Generate Co-Host Script' },
  { key: 'Generate Host Audio', label: 'Generate Host Audio' },
  { key: 'Generate Co-Host Audio', label: 'Generate Co-Host Audio' },
  { key: 'Generate Guest Intros', label: 'Generate Guest Intros' },
  { key: 'Generate Audience Prompts', label: 'Generate Audience Prompts' },
  { key: 'Generate Social Captions', label: 'Generate Social Captions' },
  { key: 'Generate Hashtags', label: 'Generate Hashtags' },
  { key: 'Generate Thumbnail Prompt', label: 'Generate Thumbnail Prompt' },
  { key: 'Generate Presentation Prompt', label: 'Generate Presentation Prompt' },
  { key: 'Generate AI Images', label: 'Generate AI Images' },
  { key: 'Generate Production Notes', label: 'Generate Production Notes' },
  { key: 'Generate Show Rundown', label: 'Generate Show Rundown' },
  { key: 'Generate Export Package', label: 'Generate Export Package' }
];

export const DEFAULT_AI_AUTOMATION = [
  'Generate Research',
  'Generate Game Summaries',
  'Generate Talking Points',
  'Generate Discussion Questions',
  'Generate Host Intros',
  'Generate Host Script',
  'Generate Co-Host Script',
  'Generate Host Audio',
  'Generate Co-Host Audio',
  'Generate Guest Intros',
  'Generate Social Captions',
  'Generate Thumbnail Prompt',
  'Generate Production Notes',
  'Generate Show Rundown'
];

export const RUNTIME_DEFAULTS = {
  total_show_runtime: 30,
  sports_segment_runtime: 22,
  commercial_sponsor_runtime: 4,
  intro_runtime: 2,
  outro_runtime: 2
};

export const SPORTS_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/sports/dashboard', section: null },
  { icon: 'Settings2', label: 'Configuration', path: '/sports/configure', section: 'Workflow' },
  { icon: 'Search', label: 'Research', path: '/sports/research', section: 'Workflow' },
  { icon: 'Trophy', label: 'Games', path: '/sports/games', section: 'Workflow' },
  { icon: 'Users', label: 'Athletes', path: '/sports/athletes', section: 'Workflow' },
  { icon: 'ClipboardList', label: 'Show Rundown', path: '/sports/rundown', section: 'Workflow' },
  { icon: 'Sparkles', label: 'AI Assets', path: '/sports/assets', section: 'Output' },
  { icon: 'Download', label: 'Export', path: '/sports/export', section: 'Output' },
  { icon: 'Settings', label: 'Settings', path: '/settings/default-production', section: null }
];

export const ASSET_TYPE_LABELS = {
  host_intro: 'Host Intro',
  host_outro: 'Host Outro',
  guest_intro: 'Guest Intro',
  talking_points: 'Talking Points',
  discussion_questions: 'Discussion Questions',
  audience_prompts: 'Audience Prompts',
  social_caption: 'Social Caption',
  hashtag: 'Hashtags',
  thumbnail_prompt: 'Thumbnail Prompt',
  presentation_prompt: 'Presentation Prompt',
  ai_image: 'AI Image',
  production_notes: 'Production Notes',
  host_script: 'Host Script',
  cohost_script: 'Co-Host Script',
  host_audio: 'Host Audio',
  cohost_audio: 'Co-Host Audio'
};

export const SEGMENT_TYPE_LABELS = {
  intro: 'Intro',
  host_monologue: 'Host Monologue',
  game_preview: 'Game Preview',
  game_recap: 'Game Recap',
  scoreboard_update: 'Scoreboard Update',
  athlete_interview: 'Athlete Interview',
  analysis: 'Analysis',
  debate: 'Debate',
  audience_qa: 'Audience Q&A',
  sponsor_break: 'Sponsor Break',
  station_id: 'Station ID',
  transition: 'Transition',
  outro: 'Outro'
};

export function formatRuntime(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  return `${minutes} min`;
}