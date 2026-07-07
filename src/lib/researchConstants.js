import { Home, BookOpen, Search, FileText, Wand2, Package } from 'lucide-react';

export const DEPARTMENTS = [
  {
    key: 'lobby',
    label: 'Lobby',
    shortLabel: 'Lobby',
    path: '/research/lobby',
    icon: Home,
    description: 'Reception and navigation hub',
    theme: 'Modern executive lobby with digital displays',
    color: 'text-cyan-400',
    colorBg: 'bg-cyan-500/10',
    colorBorder: 'border-cyan-500/20',
    gradient: 'from-cyan-500/20 to-blue-500/10',
  },
  {
    key: 'topics',
    label: 'Topics Department',
    shortLabel: 'Topics',
    path: '/research/topics',
    icon: BookOpen,
    description: 'Discover and define the research topic',
    theme: 'CREAPr Library',
    color: 'text-amber-400',
    colorBg: 'bg-amber-500/10',
    colorBorder: 'border-amber-500/20',
    gradient: 'from-amber-500/20 to-yellow-500/10',
  },
  {
    key: 'research',
    label: 'Research Department',
    shortLabel: 'Research',
    path: '/research/research',
    icon: Search,
    description: 'Acquire knowledge through deep research',
    theme: 'Research Archives',
    color: 'text-emerald-400',
    colorBg: 'bg-emerald-500/10',
    colorBorder: 'border-emerald-500/20',
    gradient: 'from-emerald-500/20 to-green-500/10',
  },
  {
    key: 'dossier',
    label: 'Dossier Department',
    shortLabel: 'Dossier',
    path: '/research/dossier',
    icon: FileText,
    description: 'Transform raw research into structured knowledge',
    theme: 'Executive Briefing Room',
    color: 'text-violet-400',
    colorBg: 'bg-violet-500/10',
    colorBorder: 'border-violet-500/20',
    gradient: 'from-violet-500/20 to-purple-500/10',
  },
  {
    key: 'develop',
    label: 'Develop Department',
    shortLabel: 'Develop',
    path: '/research/develop',
    icon: Wand2,
    description: 'Transform the dossier into production assets',
    theme: 'Creative Development Studio',
    color: 'text-pink-400',
    colorBg: 'bg-pink-500/10',
    colorBorder: 'border-pink-500/20',
    gradient: 'from-pink-500/20 to-rose-500/10',
  },
  {
    key: 'packet',
    label: 'Packet Department',
    shortLabel: 'Packet',
    path: '/research/packet',
    icon: Package,
    description: 'Assemble the complete Production Packet',
    theme: 'Production Assembly Office',
    color: 'text-blue-400',
    colorBg: 'bg-blue-500/10',
    colorBorder: 'border-blue-500/20',
    gradient: 'from-blue-500/20 to-indigo-500/10',
  },
];

export const ASSET_TYPES = [
  { key: 'teleprompter_script', label: 'Teleprompter Script', icon: 'ScrollText' },
  { key: 'show_script', label: 'Long-form Show Script', icon: 'FileText' },
  { key: 'story_summary', label: 'Story Summary', icon: 'AlignLeft' },
  { key: 'talking_points', label: 'Talking Points', icon: 'List' },
  { key: 'discussion_questions', label: 'Discussion Questions', icon: 'HelpCircle' },
  { key: 'presentation_outline', label: 'Presentation Outline', icon: 'LayoutList' },
  { key: 'slide_prompts', label: 'Slide Prompts', icon: 'Monitor' },
  { key: 'image_prompts', label: 'Image Prompts', icon: 'Image' },
  { key: 'thumbnail_prompt', label: 'Thumbnail Prompt', icon: 'ImagePlus' },
  { key: 'lower_third_text', label: 'Lower Third Text', icon: 'PanelBottom' },
  { key: 'social_captions', label: 'Social Captions', icon: 'Share2' },
  { key: 'broll_suggestions', label: 'B-Roll Suggestions', icon: 'Film' },
  { key: 'visual_suggestions', label: 'Visual Suggestions', icon: 'Eye' },
  { key: 'producer_notes', label: 'Producer Notes', icon: 'StickyNote' },
  { key: 'voice_package', label: 'Voice Package', icon: 'Mic' },
  { key: 'runtime_recommendations', label: 'Runtime Recommendations', icon: 'Clock' },
  { key: 'fact_callouts', label: 'Fact Callouts', icon: 'CheckSquare' },
  { key: 'quote_cards', label: 'Quote Cards', icon: 'Quote' },
  { key: 'interview_questions', label: 'Interview Questions', icon: 'MessageCircle' },
  { key: 'audience_engagement', label: 'Audience Engagement', icon: 'Users' },
];

export const PROJECT_STATUSES = {
  configuring: { label: 'Configuring', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  researching: { label: 'Researching', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  dossier_pending: { label: 'Dossier Pending', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  developing: { label: 'Developing', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  packet_ready: { label: 'Packet Ready', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  exported: { label: 'Exported', color: 'text-green-400', bg: 'bg-green-500/10' },
  archived: { label: 'Archived', color: 'text-muted-foreground', bg: 'bg-muted' },
};

export const DOSSIER_SECTIONS = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'background', label: 'Background' },
  { key: 'timeline', label: 'Timeline', isJson: true },
  { key: 'key_facts', label: 'Key Facts', isJson: true },
  { key: 'important_people', label: 'Important People', isJson: true },
  { key: 'organizations', label: 'Organizations', isJson: true },
  { key: 'statistics', label: 'Statistics', isJson: true },
  { key: 'verified_sources', label: 'Verified Sources', isJson: true },
  { key: 'areas_of_debate', label: 'Areas of Debate', isJson: true },
  { key: 'supporting_documents', label: 'Supporting Documents', isJson: true },
  { key: 'related_topics', label: 'Related Topics', isJson: true },
];

export function getDepartment(key) {
  return DEPARTMENTS.find(d => d.key === key);
}

export function getAssetType(key) {
  return ASSET_TYPES.find(a => a.key === key);
}

export function getProjectStatus(status) {
  return PROJECT_STATUSES[status] || PROJECT_STATUSES.configuring;
}