import React, { useMemo } from "react";

export default function AuthImmersiveLayout({ icon: Icon, title, subtitle, footer, children }) {
  const floatingPanels = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        top: `${8 + Math.random() * 80}%`,
        left: i % 2 === 0 ? `${Math.random() * 12}%` : `${78 + Math.random() * 14}%`,
        width: `${80 + Math.random() * 60}px`,
        height: `${100 + Math.random() * 120}px`,
        delay: `${Math.random() * 4}s`,
        lines: Math.floor(3 + Math.random() * 5),
      })),
    []
  );

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, hsl(190 60% 10% / 0.6) 0%, transparent 55%)," +
          "radial-gradient(ellipse at 15% 80%, hsl(270 60% 12% / 0.4) 0%, transparent 50%)," +
          "radial-gradient(ellipse at 85% 70%, hsl(190 50% 10% / 0.3) 0%, transparent 50%)," +
          "hsl(220 20% 5%)",
      }}
    >
      {/* Grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[280px] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(190 60% 45% / 0.08) 1px, transparent 1px)," +
            "linear-gradient(90deg, hsl(190 60% 45% / 0.08) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "8%", left: "6%", width: "320px", height: "320px",
            background: "radial-gradient(circle, hsl(190 80% 50% / 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "45%", right: "8%", width: "360px", height: "360px",
            background: "radial-gradient(circle, hsl(270 70% 55% / 0.09) 0%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
      </div>

      {/* Floating data panels (XL only) */}
      {floatingPanels.map((panel) => (
        <div
          key={panel.id}
          className="absolute pointer-events-none hidden xl:block"
          style={{
            top: panel.top,
            left: panel.left,
            width: panel.width,
            height: panel.height,
            animation: `cc-fade-in 1.5s ease-out ${panel.delay} both`,
          }}
        >
          <div
            className="h-full w-full rounded-lg overflow-hidden"
            style={{
              background: "hsl(190 30% 8% / 0.4)",
              border: "1px solid hsl(190 40% 30% / 0.25)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 0 16px hsl(190 50% 20% / 0.08)",
            }}
          >
            <div
              className="h-1.5"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(190 60% 40% / 0.5), transparent)",
              }}
            />
            <div className="p-2 space-y-1.5">
              {Array.from({ length: panel.lines }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-sm"
                  style={{
                    height: "3px",
                    width: `${40 + Math.random() * 50}%`,
                    background: `hsl(${j % 2 === 0 ? "190" : "270"} 40% 35% / ${0.2 + Math.random() * 0.15})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ═══ Card ═══ */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(190 60% 20%), hsl(270 60% 22%))",
              border: "1px solid hsl(190 50% 40% / 0.5)",
              boxShadow: "0 0 28px hsl(190 60% 40% / 0.2), inset 0 1px 0 hsl(190 40% 40% / 0.2)",
            }}
          >
            {Icon && <Icon className="w-7 h-7" style={{ color: "hsl(190 80% 65%)" }} aria-hidden="true" />}
          </div>
          <h1
            className="text-3xl font-bold tracking-tight text-white"
            style={{ textShadow: "0 0 24px hsl(190 80% 60% / 0.25)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2" style={{ color: "hsl(220 10% 62%)" }}>{subtitle}</p>
          )}
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 relative"
          style={{
            background: "hsl(220 25% 10% / 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid hsl(190 40% 35% / 0.3)",
            boxShadow: "0 12px 48px hsl(220 40% 3% / 0.6), 0 0 36px hsl(190 50% 30% / 0.08), inset 0 1px 0 hsl(190 40% 45% / 0.1)",
          }}
        >
          {/* Top neon edge */}
          <div
            className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, transparent, hsl(190 70% 55% / 0.6), transparent)" }}
          />

          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="mt-6 rounded-lg px-4 py-3 text-center text-sm"
            style={{
              background: "hsl(220 25% 10% / 0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid hsl(190 30% 30% / 0.2)",
              color: "hsl(220 10% 58%)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}