import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  CalendarDays, Package, Download, Bookmark, ClipboardList,
  Film, FlaskConical, CheckCircle, Mic2, Users, Sparkles,
  Settings2, Archive
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: 'Start Here',
    items: [
      { icon: LayoutDashboard, label: 'Podcast Home', path: '/news/dashboard' },
      { icon: Settings2, label: '1. Podcast Setup', path: '/talk/configure' },
      { icon: FileText, label: '2. Episode Brief', path: '/news/brief' },
      { icon: Layers, label: '3. Topic Queue', path: '/news/queue' },
      { icon: CheckCircle, label: '4. Review & Approve', path: '/news/review' },
      { icon: ClipboardList, label: '5. Episode Workspace', path: '/news/workspace' },
      { icon: Package, label: '6. Episode Production', path: '/news/production' },
      { icon: Radio, label: '7. Podcast Studio', path: '/talk/live' },
    ]
  },
  {
    label: 'Podcast Tools',
    items: [
      { icon: CalendarDays, label: 'Episode Planner', path: '/news/planner' },
      { icon: Search, label: 'Research Desk', path: '/news/research' },
      { icon: Bookmark, label: 'Topic Library', path: '/news/library' },
      { icon: Users, label: 'Guests', path: '/talk/guests' },
      { icon: Mic2, label: 'Rundown', path: '/talk/rundown' },
      { icon: Sparkles, label: 'Assets', path: '/talk/assets' },
      { icon: Archive, label: 'Archive', path: '/news/archive' },
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
