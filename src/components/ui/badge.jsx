import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// PDS §3 — Color Usage: each color communicates purpose
//   primary (purple)   → creative workflows
//   accent (orange)     → primary actions
//   success (emerald)   → success / growth
//   warning (amber)     → temporary caution
//   destructive (red)   → critical warnings only
//   info (blue)         → knowledge / information
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-fast ease-producer focus:outline-none focus:ring-2 focus:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25",
        secondary:
          "border-white/[0.08] bg-white/[0.06] text-secondary-foreground hover:bg-white/[0.1]",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25",
        success:
          "border-success/30 bg-success/15 text-success hover:bg-success/25",
        warning:
          "border-warning/30 bg-warning/15 text-warning hover:bg-warning/25",
        info:
          "border-info/30 bg-info/15 text-info hover:bg-info/25",
        outline: "border-border text-foreground hover:border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }