export const CATEGORIES = [
  { key: 'top_story', label: 'Top Story' },
  { key: 'ai_win', label: 'AI Win' },
  { key: 'made_in_america', label: 'Made in America' },
  { key: 'state_spotlight', label: 'State Spotlight' },
  { key: 'small_business', label: 'Small Business' },
  { key: 'trade_hiring', label: 'Trade & Hiring' },
  { key: 'food_agriculture', label: 'Food & Agriculture' },
  { key: 'creator_economy', label: 'Creator Economy' },
  { key: 'science_innovation', label: 'Science & Innovation' },
  { key: 'fact_check', label: 'Fact Check' },
  { key: 'tomorrow_watch', label: 'Tomorrow to Watch' },
  { key: 'conversation_starters', label: 'Conversation Starters' },
  { key: 'opening_monologue', label: 'Opening Monologue' },
  { key: 'chat_poll', label: 'Chat Poll' },
  { key: 'graphic_stat', label: 'Graphic-Worthy Statistic' },
  { key: 'broll_ideas', label: 'B-Roll Ideas' },
  { key: 'call_to_action', label: 'Call to Action' },
];

export const BRIEFING_TYPES = [
  { key: 'tnn_morning', label: 'TNN Morning Brief', description: 'The full standard format' },
  { key: 'breaking_news', label: 'Breaking News Brief', description: 'Shorter, urgent, only when needed' },
  { key: 'music_radio', label: 'Music/Radio Brief', description: 'Music industry and radio programming' },
  { key: 'business_opportunity', label: 'Business Opportunity Brief', description: 'Small business, hiring, grants, markets' },
  { key: 'state_spotlight', label: 'State Spotlight Brief', description: 'One state economy, laws, industries' },
  { key: 'creator_economy', label: 'Creator Economy Brief', description: 'Platforms, monetization, content trends' },
  { key: 'custom', label: 'Custom Brief', description: 'User-defined format' },
];

export const EDITORIAL_RULES = [
  { key: 'block_recycled_leads', label: 'Block recycled lead stories' },
  { key: 'block_7_days', label: 'Block stories used in last 7 days' },
  { key: 'block_30_days', label: 'Block stories used in last 30 days' },
  { key: 'developing_only_updated', label: 'Allow developing stories only if materially updated' },
  { key: 'require_local_state', label: 'Require at least one local/state story' },
  { key: 'require_opportunity_job', label: 'Require at least one opportunity/job story' },
  { key: 'require_govt_research', label: 'Require at least one source from government/research' },
  { key: 'require_credibility_note', label: 'Require source credibility note' },
  { key: 'require_clickable_links', label: 'Require clickable links' },
  { key: 'require_manual_review', label: 'Require manual review before finalizing' },
];

export const BRIEF_LENGTHS = [
  { key: 'quick', label: 'Quick Brief' },
  { key: 'standard', label: 'Standard Brief' },
  { key: 'full', label: 'Full Producer Packet' },
];

