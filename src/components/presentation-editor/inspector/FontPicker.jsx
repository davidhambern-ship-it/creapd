import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function FontPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-xl max-h-52 overflow-y-auto py-0.5">
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
      )}
    </div>
  );
}