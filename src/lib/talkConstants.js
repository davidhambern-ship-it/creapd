// Talk Production Configuration Options

export const SHOW_FORMAT_OPTIONS = [
  'Interview Show', 'Panel Discussion', 'Solo Commentary', 'Debate Format',
  'Call-In Show', 'Roundtable', 'Late Night Talk', 'News Discussion',
  'Lifestyle Show', 'Educational Talk', 'Celebrity Interview', 'Expert Q&A',
  'Storytelling Format', 'Audience Participation', 'Custom Format'
];

export const TALK_TOPIC_OPTIONS = [
  'Current Events', 'Politics', 'Technology', 'Business & Finance', 'Health & Wellness',
  'Entertainment', 'Pop Culture', 'Sports', 'Science', 'Environment',
  'Education', 'Social Issues', 'Lifestyle', 'Travel', 'Food & Dining',
  'Fashion', 'Relationships', 'Mental Health', 'Career & Jobs', 'Personal Finance',
  'Local News', 'Global News', 'Trending Stories', 'Viral Content', 'Celebrity News',
  'Movie Reviews', 'TV Show Reviews', 'Music News', 'Book Reviews', 'Arts & Culture',
  'Innovation', 'Startups', 'Cryptocurrency', 'Real Estate', 'Stock Market',
  'Consumer Tech', 'Social Media Trends', 'Parenting', 'Aging', 'Retirement Planning'
];

export const TONE_OPTIONS = [
  'Professional', 'Conversational', 'Energetic', 'Funny', 'Serious',
  'Investigative', 'Educational', 'Inspirational', 'Bold', 'Warm',
  'Casual', 'Formal', 'Witty', 'Thoughtful', 'Provocative'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'News Websites', 'RSS Feeds', 'Social Media Trends', 'YouTube', 'Podcasts',
  'Academic Journals', 'Government Sources', 'Press Releases',
  'Google News', 'Twitter/X Trends', 'Reddit', 'TikTok Trends',
  'Industry Publications', 'Magazine Archives', 'Public Records',
  'Custom RSS Feed', 'Custom Website', 'Manual Entry'
];

export const AI_AUTOMATION_OPTIONS = [
  { key: 'Generate Research', label: 'Generate Research' },
  { key: 'Generate Topic Summaries', label: 'Generate Topic Summaries' },
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
  'Generate Topic Summaries',
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
  total_show_runtime: 60,
  talk_segment_runtime: 45,
  commercial_sponsor_runtime: 8,
  intro_runtime: 2,
  outro_runtime: 2
};

export const TALK_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/talk/dashboard', section: null },
  { icon: 'Settings2', label: 'Configuration', path: '/talk/configure', section: 'Workflow' },
  { icon: 'Search', label: 'Research', path: '/talk/research', section: 'Workflow' },
  { icon: 'Lightbulb', label: 'Topics', path: '/talk/topics', section: 'Workflow' },
  { icon: 'Users', label: 'Guests', path: '/talk/guests', section: 'Workflow' },
  { icon: 'ClipboardList', label: 'Show Rundown', path: '/talk/rundown', section: 'Workflow' },
  { icon: 'Sparkles', label: 'AI Assets', path: '/talk/assets', section: 'Output' },
  { icon: 'Download', label: 'Export', path: '/talk/export', section: 'Output' },
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
  interview: 'Interview',
  panel_discussion: 'Panel Discussion',
  debate: 'Debate',
  solo_commentary: 'Solo Commentary',
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