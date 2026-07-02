import React from "react";
import { cn } from "@/lib/utils";

/**
 * PDS §4 & §7 — Loading Skeleton Component
 * "Loading should communicate progress.
 *  Support: Skeleton interfaces, animated placeholders, progress bars,
 *  meaningful status messages, background task indicators.
 *  Avoid blank screens whenever possible."
 *
 * Props:
 *   variant  — "card" | "text" | "row" | "circle"
 *   count    — number of skeleton items to render
 *   className — additional classes
 */
export default function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
}) {
  const variants = {
    card: "h-32 rounded-xl",
    text: "h-4 rounded w-3/4",
    row: "h-12 rounded-lg",
    circle: "h-10 w-10 rounded-full",
  };

  if (count === 1) {
    return <div className={cn("shimmer", variants[variant], className)} />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("shimmer", variants[variant], className)} />
      ))}
    </div>
  );
}

/**
 * PDS §6 — AI Thinking Indicator
 * "Avoid generic 'thinking...' indicators.
 *  Show: thought indicators, connection animations, progress,
 *  preparation, assembly, generation."
 */
export function AIThinkingIndicator({ label = "Producer AI is working" }) {
  return (
    <div className="flex items-center gap-2.5 py-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-primary animate-ai-thinking" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-ai-thinking" style={{ animationDelay: "200ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-ai-thinking" style={{ animationDelay: "400ms" }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono">{label}…</span>
    </div>
  );
}