import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';

export default function NerveCenterBottomConsole() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  const tickerItems = [
    'RESEARCH PP: OPERATIONAL',
    'DEPARTMENTS: ' + RPP_DEPARTMENTS.length,
    'ACTIVE: ' + activeDept.name.toUpperCase(),
    'CLICK A DEPARTMENT TO NAVIGATE',
  ];

  return (
    <div className="nc-bottom">
      <div className="rpp-nav-strip">
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
              {dept.output && <span className="rpp-nav-btn-output">{dept.output}</span>}
            </button>
          );
        })}
      </div>
      <div className="nc-ticker">
        <div className="nc-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="nc-ticker-item">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}