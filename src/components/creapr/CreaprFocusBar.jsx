import React from 'react';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import GuidedFocus from '@/components/creapr/GuidedFocus';

/**
 * Drop-in wrapper that wires the CREAPr Engine to GuidedFocus.
 * Pass your researchData from useResearchProduction() and render this
 * at the top of any Research page to keep the producer oriented in the POC.
 */
export default function CreaprFocusBar({ researchData }) {
  const engine = useCreaprEngine(researchData);
  return (
    <GuidedFocus
      pocState={engine.pocState}
      guidedFocus={engine.guidedFocus}
      activeDepartment={engine.activeDepartment}
      mode={engine.mode}
    />
  );
}