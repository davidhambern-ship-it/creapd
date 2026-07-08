import {
  LayoutDashboard, Settings2, Lightbulb, Layers, Sparkles, Download, Settings, Compass
} from 'lucide-react';

export const RESEARCH_DEPTH_OPTIONS = [
  { value: 'quick_scan', label: 'Quick Scan', description: 'Fast overview — key facts and top sources only' },
  { value: 'standard', label: 'Standard', description: 'Balanced research with full dossier structure' },
  { value: 'deep_dive', label: 'Deep Dive', description: 'Comprehensive multi-angle investigation' },
  { value: 'exhaustive', label: 'Exhaustive', description: 'Maximum depth — every angle, every counter-argument' }
];

export const SOURCE_DOMAIN_OPTIONS = [
  'Academic', 'Government', 'News', 'Think Tank', 'Industry Reports',
  'Scientific Journals', 'Legal Documents', 'Public Records',
  'International Organizations', 'Non-Profit Research', 'Expert Interviews', 'Custom'
];

export const RESEARCH_METHODOLOGY_OPTIONS = [
  'Literature Review', 'Expert Interview', 'Data Analysis', 'Comparative Study',
  'Historical Analysis', 'Case Study', 'Statistical Review', 'Policy Review',
  'Trend Analysis', 'Fact-Checking', 'Source Triangulation', 'Meta-Analysis'
];

export const TONE_OPTIONS = [
  'Professional', 'Conversational', 'Energetic', 'Serious', 'Investigative',
  'Educational', 'Inspirational', 'Neutral', 'Urgent', 'Humorous'
];

export const READING_STYLE_OPTIONS = [
  'Broadcast News', 'Podcast', 'Livestream', 'Interview', 'Documentary',
  'Educational Presentation', 'Corporate Communication', 'Storytelling'
];

export const PREFERRED_MODEL_OPTIONS = [
  { value: 'gemini_3_flash', label: 'Gemini 3 Flash (Fast)' },
  { value: 'gpt_5_mini', label: 'GPT-5 Mini (Balanced)' },
  { value: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6 (Deep)' },
  { value: 'gemini_3_1_pro', label: 'Gemini 3.1 Pro (Web-Enabled)' },
  { value: 'gpt_5_4', label: 'GPT-5.4 (Advanced)' },
  { value: 'claude_opus_4_6', label: 'Claude Opus 4.6 (Premium)' }
];

export const RESEARCH_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/research/dashboard', section: null },
  { icon: 'Compass', label: 'Discovery — Setup', path: '/research/configure', section: 'Discovery' },
  { icon: 'Lightbulb', label: 'Discovery — Topics', path: '/research/topics', section: 'Discovery' },
  { icon: 'Layers', label: 'Blueprint — Point Manager', path: '/research/manager', section: 'Blueprint' },
  { icon: 'Sparkles', label: 'Production — Packages', path: '/research/assets', section: 'Production' },
  { icon: 'Download', label: 'Assembly — Export', path: '/research/export', section: 'Assembly' },
  { icon: 'Settings', label: 'Settings', path: '/settings/default-production', section: null }
];

export const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/research/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/research/configure' },
  { icon: Lightbulb, label: 'Topics', path: '/research/topics' },
  { icon: Sparkles, label: 'Production', path: '/research/assets' },
  { icon: Download, label: 'Assembly', path: '/research/export' }
];

export const POINT_TYPE_LABELS = {
  finding: 'Finding',
  statistic: 'Statistic',
  quote: 'Quote',
  context: 'Context',
  counter_argument: 'Counter-Argument',
  timeline_event: 'Timeline Event',
  key_person: 'Key Person',
  key_organization: 'Key Organization',
  coverage_angle: 'Coverage Angle',
  data_point: 'Data Point'
};

export const POINT_TYPE_COLORS = {
  finding: 'bg-blue-500/15 text-blue-400',
  statistic: 'bg-amber-500/15 text-amber-400',
  quote: 'bg-purple-500/15 text-purple-400',
  context: 'bg-cyan-500/15 text-cyan-400',
  counter_argument: 'bg-red-500/15 text-red-400',
  timeline_event: 'bg-emerald-500/15 text-emerald-400',
  key_person: 'bg-pink-500/15 text-pink-400',
  key_organization: 'bg-indigo-500/15 text-indigo-400',
  coverage_angle: 'bg-orange-500/15 text-orange-400',
  data_point: 'bg-teal-500/15 text-teal-400'
};

export const TOPIC_STATUS_LABELS = {
  pending: 'Pending',
  researching: 'Researching',
  researched: 'Researched',
  in_review: 'In Review',
  selected: 'Selected',
  used: 'Used',
  rejected: 'Rejected',
  archived: 'Archived'
};

export const ICON_MAP = {
  LayoutDashboard, Settings2, Lightbulb, Layers, Sparkles, Download, Settings, Compass
};

export const RUNTIME_DEFAULTS = {
  total_show_runtime: 30,
  max_points_per_topic: 10
};

export function formatConfidence(score) {
  if (!score && score !== 0) return '—';
  return `${Math.round(score)}%`;
}