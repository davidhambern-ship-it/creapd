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
      { icon: FileText, label: "Discovery — Today's Brief", path: '/news/brief' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/news/dashboard' },
    ]
  },
  {
    label: 'Discovery',
    items: [
      { icon: Layers, label: 'Discovery — Story Queue', path: '/news/queue' },
      { icon: Palette, label: 'Discovery — Brand Profiles', path: '/news/brands' },
      { icon: Tv, label: 'Discovery — Show Profiles', path: '/news/shows' },
    ]
  },
  {
    label: 'Knowledge',
    items: [
      { icon: Search, label: 'Knowledge — Research Desk', path: '/news/research' },
      { icon: Radio, label: 'Knowledge — Sources', path: '/news/sources' },
      { icon: FileInput, label: 'Knowledge — Import URL', path: '/news/import' },
      { icon: Bookmark, label: 'Knowledge — Story Library', path: '/news/library' },
      { icon: ImageIcon, label: 'Knowledge — Media Library', path: '/news/images' },
    ]
  },
  {
    label: 'Blueprint',
    items: [
      { icon: ClipboardList, label: 'Blueprint — Story Manager', path: '/news/workspace' },
      { icon: LayoutTemplate, label: 'Blueprint — Templates', path: '/news/templates' },
      { icon: ImageIcon, label: 'Blueprint — Graphics Templates', path: '/news/graphics-templates' },
      { icon: MessageSquareCode, label: 'Blueprint — Prompt Templates', path: '/news/prompt-templates' },
    ]
  },
  {
    label: 'Production',
    items: [
      { icon: Package, label: 'Production — Packages', path: '/news/production' },
    ]
  },
  {
    label: 'Assembly',
    items: [
      { icon: Film, label: 'Assembly — Presentations', path: '/news/presentations' },
      { icon: Download, label: 'Assembly — Export Center', path: '/news/export' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Archive, label: 'System — Archive', path: '/news/archive' },
      { icon: ShieldCheck, label: 'System — Security & Privacy', path: '/news/security' },
      { icon: Activity, label: 'System — Automation', path: '/news/automation' },
      { icon: Building2, label: 'System — Organizations', path: '/news/organizations' },
      { icon: Bell, label: 'System — Activity Center', path: '/news/activity' },
      { icon: UserCircle, label: 'System — My Profile', path: '/news/profile' },
      { icon: Settings, label: 'System — Settings', path: '/news/settings' },
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