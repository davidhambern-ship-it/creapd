import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Upload, Loader2 } from 'lucide-react';

export default function FontPicker({ value, options, onChange, onUpload, uploading }) {
  const [open, setOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [fontName, setFontName] = useState('');
  const ref = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = fontName.trim() || file.name.replace(/\.[^.]+$/, '');
    onUpload?.(file, name);
    setShowUpload(false);
    setFontName('');
    e.target.value = '';
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8"
        style={{ fontFamily: value || 'Inter' }}
      >
        <span className="truncate">{value || 'Select font'}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-xl max-h-64 overflow-y-auto">
          <div className="overflow-y-auto py-0.5 max-h-48">
            {options.map(font => (
              <button
                key={font}
                type="button"
                onClick={() => { onChange(font); setOpen(false); }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-muted text-left"
                style={{ fontFamily: font }}
              >
                <span className="truncate">{font}</span>
                {value === font && <Check className="w-3 h-3 flex-shrink-0 text-primary" />}
              </button>
            ))}
          </div>
          {onUpload && (
            <>
              <div className="border-t border-border" />
              {showUpload ? (
                <div className="p-2 space-y-1.5">
                  <input
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    placeholder="Font display name..."
                    className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary text-primary-foreground rounded-md px-2 py-1.5 h-8 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowUpload(false); setFontName(''); }}
                      className="text-xs bg-muted rounded-md px-2 h-8"
                    >Cancel</button>
                  </div>
                  <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFile} className="hidden" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs hover:bg-muted text-muted-foreground"
                >
                  <Upload className="w-3 h-3" /> Upload Custom Font
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}