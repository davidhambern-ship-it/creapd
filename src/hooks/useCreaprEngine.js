/**
 * CREAPr Engine — CBS Parts 5 & 6
 * 
 * The Engine provides:
 * - POC stage tracking (derived from entity states)
 * - Guided Focus state (where am I, what's happening, what's next)
 * - Department coordination
 * - Decision Packet management
 * - CREAPr narration triggers
 * 
 * This hook wraps the existing useResearchProduction data and
 * adds the Brain's decision layer on top.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { deriveResearchPOCStage, POC_STAGES } from '@/lib/pocStageTracker';
import { DEPARTMENTS, getDepartmentForStage, classifyIntent } from '@/lib/departmentRegistry';
import { useCREAPMode } from '@/context/CREAPModeContext';

export function useCreaprEngine(researchData) {
  const { mode, traits } = useCREAPMode();
  const { config, topics, points, packages, dossiers } = researchData;

  // Derived POC state
  const [pocState, setPocState] = useState(null);
  
  // Department activity tracking
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [departmentActivity, setDepartmentActivity] = useState([]);

  // Decision Packet state
  const [pendingPacket, setPendingPacket] = useState(null);

  // CREAPr narration queue
  const [narrationQueue, setNarrationQueue] = useState([]);
  const [currentNarration, setCurrentNarration] = useState(null);

  // Refs for avoiding stale closures
  const pocStateRef = useRef(null);
  const modeRef = useRef(mode);

  useEffect(() => { pocStateRef.current = pocState; }, [pocState]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Derive POC stage whenever entity data changes
  useEffect(() => {
    const derived = deriveResearchPOCStage({ config, topics, points, packages, dossiers });
    setPocState(derived);
    
    // Update active department based on stage
    const dept = getDepartmentForStage(derived.stage);
    if (dept && dept.key !== activeDepartment?.key) {
      setActiveDepartment(dept);
    }
  }, [config, topics, points, packages, dossiers]);

  /**
   * Enqueue a narration for CREAPr to speak.
   * The UI layer picks these up and plays them via TTS.
   */
  const enqueueNarration = useCallback((text, metadata = {}) => {
    const narration = {
      id: `narr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      metadata: { ...metadata, pocStage: pocStateRef.current?.stage, mode: modeRef.current },
      timestamp: new Date().toISOString(),
    };
    setNarrationQueue(prev => [...prev, narration]);
  }, []);

  /**
   * Pop the next narration from the queue.
   */
  const consumeNarration = useCallback(() => {
    setNarrationQueue(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setCurrentNarration(next);
      return rest;
    });
  }, []);

  /**
   * Clear current narration after it's been spoken.
   */
  const clearNarration = useCallback(() => {
    setCurrentNarration(null);
  }, []);

  /**
   * Emit a Decision Packet — CBS Part 4.
   * The UI renders the packet and routes the producer's decision back.
   */
  const emitDecisionPacket = useCallback((packet) => {
    setPendingPacket({
      ...packet,
      emitted_at: new Date().toISOString(),
      poc_stage: pocStateRef.current?.stage,
    });
  }, []);

  /**
   * Resolve a Decision Packet with the producer's decision.
   */
  const resolveDecisionPacket = useCallback((decision) => {
    setPendingPacket(null);
    return decision;
  }, []);

  /**
   * Determine if an action should be automated based on CREAP Mode.
   * CBS Section 5.3 — Mode-Based Automation Behavior.
   */
  const shouldAutomate = useCallback((actionType) => {
    const CREAP_MODES = { AUTOPILOT: 'autopilot', HYBRID: 'hybrid', FREE: 'free' };
    const m = modeRef.current;

    if (m === CREAP_MODES.AUTOPILOT) {
      // Automate everything except creative decisions
      return actionType !== 'creative';
    }
    if (m === CREAP_MODES.HYBRID) {
      // Only automate operational tasks
      return actionType === 'operational';
    }
    // FREE mode — no automation
    return false;
  }, []);

  /**
   * Classify a producer message and determine the next action.
   * Uses deterministic rules first, falls back to AI escalation.
   * CBS Section 6.1 — AI Escalation Points.
   */
  const classifyProducerMessage = useCallback(async (message) => {
    // Step 1: Try deterministic classification
    const result = classifyIntent(message);
    if (result && result.confidence >= 0.7) {
      return result;
    }

    // Step 2: AI Escalation Point E1 — Ambiguous Intent
    try {
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Classify the producer's intent. Current POC stage: ${pocStateRef.current?.stageInfo?.name || 'unknown'}.

Producer said: "${message}"

Available departments:
- sift: Content acquisition, story fetching, classification
- research: Deep research, topic investigation, dossier assembly
- manager: Package generation, voiceover, script creation
- apd: Presentation assembly, slide generation, visual production

Return JSON with: intent (short label), department (sift|research|manager|apd|null), action (delegate|respond|clarify), confidence (0-1).`,
        model: 'gpt_5_mini',
        response_json_schema: {
          type: 'object',
          properties: {
            intent: { type: 'string' },
            department: { type: 'string', enum: ['sift', 'research', 'manager', 'apd', 'null'] },
            action: { type: 'string', enum: ['delegate', 'respond', 'clarify'] },
            confidence: { type: 'number' },
          },
        },
      });
      return {
        department: llmResult?.department === 'null' ? null : llmResult?.department,
        action: llmResult?.action || 'respond',
        confidence: llmResult?.confidence || 0,
        intent: llmResult?.intent,
      };
    } catch (err) {
      console.error('Intent classification failed:', err);
      return { department: null, action: 'respond', confidence: 0 };
    }
  }, []);

  // Guided Focus state — CBS Principle 6
  const guidedFocus = pocState ? {
    stage: pocState.stage,
    stageName: pocState.stageInfo.name,
    stageDescription: pocState.stageInfo.description,
    whereAmI: pocState.stageInfo.name,
    whatsHappening: pocState.pendingAction,
    whatNext: pocState.nextRoute,
    activeDepartment,
    mode,
    traits,
  } : null;

  return {
    // POC State
    pocState,
    pocStages: POC_STAGES,
    guidedFocus,

    // Department coordination
    activeDepartment,
    departmentActivity,
    departments: DEPARTMENTS,

    // Decision Packets
    pendingPacket,
    emitDecisionPacket,
    resolveDecisionPacket,

    // CREAPr narration
    narrationQueue,
    currentNarration,
    enqueueNarration,
    consumeNarration,
    clearNarration,

    // Brain decisions
    shouldAutomate,
    classifyProducerMessage,

    // Mode
    mode,
    traits,
  };
}