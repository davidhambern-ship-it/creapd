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
      { icon: FileText, label: "Today's Brief", path: '/news/todaysbrief' },
      { icon: LayoutDashboard, label: 'Dashboard', path: '/news/dashboard' },
    ]
  },
  {
    label: 'Content',
    items: [
      { icon: Layers, label: 'Story Queue', path: '/news/storyqueue' },
      { icon: Bookmark, label: 'Story Package Library', path: '/news/storylibrary' },
      { icon: ClipboardList, label: 'Story Manager', path: '/news/storymanager' },
    ]
  },
  {
    label: 'Production',
    items: [
      { icon: Package, label: 'Production', path: '/news/productionpackages' },
      { icon: Palette, label: 'Brand Profiles', path: '/news/brandprofiles' },
      { icon: Tv, label: 'Show Profiles', path: '/news/showprofiles' },
      { icon: ImageIcon, label: 'Image/Video Library', path: '/news/imagelibrary' },
    ]
  },
  {
    label: 'Output',
    items: [
      { icon: Film, label: 'Presentations', path: '/news/presentations' },
      { icon: Download, label: 'Export Center', path: '/news/exportcenter' },
    ]
  },
  {
    label: 'Research & Sources',
    items: [
      { icon: Search, label: 'Research Desk', path: '/news/researchdesk' },
      { icon: Radio, label: 'Sources', path: '/news/sources' },
      { icon: FileInput, label: 'Import URL', path: '/news/manualimport' },
    ]
  },
  {
    label: 'Templates',
    items: [
      { icon: LayoutTemplate, label: 'Templates', path: '/news/templatelibrary' },
      { icon: ImageIcon, label: 'Graphics Templates', path: '/news/productiontemplates' },
      { icon: MessageSquareCode, label: 'Prompt Templates', path: '/news/prompttemplates' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Archive, label: 'Archive', path: '/news/archivepage' },
      { icon: ShieldCheck, label: 'Security & Privacy', path: '/news/securitycenter' },
      { icon: Activity, label: 'Automation', path: '/news/automationcenter' },
      { icon: Building2, label: 'Organizations', path: '/news/organizations' },
      { icon: Bell, label: 'Activity Center', path: '/news/activitycenter' },
      { icon: UserCircle, label: 'My Profile', path: '/news/userprofile' },
      { icon: Settings, label: 'Settings', path: '/news/settingspage' },
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
  return 'news';
}