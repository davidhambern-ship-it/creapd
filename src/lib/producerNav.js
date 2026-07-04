import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  Archive, Settings, Activity, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark,
  ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, Newspaper, Church, Mic2, ChefHat, Trophy, Brush
} from 'lucide-react';

export const PRODUCER_NAV_SECTIONS = [
  {
    label: null,
    items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/' }]
  },
  {
    label: 'Planning',
    items: [
      { icon: FileText, label: "Today's Brief", path: '/brief' },
      { icon: CalendarDays, label: 'Weekly Planner', path: '/planner' },
    ]
  },
  {
    label: 'Content',
    items: [
      { icon: Layers, label: 'Story Queue', path: '/queue' },
      { icon: Bookmark, label: 'Story Package Library', path: '/library' },
      { icon: ClipboardList, label: 'Story Manager', path: '/workspace' },
    ]
  },
  {
    label: 'Production',
    items: [
      { icon: Package, label: 'Production', path: '/production' },
      { icon: Palette, label: 'Brand Profiles', path: '/brands' },
      { icon: Tv, label: 'Show Profiles', path: '/shows' },
      { icon: ImageIcon, label: 'Image/Video Library', path: '/images' },
    ]
  },
  {
    label: 'Output',
    items: [
      { icon: Download, label: 'Export Center', path: '/export' },
    ]
  },
  {
    label: 'Research & Sources',
    items: [
      { icon: Search, label: 'Research Desk', path: '/research' },
      { icon: Radio, label: 'Sources', path: '/sources' },
      { icon: FileInput, label: 'Import URL', path: '/import' },
    ]
  },
  {
    label: 'Templates',
    items: [
      { icon: LayoutTemplate, label: 'Templates', path: '/templates' },
      { icon: ImageIcon, label: 'Graphics Templates', path: '/graphics-templates' },
      { icon: MessageSquareCode, label: 'Prompt Templates', path: '/prompt-templates' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Archive, label: 'Archive', path: '/archive' },
      { icon: ShieldCheck, label: 'Security & Privacy', path: '/security' },
      { icon: Activity, label: 'Automation', path: '/automation' },
      { icon: Building2, label: 'Organizations', path: '/organizations' },
      { icon: Bell, label: 'Activity Center', path: '/activity' },
      { icon: UserCircle, label: 'My Profile', path: '/profile' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ]
  },
];

export const PRODUCTION_MODES = [
  { key: 'news', label: 'News', icon: Newspaper, path: '/' },
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
  return 'news';
}