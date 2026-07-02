import * as React from "react"

import { cn } from "@/lib/utils"

// PDS §7 — Card variants:
//   default:       Information Card — visually calm, no interaction demand
//   hero:          Hero Card — dominates visual hierarchy, glass + elevation-4
//   action:        Action Card — lifts on hover, glows subtly, feels clickable
//   workspace:     Workspace Card — prioritizes editing, minimal decoration

const Card = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border text-card-foreground transition-all duration-normal ease-producer",
      variant === "default" && "glass-surface shadow-elevation-1",
      variant === "hero" && "glass-hero",
      variant === "action" && "glass-surface shadow-elevation-2 hover:shadow-elevation-3 hover:-translate-y-0.5 hover:border-accent/20 cursor-pointer",
      variant === "workspace" && "glass-surface-elevated",
      className
    )}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-heading font-semibold leading-none tracking-tight", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }