import React from 'react';
import { Shield, Lock, Activity, Cpu } from 'lucide-react';

export default function NerveCenterTopBar({ readiness = 0 }) {
  const activeSegs = Math.round((readiness / 100) * 14);
  return (
    <div className="nc-topbar">
      <div className="nc-topbar-section">
        <Shield className="w-3 h-3" style={{ color: 'hsl(152 60% 50%)' }} />
        <span className="nc-topbar-label">SYS_STATUS</span>
        <span className="nc-topbar-value" style={{ color: 'hsl(152 60% 50%)' }}>OPTIMAL</span>
        <span className="nc-led nc-led-green" />
      </div>
      <div className="nc-topbar-divider" />
      <div className="nc-topbar-section">
        <Lock className="w-3 h-3" style={{ color: 'hsl(35 90% 55%)' }} />
        <span className="nc-topbar-label">NETWORK</span>
        <span className="nc-topbar-value" style={{ color: 'hsl(35 90% 55%)' }}>ENCRYPTED</span>
        <span className="nc-led nc-led-amber" />
      </div>
      <div className="nc-topbar-divider" />
      <div className="nc-topbar-section nc-topbar-flex">
        <Activity className="w-3 h-3" style={{ color: 'hsl(190 80% 55%)' }} />
        <span className="nc-topbar-label">THROUGHPUT</span>
        <div className="nc-seg-bar">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="nc-seg" style={{ opacity: i < activeSegs ? 1 : 0.15 }} />
          ))}
        </div>
        <span className="nc-topbar-mono">{readiness}%</span>
      </div>
      <div className="nc-topbar-divider" />
      <div className="nc-topbar-section">
        <Cpu className="w-3 h-3" style={{ color: 'hsl(270 70% 60%)' }} />
        <span className="nc-topbar-label">CORE</span>
        <span className="nc-topbar-value">RPP-001</span>
      </div>
      <div className="nc-topbar-spacer" />
      <div className="nc-topbar-clock">
        <span className="nc-topbar-label">SESSION</span>
        <span className="nc-topbar-value" style={{ color: 'hsl(152 60% 50%)' }}>ACTIVE</span>
      </div>
    </div>
  );
}