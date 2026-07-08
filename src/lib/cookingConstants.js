// Cooking Production Configuration Options

export const SHOW_FORMAT_OPTIONS = [
  'Step-by-Step Tutorial', 'Quick Recipe', 'Cooking Competition', 'Ingredient Spotlight',
  'Cuisine Exploration', 'Meal Prep Guide', 'Baking Show', 'Grilling & BBQ',
  'Healthy Cooking', 'Comfort Food', 'Holiday Special', 'Batch Cooking',
  'One-Pot Meals', 'Cooking with Kids', 'Farm to Table', 'Custom Format'
];

export const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'French', 'Mediterranean', 'Asian', 'Japanese', 'Chinese',
  'Thai', 'Indian', 'Middle Eastern', 'American', 'Southern US', 'Korean', 'Vietnamese',
  'Spanish', 'Greek', 'African', 'Caribbean', 'Brazilian', 'German',
  'Vegan', 'Vegetarian', 'Keto', 'Gluten-Free', 'Seafood', 'Desserts', 'Breakfast',
  'BBQ & Grilling', 'Comfort Food', 'Fusion', 'Plant-Based', 'Low-Carb'
];

export const TONE_OPTIONS = [
  'Warm & Educational', 'Energetic & Fun', 'Professional & Refined', 'Casual & Conversational',
  'Inspiring', 'Bold & Adventurous', 'Comforting', 'Quick & Punchy'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'Food Blogs', 'Recipe Websites', 'YouTube Cooking Channels', 'Food Magazines',
  'Culinary Institutes', 'Chef Interviews', 'Food Science Journals', 'Nutrition Databases',
  'Seasonal Food Guides', "Farmer's Market Reports", 'Food Trends',
  'Instagram Food Trends', 'TikTok Food Trends', 'Pinterest Recipes',
  'Custom RSS Feed', 'Custom Website', 'Manual Entry'
];

export const AI_AUTOMATION_OPTIONS = [
  { key: 'Generate Research', label: 'Generate Research' },
  { key: 'Generate Recipe Summaries', label: 'Generate Recipe Summaries' },
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
  'Generate Recipe Summaries',
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
  cooking_segment_runtime: 22,
  commercial_sponsor_runtime: 4,
  intro_runtime: 2,
  outro_runtime: 2
};

export const COOKING_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/cooking/dashboard', section: null },
  { icon: 'Compass', label: 'Discovery — Show Setup', path: '/cooking/configure', section: 'Discovery' },
  { icon: 'Search', label: 'Knowledge — Research', path: '/cooking/research', section: 'Knowledge' },
  { icon: 'ChefHat', label: 'Blueprint — Recipes', path: '/cooking/recipes', section: 'Blueprint' },
  { icon: 'Carrot', label: 'Blueprint — Ingredients', path: '/cooking/ingredients', section: 'Blueprint' },
  { icon: 'Sparkles', label: 'Production — AI Assets', path: '/cooking/assets', section: 'Production' },
  { icon: 'ClipboardList', label: 'Assembly — Rundown', path: '/cooking/rundown', section: 'Assembly' },
  { icon: 'Download', label: 'Assembly — Export', path: '/cooking/export', section: 'Assembly' },
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
  recipe_walkthrough: 'Recipe Walkthrough',
  technique_demo: 'Technique Demo',
  ingredient_spotlight: 'Ingredient Spotlight',
  tasting: 'Tasting',
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