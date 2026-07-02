import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PDS §5 — Environment Breadcrumb
 * "Provide intelligent breadcrumbs. Breadcrumbs should communicate location
 *  without consuming unnecessary space."
 *
 * Props:
 *   items — array of { label, path? } objects; last item is current location
 *   className — additional classes
 */
export default function EnvironmentBreadcrumb({ items = [], className }) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground flex-wrap",
        className
      )}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-accent transition-colors duration-fast ease-producer"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && "text-foreground font-medium")}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}