import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { registry } from '@/lib/creapr/Registry';

/**
 * OrchestratorProvider — the global CREAPr Engine shell.
 *
 * Holds the in-memory Orchestrator State Schema:
 *   - status: 'idle' | 'running' | 'paused' | 'completed' | 'faulted'
 *   - activeScriptId: ID of the currently executing hybrid script
 *   - currentStepIndex: pointer into the script's step array
 *   - contextVars: cross-step data store (read/written by steps and logic modules)
 *   - executionBuffer: queue of steps waiting to execute (for concurrent dispatch)
 *   - activeAtoms: snapshot of registered atom IDs at last check
 *   - fault: { stepIndex, targetId, type: 'missing_atom', message } when faulted
 *
 * The provider exposes:
 *   - state (the schema above)
 *   - loadScript(script): parse a hybrid script and prime the engine
 *   - run(): begin execution from currentStepIndex
 *   - pause(): halt execution
 *   - resume(): continue from currentStepIndex
 *   - reset(): clear everything back to idle
 *   - setVar(key, value): write to contextVars
 *   - getVar(key): read from contextVars
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
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ── Provider ────────────────────────────────────────────────────────
export function OrchestratorProvider({ children }) {
  const [state, dispatch] = useReducer(orchestratorReducer, initialState);
  const scriptRef = useRef(null); // holds the currently loaded script object

  // Sync activeAtoms whenever the registry changes.
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
  }, []);

  const setVar = useCallback((key, value) => {
    dispatch({ type: 'SET_VAR', key, value });
  }, []);

  const contextVarsRef = useRef(state.contextVars);
  contextVarsRef.current = state.contextVars;

  const getVar = useCallback((key) => {
    return contextVarsRef.current[key];
  }, []);

  /**
   * Execute a single step. This is the heart of the interpreter.
   * Returns true if the step completed, false if it faulted.
   */
  const executeStep = useCallback(async (step, index) => {
    const script = scriptRef.current;
    if (!script || !script.steps || index >= script.steps.length) {
      dispatch({ type: 'SET_STATUS', status: 'completed' });
      dispatch({ type: 'LOG', msg: 'Script completed — no more steps.' });
      return true;
    }

    dispatch({ type: 'LOG', msg: `Step ${index}: ${step.action} → ${step.target || '(no target)'}` });

    // ── Logic Module step: delegate to a JS function ──
    if (step.action === 'run_logic' && step.script) {
      const logicModule = script.logicModules?.[step.script];
      if (logicModule) {
        const result = await logicModule({
          get: getVar,
          set: setVar,
          registry,
        });
        if (result?.vars) dispatch({ type: 'SET_VARS', vars: result.vars });
        dispatch({ type: 'LOG', msg: `Logic module "${step.script}" returned: ${JSON.stringify(result)}` });
        return true;
      }
      dispatch({ type: 'LOG', msg: `Logic module "${step.script}" not found — skipping.` });
      return true;
    }

    // ── Atom Command step: issue a command to a registered component ──
    if (step.target) {
      const atom = registry.get(step.target);

      if (!atom) {
        // ── Fault surface — the atom is missing ──
        const onMissing = step.on_missing || 'abort';
        dispatch({ type: 'LOG', msg: `Atom "${step.target}" missing. on_missing=${onMissing}` });

        if (onMissing === 'skip') return true;
        if (onMissing === 'retry') {
          // Re-queue for next tick — the component may be mounting.
          return false;
        }
        // 'abort' (default)
        dispatch({
          type: 'SET_FAULT',
          fault: { stepIndex: index, targetId: step.target, type: 'missing_atom', message: `Atom "${step.target}" not registered` },
        });
        return false;
      }

      // Issue the command
      await atom.onCommand(step.command || step.action, step.payload || {});
      return true;
    }

    // ── No-op step (just logging / context set) ──
    if (step.action === 'set_context' && step.payload) {
      dispatch({ type: 'SET_VARS', vars: step.payload });
      return true;
    }

    dispatch({ type: 'LOG', msg: `Unknown step action: ${step.action} — skipping.` });
    return true;
  }, [getVar, setVar]);

  /**
   * Run the script from the current step index. This is an event-driven
   * loop — it executes one step, waits for completion, then advances.
   */
  const stepIndexRef = useRef(state.currentStepIndex);
  stepIndexRef.current = state.currentStepIndex;

  const run = useCallback(async () => {
    const script = scriptRef.current;
    if (!script) return;

    dispatch({ type: 'SET_STATUS', status: 'running' });
    statusRef.current = 'running';
    dispatch({ type: 'CLEAR_FAULT' });

    let index = stepIndexRef.current;
    const steps = script.steps || [];

    while (index < steps.length) {
      // Check if we've been paused or faulted from outside the loop.
      // statusRef is updated synchronously and on each render.
      if (statusRef.current === 'paused' || statusRef.current === 'faulted') {
        dispatch({ type: 'SET_STEP', index });
        stepIndexRef.current = index;
        return;
      }

      const ok = await executeStep(steps[index], index);
      if (!ok) {
        // Fault or retry — stop here and preserve position.
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
  }, []);

  const resume = useCallback(() => {
    run();
  }, [run]);

  const reset = useCallback(() => {
    scriptRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  // Keep a ref of the current status so the run() loop can check it.
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

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