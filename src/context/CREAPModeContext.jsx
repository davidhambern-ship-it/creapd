import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CREAP_MODES, MODE_TRAITS } from '@/lib/creapdPersonality';

const CREAPModeContext = createContext(null);

/**
 * Derive the production profile key from the current route.
 * /music/* → music, /talk/* → talk, /cooking/* → cooking, etc.
 * Default → news
 */
function deriveProfileFromPath(pathname) {
  if (pathname.startsWith('/music')) return 'music';
  if (pathname.startsWith('/talk')) return 'talk';
  if (pathname.startsWith('/cooking')) return 'cooking';
  if (pathname.startsWith('/sports')) return 'sports';
  if (pathname.startsWith('/cosmo')) return 'cosmo';
  if (pathname.startsWith('/spiritual')) return 'spiritual';
  return 'news';
}

/**
 * Derive the workflow step from the current route.
 * 1 = Story Review, 2 = Story Selection, 3 = Package Generation,
 * 4 = Package Review, 5 = Presentation, 6 = Export
 */
function deriveStepFromPath(pathname) {
  if (pathname.includes('/news/storyqueue') || pathname.includes('/news/storyintelligencereview')) return 1;
  if (pathname.includes('/news/storymanager') || pathname.includes('/news/storylibrary')) return 2;
  if (pathname.includes('/news/productionpackages')) return 3;
  if (pathname.includes('/news/presentations')) return 5;
  if (pathname.includes('/news/exportcenter')) return 6;
  if (pathname.includes('/news/todaysbrief') || pathname === '/' || pathname.includes('/dashboard')) return 1;
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

  // Derive profile and step from route
  const profile = deriveProfileFromPath(location.pathname);
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
 * Returns mode, setMode, activeStep, setActiveStep, focusZone,
 * isFocusAware, profile, isProcessing, setIsProcessing, traits, isLoadingPrefs.
 */
export function useCREAPMode() {
  const ctx = useContext(CREAPModeContext);
  if (!ctx) {
    throw new Error('useCREAPMode must be used within a CREAPModeProvider');
  }
  return ctx;
}