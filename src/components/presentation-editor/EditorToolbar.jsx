import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Save, Undo2, Redo2, Play, Download, RefreshCw,
  ShieldCheck, Plus, Type, Image as ImageIcon, Square,
  ChevronDown, Edit3, Eye
} from 'lucide-react';

export default function EditorToolbar({
  saving, canUndo, canRedo, hasSelection, presentationTitle, mode,
  onSave, onUndo, onRedo, onToggleMode, onExport,
  onRegenerateSlide, onRegenerateElement, onRunQA, onAddElement,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-card border-b border-border flex-wrap">
      <span className="text-sm font-heading font-semibold mr-2 truncate max-w-[200px]">
        {presentationTitle || 'Presentation Editor'}
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      <Button variant="ghost" size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save
      </Button>
      <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="w-9 h-9">
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="w-9 h-9">
        <Redo2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Mode toggle */}
      <Button variant={mode === 'edit' ? 'default' : 'ghost'} size="sm" onClick={() => onToggleMode('edit')} className="gap-1.5">
        <Edit3 className="w-4 h-4" /> Edit
      </Button>
      <Button variant={mode === 'preview' ? 'default' : 'ghost'} size="sm" onClick={() => onToggleMode('preview')} className="gap-1.5">
        <Eye className="w-4 h-4" /> Preview
      </Button>

      {mode === 'edit' && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(!addOpen)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add
              <ChevronDown className="w-3 h-3" />
            </Button>
            {addOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl py-1 w-40">
                  {[
                    { type: 'text', label: 'Text Box', icon: Type },
                    { type: 'image', label: 'Image', icon: ImageIcon },
                    { type: 'shape', label: 'Shape', icon: Square },
                    { type: 'lower_third', label: 'Lower Third', icon: Square },
                    { type: 'caption', label: 'Caption', icon: Type },
                  ].map(({ type, label, icon: Icon }) => (
                    <button key={type} onClick={() => { onAddElement(type); setAddOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                      <Icon className="w-4 h-4 text-muted-foreground" /> {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="ghost" size="sm" onClick={onRegenerateSlide} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Regenerate Slide
          </Button>
          {hasSelection && (
            <Button variant="ghost" size="sm" onClick={onRegenerateElement} className="gap-1.5">
              <RefreshCw className="w-4 h-4" /> Regenerate Element
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRunQA} className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Run QA
          </Button>
        </>
      )}

      <div className="flex-1" />

      {/* Export */}
      <div className="relative">
        <Button variant="ghost" size="sm" onClick={() => setExportOpen(!exportOpen)} className="gap-1.5">
          <Download className="w-4 h-4" /> Export
          <ChevronDown className="w-3 h-3" />
        </Button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
            <div className="absolute top-full right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl py-1 w-44">
              {['PDF', 'PowerPoint', 'Google Slides', 'Video', 'Present Mode'].map(fmt => (
                <button key={fmt} onClick={() => { onExport(fmt); setExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                  {fmt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}