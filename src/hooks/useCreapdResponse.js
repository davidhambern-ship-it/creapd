import { useState, useRef, useCallback, useEffect } from "react";
import {
  CREAP_MODES,
  generateResponse,
  generateDeadSpace,
  IDLE_THRESHOLDS,
} from "@/lib/creapdPersonality";

/**
 * CREAPD Response Hook — the conversational personality engine.
 *
 * Provides reactive CREAPD responses based on:
 *   - The active CREAP mode (AUTOPILOT / HYBRID / FREE)
 *   - The action category (acknowledgment, approval, decision_packet, etc.)
 *   - Idle duration (drives dead space messages)
 *   - Processing state (drives processing dead space)
 *
 * Usage:
 *   const { response, deadSpace, respond, resetIdle } = useCreapdResponse({
 *     mode: CREAP_MODES.HYBRID,
 *     profile: "news",
 *   });
 *
 *   respond("approval");                           // → "That angle has teeth. Keep it."
 *   respond("decision_packet", { count: 34 });     // → "I axed 22, kept 12..."
 *
 * @param {object} opts
 * @param {string} opts.mode — CREAP_MODES value (default HYBRID)
 * @param {string|null} opts.profile — production profile key
 * @param {boolean} opts.isProcessing — whether CREAPD is actively working
 * @returns {object} { response, deadSpace, respond, resetIdle, isIdle }
 */
export function useCreapdResponse({
  mode = CREAP_MODES.HYBRID,
  profile = null,
  isProcessing = false,
} = {}) {
  const [response, setResponse] = useState("");
  const [deadSpace, setDeadSpace] = useState(null);

  const lastResponseRef = useRef(null);
  const lastDeadSpaceRef = useRef(null);
  const lastInteractionRef = useRef(Date.now());
  const idleTimerRef = useRef(null);
  const deadSpaceRotationRef = useRef(null);

  // Reset idle timer on any interaction
  const resetIdle = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setDeadSpace(null);
    if (deadSpaceRotationRef.current) {
      clearTimeout(deadSpaceRotationRef.current);
      deadSpaceRotationRef.current = null;
    }
  }, []);

  // Generate a personality response for a given category
  const respond = useCallback(
    (category, tokens = {}) => {
      const msg = generateResponse({
        category,
        mode,
        profile,
        tokens,
        lastResponse: lastResponseRef.current,
      });
      lastResponseRef.current = msg;
      setResponse(msg);
      resetIdle();
      return msg;
    },
    [mode, profile, resetIdle]
  );

  // Clear the current response
  const clear = useCallback(() => {
    setResponse("");
  }, []);

  // Track idle time and emit dead space messages
  useEffect(() => {
    // FREE mode never shows dead space
    if (mode === CREAP_MODES.FREE) {
      setDeadSpace(null);
      return undefined;
    }

    const checkIdle = () => {
      const idleMs = Date.now() - lastInteractionRef.current;

      // If processing, always show processing dead space
      if (isProcessing) {
        const msg = generateDeadSpace({
          idleMs,
          mode,
          isProcessing: true,
          lastResponse: lastDeadSpaceRef.current,
        });
        if (msg && msg !== lastDeadSpaceRef.current) {
          lastDeadSpaceRef.current = msg;
          setDeadSpace(msg);
        }
      } else if (idleMs >= IDLE_THRESHOLDS.SHORT) {
        // Idle dead space
        const msg = generateDeadSpace({
          idleMs,
          mode,
          isProcessing: false,
          lastResponse: lastDeadSpaceRef.current,
        });
        if (msg && msg !== lastDeadSpaceRef.current) {
          lastDeadSpaceRef.current = msg;
          setDeadSpace(msg);
        }
      } else {
        setDeadSpace(null);
      }

      // Schedule next check — rotate every 8 seconds once idle
      deadSpaceRotationRef.current = setTimeout(checkIdle, 8000);
    };

    // Start checking after a short delay
    idleTimerRef.current = setTimeout(checkIdle, IDLE_THRESHOLDS.SHORT);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (deadSpaceRotationRef.current) clearTimeout(deadSpaceRotationRef.current);
    };
  }, [mode, isProcessing]);

  const isIdle = deadSpace !== null;

  return { response, deadSpace, respond, clear, resetIdle, isIdle };
}