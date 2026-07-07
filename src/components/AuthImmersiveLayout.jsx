import React, { useMemo } from "react";

/**
 * Immersive sci-fi auth layout — CSS-only atmospheric backdrop with
 * glassmorphism login card. No Three.js — keeps the auth screen fast.
 */
export default function AuthImmersiveLayout({ icon: Icon, title, subtitle, footer, children }) {
  // Pre-generate floating panel positions so they don't re-randomize on re-render
  const floatingPanels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        top: `${8 + Math.random() * 80}%`,
        left: i % 2 === 0 ? `${Math.random() * 12}%` : `${78 + Math.random() * 14}%`,
        width: `${80 + Math.random() * 60}px`,
        height: `${100 + Math.random() * 120}px`,
        delay: `${Math.random() * 6}s`,
        duration: `${8 + Math.random() * 8}s`,
        lines: Math.floor(3 + Math.random() * 5),
      })),
    []
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(190 60% 8% / 0.8) 0%, transparent 60%)," +
          "radial-gradient(ellipse at 15% 80%, hsl(270 60% 10% / 0.5) 0%, transparent 50%)," +
          "radial-gradient(ellipse at 85% 70%, hsl(190 50% 8% / 0.4) 0%, transparent 50%)," +
          "hsl(220 20% 4%)",
      }}
    >
      {/* ═══ Atmospheric backdrop ═══ */}

      {/* Animated grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[280px] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(190 60% 45% / 0.07) 1px, transparent 1px)," +
            "linear-gradient(90deg, hsl(190 60% 45% / 0.07) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          maskImage: "linear-gradient(to top, hsl(0 0% 0% / 1), transparent)",
          WebkitMaskImage: "linear-gradient(to top, hsl(0 0% 0% / 1), transparent)",
          animation: "cc-grid-floor-pan 10s linear infinite",
        }}
      />

      {/* Drifting glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "10%", left: "8%", width: "300px", height: "300px",
            background: "radial-gradient(circle, hsl(190 80% 50% / 0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "cc-orb-1 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "50%", right: "10%", width: "350px", height: "350px",
            background: "radial-gradient(circle, hsl(270 70% 55% / 0.07) 0%, transparent 70%)",
            filter: "blur(70px)",
            animation: "cc-orb-2 24s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "5%", left: "30%", width: "250px", height: "250px",
            background: "radial-gradient(circle, hsl(152 60% 45% / 0.05) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "cc-orb-3 18s ease-in-out infinite",
          }}
        />
      </div>

      {/* Scan line sweep */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: "2px",
          background: "linear-gradient(90deg, transparent, hsl(190 80% 55% / 0.35), transparent)",
          boxShadow: "0 0 12px hsl(190 80% 55% / 0.25)",
          animation: "cc-scan-sweep 12s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />

      {/* Floating data panels — decorative side elements */}
      {floatingPanels.map((panel) => (
        <div
          key={panel.id}
          className="absolute pointer-events-none hidden xl:block"
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
            opacity: 0,
            animation: `cc-fade-in 1s ease-out ${panel.delay} forwards, cc-fade-up 6s ease-in-out ${panel.duration} infinite alternate`,
            animationDelay: `${panel.delay}, ${panel.delay}`,
          }}
        >
          <div
            className="h-full w-full rounded-lg overflow-hidden"
            style={{
              background: "hsl(190 30% 8% / 0.35)",
              border: "1px solid hsl(190 40% 30% / 0.2)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 0 16px hsl(190 50% 20% / 0.06)",
            }}
          >
            {/* Panel header bar */}
            <div
              className="h-1.5"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(190 60% 40% / 0.4), transparent)",
              }}
            />
            {/* Panel content lines — fake data bars */}
            <div className="p-2 space-y-1.5">
              {Array.from({ length: panel.lines }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-sm"
                  style={{
                    height: "3px",
                    width: `${40 + Math.random() * 50}%`,
                    background: `hsl(${j % 2 === 0 ? "190" : "270"} 40% 35% / ${0.15 + Math.random() * 0.15})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ═══ Login card ═══ */}
      <div className="relative z-10 w-full max-w-md cc-animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(190 60% 18%), hsl(270 60% 20%))",
              border: "1px solid hsl(190 50% 35% / 0.4)",
              boxShadow: "0 0 24px hsl(190 60% 40% / 0.15), inset 0 1px 0 hsl(190 40% 40% / 0.15)",
            }}
          >
            <Icon className="w-7 h-7" style={{ color: "hsl(190 80% 60%)" }} aria-hidden="true" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              color: "hsl(0 0% 100%)",
              textShadow: "0 0 20px hsl(190 80% 60% / 0.2)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2" style={{ color: "hsl(220 10% 60%)" }}>{subtitle}</p>
          )}
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "hsl(220 25% 8% / 0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid hsl(190 40% 30% / 0.25)",
            boxShadow: "0 12px 48px hsl(220 40% 3% / 0.5), 0 0 32px hsl(190 50% 25% / 0.06), inset 0 1px 0 hsl(190 40% 40% / 0.08)",
          }}
        >
          {/* Top neon edge */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(190 70% 50% / 0.5), transparent)",
            }}
          />
          {/* Shimmer sweep */}
          <div className="holo-shimmer absolute inset-0 rounded-2xl pointer-events-none" />

          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6">
            <div
              className="rounded-lg px-4 py-3 text-center text-sm"
              style={{
                background: "hsl(220 25% 8% / 0.4)",
                backdropFilter: "blur(8px)",
                border: "1px solid hsl(190 30% 25% / 0.15)",
                color: "hsl(220 10% 55%)",
              }}
            >
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}