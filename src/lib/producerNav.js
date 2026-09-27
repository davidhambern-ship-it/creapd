import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  Archive, Settings, Activity, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark,
  ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, Newspaper, Church, Mic2, ChefHat, Trophy, Brush, Film, FlaskConical, CheckCircle
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: 'News Desk',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/news/dashboard' },
      { icon: FileText, label: "Today's Brief", path: '/news/brief' },
      { icon: CalendarDays, label: 'Weekly Planner', path: '/news/planner' },
    ]
  },
  {
    label: 'Assignment Desk',
    items: [
      { icon: Layers, label: 'Story Queue', path: '/news/queue' },
      { icon: CheckCircle, label: 'Story Review', path: '/news/review' },
      { icon: Search, label: 'Research Desk', path: '/news/research' },
      { icon: Bookmark, label: 'Story Library', path: '/news/library' },
    ]
  },
  {
    label: 'Production',
    items: [
      { icon: ClipboardList, label: 'Story Workspace', path: '/news/workspace' },
      { icon: Package, label: 'Production Packages', path: '/news/production' },
      { icon: Film, label: 'Presentations', path: '/presentations' },
      { icon: Download, label: 'Export Center', path: '/news/export' },
    ]
  },
];

export const PRODUCTION_MODES = [
  { key: 'news', label: 'News', icon: Newspaper, path: '/news/dashboard' },
  { key: 'talk', label: 'Talk', icon: Mic2, path: '/talk/dashboard' },
  { key: 'cooking', label: 'Cooking', icon: ChefHat, path: '/cooking/dashboard' },
  { key: 'sports', label: 'Sports', icon: Trophy, path: '/sports/dashboard' },
  { key: 'cosmo', label: 'Cosmo', icon: Brush, path: '/cosmo/dashboard' },
  { key: 'radio', label: 'Radio', icon: Radio, path: '/music/configure' },
  { key: 'spiritual', label: 'Spiritual', icon: Church, path: '/spiritual/dashboard' },
  { key: 'research', label: 'Research', icon: FlaskConical, path: '/research' },
];

export const PRODUCER_NAV_ITEMS = PRODUCER_NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.label }))
);

export function getActiveProductionMode(pathname) {
  if (pathname.startsWith('/music')) return 'radio';
  if (pathname.startsWith('/spiritual')) return 'spiritual';
  if (pathname.startsWith('/talk')) return 'talk';
  if (pathname.startsWith('/cooking')) return 'cooking';
  if (pathname.startsWith('/sports')) return 'sports';
  if (pathname.startsWith('/cosmo')) return 'cosmo';
  if (pathname.startsWith('/research')) return 'research';
  if (pathname.startsWith('/news')) return 'news';
  return 'news';
}