export const DAY_STATUSES = {
  not_planned: { label: 'Not Planned', dot: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/20', bg: 'bg-gray-500/5' },
  planned: { label: 'Planned', dot: 'bg-berna-emerald', text: 'text-berna-emerald', border: 'border-berna-emerald/20', bg: 'bg-berna-emerald/5' },
  scheduled: { label: 'Scheduled', dot: 'bg-berna-purple', text: 'text-berna-purple', border: 'border-berna-purple/20', bg: 'bg-berna-purple/5' },
  generating: { label: 'Generating', dot: 'bg-berna-orange', text: 'text-berna-orange', border: 'border-berna-orange/20', bg: 'bg-berna-orange/5' },
  ready: { label: 'Ready', dot: 'bg-berna-emerald', text: 'text-berna-emerald', border: 'border-berna-emerald/20', bg: 'bg-berna-emerald/5' },
  needs_review: { label: 'Needs Review', dot: 'bg-berna-orange', text: 'text-berna-orange', border: 'border-berna-orange/20', bg: 'bg-berna-orange/5' },
  skipped: { label: 'Skipped', dot: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/20', bg: 'bg-gray-500/5' },
  failed: { label: 'Failed', dot: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
};

export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const DAY_LABELS = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

export const SUGGESTED_WEEK = [
  { day: 'sunday', theme: 'Positive National Headlines + Week Ahead', energy: 'Optimistic', categories: ['top_story', 'tomorrow_watch', 'conversation_starters'], type: 'tnn_morning' },
  { day: 'monday', theme: 'Business Opportunity + Jobs', energy: 'Motivating', categories: ['small_business', 'trade_hiring', 'ai_win'], type: 'business_opportunity' },
  { day: 'tuesday', theme: 'AI & Technology Helping Workers', energy: 'Forward-Looking', categories: ['ai_win', 'science_innovation', 'trade_hiring'], type: 'tnn_morning' },
  { day: 'wednesday', theme: 'Made in America + Manufacturing', energy: 'Patriotic', categories: ['made_in_america', 'trade_hiring', 'state_spotlight'], type: 'tnn_morning' },
  { day: 'thursday', theme: 'State Spotlight + Local Wins', energy: 'Community-Focused', categories: ['state_spotlight', 'small_business', 'food_agriculture'], type: 'state_spotlight' },
  { day: 'friday', theme: 'Creator Economy + Weekend Talking Points', energy: 'Energetic', categories: ['creator_economy', 'conversation_starters', 'chat_poll'], type: 'creator_economy' },
  { day: 'saturday', theme: 'Planning Day', energy: 'Strategic', categories: [], type: 'tnn_morning' },
];

export const DEFAULT_TEMPLATES = [
  {
    name: 'TNN Morning Brief',
    template_key: 'tnn_morning',
    description: 'The full standard morning briefing format with all sections.',
    included_sections: JSON.stringify(['top_story', 'ai_win', 'made_in_america', 'state_spotlight', 'small_business', 'trade_hiring', 'food_agriculture', 'creator_economy', 'science_innovation', 'fact_check', 'tomorrow_watch', 'conversation_starters', 'opening_monologue', 'chat_poll', 'graphic_stat', 'broll_ideas', 'call_to_action']),
    default_categories: JSON.stringify(['top_story', 'ai_win', 'made_in_america', 'state_spotlight', 'small_business', 'trade_hiring']),
    scoring_weights: JSON.stringify({ freshness: 1, credibility: 1, opportunity: 1.5, usefulness: 1, duplicate: -0.5 }),
    required_source_types: JSON.stringify(['major_news', 'wire_service', 'government']),
    tone: 'professional',
    default_read_time: '12 min',
    enabled: true,
  },
  {
    name: 'Business Opportunity Brief',
    template_key: 'business_opportunity',
    description: 'Focuses on small business, hiring, grants, markets, entrepreneurship, American manufacturing, and AI productivity.',
    included_sections: JSON.stringify(['top_story', 'small_business', 'trade_hiring', 'ai_win', 'made_in_america', 'graphic_stat', 'call_to_action']),
    default_categories: JSON.stringify(['small_business', 'trade_hiring', 'ai_win', 'made_in_america']),
    scoring_weights: JSON.stringify({ freshness: 0.8, credibility: 1, opportunity: 2, usefulness: 1.5, duplicate: -0.5 }),
    required_source_types: JSON.stringify(['major_news', 'local_business', 'manufacturing', 'labor_workforce']),
    tone: 'energetic',
    default_read_time: '8 min',
    enabled: true,
  },
  {
    name: 'State Spotlight Brief',
    template_key: 'state_spotlight',
    description: 'Focuses on one state: economy, laws/policy, industries, jobs, local businesses, infrastructure.',
    included_sections: JSON.stringify(['top_story', 'state_spotlight', 'small_business', 'trade_hiring', 'food_agriculture', 'conversation_starters', 'call_to_action']),
    default_categories: JSON.stringify(['state_spotlight', 'small_business', 'trade_hiring', 'food_agriculture']),
    scoring_weights: JSON.stringify({ freshness: 1, credibility: 1.2, opportunity: 1, usefulness: 1.5, duplicate: -0.5 }),
    required_source_types: JSON.stringify(['state_government', 'local_business', 'major_news']),
    tone: 'conversational',
    default_read_time: '10 min',
    enabled: true,
  },
  {
    name: 'Creator Economy Brief',
    template_key: 'creator_economy',
    description: 'Focuses on platforms, monetization, social media tools, livestreaming, AI creator tools, content trends, audience growth.',
    included_sections: JSON.stringify(['top_story', 'creator_economy', 'ai_win', 'conversation_starters', 'chat_poll', 'broll_ideas', 'call_to_action']),
    default_categories: JSON.stringify(['creator_economy', 'ai_win', 'science_innovation']),
    scoring_weights: JSON.stringify({ freshness: 1.5, credibility: 0.8, opportunity: 1.5, usefulness: 1, duplicate: -0.5 }),
    required_source_types: JSON.stringify(['creator_economy', 'ai_technology', 'major_news']),
    tone: 'energetic',
    default_read_time: '8 min',
    enabled: true,
  },
  {
    name: 'Music/Radio Brief',
    template_key: 'music_radio',
    description: 'Focuses on music industry, radio programming, streaming platforms, independent artists, chart trends, creator/music monetization, live audience engagement.',
    included_sections: JSON.stringify(['top_story', 'creator_economy', 'conversation_starters', 'chat_poll', 'broll_ideas', 'call_to_action']),
    default_categories: JSON.stringify(['creator_economy', 'conversation_starters']),
    scoring_weights: JSON.stringify({ freshness: 1.5, credibility: 0.8, opportunity: 1, usefulness: 1, duplicate: -0.5 }),
    required_source_types: JSON.stringify(['creator_economy', 'major_news']),
    tone: 'energetic',
    default_read_time: '7 min',
    enabled: true,
  },
  {
    name: 'Breaking News Brief',
    template_key: 'breaking_news',
    description: 'Shorter, urgent format — only used when needed for developing stories.',
    included_sections: JSON.stringify(['top_story', 'fact_check', 'call_to_action']),
    default_categories: JSON.stringify(['top_story', 'fact_check']),
    scoring_weights: JSON.stringify({ freshness: 2, credibility: 1.5, opportunity: 1, usefulness: 1, duplicate: -1 }),
    required_source_types: JSON.stringify(['wire_service', 'major_news', 'government']),
    tone: 'professional',
    default_read_time: '4 min',
    enabled: true,
  },
  {
    name: 'Custom Brief',
    template_key: 'custom',
    description: 'User-defined format. Configure sections, categories, and rules manually.',
    included_sections: JSON.stringify([]),
    default_categories: JSON.stringify([]),
    scoring_weights: JSON.stringify({ freshness: 1, credibility: 1, opportunity: 1, usefulness: 1, duplicate: -0.5 }),
    required_source_types: JSON.stringify([]),
    tone: 'professional',
    default_read_time: '10 min',
    enabled: true,
  },
];

export const parseJSON = (str, fallback) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

export const stringifyJSON = (val) => JSON.stringify(val || []);