import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Save, Undo2, Redo2, Download, RefreshCw, ShieldCheck,
  Plus, Type, Image as ImageIcon, Square, ChevronDown,
  AlignLeft, Captions, Wand2, FolderOpen,
  Video, Music, PenTool, Shapes, BarChart3, Table as TableIcon,
  Minus, MessageSquare, Quote, Code, Sigma, QrCode, Box,
} from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const ADD_GROUPS = [
  {
    label: 'Content',
    items: [
      { type: 'text', label: 'Text', icon: Type },
      { type: 'quote', label: 'Quote', icon: Quote },
      { type: 'code_block', label: 'Code Block', icon: Code },
      { type: 'equation', label: 'Equation', icon: Sigma },
    ],
  },
  {
    label: 'Media',
    items: [
      { type: 'image', label: 'Image', icon: ImageIcon },
      { type: 'video', label: 'Video', icon: Video },
      { type: 'audio', label: 'Audio', icon: Music },
      { type: 'svg', label: 'SVG', icon: PenTool },
      { type: 'icon', label: 'Icon', icon: Shapes },
      { type: 'qr_code', label: 'QR Code', icon: QrCode },
    ],
  },
  {
    label: 'Layout',
    items: [
      { type: 'shape', label: 'Shape', icon: Square },
      { type: 'divider', label: 'Divider', icon: Minus },
      { type: 'table', label: 'Table', icon: TableIcon },
      { type: 'chart', label: 'Chart', icon: BarChart3 },
      { type: 'callout', label: 'Callout', icon: MessageSquare },
      { type: 'placeholder', label: 'Placeholder', icon: Box },
    ],
  },
  {
    label: 'Broadcast',
    items: [
      { type: 'lower_third', label: 'Lower Third', icon: AlignLeft },
      { type: 'caption', label: 'Caption', icon: Captions },
    ],
  },
];

const MEDIA_ADD_OPTIONS = [
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'audio', label: 'Audio', icon: Music },
  { type: 'shape', label: 'Shape', icon: Square },
];

const EXPORT_OPTIONS = ['Google Slides (PPTX)', 'PDF', 'PowerPoint', 'Video', 'Present Mode'];

const ROOM_INFO = {
  design: { label: 'Design Room', hint: 'Compose slides, add elements, and refine visual layout.' },
  animate: { label: 'Animate Room', hint: 'Select an element and use the Animation Inspector and timeline below.' },
  media: { label: 'Media Room', hint: 'Manage package assets and presentation media.' },
  script: { label: 'Script Room', hint: 'Edit narration, speaker notes, and presentation copy.' },
  review: { label: 'Review Room', hint: 'Run QA, inspect issues, and approve the production.' },
  present: { label: 'Present Room', hint: 'Rehearse and run the presentation using the controls below the canvas.' },
  ai: { label: 'AI Control Room', hint: 'Coordinate the Presentation Studio specialist workers.' },
};

