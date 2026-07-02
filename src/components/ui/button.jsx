import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// PDS §7 — Primary: highest visual priority, orange accent, subtle glow, hover elevation, press animation
// PDS §7 — Secondary: lower emphasis, glass styling, minimal glow
// PDS §7 — Tertiary: low-priority utility, never competes with primary
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-normal ease-producer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-elevation-2 hover:shadow-glow-orange hover:-translate-y-px hover:bg-accent/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elevation-1 hover:bg-destructive/90 hover:shadow-elevation-2",
        outline:
          "glass-surface text-foreground hover:border-accent/30 hover:text-accent hover:shadow-elevation-1",
        secondary:
          "glass-surface-elevated text-foreground shadow-elevation-1 hover:shadow-elevation-2 hover:border-primary/20",
        ghost: "hover:bg-white/[0.06] hover:text-accent-foreground",
        link: "text-accent underline-offset-4 hover:underline hover:text-accent/80",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }