import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Zap, FolderOpen, FileText, ShieldCheck, Play, Cpu, ArrowLeft, LogOut } from 'lucide-react';
import { WORKSPACE_MODES, WORKSPACE_ORDER } from '@/hooks/useWorkspaceMode';

const ICON_MAP = { Palette, Zap, FolderOpen, FileText, ShieldCheck, Play, Cpu };

function ExitEditorButton() {
  return (
    <Link to="/news/presentations" title="Exit Presentation Editor">
      <button className="cpe-ws-btn">
        <LogOut className="w-3.5 h-3.5" />
        <span className="cpe-ws-label">Exit Editor</span>
      </button>
    </Link>
  );
}

export default function WorkspaceSwitcher({ activeMode, onModeChange }) {
  if (activeMode === 'present') {
    return (
      <div className="cpe-ws-switcher">
        <button
          className="cpe-ws-btn active"
          onClick={() => onModeChange('design')}
          title="Back to Editor (Esc)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="cpe-ws-label">Back to Editor</span>
        </button>
        <ExitEditorButton />
      </div>
    );
  }

  return (
    <div className="cpe-ws-switcher">
      <ExitEditorButton />
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
