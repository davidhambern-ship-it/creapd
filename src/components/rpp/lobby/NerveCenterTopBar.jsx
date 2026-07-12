import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';

export default function NerveCenterTopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  return (
    <div className="nc-topbar">
      <div className="rpp-nav-strip" style={{ flex: 1 }}>
        {RPP_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept.id === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => navigate(dept.path)}
              className={`rpp-nav-btn ${isActive ? 'rpp-nav-btn-active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="rpp-nav-btn-label">{dept.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}