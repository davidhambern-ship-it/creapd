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
        className={`fixed bottom-5 right-5 z-40 lg:bottom-6 lg:right-6 flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg glow-purple transition-all hover:scale-105 active:scale-95 relative ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open CREAPD"
      >
        <div className="flex items-center gap-2 px-4 py-3 relative">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-heading font-semibold hidden sm:inline">CREAPD</span>
        </div>
      </button>

      {/* Chat panel */}
      <CreapdChat open={open} onClose={() => setOpen(false)} />
    </>
  );
}