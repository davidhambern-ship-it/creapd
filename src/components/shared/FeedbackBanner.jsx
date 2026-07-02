import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * PDS §7 — Success & Error Components
 *
 * Success: "Emerald accent, soft glow, confirmation animation.
 *  Never over-celebrate routine actions."
 *
 * Error: "Errors should educate. Support: explanation, recovery,
 *  suggested fix, retry, help. Errors should never blame the producer."
 *
 * Props:
 *   variant  — "success" | "error" | "warning" | "info"
 *   title    — headline message
 *   message  — explanation of what happened
 *   recovery — optional ReactNode (retry button, link, etc.)
 *   onClose  — optional dismiss handler
 */
const VARIANTS = {
  success: {
    icon: CheckCircle2,
    color: "text-success",
    border: "border-success/30",
    bg: "bg-success/10",
    glow: "shadow-glow-emerald",
    defaultTitle: "Completed",
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    border: "border-destructive/30",
    bg: "bg-destructive/10",
    glow: "",
    defaultTitle: "Something went wrong",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    border: "border-warning/30",
    bg: "bg-warning/10",
    glow: "",
    defaultTitle: "Needs attention",
  },
  info: {
    icon: Info,
    color: "text-info",
    border: "border-info/30",
    bg: "bg-info/10",
    glow: "",
    defaultTitle: "Information",
  },
};

export default function FeedbackBanner({
  variant = "info",
  title,
  message = "",
  recovery = null,
  onClose = null,
  className,
}) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 flex items-start gap-3 transition-all duration-normal ease-producer",
        config.border,
        config.bg,
        config.glow,
        variant === "success" && "animate-success-glow",
        className
      )}
      role="alert"
    >
      {Icon && <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.color)} />}

      <div className="flex-1 min-w-0">
        <h5 className={cn("font-heading font-medium leading-tight tracking-tight mb-0.5", config.color)}>
          {title || config.defaultTitle}
        </h5>
        {message && (
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        )}
        {recovery && <div className="mt-2.5">{recovery}</div>}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-producer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}