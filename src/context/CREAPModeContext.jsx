import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CREAP_MODES, MODE_TRAITS } from '@/lib/creapdPersonality';
import { deriveProfileFromPath, getProfileDepartmentState } from '@/lib/productionDepartments';

const CREAPModeContext = createContext(null);

/**
 * Legacy route-step mapping retained for backward compatibility with older
 * CREAP components. New shared UI should prefer activeDepartmentKey and
 * activeDepartment from the universal five-department architecture.
 */
function deriveStepFromPath(pathname) {
  if (pathname.includes('/news/queue') || pathname.includes('/news/review')) return 1;
  if (pathname.includes('/news/workspace') || pathname.includes('/news/library')) return 2;
  if (pathname.includes('/news/production')) return 3;
  if (pathname.includes('/news/presentations')) return 5;
  if (pathname.includes('/news/export')) return 6;
  if (pathname.includes('/news/brief') || pathname === '/' || pathname.includes('/news/dashboard')) return 1;
  return 1;
}

const STEP_ZONES = {
  1: 'story_review',
  2: 'story_selection',
  3: 'package_generation',
  4: 'package_review',
  5: 'presentation',
  6: 'export',
};

export function CREAPModeProvider({ children }) {
  const location = useLocation();
  const [mode, setModeState] = useState(CREAP_MODES.HYBRID);
  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const prefsRef = useRef(null);

  // Universal profile/department state. This fixes Research and gives every PP
  // one shared answer to "which production department am I in?".
  const departmentState = getProfileDepartmentState(location.pathname);
  const profile = departmentState.profileKey || deriveProfileFromPath(location.pathname) || 'news';
  const activeDepartmentKey = departmentState.departmentKey;
  const activeDepartment = departmentState.department;
  const activeProfileDepartment = departmentState.profileDepartment;

  // Legacy step remains available so existing CREAP behaviors are not broken.
  const routeStep = deriveStepFromPath(location.pathname);

  // Sync step with route (but allow manual override)
  useEffect(() => {
    setActiveStep(routeStep);
  }, [routeStep]);

  // Load saved mode from ProducerPreferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await base44.entities.ProducerPreferences.filter({}, '-created_date', 1);
        if (!cancelled && prefs && prefs.length > 0) {
          prefsRef.current = prefs[0];
          if (prefs[0].creap_mode) {
            setModeState(prefs[0].creap_mode);
          }
        }
      } catch (err) {
        // Prefs might not exist yet — that's fine, default to HYBRID
      } finally {
        if (!cancelled) setIsLoadingPrefs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Set mode and persist to ProducerPreferences
  const setMode = useCallback(async (newMode) => {
    setModeState(newMode);

    // Persist
    try {
      if (prefsRef.current) {
        const updated = await base44.entities.ProducerPreferences.update(prefsRef.current.id, {
          creap_mode: newMode,
        });
        prefsRef.current = updated;
      } else {
        const created = await base44.entities.ProducerPreferences.create({
          creap_mode: newMode,
        });
        prefsRef.current = created;
      }
    } catch (err) {
      // Persistence failure shouldn't block the UI — mode still works in-session
      console.error('CREAP mode persistence error:', err);
    }
  }, []);

  const focusZone = STEP_ZONES[activeStep] || 'story_review';
  const isFocusAware = mode !== CREAP_MODES.FREE;
  const traits = MODE_TRAITS[mode] || MODE_TRAITS[CREAP_MODES.HYBRID];

  const value = {
    mode,
    setMode,
    activeStep,
    setActiveStep,
    focusZone,
    isFocusAware,
    profile,
    activeDepartmentKey,
    activeDepartment,
    activeProfileDepartment,
    isProcessing,
    setIsProcessing,
    traits,
    isLoadingPrefs,
  };

  return (
    <CREAPModeContext.Provider value={value}>
      {children}
    </CREAPModeContext.Provider>
  );
}

/**
 * Hook to access the CREAP Mode context.
 * Legacy fields remain available while universal department fields are added.
 */
export function useCREAPMode() {
  const ctx = useContext(CREAPModeContext);
  if (!ctx) {
    throw new Error('useCREAPMode must be used within a CREAPModeProvider');
  }
  return ctx;
}
