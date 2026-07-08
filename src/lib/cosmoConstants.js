// Cosmo (Health/Beauty) Production Configuration Options

export const SHOW_FORMAT_OPTIONS = [
  'Product Review', 'Tutorial / How-To', 'Expert Interview', 'Trend Discussion',
  'Routine Walkthrough', 'Q&A Session', 'Comparison Show', 'Before & After',
  'Myth Busting', 'Ingredient Deep Dive', 'Self-Care Guide', 'Seasonal Tips',
  'Audience Makeover', 'Brand Spotlight', 'Wellness Roundtable', 'Custom Format'
];

export const TOPIC_OPTIONS = [
  'Skincare', 'Haircare', 'Makeup', 'Nail Care',
  'Fragrance', 'Anti-Aging', 'Acne Solutions', 'Sun Protection',
  'Clean Beauty', 'K-Beauty', 'J-Beauty', 'Men\'s Grooming',
  'Wellness & Supplements', 'Nutrition', 'Fitness', 'Mental Health',
  'Sleep Health', 'Hormonal Health', 'Gut Health', 'Immunity',
  'Weight Management', 'Yoga & Meditation', 'Natural Remedies', 'Essential Oils',
  'Cosmetic Procedures', 'Dermatology', 'Dental Care', 'Eye Care',
  'Sustainable Beauty', 'Vegan Beauty', 'DIY Beauty', 'Beauty Tech & Devices'
];

export const TONE_OPTIONS = [
  'Warm & Empowering', 'Energetic & Fun', 'Professional & Educational', 'Casual & Conversational',
  'Inspiring', 'Bold & Trendy', 'Calming & Reassuring', 'Quick & Punchy'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'Beauty Blogs', 'YouTube Beauty Channels', 'Instagram Beauty Trends', 'TikTok Beauty Trends',
  'Beauty Magazines', 'Dermatology Journals', 'Wellness Websites', 'Nutrition Sites',
  'FDA/Cosmetic Regulations', 'Ingredient Databases', 'Brand Press Releases',
  'Influencer Reviews', 'Customer Reviews', 'Beauty Awards & Rankings',
  'Fashion Week Coverage', 'Salon & Spa Trends', 'Fitness Blogs', 'Mental Health Resources',
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
  total_show_runtime: 30,
  cosmo_segment_runtime: 22,
  commercial_sponsor_runtime: 4,
  intro_runtime: 2,
  outro_runtime: 2
};

export const COSMO_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/cosmo/dashboard', section: null },
  { icon: 'Compass', label: 'Discovery — Show Setup', path: '/cosmo/configure', section: 'Discovery' },
  { icon: 'Search', label: 'Knowledge — Research', path: '/cosmo/research', section: 'Knowledge' },
  { icon: 'Sparkles', label: 'Blueprint — Topics', path: '/cosmo/topics', section: 'Blueprint' },
  { icon: 'Users', label: 'Blueprint — Guests', path: '/cosmo/guests', section: 'Blueprint' },
  { icon: 'Wand2', label: 'Production — AI Assets', path: '/cosmo/assets', section: 'Production' },
  { icon: 'ClipboardList', label: 'Assembly — Rundown', path: '/cosmo/rundown', section: 'Assembly' },
  { icon: 'Download', label: 'Assembly — Export', path: '/cosmo/export', section: 'Assembly' },
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
  tutorial_demo: 'Tutorial / Demo',
  product_review: 'Product Review',
  expert_interview: 'Expert Interview',
  trend_discussion: 'Trend Discussion',
  audience_qa: 'Audience Q&A',
  comparison: 'Comparison',
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