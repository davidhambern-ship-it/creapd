import React from 'react';
import { Palette, Zap, FolderOpen, FileText, ShieldCheck, Play, Cpu } from 'lucide-react';
import { WORKSPACE_MODES, WORKSPACE_ORDER } from '@/hooks/useWorkspaceMode';

const ICON_MAP = { Palette, Zap, FolderOpen, FileText, ShieldCheck, Play, Cpu };

export default function WorkspaceSwitcher({ activeMode, onModeChange }) {
  return (
    <div className="cpe-ws-switcher">
      {WORKSPACE_ORDER.map(key => {
        const mode = WORKSPACE_MODES[key];
        const Icon = ICON_MAP[mode.icon];
        const isActive = activeMode === key;
        return (
          <button
            key={key}
            className={`cpe-ws-btn ${isActive ? 'active' : ''}`}
            onClick={() => onModeChange(key)}
            title={`${mode.label} — ${mode.focus}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="cpe-ws-label">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}