import React from 'react';
import { Outlet } from 'react-router-dom';
import { CREAPModeProvider } from '@/context/CREAPModeContext';
import SystemNarrationOverlay from '@/components/system/SystemNarrationOverlay';

/**
 * Thin layout route that wraps all authenticated pages in the CREAPModeProvider.
 * This makes the CREAP Mode context (mode, step, profile, focus zone) available
 * to every authenticated page and component.
 *
 * Also renders the SystemNarrationOverlay — when AUTOPILOT mode is active,
 * each page with a narration script gets an animated, voice-narrated guided
 * tour before revealing the actual interface.
 */
export default function CREAPModeLayout() {
  return (
    <CREAPModeProvider>
      <Outlet />
      <SystemNarrationOverlay />
    </CREAPModeProvider>
  );
}