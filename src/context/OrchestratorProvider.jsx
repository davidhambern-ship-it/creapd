import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registry } from '@/lib/creapr/Registry';
import { base44 } from '@/api/base44Client';
import { getNarration as getHardcodedNarration } from '@/lib/systemNarration';
import { resolveTourIcon } from '@/lib/tourIcons';

/**
 * OrchestratorProvider — CREAPr Engine.
 *
 * CREAPr IS the Tour Guide of CREAPD. This engine loads TourScript /
 * TourScene entities from the database and plays them with full visuals,
 * TTS, and word-by-word text reveal — the same cinematic experience
 * the tour system always provided, now driven directly by the engine.
 *
 * The Tour Control Center (admin page) is the visual control panel for
 * CREAPr because it edits the TourScript/TourScene entities that this
 * engine plays.
 *
 * Step types:
 *   - navigate:        { action: 'navigate', target: '/route/path' }
 *   - play_tour:       { action: 'play_tour', payload: { route_path: '/news/storyqueue' } }
 *                       (if route_path omitted, plays tour for current route)
 *   - await_approval:  { action: 'await_approval', payload: { prompt, approve_label, reject_label } }
 *   - invoke_function: { action: 'invoke_function', payload: { function_name, params, result_key } }
 *   - wait:            { action: 'wait', payload: { duration } }
 *   - set_context:     { action: 'set_context', payload: { key: value } }
 *   - run_logic:       { action: 'run_logic', script: 'moduleName' }
 *   - atom command:    { target: 'atomId', command: 'highlight' }
 */

const initialState = {
  status: 'idle',
  activeScriptId: null,
  currentStepIndex: 0,
  contextVars: {},
  activeAtoms: [],
  fault: null,
  log: [],
  pendingApproval: null,
  // Tour state — CREAPr plays tours directly
  tour: null,           // { scenes, default_voice, default_elevenlabs_voice_id, name, _scriptId }
  tourSceneIndex: 0,
  tourActive: false,
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
    case 'START_TOUR':
      return { ...state, tour: action.tour, tourSceneIndex: 0, tourActive: true };
    case 'SET_TOUR_SCENE':
      return { ...state, tourSceneIndex: action.index };
    case 'END_TOUR':
      return { ...state, tour: null, tourSceneIndex: 0, tourActive: false };
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

// ── Tour loader: fetch TourScript + TourScenes from DB, fall back to hardcoded ──
async function loadTourForRoute(routePath) {
  try {
    const scripts = await base44.entities.TourScript.filter({
      route_path: routePath,
      is_active: true,
    });

    if (scripts && scripts.length > 0) {
      const script = scripts[0];
      let scenes = await base44.entities.TourScene.filter({
        tour_script_id: script.id,
      });
      scenes.sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));

      return {
        name: script.script_name,
        default_voice: script.default_voice || 'storm',
        default_elevenlabs_voice_id: script.default_elevenlabs_voice_id || '',
        _source: 'database',
        _scriptId: script.id,
        scenes: scenes.map(s => ({
          id: s.scene_id || String(s.id),
          text: s.text,
          speech: s.speech_text || s.text,
          visual: s.visual_type || 'reveal',
          icon: resolveTourIcon(s.icon_name),
          icon_name: s.icon_name || '',
          color: s.icon_color || 'text-berna-purple',
          font_style: s.font_style || 'heading',
          voice_override: s.voice_override || null,
          elevenlabs_voice_id: s.elevenlabs_voice_id || '',
          speech_speed: s.speech_speed ?? 1,
          voice_stability: s.voice_stability ?? 0.5,
          voice_similarity: s.voice_similarity ?? 0.75,
          pause_after_ms: s.pause_after_ms ?? 500,
          text_color: s.text_color || 'text-white',
          text_size: s.text_size || 'lg',
          text_alignment: s.text_alignment || 'center',
          background_type: s.background_type || 'default',
          generated_image_url: s.generated_image_url || '',
        })),
      };
    }
  } catch (err) {
    console.error('Tour load error, falling back to hardcoded:', err);
  }

  // Fall back to hardcoded narration
  const hardcoded = getHardcodedNarration(routePath);
  if (hardcoded) {
    return {
      ...hardcoded,
      default_voice: hardcoded.default_voice || 'storm',
      default_elevenlabs_voice_id: hardcoded.default_elevenlabs_voice_id || '',
      _source: 'hardcoded',
    };
  }

  return null;
}

// ── Provider ────────────────────────────────────────────────────────
export function OrchestratorProvider({ children }) {
  const [state, dispatch] = useReducer(orchestratorReducer, initialState);
  const scriptRef = useRef(null);
  const navigateRef = useRef(null);
  const approvalResolveRef = useRef(null);
  const tourResolveRef = useRef(null);
  const locationRef = useRef(window.location.pathname);

  const navigate = useNavigate();
  navigateRef.current = navigate;

  // Refs for closure-safe access inside the async run() loop
  const contextVarsRef = useRef(state.contextVars);
  contextVarsRef.current = state.contextVars;

  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  const stepIndexRef = useRef(state.currentStepIndex);
  stepIndexRef.current = state.currentStepIndex;

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

    const targetLabel = step.target || step.payload?.route_path || step.payload?.function_name || '(no target)';
    dispatch({ type: 'LOG', msg: `Step ${index}: ${step.action} → ${targetLabel}` });

    // ── Navigate: change the route ──
    if (step.action === 'navigate' && step.target) {
      navigateRef.current(step.target);
      locationRef.current = step.target;
      // Brief wait for the page to mount
      const waitMs = step.payload?.wait_ms ?? 800;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return true;
    }

    // ── Play Tour: load + play the tour for a route ──
    if (step.action === 'play_tour') {
      const routePath = step.payload?.route_path || locationRef.current;
      const tour = await loadTourForRoute(routePath);

      if (!tour || !tour.scenes || tour.scenes.length === 0) {
        dispatch({ type: 'LOG', msg: `No tour found for ${routePath} — skipping.` });
        return true;
      }

      dispatch({ type: 'START_TOUR', tour });
      dispatch({ type: 'LOG', msg: `Playing tour: ${tour.name} (${tour.scenes.length} scenes)` });

      // Wait for the tour to complete (overlay calls completeTour/skipTour)
      await new Promise(resolve => {
        tourResolveRef.current = resolve;
      });

      dispatch({ type: 'END_TOUR' });
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
        const result = await logicModule({ get: getVar, set: setVar, registry });
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

  // ── Approval controls ──
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

  // ── Tour controls (called by CreaprTourOverlay) ──
  const advanceTourScene = useCallback(() => {
    dispatch({ type: 'SET_TOUR_SCENE', index: state.tourSceneIndex + 1 });
  }, [state.tourSceneIndex]);

  const completeTour = useCallback(() => {
    dispatch({ type: 'END_TOUR' });
    if (tourResolveRef.current) {
      tourResolveRef.current();
      tourResolveRef.current = null;
    }
  }, []);

  const skipTour = useCallback(() => {
    dispatch({ type: 'END_TOUR' });
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
    advanceTourScene,
    completeTour,
    skipTour,
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