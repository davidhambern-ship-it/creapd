import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

/**
 * PDS §6 — Background Automation Status Bar
 * "Background systems should communicate activity without demanding attention.
 *  Examples: Library growing, Seeder importing, Knowledge Graph updating,
 *  Research indexing, Search rebuilding. Automation indicators should remain subtle."
 *
 * Props:
 *   tasks — array of { id, label, status: "running"|"completed"|"idle", progress? }
 *   className — additional classes
 */
export default function AutomationStatusBar({ tasks = [], className }) {
  const [dismissed, setDismissed] = useState(false);

  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "completed");
  const hasRunning = tasks.some((t) => t.status === "running");

  // Auto-dismiss completed tasks after a delay if nothing is running
  useEffect(() => {
    if (!hasRunning && activeTasks.length > 0) {
      const timer = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(timer);
    }
    setDismissed(false);
  }, [hasRunning, activeTasks.length]);

  if (dismissed || activeTasks.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 glass-surface-elevated rounded-xl border border-white/[0.08] px-4 py-3 shadow-elevation-3 max-w-xs",
        "animate-stagger-in",
        className
      )}
    >
      <div className="space-y-2">
        {activeTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2.5 text-xs">
            {task.status === "running" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
            )}
            <span className="flex-1 text-foreground font-medium truncate">{task.label}</span>
            {task.status === "running" && task.progress != null && (
              <span className="text-muted-foreground font-mono">{task.progress}%</span>
            )}
            {task.status === "completed" && (
              <Sparkles className="w-3 h-3 text-success/50" />
            )}
          </div>
        ))}
      </div>
      {hasRunning && (
        <div className="mt-2 h-0.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-primary/50 shimmer" style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}