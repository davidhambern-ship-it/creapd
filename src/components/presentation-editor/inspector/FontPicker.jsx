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
        className="cpe-select flex items-center justify-between"
        style={{ fontFamily: value || 'Inter' }}
      >
        <span className="truncate">{value || 'Select font'}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="cpe-dropdown absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto">
          <div className="overflow-y-auto py-0.5 max-h-48">
            {options.map(font => (
              <button
                key={font}
                type="button"
                onClick={() => { onChange(font); setOpen(false); }}
                className="cpe-dropdown-item justify-between"
                style={{ fontFamily: font }}
              >
                <span className="truncate">{font}</span>
                {value === font && <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(152 60% 45%)' }} />}
              </button>
            ))}
          </div>
          {onUpload && (
            <>
              <div className="my-1" style={{ borderTop: '1px solid hsl(220 8% 15%)' }} />
              {showUpload ? (
                <div className="p-2 space-y-1.5">
                  <input
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    placeholder="Font display name..."
                    className="cpe-input"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="cpe-mini-btn flex-1"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowUpload(false); setFontName(''); }}
                      className="cpe-mini-btn"
                    >Cancel</button>
                  </div>
                  <input ref={fileRef} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFile} className="hidden" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="cpe-dropdown-item"
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