import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  CalendarDays, Package, Download, Bookmark, ClipboardList,
  Film, FlaskConical, Mic2, Users, Sparkles,
  Settings2, Archive, Rss
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: 'Episode Flow',
    items: [
      { icon: LayoutDashboard, label: 'Podcast Home', path: '/podcast' },
      { icon: Settings2, label: '1. Setup', path: '/podcast/setup' },
      { icon: Search, label: '2. Research', path: '/podcast/research' },
      { icon: FileText, label: '3. Episode Brief', path: '/podcast/brief' },
      { icon: Package, label: '4. Episode Production', path: '/podcast/production' },
      { icon: Radio, label: '5. Podcast Studio', path: '/podcast/studio' },
      { icon: Download, label: '6. Finish & Publish', path: '/podcast/export' },
    ]
  },
  {
    label: 'Episode Tools',
    items: [
      { icon: CalendarDays, label: 'Episode Planner', path: '/podcast/planner' },
      { icon: Rss, label: 'Sources', path: '/podcast/sources' },
      { icon: Layers, label: 'Content Queue', path: '/podcast/queue' },
      { icon: Sparkles, label: 'Content Review', path: '/podcast/review' },
      { icon: ClipboardList, label: 'Episode Workspace', path: '/podcast/workspace' },
      { icon: Bookmark, label: 'Topic Library', path: '/podcast/library' },
      { icon: Users, label: 'Guests', path: '/podcast/guests' },
      { icon: Mic2, label: 'Rundown', path: '/podcast/rundown' },
      { icon: Sparkles, label: 'Production Assets', path: '/podcast/assets' },
      { icon: Archive, label: 'Archive', path: '/podcast/archive' },
      { icon: Film, label: 'Presentations', path: '/presentations' },
    ]
  },
];

export const PRODUCTION_MODES = [
  { key: 'radio', label: 'Radio', icon: Radio, path: '/music/configure' },
  { key: 'podcast', label: 'Podcast', icon: Mic2, path: '/podcast' },
  { key: 'research', label: 'Research', icon: FlaskConical, path: '/research' },
];

export const PRODUCER_NAV_ITEMS = PRODUCER_NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.label }))
);

export function getActiveProductionMode(pathname) {
  if (pathname.startsWith('/music')) return 'radio';
  if (pathname.startsWith('/research')) return 'research';
  if (pathname.startsWith('/podcast') || pathname.startsWith('/news') || pathname.startsWith('/talk')) return 'podcast';
  return 'podcast';
}
