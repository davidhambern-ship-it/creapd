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
        className={`fixed bottom-16 lg:bottom-4 right-3 lg:right-4 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg glow-purple m-fab-pulse transition-all hover:scale-105 active:scale-90 ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open CREAPD"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping-slow" />
        <Sparkles className="w-4 h-4 relative" />
      </button>

      {/* Chat panel */}
      <CreapdChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}