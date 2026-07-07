import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';

export default function RPPDepartmentNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  return (
    <nav className="flex items-center gap-1">
      {RPP_DEPARTMENTS.map((dept, idx) => {
        const Icon = dept.icon;
        const isActive = activeDept.id === dept.id;
        return (
          <React.Fragment key={dept.id}>
            {idx > 0 && (
              <div className="hidden md:block w-px h-5 bg-border/50 mx-0.5" />
            )}
            <button
              onClick={() => navigate(dept.path)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
              title={dept.description}
            >
              <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="hidden lg:inline">{dept.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}