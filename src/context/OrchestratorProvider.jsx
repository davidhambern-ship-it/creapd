import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registry } from '@/lib/creapr/Registry';
import { base44 } from '@/api/base44Client';

/**
 * OrchestratorProvider — the global CREAPr Engine shell.
 *
 * In AUTOPILOT mode, this engine drives the entire app: it navigates routes,
 * narrates what's happening, invokes backend functions, pauses for user
 * approval at key gates, and issues commands to registered UI atoms.
 *
 * State Schema:
 *   - status: 'idle' | 'running' | 'paused' | 'completed' | 'faulted' | 'awaiting_input'
 *   - activeScriptId, currentStepIndex, contextVars, activeAtoms, fault, log
 *   - narration: { text, speech, auto_advance, duration } | null
 *   - pendingApproval: { prompt, approve_label, reject_label, step_index } | null
 *
 * Step types supported:
 *   - set_context:     { action: 'set_context', payload: { key: value } }
 *   - run_logic:       { action: 'run_logic', script: 'moduleName' }
 *   - navigate:        { action: 'navigate', target: '/route/path', payload: { wait_ms } }
 *   - narrate:         { action: 'narrate', payload: { text, speech, auto_advance, duration } }
 *   - await_approval:  { action: 'await_approval', payload: { prompt, approve_label, reject_label } }
 *   - invoke_function: { action: 'invoke_function', payload: { function_name, params, result_key } }
 *   - wait:            { action: 'wait', payload: { duration } }
 *   - atom command:    { action: 'highlight'|'dim'|'reset'|..., target: 'atomId', command: 'highlight' }
 */

const initialState = {
  status: 'idle',
  activeScriptId: null,
  currentStepIndex: 0,
  contextVars: {},
  executionBuffer: [],
  activeAtoms: [],
  fault: null,
  log: [],
  narration: null,
  pendingApproval: null,
};

const OrchestratorContext = createContext(null);

