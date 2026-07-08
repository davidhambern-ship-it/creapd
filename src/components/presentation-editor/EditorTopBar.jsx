import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Save, Undo2, Redo2, Download, RefreshCw, ShieldCheck,
  Plus, Type, Image as ImageIcon, Square, ChevronDown, Edit3, Eye,
  AlignLeft, Captions, Wand2, FolderOpen,
} from 'lucide-react';

const ADD_OPTIONS = [
  { type: 'text', label: 'Text Box', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'shape', label: 'Shape', icon: Square },
  { type: 'lower_third', label: 'Lower Third', icon: AlignLeft },
  { type: 'caption', label: 'Caption', icon: Captions },
];

const EXPORT_OPTIONS = ['Google Slides (PPTX)', 'PDF', 'PowerPoint', 'Video', 'Present Mode'];

export default function EditorTopBar({
  saving, dirty, canUndo, canRedo, hasSelection, title, mode,
  onSave, onUndo, onRedo, onToggleMode, onExport,
  onRegenerateSlide, onRegenerateElement, onRunQA, onAddElement,
  onAutoBuild,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-card border-b border-border">
      <div className="flex items-center gap-2 mr-2">
        <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-berna-purple hidden sm:inline">CREAPD</span>
        <span className="text-sm font-heading font-semibold truncate max-w-[180px]">{title || 'Presentation Editor'}</span>
      </div>
      {dirty && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}

      <Sep />

      <Button variant="ghost" size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
      </Button>
      <IconBtn onClick={onUndo} disabled={!canUndo}><Undo2 className="w-4 h-4" /></IconBtn>
      <IconBtn onClick={onRedo} disabled={!canRedo}><Redo2 className="w-4 h-4" /></IconBtn>

      <Sep />

      <Sep />

      <Link to="/news/presentations">
        <Button variant="ghost" size="sm" className="gap-1.5">
          <FolderOpen className="w-4 h-4" /> Open
        </Button>
      </Link>

      <Button variant={mode === 'edit' ? 'default' : 'ghost'} size="sm" onClick={() => onToggleMode('edit')} className="gap-1.5">
        <Edit3 className="w-4 h-4" /> Edit
      </Button>
      <Button variant={mode === 'preview' ? 'default' : 'ghost'} size="sm" onClick={() => onToggleMode('preview')} className="gap-1.5">
        <Eye className="w-4 h-4" /> Preview
      </Button>

      {mode === 'edit' && (
        <>
          <Sep />

          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(!addOpen)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add <ChevronDown className="w-3 h-3" />
            </Button>
            {addOpen && (
              <Dropdown onClose={() => setAddOpen(false)}>
                {ADD_OPTIONS.map(({ type, label, icon: Icon }) => (
                  <button key={type} onClick={() => { onAddElement(type); setAddOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" /> {label}
                  </button>
                ))}
              </Dropdown>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={onRegenerateSlide} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </Button>
          {hasSelection && (
            <Button variant="ghost" size="sm" onClick={onRegenerateElement} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Element
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRunQA} className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> QA
          </Button>
        </>
      )}

      <div className="flex-1" />

      {onAutoBuild && (
        <Button
          variant="default"
          size="sm"
          onClick={onAutoBuild}
          className="gap-1.5 bg-gradient-to-r from-berna-purple to-berna-orange text-white hover:opacity-90"
        >
          <Wand2 className="w-4 h-4" /> Auto-Build
        </Button>
      )}

      <div className="relative">
        <Button variant="ghost" size="sm" onClick={() => setExportOpen(!exportOpen)} className="gap-1.5">
          <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
        </Button>
        {exportOpen && (
          <Dropdown onClose={() => setExportOpen(false)} align="right">
            {EXPORT_OPTIONS.map(fmt => (
              <button key={fmt} onClick={() => { onExport(fmt); setExportOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted">{fmt}</button>
            ))}
          </Dropdown>
        )}
      </div>
    </div>
  );
}

function Sep() { return <div className="w-px h-6 bg-border mx-1" />; }
function IconBtn({ children, ...props }) {
  return <Button variant="ghost" size="icon" className="w-9 h-9" {...props}>{children}</Button>;
}

function Dropdown({ children, onClose, align = 'left' }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl py-1 w-40`}>
        {children}
      </div>
    </>
  );
}