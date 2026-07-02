import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// PDS §7 — Notifications/Alerts should inform without interrupting
// PDS §3 — Color semantics: success=emerald, warning=amber, destructive=red, info=blue
// PDS §6 — Errors should educate, not blame; success should reward subtly
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-normal ease-producer [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "glass-surface text-foreground border-border",
        success:
          "border-success/30 bg-success/10 text-foreground [&>svg]:text-success shadow-glow-emerald",
        warning:
          "border-warning/30 bg-warning/10 text-foreground [&>svg]:text-warning",
        info:
          "border-info/30 bg-info/10 text-foreground [&>svg]:text-info",
        destructive:
          "border-destructive/30 bg-destructive/10 text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props} />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-heading font-medium leading-none tracking-tight", className)}
    {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground [&_p]:leading-relaxed", className)}
    {...props} />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }