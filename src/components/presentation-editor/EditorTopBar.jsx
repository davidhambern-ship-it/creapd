import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Save, Undo2, Redo2, Download, RefreshCw, ShieldCheck,
  Plus, Type, Image as ImageIcon, Square, ChevronDown,
  AlignLeft, Captions, Wand2, FolderOpen, Cpu, ClipboardCheck,
  Video, Music,
} from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const ADD_OPTIONS = [
  { type: 'text', label: 'Text Box', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'shape', label: 'Shape', icon: Square },
  { type: 'lower_third', label: 'Lower Third', icon: AlignLeft },
  { type: 'caption', label: 'Caption', icon: Captions },
];

const MEDIA_ADD_OPTIONS = [
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'audio', label: 'Audio', icon: Music },
  { type: 'shape', label: 'Shape', icon: Square },
];

const EXPORT_OPTIONS = ['Google Slides (PPTX)', 'PDF', 'PowerPoint', 'Video', 'Present Mode'];

export default function EditorTopBar({
  saving, dirty, canUndo, canRedo, hasSelection, title,
  onSave, onUndo, onRedo, onExport,
  onRegenerateSlide, onRegenerateElement, onRunQA, onAddElement,
  onAutoBuild, onToggleAiPanel, aiPanelOpen,
  onToggleReviewPanel, reviewPanelOpen,
  workspaceMode, onWorkspaceModeChange,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [mediaAddOpen, setMediaAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const showDesignTools = workspaceMode === 'design';
  const showAnimateTools = workspaceMode === 'animate';
  const showMediaTools = workspaceMode === 'media';
  const showReviewTools = workspaceMode === 'review';
  const showAITools = workspaceMode === 'ai';

  return (
    <div className="cpe-topbar flex items-center gap-1 px-3 py-2">
      <div className="flex items-center gap-2 mr-2 min-w-0">
        <span className="cpe-brand-mark text-[11px] hidden sm:inline">CREAPD</span>
        <span className="cpe-title-text text-sm truncate max-w-[180px]">{title || 'Presentation Editor'}</span>
      </div>
      {dirty && <span className="cpe-dirty-dot" title="Unsaved changes" />}

      <div className="cpe-sep" />

      <button className="cpe-tool-btn" onClick={onSave} disabled={saving}>
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save
      </button>
      <button className="cpe-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo"><Undo2 className="w-4 h-4" /></button>
      <button className="cpe-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo"><Redo2 className="w-4 h-4" /></button>

      <div className="cpe-sep" />

      <Link to="/news/presentations">
        <button className="cpe-tool-btn"><FolderOpen className="w-4 h-4" /> Open</button>
      </Link>

      <div className="cpe-sep" />

      <WorkspaceSwitcher activeMode={workspaceMode} onModeChange={onWorkspaceModeChange} />

      {/* Design mode tools */}
      {showDesignTools && (
        <>
          <div className="cpe-sep" />
          <div className="relative">
            <button className="cpe-tool-btn" onClick={() => setAddOpen(!addOpen)}>
              <Plus className="w-4 h-4" /> Add <ChevronDown className="w-3 h-3" />
            </button>
            {addOpen && (
              <Dropdown onClose={() => setAddOpen(false)}>
                {ADD_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => { onAddElement(type); setAddOpen(false); }}
                    className="cpe-dropdown-item">
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>
          <button className="cpe-tool-btn" onClick={onRegenerateSlide} title="Re-direct via APD">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
          {hasSelection && (
            <button className="cpe-tool-btn" onClick={onRegenerateElement} title="Improve selected element via AI">
              <RefreshCw className="w-3.5 h-3.5" /> Element
            </button>
          )}
        </>
      )}

      {/* Animate mode tools */}
      {showAnimateTools && (
        <>
          <div className="cpe-sep" />
          <button className="cpe-tool-btn" onClick={onRegenerateSlide} title="Re-direct via APD">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
          {hasSelection && (
            <button className="cpe-tool-btn" onClick={onRegenerateElement} title="Improve selected element via AI">
              <RefreshCw className="w-3.5 h-3.5" /> Element
            </button>
          )}
        </>
      )}

      {/* Media mode tools */}
      {showMediaTools && (
        <>
          <div className="cpe-sep" />
          <div className="relative">
            <button className="cpe-tool-btn" onClick={() => setMediaAddOpen(!mediaAddOpen)}>
              <Plus className="w-4 h-4" /> Add Media <ChevronDown className="w-3 h-3" />
            </button>
            {mediaAddOpen && (
              <Dropdown onClose={() => setMediaAddOpen(false)}>
                {MEDIA_ADD_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => { onAddElement(type); setMediaAddOpen(false); }}
                    className="cpe-dropdown-item">
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>
        </>
      )}

      {/* Review mode tools */}
      {showReviewTools && (
        <>
          <div className="cpe-sep" />
          <button className="cpe-tool-btn" onClick={onRunQA}>
            <ShieldCheck className="w-4 h-4" /> Run QA
          </button>
          <button className="cpe-tool-btn" onClick={onRegenerateSlide} title="Re-direct via APD">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        </>
      )}

      {/* AI mode tools */}
      {showAITools && (
        <>
          <div className="cpe-sep" />
          <button className={`cpe-tool-btn ${aiPanelOpen ? 'active' : ''}`} onClick={onToggleAiPanel}>
            <Cpu className="w-4 h-4" /> AI Workers
          </button>
        </>
      )}

      <div className="flex-1" />

      <button
        className={`cpe-tool-btn ${reviewPanelOpen ? 'active' : ''}`}
        onClick={onToggleReviewPanel}
        title="Review & Production"
      >
        <ClipboardCheck className="w-4 h-4" /> Review
      </button>

      {onAutoBuild && (
        <button className="cpe-autobuild-btn" onClick={onAutoBuild}>
          <Wand2 className="w-4 h-4" /> Auto-Build
        </button>
      )}

      <div className="relative">
        <button className="cpe-tool-btn" onClick={() => setExportOpen(!exportOpen)}>
          <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
        </button>
        {exportOpen && (
          <Dropdown onClose={() => setExportOpen(false)} align="right">
            {EXPORT_OPTIONS.map(fmt => (
              <button key={fmt} onClick={() => { onExport(fmt); setExportOpen(false); }}
                className="cpe-dropdown-item">{fmt}</button>
            ))}
          </Dropdown>
        )}
      </div>
    </div>
  );
}

function Dropdown({ children, onClose, align = 'left' }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`cpe-dropdown ${align === 'right' ? 'right-0' : 'left-0'}`}>
        {children}
      </div>
    </>
  );
}