// ── Reducer ──────────────────────────────────────────────────────────
function orchestratorReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SCRIPT':
      return {
        ...initialState,
        status: 'paused',
        activeScriptId: action.scriptId,
        contextVars: action.initialVars || {},
        log: [{ ts: Date.now(), msg: `Script loaded: ${action.scriptId}` }],
      };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_STEP':
      return { ...state, currentStepIndex: action.index };
    case 'SET_VAR':
      return { ...state, contextVars: { ...state.contextVars, [action.key]: action.value } };
    case 'SET_VARS':
      return { ...state, contextVars: { ...state.contextVars, ...action.vars } };
    case 'SET_FAULT':
      return { ...state, status: 'faulted', fault: action.fault };
    case 'CLEAR_FAULT':
      return { ...state, fault: null, status: state.status === 'faulted' ? 'paused' : state.status };
    case 'SYNC_ATOMS':
      return { ...state, activeAtoms: action.ids };
    case 'LOG':
      return { ...state, log: [...state.log, { ts: Date.now(), msg: action.msg }] };
    case 'SET_NARRATION':
      return { ...state, narration: action.narration };
    case 'CLEAR_NARRATION':
      return { ...state, narration: null };
    case 'AWAIT_INPUT':
      return { ...state, status: 'awaiting_input', pendingApproval: action.approval };
    case 'CLEAR_APPROVAL':
      return { ...state, status: 'running', pendingApproval: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ── Provider ────────────────────────────────────────────────────────
export function OrchestratorProvider({ children }) {
  const [state, dispatch] = useReducer(orchestratorReducer, initialState);
  const scriptRef = useRef(null);
  const navigateRef = useRef(null);
  const approvalResolveRef = useRef(null);
  const narrationResolveRef = useRef(null);

  // useNavigate — safe because OrchestratorProvider is rendered inside <Router>
  const navigate = useNavigate();
  navigateRef.current = navigate;

  // Refs for closure-safe access inside the async run() loop
  const contextVarsRef = useRef(state.contextVars);
  contextVarsRef.current = state.contextVars;

  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  const stepIndexRef = useRef(state.currentStepIndex);
  stepIndexRef.current = state.currentStepIndex;

  // Tour coordination: the navigate step waits for the tour to finish
  // before proceeding. SystemNarrationOverlay calls signalTourComplete().
  const tourResolveRef = useRef(null);

  // Sync activeAtoms whenever the registry changes
  useEffect(() => {
    const unsub = registry.subscribe(() => {
      dispatch({ type: 'SYNC_ATOMS', ids: registry.list() });
    });
    dispatch({ type: 'SYNC_ATOMS', ids: registry.list() });
    return unsub;
  }, []);

  // ── Public API ────────────────────────────────────────────────────
  const loadScript = useCallback((script, initialVars) => {
    scriptRef.current = script;
    dispatch({
      type: 'LOAD_SCRIPT',
      scriptId: script.id || script.name || 'unnamed',
      initialVars,
    });
    stepIndexRef.current = 0;
    statusRef.current = 'paused';
  }, []);

  const setVar = useCallback((key, value) => {
    dispatch({ type: 'SET_VAR', key, value });
    contextVarsRef.current = { ...contextVarsRef.current, [key]: value };
  }, []);

  const getVar = useCallback((key) => {
    return contextVarsRef.current[key];
  }, []);

  /**
   * Execute a single step. Returns true if completed, false if faulted.
   */
  const executeStep = useCallback(async (step, index) => {
    const script = scriptRef.current;
    if (!script || !script.steps || index >= script.steps.length) {
      dispatch({ type: 'SET_STATUS', status: 'completed' });
      statusRef.current = 'completed';
      dispatch({ type: 'LOG', msg: 'Script completed — no more steps.' });
      return true;
    }

    const targetLabel = step.target || step.payload?.function_name || '(no target)';
    dispatch({ type: 'LOG', msg: `Step ${index}: ${step.action} → ${targetLabel}` });

    // ── Navigate: change the route, then wait for tour to play ──
    if (step.action === 'navigate' && step.target) {
      navigateRef.current(step.target);

      // Check if a tour script exists for this route.
      // If yes, wait for the tour to complete (SystemNarrationOverlay
      // will call signalTourComplete). If no, wait a fixed time.
      const hasTour = step.payload?.has_tour ?? true;
      const fallbackMs = step.payload?.wait_ms ?? 2000;

      if (hasTour) {
        // Wait for the tour to signal completion (via signalTourComplete).
        // If no tour plays (already seen, or no tour for this route),
        // fall back after 30s so the script doesn't stall.
        await Promise.race([
          new Promise(resolve => {
            tourResolveRef.current = resolve;
          }),
          new Promise(resolve => setTimeout(resolve, 30000)),
        ]);
        tourResolveRef.current = null;
      } else {
        await new Promise(resolve => setTimeout(resolve, fallbackMs));
      }
      return true;
    }

    // ── Narrate: delegate to the tour system's visual overlay ──
    // (Legacy support — the tour system handles narration per-route now.
    // This step type is kept for scripts that need inline narration
    // outside of the per-route tour system.)
    if (step.action === 'narrate' && step.payload) {
      dispatch({ type: 'SET_NARRATION', narration: step.payload });
      if (step.payload.auto_advance) {
        const duration = step.payload.duration || 4000;
        await new Promise(resolve => setTimeout(resolve, duration));
        dispatch({ type: 'CLEAR_NARRATION' });
      } else {
        await new Promise(resolve => {
          narrationResolveRef.current = resolve;
        });
        dispatch({ type: 'CLEAR_NARRATION' });
      }
      return true;
    }

    // ── Await Approval: pause until user approves or rejects ──
    if (step.action === 'await_approval' && step.payload) {
      dispatch({ type: 'AWAIT_INPUT', approval: { ...step.payload, step_index: index } });
      await new Promise(resolve => {
        approvalResolveRef.current = resolve;
      });
      dispatch({ type: 'CLEAR_APPROVAL' });
      statusRef.current = 'running';
      return true;
    }

    // ── Invoke Function: call a backend function ──
    if (step.action === 'invoke_function' && step.payload) {
      const { function_name, params, result_key } = step.payload;
      try {
        dispatch({ type: 'LOG', msg: `Invoking ${function_name}...` });
        const response = await base44.functions.invoke(function_name, params || {});
        const result = response?.data !== undefined ? response.data : response;
        if (result_key) {
          dispatch({ type: 'SET_VAR', key: result_key, value: result });
          contextVarsRef.current = { ...contextVarsRef.current, [result_key]: result };
        }
        dispatch({ type: 'LOG', msg: `${function_name} completed.` });
      } catch (err) {
        dispatch({ type: 'LOG', msg: `${function_name} failed: ${err.message}` });
        if (step.on_error === 'skip') return true;
        dispatch({ type: 'SET_FAULT', fault: { stepIndex: index, targetId: function_name, type: 'function_error', message: err.message } });
        statusRef.current = 'faulted';
        return false;
      }
      return true;
    }

    // ── Wait: simple delay ──
    if (step.action === 'wait' && step.payload) {
      const duration = step.payload.duration || 1000;
      await new Promise(resolve => setTimeout(resolve, duration));
      return true;
    }

    // ── Logic Module: delegate to a JS function ──
    if (step.action === 'run_logic' && step.script) {
      const logicModule = script.logicModules?.[step.script];
      if (logicModule) {
        const result = await logicModule({
          get: getVar,
          set: setVar,
          registry,
        });
        if (result?.vars) {
          dispatch({ type: 'SET_VARS', vars: result.vars });
          contextVarsRef.current = { ...contextVarsRef.current, ...result.vars };
        }
        dispatch({ type: 'LOG', msg: `Logic module "${step.script}" completed.` });
        return true;
      }
      dispatch({ type: 'LOG', msg: `Logic module "${step.script}" not found — skipping.` });
      return true;
    }

    // ── Atom Command: issue a command to a registered component ──
    if (step.target && (step.command || ['highlight', 'dim', 'reset'].includes(step.action))) {
      const atom = registry.get(step.target);
      if (!atom) {
        const onMissing = step.on_missing || 'abort';
        dispatch({ type: 'LOG', msg: `Atom "${step.target}" missing. on_missing=${onMissing}` });
        if (onMissing === 'skip') return true;
        if (onMissing === 'retry') return false;
        dispatch({ type: 'SET_FAULT', fault: { stepIndex: index, targetId: step.target, type: 'missing_atom', message: `Atom "${step.target}" not registered` } });
        statusRef.current = 'faulted';
        return false;
      }
      await atom.onCommand(step.command || step.action, step.payload || {});
      return true;
    }

    // ── Set Context ──
    if (step.action === 'set_context' && step.payload) {
      dispatch({ type: 'SET_VARS', vars: step.payload });
      contextVarsRef.current = { ...contextVarsRef.current, ...step.payload };
      return true;
    }

    dispatch({ type: 'LOG', msg: `Unknown step action: ${step.action} — skipping.` });
    return true;
  }, [getVar, setVar]);

  /**
   * Run the script from the current step index.
   */
  const run = useCallback(async () => {
    const script = scriptRef.current;
    if (!script) return;

    dispatch({ type: 'SET_STATUS', status: 'running' });
    statusRef.current = 'running';
    dispatch({ type: 'CLEAR_FAULT' });

    let index = stepIndexRef.current;
    const steps = script.steps || [];

    while (index < steps.length) {
      if (statusRef.current === 'paused' || statusRef.current === 'faulted') {
        dispatch({ type: 'SET_STEP', index });
        stepIndexRef.current = index;
        return;
      }

      const ok = await executeStep(steps[index], index);
      if (!ok) {
        dispatch({ type: 'SET_STEP', index });
        stepIndexRef.current = index;
        return;
      }

      index++;
      dispatch({ type: 'SET_STEP', index });
      stepIndexRef.current = index;
    }

    dispatch({ type: 'SET_STATUS', status: 'completed' });
    statusRef.current = 'completed';
    dispatch({ type: 'LOG', msg: 'Script completed.' });
  }, [executeStep]);

  const pause = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: 'paused' });
    statusRef.current = 'paused';
  }, []);

  const resume = useCallback(() => {
    run();
  }, [run]);

  const reset = useCallback(() => {
    scriptRef.current = null;
    dispatch({ type: 'RESET' });
    stepIndexRef.current = 0;
    statusRef.current = 'idle';
  }, []);

  // ── Approval & Narration controls ──
  const approve = useCallback(() => {
    contextVarsRef.current = { ...contextVarsRef.current, last_approval: 'approved' };
    dispatch({ type: 'SET_VAR', key: 'last_approval', value: 'approved' });
    if (approvalResolveRef.current) {
      approvalResolveRef.current();
      approvalResolveRef.current = null;
    }
  }, []);

  const reject = useCallback(() => {
    contextVarsRef.current = { ...contextVarsRef.current, last_approval: 'rejected' };
    dispatch({ type: 'SET_VAR', key: 'last_approval', value: 'rejected' });
    if (approvalResolveRef.current) {
      approvalResolveRef.current();
      approvalResolveRef.current = null;
    }
  }, []);

  const dismissNarration = useCallback(() => {
    dispatch({ type: 'CLEAR_NARRATION' });
    if (narrationResolveRef.current) {
      narrationResolveRef.current();
      narrationResolveRef.current = null;
    }
  }, []);

  // Called by SystemNarrationOverlay when a tour finishes (completes or skipped).
  // This unblocks the navigate step so the engine can proceed.
  const signalTourComplete = useCallback(() => {
    if (tourResolveRef.current) {
      tourResolveRef.current();
      tourResolveRef.current = null;
    }
  }, []);

  const value = {
    state,
    loadScript,
    run,
    pause,
    resume,
    reset,
    setVar,
    getVar,
    registry,
    approve,
    reject,
    dismissNarration,
    signalTourComplete,
  };

  return (
    <OrchestratorContext.Provider value={value}>
      {children}
    </OrchestratorContext.Provider>
  );
}

// ── Hook for consuming the orchestrator ─────────────────────────────
export function useOrchestrator() {
  const ctx = useContext(OrchestratorContext);
  if (!ctx) {
    throw new Error('useOrchestrator must be used within an OrchestratorProvider');
  }
  return ctx;
}

export default OrchestratorContext;