export default function EditorTopBar({
  saving, dirty, canUndo, canRedo, hasSelection, title,
  onSave, onUndo, onRedo, onExport,
  onRegenerateSlide, onRegenerateElement, onRunQA, onAddElement,
  workspaceMode, onWorkspaceModeChange,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [mediaAddOpen, setMediaAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const room = ROOM_INFO[workspaceMode] || ROOM_INFO.design;
  const showDesignTools = workspaceMode === 'design';
  const showMediaTools = workspaceMode === 'media';
  const showReviewTools = workspaceMode === 'review';

  return (
    <div className="cpe-topbar flex flex-col flex-shrink-0">
      {/* Global Presentation Studio header — these controls never change rooms. */}
      <div className="cpe-global-toolbar flex items-center gap-1 px-3 py-2 min-w-0">
        <div className="flex items-center gap-2 mr-2 min-w-0">
          <span className="cpe-brand-mark text-[11px] hidden sm:inline">CREAPD · PRESENTATION STUDIO</span>
          <span className="cpe-title-text text-sm truncate max-w-[260px]">{title || 'Presentation Editor'}</span>
          {dirty && <span className="cpe-dirty-dot" title="Unsaved changes" />}
        </div>

        <div className="cpe-sep" />

        <button className="cpe-tool-btn" onClick={onSave} disabled={saving}>
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        <button className="cpe-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo"><Undo2 className="w-4 h-4" /></button>
        <button className="cpe-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo"><Redo2 className="w-4 h-4" /></button>

        <div className="cpe-sep" />

        <Link to="/presentations">
          <button className="cpe-tool-btn"><FolderOpen className="w-4 h-4" /> Open</button>
        </Link>

        <div className="flex-1" />

        <button
          className="cpe-tool-btn cpe-director-btn"
          onClick={onRegenerateSlide}
          title="Run the CREAPD Presentation Director / APD across this presentation"
        >
          <Wand2 className="w-4 h-4" /> Director
        </button>

        <div className="relative">
          <button className="cpe-tool-btn" onClick={() => setExportOpen(!exportOpen)}>
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
          </button>
          {exportOpen && (
            <Dropdown onClose={() => setExportOpen(false)} align="right">
              {EXPORT_OPTIONS.map(fmt => (
                <button key={fmt} onClick={() => { onExport(fmt); setExportOpen(false); }} className="cpe-dropdown-item">{fmt}</button>
              ))}
            </Dropdown>
          )}
        </div>
      </div>

      {/* Navigation between Presentation Studio rooms. */}
      <div className="cpe-studio-roombar flex items-center gap-3 px-3 py-1.5">
        <span className="cpe-roombar-label">Studio Rooms</span>
        <WorkspaceSwitcher activeMode={workspaceMode} onModeChange={onWorkspaceModeChange} />
      </div>

      {/* Context toolbar: equipment/actions that belong only to the active room. */}
      <div className="cpe-room-toolbar flex items-center gap-1 px-3 py-1.5 min-h-[38px]">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <span className="cpe-room-title">{room.label}</span>
          <span className="cpe-room-hint hidden lg:inline truncate">{room.hint}</span>
        </div>

        <div className="flex-1" />

        {showDesignTools && (
          <>
            <div className="relative">
              <button className="cpe-tool-btn" onClick={() => setAddOpen(!addOpen)}>
                <Plus className="w-4 h-4" /> Add Element <ChevronDown className="w-3 h-3" />
              </button>
              {addOpen && (
                <Dropdown onClose={() => setAddOpen(false)} align="right">
                  {ADD_GROUPS.map((group, gi) => (
                    <div key={group.label} className={gi > 0 ? 'mt-1 pt-1 border-t border-white/5' : ''}>
                      <div className="cpe-dropdown-group-label">{group.label}</div>
                      {group.items.map(({ type, label, icon: Icon }) => (
                        <button key={type} onClick={() => { onAddElement(type); setAddOpen(false); }} className="cpe-dropdown-item">
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
                    </div>
                  ))}
                </Dropdown>
              )}
            </div>
            {hasSelection && (
              <button className="cpe-tool-btn" onClick={onRegenerateElement} title="Improve selected text element via AI">
                <RefreshCw className="w-3.5 h-3.5" /> Improve Element
              </button>
            )}
          </>
        )}

        {showMediaTools && (
          <div className="relative">
            <button className="cpe-tool-btn" onClick={() => setMediaAddOpen(!mediaAddOpen)}>
              <Plus className="w-4 h-4" /> Add Media <ChevronDown className="w-3 h-3" />
            </button>
            {mediaAddOpen && (
              <Dropdown onClose={() => setMediaAddOpen(false)} align="right">
                {MEDIA_ADD_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => { onAddElement(type); setMediaAddOpen(false); }} className="cpe-dropdown-item">
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>
        )}

        {showReviewTools && (
          <button className="cpe-tool-btn" onClick={onRunQA}>
            <ShieldCheck className="w-4 h-4" /> Run QA
          </button>
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
