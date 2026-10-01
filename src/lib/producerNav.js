import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  CalendarDays, Package, Download, Bookmark, ClipboardList,
  Film, FlaskConical, CheckCircle, Mic2, Users, Sparkles
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: 'Episode Prep',
    items: [
      { icon: LayoutDashboard, label: 'Podcast Dashboard', path: '/news/dashboard' },
      { icon: FileText, label: 'Next Episode Brief', path: '/news/brief' },
      { icon: CalendarDays, label: 'Episode Planner', path: '/news/planner' },
    ]
  },
  {
    label: 'Editorial',
    items: [
      { icon: Layers, label: 'Topic Queue', path: '/news/queue' },
      { icon: CheckCircle, label: 'Review & Approve', path: '/news/review' },
      { icon: Search, label: 'Research Desk', path: '/news/research' },
      { icon: Bookmark, label: 'Topic Library', path: '/news/library' },
    ]
  },
  {
    label: 'Build & Produce',
    items: [
      { icon: ClipboardList, label: 'Episode Workspace', path: '/news/workspace' },
      { icon: Package, label: 'Production Packages', path: '/news/production' },
      { icon: Users, label: 'Guests', path: '/talk/guests' },
      { icon: Mic2, label: 'Rundown', path: '/talk/rundown' },
      { icon: Sparkles, label: 'Assets', path: '/talk/assets' },
      { icon: Radio, label: 'Podcast Studio', path: '/talk/live' },
      { icon: Film, label: 'Presentations', path: '/presentations' },
      { icon: Download, label: 'Export', path: '/news/export' },
    ]
  },
];

export const PRODUCTION_MODES = [
  { key: 'radio', label: 'Radio', icon: Radio, path: '/music/configure' },
  { key: 'podcast', label: 'Podcast', icon: Mic2, path: '/news/dashboard' },
  { key: 'research', label: 'Research', icon: FlaskConical, path: '/research' },
];

export const PRODUCER_NAV_ITEMS = PRODUCER_NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.label }))
);

export function getActiveProductionMode(pathname) {
  if (pathname.startsWith('/music')) return 'radio';
  if (pathname.startsWith('/research')) return 'research';
  if (pathname.startsWith('/news') || pathname.startsWith('/talk')) return 'podcast';
  return 'podcast';
}
