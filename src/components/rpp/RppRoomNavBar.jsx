import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';

/**
 * RppRoomNavBar — top navigation bar for switching between Research rooms
 * (Lobby, Topics, Research, Dossier, Develop, Packet, Archive).
 */
export default function RppRoomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="rpp-topbar sticky top-0 z-30">
      <div className="rpp-topbar-nav overflow-x-auto">
        {RPP_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = location.pathname === dept.path ||
            (dept.path !== '/research' && location.pathname.startsWith(dept.path));
          return (
            <button
              key={dept.id}
              onClick={() => navigate(dept.path)}
              className={`rpp-nav-tab flex-shrink-0 ${isActive ? 'active' : ''}`}
              title={dept.description}
            >
              <Icon className="w-4 h-4" />
              <span>{dept.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}