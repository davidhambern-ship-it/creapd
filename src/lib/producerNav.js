import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  Archive, Settings, Activity, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark,
  ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, Newspaper, Church, Mic2, ChefHat, Trophy, Brush, Film
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: null,
    items: [
      { icon: FileText, label: "Today's Brief", path: '/news/brief' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/news/dashboard' },
    ]
  },
  {
    label: 'Content',
    items: [
      { icon: Layers, label: 'Story Queue', path: '/news/queue' },
      { icon: Bookmark, label: 'Story Package Library', path: '/news/library' },
      { icon: ClipboardList, label: 'Story Manager', path: '/news/workspace' },
    ]
  },
  {
    label: 'Production',
    items: [
      { icon: Package, label: 'Production', path: '/news/production' },
      { icon: Palette, label: 'Brand Profiles', path: '/news/brands' },
      { icon: Tv, label: 'Show Profiles', path: '/news/shows' },
      { icon: ImageIcon, label: 'Image/Video Library', path: '/news/images' },
    ]
  },
  {
    label: 'Output',
    items: [
      { icon: Film, label: 'Presentations', path: '/news/presentations' },
      { icon: Download, label: 'Export Center', path: '/news/export' },
    ]
  },
  {
    label: 'Research & Sources',
    items: [
      { icon: Search, label: 'Research Desk', path: '/news/research' },
      { icon: Radio, label: 'Sources', path: '/news/sources' },
      { icon: FileInput, label: 'Import URL', path: '/news/import' },
    ]
  },
  {
    label: 'Templates',
    items: [
      { icon: LayoutTemplate, label: 'Templates', path: '/news/templates' },
      { icon: ImageIcon, label: 'Graphics Templates', path: '/news/graphics-templates' },
      { icon: MessageSquareCode, label: 'Prompt Templates', path: '/news/prompt-templates' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Archive, label: 'Archive', path: '/news/archive' },
      { icon: ShieldCheck, label: 'Security & Privacy', path: '/news/security' },
      { icon: Activity, label: 'Automation', path: '/news/automation' },
      { icon: Building2, label: 'Organizations', path: '/news/organizations' },
      { icon: Bell, label: 'Activity Center', path: '/news/activity' },
      { icon: UserCircle, label: 'My Profile', path: '/news/profile' },
      { icon: Settings, label: 'Settings', path: '/news/settings' },
    ]
  },
];

export const PRODUCTION_MODES = [
  { key: 'news', label: 'News', icon: Newspaper, path: '/news/dashboard' },
  { key: 'talk', label: 'Talk', icon: Mic2, path: '/talk/dashboard' },
  { key: 'cooking', label: 'Cooking', icon: ChefHat, path: '/cooking/dashboard' },
  { key: 'sports', label: 'Sports', icon: Trophy, path: '/sports/dashboard' },
  { key: 'cosmo', label: 'Cosmo', icon: Brush, path: '/cosmo/dashboard' },
  { key: 'radio', label: 'Radio', icon: Radio, path: '/music/dashboard' },
  { key: 'spiritual', label: 'Spiritual', icon: Church, path: '/spiritual/dashboard' },
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
  if (pathname.startsWith('/news')) return 'news';
  return 'news';
}