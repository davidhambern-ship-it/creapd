import React from "react";
import { cn } from "@/lib/utils";

/**
 * PDS §4 — Hero Zone Component
 * "Every screen should begin with a Hero Zone.
 *  It should communicate: Where am I? What am I working on? What is most important right now?
 *  Only one Hero should exist per screen."
 *
 * Props:
 *   title        — environment name or current work title
 *   subtitle     — context / what's most important right now
 *   icon         — lucide icon component
 *   accent       — PDS environment accent ("purple"|"orange"|"emerald"|"blue"|"info")
 *   actions      — ReactNode for contextual quick actions
 *   children     — custom hero content
 */
const ACCENT_MAP = {
  purple: "text-primary",
  orange: "text-accent",
  emerald: "text-success",
  blue: "text-info",
  info: "text-info",
};

const GLOW_MAP = {
  purple: "bg-primary/10",
  orange: "bg-accent/10",
  emerald: "bg-success/10",
  blue: "bg-info/10",
  info: "bg-info/10",
};

export default function HeroZone({
  title,
  subtitle,
  icon: Icon,
  accent = "purple",
  actions = null,
  children = null,
  className,
}) {
  return (
    <div className={cn("glass-hero p-6 md:p-8 ambient-glow", className)}>
      <div className="flex items-start gap-4 flex-wrap">
        {Icon && (
          <div className="relative flex-shrink-0">
            <div className={cn("absolute inset-0 blur-2xl rounded-2xl", GLOW_MAP[accent])} />
            <div className="relative w-12 h-12 rounded-xl glass-surface flex items-center justify-center border-white/10">
              <Icon className={cn("w-6 h-6", ACCENT_MAP[accent])} />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}