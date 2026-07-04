import React from "react";
import { useCreapdMessage } from "@/hooks/useCreapdMessage";
import CreapdLogo from "@/components/brand/CreapdLogo";

/**
 * Branded CREAPD loading component.
 *
 * Layout: animated CREAPD logo → rotating personality message → optional progress bar.
 * Replace generic spinners / "Loading…" text with this component.
 *
 * @param {object} props
 * @param {string|null} props.profile — active production profile key
 * @param {number} props.progress — 0–100 progress value (omits bar when undefined)
 * @param {string} props.size — "sm" | "md" | "lg"
 * @param {boolean} props.fullHeight — vertically center within parent
 */
export default function CreapdLoading({
  profile = null,
  progress,
  size = "md",
  fullHeight = false,
}) {
  const { message, key } = useCreapdMessage({ profile });

  const logoSize = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-16 h-16" : "w-12 h-12";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const showProgress = typeof progress === "number" && progress >= 0;

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullHeight ? "h-full" : "py-12"} px-4 text-center`}>
      <div className={`${logoSize} animate-gentle-float flex items-center justify-center`}>
        <CreapdLogo showWordmark={false} height={logoSize} />
      </div>

      <div className="relative h-6 min-w-[200px] flex items-center justify-center">
        <p
          key={key}
          className={`${textSize} font-heading font-medium text-foreground/80 animate-fade-in`}
        >
          {message}
        </p>
      </div>

      {showProgress && (
        <div className="w-full max-w-xs h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-berna-purple to-berna-orange transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}