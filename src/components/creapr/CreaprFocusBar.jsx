import React, { useEffect, useRef } from 'react';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import { useCreaprNarration } from '@/hooks/useCreaprNarration';
import GuidedFocus from '@/components/creapr/GuidedFocus';
import DecisionPacketPanel from '@/components/creapr/DecisionPacketPanel';

/**
 * Drop-in wrapper that wires the CREAPr Engine to GuidedFocus
 * and renders Decision Packets when the Brain emits them.
 *
 * Pass your researchData from useResearchProduction() and render this
 * at the top of any Research page to keep the producer oriented in the POC.
 */
export default function CreaprFocusBar({ researchData }) {
  const engine = useCreaprEngine(researchData);
  const { config, points, refresh } = researchData;

  // Connect the engine's narration queue to TTS audio playback
  useCreaprNarration(engine, { voice: 'daniel' });

  // Track whether we've already emitted a packet for the current batch of pending points
  const lastPendingCountRef = useRef(0);

  // Auto-emit a Decision Packet when research points are ready for approval (Stage 3→4 transition)
  useEffect(() => {
    if (!engine.pocState) return;

    const pendingPoints = points?.filter(p => p.status === 'pending') || [];

    // Only emit when we're at the "review points" stage AND new pending points appeared
    if (
      engine.pocState.stage === 3 &&
      pendingPoints.length > 0 &&
      pendingPoints.length !== lastPendingCountRef.current &&
      !engine.pendingPacket
    ) {
      lastPendingCountRef.current = pendingPoints.length;
      engine.emitDecisionPacket({
        title: `${pendingPoints.length} Research Point${pendingPoints.length === 1 ? '' : 's'} Ready for Review`,
        description: 'Approve these points to proceed to package generation, or reject to send them back.',
        type: 'approve_reject',
        context: [
          { label: 'Pending Points', value: pendingPoints.length },
          { label: 'Approved', value: points.filter(p => p.status === 'approved').length },
        ],
      });
    }

    // Reset counter when moving past stage 3
    if (engine.pocState.stage !== 3) {
      lastPendingCountRef.current = 0;
    }
  }, [engine.pocState, points, engine.pendingPacket, engine.emitDecisionPacket]);

  const handleResolve = async (decision) => {
    // If approved, navigate to the Research Manager to review
    if (decision.approved) {
      // Batch-approve pending points
      if (config?.id) {
        try {
          const { base44 } = await import('@/api/base44Client');
          await base44.entities.ResearchPoint.updateMany(
            { configuration_id: config.id, status: 'pending' },
            { $set: { status: 'approved' } }
          );
        } catch (err) {
          console.error('Batch approve failed:', err);
        }
        refresh?.();
      }
    }
    engine.resolveDecisionPacket(decision);
  };

  return (
    <div className="space-y-4">
      <GuidedFocus
        pocState={engine.pocState}
        guidedFocus={engine.guidedFocus}
        activeDepartment={engine.activeDepartment}
        mode={engine.mode}
      />
      {engine.pendingPacket && (
        <DecisionPacketPanel
          packet={engine.pendingPacket}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}