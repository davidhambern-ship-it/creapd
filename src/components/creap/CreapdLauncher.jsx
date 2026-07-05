import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import CreapdChat from './CreapdChat';

export default function CreapdLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-4 right-4 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg glow-purple transition-all hover:scale-105 active:scale-95 ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open CREAPD"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Chat panel */}
      <CreapdChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}