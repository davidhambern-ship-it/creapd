import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Database, Globe, Cpu, BookOpen, ShieldCheck, Server } from 'lucide-react';

const ADMIN_ITEMS = [
  { icon: Globe, label: 'Scripture Registry', path: '/admin/world-scripture-registry' },
  { icon: Cpu, label: 'Content Acquisition', path: '/admin/content-acquisition-engine' },
  { icon: Database, label: 'Source Management', path: '/admin/source-management-center' },
  { icon: Server, label: 'Handler Registry', path: '/admin/handler-registry' },
  { icon: BookOpen, label: 'Foundation Seeder', path: '/admin/foundation-seeder' },
];

/**
 * Shared admin section for sidebars across all production profiles.
 * Renders as a section header + nav links. Only visible to admins.
 *
 * Props:
 * - collapsed: if true, hides labels (for ProducerSidebar)
 * - variant: 'producer' | 'music' | 'spiritual' — controls styling
 * - onNavigate: callback when a link is clicked (e.g. close mobile nav)
 */
export default function AdminSidebarSection({ collapsed = false, variant = 'producer', onNavigate }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const isMusicOrSpiritual = variant === 'music' || variant === 'spiritual' || variant === 'talk' || variant === 'cooking' || variant === 'sports';

  return (
    <div className={isMusicOrSpiritual ? 'pt-2' : ''}>
      {!collapsed && (
        <p className={`px-3 pt-4 pb-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60 ${isMusicOrSpiritual ? '' : ''}`}>
          Administration
        </p>
      )}
      {ADMIN_ITEMS.map(item => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        const className = isMusicOrSpiritual
          ? `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-primary/15 text-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`
          : `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
              isActive ? 'bg-white/[0.06] text-white' : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
            }`;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={className}
          >
            {!isMusicOrSpiritual && isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />
            )}
            <item.icon className={`w-4 h-4 flex-shrink-0 ${!isMusicOrSpiritual && isActive ? 'text-berna-purple' : !isMusicOrSpiritual ? 'group-hover:text-berna-purple/70' : ''}`} />
            {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
}