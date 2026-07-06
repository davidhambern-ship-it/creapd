import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, AlertCircle, ChevronRight, Loader2, Lightbulb } from 'lucide-react';

/**
 * Decision Packet UI — CBS Part 4
 *
 * Renders a pending decision from the CREAPr Engine.
 * The producer resolves it with their choice, which routes back through resolveDecisionPacket().
 *
 * Packet shape:
 * {
 *   title: string,
 *   description: string,
 *   type: 'approve_reject' | 'choice' | 'confirm',
 *   options?: [{ label, value, description? }],  // for 'choice'
 *   context?: { label, value }[],                // optional context rows
 *   poc_stage?: number,
 *   emitted_at?: string,
 * }
 */
export default function DecisionPacketPanel({ packet, onResolve }) {
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(false);

  if (!packet) return null;

  const handleResolve = async (decision) => {
    setResolving(true);
    try {
      await onResolve?.(decision);
    } finally {
      setResolving(false);
      setSelected(null);
    }
  };

  const type = packet.type || 'confirm';

  return (
    <div className="glass-panel p-5 border-primary/20 glow-purple animate-slide-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Decision Required</span>
            {packet.poc_stage != null && (
              <span className="text-[10px] text-muted-foreground">Stage {packet.poc_stage}</span>
            )}
          </div>
          <h3 className="text-base font-heading font-semibold leading-tight">{packet.title}</h3>
          {packet.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-snug">{packet.description}</p>
          )}
        </div>
      </div>

      {/* Context rows */}
      {packet.context?.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {packet.context.map((row, i) => (
            <div key={i} className="rounded-md bg-muted/30 px-3 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
              <p className="text-sm font-medium truncate">{row.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Decision controls by type */}
      {type === 'approve_reject' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={resolving}
            onClick={() => handleResolve({ approved: true })}
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            disabled={resolving}
            onClick={() => handleResolve({ approved: false })}
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {type === 'choice' && packet.options?.length > 0 && (
        <div className="space-y-2">
          {packet.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                disabled={resolving}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    {opt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
              </button>
            );
          })}
          <Button
            size="sm"
            className="w-full"
            disabled={!selected || resolving}
            onClick={() => handleResolve({ choice: selected })}
          >
            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-1" />}
            Confirm Selection
          </Button>
        </div>
      )}

      {type === 'confirm' && (
        <Button
          size="sm"
          className="w-full"
          disabled={resolving}
          onClick={() => handleResolve({ confirmed: true })}
        >
          {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          Got it
        </Button>
      )}
    </div>
  );
}