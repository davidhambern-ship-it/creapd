import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/**
 * PDS §4 & §7 — Empty State Component
 * "Never display 'No Data.' Instead communicate:
 *  Purpose, Suggested Action, Helpful Illustration, Quick Start.
 *  Every empty state should encourage the producer to continue."
 *
 * Props:
 *   icon         — lucide icon component (optional)
 *   title        — what this environment does / why it matters
 *   description  — helpful context
 *   action       — ReactNode (button, link) for suggested next step
 *   className    — additional classes
 */
export default function EmptyState({
  icon: Icon = Sparkles,
  title = "Nothing here yet",
  description = "",
  action = null,
  className,
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 blur-xl bg-primary/10 rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl glass-surface flex items-center justify-center border-primary/20">
          {Icon && <Icon className="w-7 h-7 text-primary" />}
        </div>
      </div>
      <h3 className="font-heading font-semibold text-lg text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}