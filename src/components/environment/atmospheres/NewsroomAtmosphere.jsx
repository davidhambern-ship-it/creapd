import React from 'react';

// CREAPD News — immersive broadcast studio environment.
// The generated newsroom asset establishes the physical set; CSS overlays keep
// page content readable without flattening the environment back into a generic app.
export default function NewsroomAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.015]"
        style={{ backgroundImage: "url('/assets/news/NewsPP_Backdrop_01.png')" }}
      />

      {/* Darken the lower work surface and extreme edges while preserving the set. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.16)_0%,rgba(0,0,0,.30)_42%,rgba(0,0,0,.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(0,0,0,.54)_100%)]" />

      {/* Broadcast-light sweeps echo the CREAPD palette. */}
      <div className="absolute -top-24 left-[8%] h-72 w-72 rounded-full bg-orange-500/[0.09] blur-[90px] animate-orb-1" />
      <div className="absolute top-[8%] right-[7%] h-80 w-80 rounded-full bg-cyan-400/[0.07] blur-[100px] animate-orb-2" />
      <div className="absolute bottom-[4%] left-1/2 h-40 w-[62%] -translate-x-1/2 rounded-full bg-purple-600/[0.08] blur-[80px]" />

      {/* Fine broadcast scan texture. */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,.24) 0, rgba(255,255,255,.24) 1px, transparent 1px, transparent 4px)',
        }}
      />
      <div className="cc-scan-line opacity-30" />
    </div>
  );
}
