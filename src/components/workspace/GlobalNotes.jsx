import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function GlobalNotes({ notes, onChange }) {
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleChange = (e) => {
    setLocalNotes(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="glass-panel p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white neon-underline">Global Production Notes</h3>
        <Save className="w-3 h-3 text-berna-emerald" />
      </div>
      <textarea
        value={localNotes}
        onChange={handleChange}
        placeholder="Opening remarks, sponsor reminders, guest information, equipment reminders, studio notes, crew instructions, closing remarks..."
        className="w-full h-32 rounded-lg bg-white/[0.02] border border-white/[0.06] p-2 text-xs text-white/80 placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-berna-purple/40"
      />
      <p className="text-[9px] text-muted-foreground">Auto-saved</p>
    </div>
  );
}