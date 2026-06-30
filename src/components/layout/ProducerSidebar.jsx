import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getProfileConfig } from '@/lib/productionProfiles';
import {
  LayoutDashboard, FileText, Search, Radio, Archive, Settings, Activity,
  ChevronLeft, ChevronRight, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark, ClipboardList,
  FileInput, ImageIcon, MessageSquareCode, ShieldCheck, ListMusic, Clock,
  Scissors, Users, BookOpen, ShoppingCart, List, ChefHat, Newspaper, Music,
  Layers, Calendar
} from 'lucide-react';

const defaultNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', key: 'dashboard' },
  { icon: Search, label: 'Research', path: '/research', key: 'research' },
  { icon: ClipboardList, label: 'Workspace', path: '/workspace', key: 'workspace' },
  { icon: Package, label: 'Production', path: '/production', key: 'production' },
  { icon: Download, label: 'Export', path: '/export', key: 'export' },
  { icon: Radio, label: 'Sources', path: '/sources', key: 'sources' },
  { icon: Archive, label: 'Archive', path: '/archive', key: 'archive' },
  { icon: LayoutTemplate, label: 'Templates', path: '/templates', key: 'templates' },
  { icon: ShieldCheck, label: 'Security', path: '/security', key: 'security' },
  { icon: Activity, label: 'Automation', path: '/automation', key: 'automation' },
  { icon: Building2, label: 'Orgs', path: '/organizations', key: 'organizations' },
  { icon: Bell, label: 'Activity', path: '/activity', key: 'activity' },
  { icon: UserCircle, label: 'Profile', path: '/profile', key: 'profile' },
  { icon: Settings, label: 'Settings', path: '/settings', key: 'settings' },
];

const profileSpecificNavItems = {
  news: [
    { icon: FileText, label: 'Stories', path: '/workspace', key: 'stories' },
    { icon: Layers, label: "Today's Brief", path: '/brief', key: 'brief' },
    { icon: CalendarDays, label: 'Planner', path: '/planner', key: 'planner' },
    { icon: Bookmark, label: 'Library', path: '/library', key: 'library' },
    { icon: Palette, label: 'Brands', path: '/brands', key: 'brands' },
    { icon: Tv, label: 'Shows', path: '/shows', key: 'shows' },
    { icon: ImageIcon, label: 'Images', path: '/images', key: 'images' },
    { icon: FileInput, label: 'Import', path: '/import', key: 'import' },
    { icon: MessageSquareCode, label: 'Prompts', path: '/prompt-templates', key: 'prompt-templates' },
  ],
  music: [
    { icon: ListMusic, label: 'Playlist', path: '/workspace', key: 'playlist' },
    { icon: Clock, label: 'Show Clock', path: '/production', key: 'show_clock' },
    { icon: Scissors, label: 'Segments', path: '/production', key: 'segments' },
    { icon: Users, label: 'Artists', path: '/research', key: 'artists' },
    { icon: Music, label: 'Charts', path: '/research', key: 'charts' },
  ],
  cooking: [
    { icon: BookOpen, label: 'Recipes', path: '/workspace', key: 'recipes' },
    { icon: List, label: 'Ingredients', path: '/workspace', key: 'ingredients' },
    { icon: ShoppingCart, label: 'Shopping', path: '/workspace', key: 'shopping' },
    { icon: ChefHat, label: 'Rundown', path: '/production', key: 'rundown' },
    { icon: BookOpen, label: 'Food Facts', path: '/research', key: 'food_facts' },
  ]
};

const iconMap = {
  LayoutDashboard, FileText, Search, Radio, Archive, Settings, Activity,
  ChevronLeft, ChevronRight, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark, ClipboardList, FileInput,
  ImageIcon, MessageSquareCode, ShieldCheck, ListMusic, Clock, Scissors, Users,
  BookOpen, ShoppingCart, List, ChefHat, Newspaper, Music, Layers, Calendar
};

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [profileKey, setProfileKey] = useState('news');
  const [profile, setProfile] = useState(null);
  const [navItems, setNavItems] = useState(defaultNavItems);

  useEffect(() => {
    const profileFromUrl = searchParams.get('profile');
    const productionId = searchParams.get('productionId');

    if (profileFromUrl) {
      setProfileKey(profileFromUrl);
      const profileConfig = getProfileConfig(profileFromUrl);
      setProfile(profileConfig);
      
      const specificItems = profileSpecificNavItems[profileFromUrl] || [];
      setNavItems([...defaultNavItems.slice(0, 2), ...specificItems, ...defaultNavItems.slice(2)]);
    } else if (productionId) {
      loadProductionProfile(productionId);
    }
  }, [searchParams]);

  const loadProductionProfile = async (productionId) => {
    try {
      const production = await base44.entities.Production.get(productionId);
      if (production && production.profile_key) {
        setProfileKey(production.profile_key);
        const profileConfig = getProfileConfig(production.profile_key);
        setProfile(profileConfig);
        
        const specificItems = profileSpecificNavItems[production.profile_key] || [];
        setNavItems([...defaultNavItems.slice(0, 2), ...specificItems, ...defaultNavItems.slice(2)]);
      }
    } catch (error) {
      console.error('Error loading production profile:', error);
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-r border-white/[0.06] relative z-40`}>
        {/* Profile indicator */}
        {profile && !collapsed && (
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-${profile.color || 'berna-purple'}`} />
              <span className="text-xs font-semibold text-white truncate">{profile.name}</span>
            </div>
          </div>
        )}
        
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const IconComponent = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                  isActive
                    ? 'bg-white/[0.06] text-white'
                    : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />
                )}
                {IconComponent && (
                  <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-berna-purple' : 'group-hover:text-berna-purple/70'}`} />
                )}
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={onToggle}
          className="p-3 text-muted-foreground hover:text-white border-t border-white/[0.06] flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.06] flex items-center justify-around px-1 py-1 safe-area-bottom">
        {navItems.slice(0, 5).map(item => {
          const isActive = location.pathname === item.path;
          const IconComponent = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 ${
                isActive ? 'text-berna-purple' : 'text-muted-foreground'
              }`}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
              <span className="text-[9px] truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}